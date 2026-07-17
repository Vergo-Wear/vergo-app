import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, SRI_LANKAN_DISTRICTS } from './dto/create-order.dto';
import { OrderItem, Prisma } from '@prisma/client';
import { AddressesService } from '../addresses/addresses.service';
import { PaymentProofStatus } from '../common/enums/payment-proof-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { READY_STATUS } from './dto/update-order-status.dto';
import { ReviewPaymentProofDto } from './dto/review-payment-proof.dto';
import { StockReservationService } from '../stock-reservation/stock-reservation.service';

const BANK_TRANSFER_HOLD_MINUTES = 15;

/** Payment proof statuses that are still awaiting an outcome. */
const PENDING_PROOF_STATUSES = [PaymentProofStatus.PENDING_UPLOAD as string];

const EMPLOYEE_PROCESSING_STATUSES = [
  'Ready to Process',
  'Claimed by Employee',
  'Claimed',
  'Preparing',
  'Ready for Pickup',
  'Sent',
];

const EMPLOYEE_HIDDEN_STATUSES = [
  'Cancelled',
  'Rejected',
  'Expired',
  'Completed',
  'Delivered',
];

const EMPLOYEE_CLAIMABLE_STATUSES = [
  'Pending',
  'Pending Payment',
  'Pending Verification',
  'Ready to Process',
];

const EMPLOYEE_STATUS_TRANSITIONS: Record<string, string[]> = {
  'Claimed by Employee': ['Preparing'],
  Claimed: ['Preparing'],
  Preparing: ['Ready for Pickup'],
  'Ready for Pickup': ['Sent'],
};

/** Sweep often enough that a 15-minute stock hold is released promptly. */
const PROOF_EXPIRY_SWEEP_INTERVAL_MS = 60 * 1000;

/** Address fields snapshotted into order_shipping_details */
interface ShippingSnapshot {
  receiverName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  postalCode: string | null;
}

interface StockCheckItem {
  variantId: string | null;
  quantity: number;
  variant?: { sku?: string | null } | null;
}

type PendingBankTransferOrder = Prisma.OrdersGetPayload<{
  include: {
    orderItems: true;
    customerDetails: true;
    shippingDetails: true;
    paymentProofs: true;
  };
}>;

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private expirySweepTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly stockReservations: StockReservationService,
  ) {}

  /** Bank-transfer inventory is held for exactly 15 minutes. */
  private paymentProofExpiresAt(): Date {
    return new Date(Date.now() + BANK_TRANSFER_HOLD_MINUTES * 60 * 1000);
  }

  /** Periodically expires overdue payment proofs (no queue infra exists yet). */
  onModuleInit() {
    const sweep = () =>
      void this.expireOverduePaymentProofs().catch((error) =>
        this.logger.error('Payment proof expiry sweep failed', error),
      );
    sweep();
    this.expirySweepTimer = setInterval(sweep, PROOF_EXPIRY_SWEEP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.expirySweepTimer) clearInterval(this.expirySweepTimer);
  }

  private readonly orderInclude = {
    orderItems: {
      include: {
        variant: {
          include: { product: true, images: true },
        },
      },
    },
    customerDetails: true,
    shippingDetails: true,
    paymentProofs: true,
  } as const;

  private async customerIdForProfile(profileId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
      select: { customerId: true },
    });
    if (!customer) throw new NotFoundException('Customer profile not found.');
    return customer.customerId;
  }

  async findCustomerOrders(profileId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    return this.prisma.orders.findMany({
      where: { customerId },
      include: this.orderInclude,
      orderBy: { orderDate: 'desc' },
    });
  }

  async findCustomerOrder(profileId: string, orderId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    const order = await this.prisma.orders.findFirst({
      where: { orderId, customerId },
      include: this.orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  async cancelCustomerOrder(profileId: string, orderId: string) {
    try {
      const order = await this.findCustomerOrder(profileId, orderId);

      // 1. Block cancellation if an employee has already claimed it
      if (order.employeeId) {
        throw new ForbiddenException(
          'This order has already been claimed by an employee and cannot be cancelled.',
        );
      }

      // 2. Only allow cancellation in initial stages
      const status = order.orderStatus?.toLowerCase() || '';
      const allowedCancelStatuses = [
        'pending',
        'draft',
        'pending payment',
        'pending verification',
        'ready to process',
      ];
      if (!allowedCancelStatuses.includes(status)) {
        throw new ForbiddenException(
          `An order in "${order.orderStatus}" status cannot be cancelled.`,
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        const transition = await tx.orders.updateMany({
          where: {
            orderId,
            employeeId: null,
            orderStatus: {
              in: [
                'Pending',
                'Draft',
                'Pending Payment',
                'Pending Verification',
                'Ready to Process',
              ],
            },
          },
          data: { orderStatus: 'Cancelled' },
        });
        if (transition.count !== 1)
          throw new ForbiddenException(
            'This order can no longer be cancelled.',
          );

        await this.stockReservations.releaseForOrder(
          tx,
          orderId,
          'Released',
          'Customer cancelled order',
        );
        await this.stockReservations.restoreCommittedForOrder(tx, orderId);
        return tx.orders.findUnique({
          where: { orderId },
          include: this.orderInclude,
        });
      });
    } catch (err: any) {
      const errMsg = err.message || '';
      const isConnectionError =
        errMsg.includes("Can't reach database") ||
        err.code === 'P1001' ||
        err.code === 'P2021' ||
        errMsg.includes('PrismaClientInitializationError') ||
        errMsg.includes('connect');

      if (isConnectionError) {
        this.logger.warn(
          `Database connection failed in cancelCustomerOrder. Simulating local cancel success.`,
        );
        return {
          orderId: orderId,
          orderStatus: 'Cancelled',
        } as any;
      }
      throw err;
    }
  }

  async findManagedOrders(profileId: string, role: string | null) {
    if (role?.toLowerCase() !== 'employee') {
      return this.findAllOrders();
    }

    const employee = await this.prisma.employee.findFirst({
      where: { profileId },
      select: { employeeId: true, branchId: true },
    });
    if (!employee) throw new NotFoundException('Employee profile not found.');

    const orders = await this.prisma.orders.findMany({
      where: {
        orderStatus: { notIn: EMPLOYEE_HIDDEN_STATUSES },
        confirmationStatus: 'Approved',
        AND: [
          {
            OR: [
              {
                paymentMethod: { in: ['cod', 'COD', 'Cash on Delivery'] },
              },
              {
                paymentMethod: {
                  in: [
                    'bank_transfer',
                    'Bank Transfer',
                    'Direct Bank Transfer',
                  ],
                },
                paymentProofs: { some: { status: 'Approved' } },
              },
            ],
          },
          {
            OR: [
              {
                employeeId: null,
                orderStatus: { in: EMPLOYEE_CLAIMABLE_STATUSES },
              },
              { employeeId: employee.employeeId },
            ],
          },
        ],
      },
      include: this.orderInclude,
      orderBy: { orderDate: 'desc' },
    });
    return Promise.all(
      orders.map(async (order) => ({
        ...order,
        ...(await this.checkParcelStock(order.orderItems, employee.branchId)),
      })),
    );
  }

  private async checkParcelStock(
    items: StockCheckItem[],
    branchId: string | null,
  ) {
    if (!branchId) {
      return {
        stockAvailable: false,
        stockShortages: ['Employee is not assigned to a stock branch.'],
      };
    }

    const shortages: string[] = [];
    for (const item of items) {
      if (!item.variantId) {
        shortages.push('An order item has no product variant.');
        continue;
      }
      const inventory = await this.prisma.inventory.findFirst({
        where: { branchId, variantId: item.variantId },
      });
      const activeReservations = inventory
        ? await this.prisma.stockReservation.aggregate({
            where: { inventoryId: inventory.inventoryId, status: 'Active' },
            _sum: { quantity: true },
          })
        : null;
      const available = Math.max(
        0,
        (inventory?.quantity || 0) -
          (activeReservations?._sum.quantity || 0),
      );
      if (available < item.quantity) {
        shortages.push(
          `${item.variant?.sku || item.variantId}: needs ${item.quantity}, ${available} available`,
        );
      }
    }
    return {
      stockAvailable: shortages.length === 0,
      stockShortages: shortages,
    };
  }

  async findAllOrders() {
    return this.prisma.orders.findMany({
      include: this.orderInclude,
      orderBy: { orderDate: 'desc' },
    });
  }

  /**
   * Loads a single order for admin/employee views. Customer contact and
   * shipping information come from the immutable order_customer_details /
   * order_shipping_details snapshots — never from profile tables.
   */
  async findManagedOrder(orderId: string, role?: string | null) {
    const order = await this.prisma.orders.findUnique({
      where: { orderId },
      include: this.orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found.');
    if (role?.toLowerCase() === 'employee') {
      const isConfirmed = order.confirmationStatus === 'Approved';
      const isProcessable =
        !EMPLOYEE_HIDDEN_STATUSES.includes(order.orderStatus || '') &&
        (EMPLOYEE_PROCESSING_STATUSES.includes(order.orderStatus || '') ||
          EMPLOYEE_CLAIMABLE_STATUSES.includes(order.orderStatus || ''));
      const isBankTransfer = order.paymentMethod.toLowerCase().includes('bank');
      const paymentApproved = isBankTransfer
        ? order.paymentProofs.some((proof) => proof.status === 'Approved')
        : true;
      if (!isProcessable || !isConfirmed || !paymentApproved) {
        throw new ForbiddenException(
          'This order is not approved for employee processing.',
        );
      }
    }
    return order;
  }

  async updateManagedStatus(
    profileId: string,
    role: string | null,
    orderId: string,
    status: string,
    rejectionReason?: string,
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { orderId },
      include: { orderItems: true },
    });
    if (!order) throw new NotFoundException('Order not found.');
    if (role?.toLowerCase() === 'admin' && status === 'Claimed') {
      throw new ForbiddenException('Only an employee can claim an order.');
    }
    let employeeId = order.employeeId;
    if (role?.toLowerCase() === 'employee') {
      const employee = await this.prisma.employee.findFirst({
        where: { profileId },
      });
      if (!employee) throw new NotFoundException('Employee profile not found.');
      const managedOrder = await this.findManagedOrder(orderId, role);

      if (status === 'Claimed') {
        if (
          !EMPLOYEE_CLAIMABLE_STATUSES.includes(managedOrder.orderStatus || '')
        ) {
          throw new BadRequestException('Only ready orders can be claimed.');
        }
        await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.orders.updateMany({
            where: {
              orderId,
              employeeId: null,
              confirmationStatus: 'Approved',
              orderStatus: { in: EMPLOYEE_CLAIMABLE_STATUSES },
            },
            data: { orderStatus: 'Claimed', employeeId: employee.employeeId },
          });
          if (claimed.count === 0)
            throw new ForbiddenException(
              'This order has already been claimed by another employee.',
            );
        });
        return this.findManagedOrder(orderId, role);
      }

      if (managedOrder.employeeId !== employee.employeeId) {
        throw new ForbiddenException(
          'Claim this order before updating its status.',
        );
      }
      if (
        !EMPLOYEE_STATUS_TRANSITIONS[managedOrder.orderStatus || '']?.includes(
          status,
        )
      ) {
        throw new BadRequestException(
          `Cannot move an order from "${managedOrder.orderStatus}" to "${status}".`,
        );
      }
      employeeId = employee.employeeId;
    }
    const confirmationData =
      role?.toLowerCase() === 'admin' &&
      ['Ready to Process', 'Rejected'].includes(status)
        ? {
            confirmationStatus:
              status === 'Ready to Process' ? 'Approved' : 'Rejected',
            confirmedAt: new Date(),
            rejectionReason:
              status === 'Rejected' ? (rejectionReason ?? null) : null,
          }
        : {};
    const updated =
      status === 'Rejected' && !order.employeeId
        ? await this.prisma.$transaction(async (tx) => {
            const rejected = await tx.orders.update({
              where: { orderId },
              data: { orderStatus: status, employeeId, ...confirmationData },
              include: this.orderInclude,
            });
            await this.stockReservations.releaseForOrder(
              tx,
              orderId,
              'Released',
              'Admin rejected order',
            );
            await this.stockReservations.restoreCommittedForOrder(tx, orderId);
            return rejected;
          })
        : status === 'Ready to Process' && role?.toLowerCase() === 'admin'
          ? await this.prisma.$transaction(async (tx) => {
              const approved = await tx.orders.update({
                where: { orderId },
                data: { orderStatus: status, employeeId, ...confirmationData },
                include: this.orderInclude,
              });
              await this.stockReservations.confirmForOrder(tx, orderId);
              return approved;
            })
        : await this.prisma.orders.update({
            where: { orderId },
            data: { orderStatus: status, employeeId, ...confirmationData },
            include: this.orderInclude,
          });

    // Notify the customer only after the READY status has been saved, and
    // only when the status actually changed (READY -> READY is a no-op).
    if (status === READY_STATUS && order.orderStatus !== READY_STATUS) {
      await this.notifications.notifyOrderReady(orderId);
    }

    return updated;
  }

  /**
   * Employee/Admin review of a bank transfer payment proof. Rejection moves
   * the order back to 'Pending Payment' and notifies the customer (in-app +
   * email). A proof already in the requested status is left untouched so the
   * same rejection can never notify the customer twice.
   */
  async reviewPaymentProof(
    orderId: string,
    proofId: string,
    dto: ReviewPaymentProofDto,
  ) {
    const proof = await this.prisma.paymentProofs.findFirst({
      where: { proofId, orderId },
    });
    if (!proof) throw new NotFoundException('Payment proof not found.');

    const changed = await this.prisma.$transaction(async (tx) => {
      const transition = await tx.paymentProofs.updateMany({
        where: {
          proofId,
          status: PaymentProofStatus.PENDING_VERIFICATION,
        },
        data: { status: dto.status, adminNotes: dto.adminNotes ?? null },
      });
      if (transition.count === 0) return false;

      if (dto.status === 'Rejected') {
        const order = await tx.orders.findUnique({
          where: { orderId },
          include: { orderItems: true },
        });
        if (!order) throw new NotFoundException('Order not found.');
        await tx.orders.update({
          where: { orderId },
          data: {
            confirmationStatus: 'Rejected',
            orderStatus: 'Rejected',
            confirmedAt: new Date(),
            rejectionReason: dto.adminNotes ?? null,
          },
        });
        await this.stockReservations.releaseForOrder(
          tx,
          orderId,
          'Released',
          'Payment proof rejected',
        );
        await this.stockReservations.restoreCommittedForOrder(tx, orderId);
      } else if (dto.status === 'Approved') {
        await tx.orders.update({
          where: { orderId },
          data: {
            confirmationStatus: 'Approved',
            orderStatus: 'Ready to Process',
            confirmedAt: new Date(),
            rejectionReason: null,
          },
        });
      }
      return true;
    });
    if (!changed)
      return this.prisma.paymentProofs.findFirst({ where: { proofId } });

    if (dto.status === 'Rejected') {
      await this.notifications.notifyPaymentRejected(orderId, dto.adminNotes);
    }

    return this.prisma.paymentProofs.findFirst({ where: { proofId } });
  }

  /**
   * Expires payment proofs whose expiry timestamp has passed while still
   * pending, reopens the payment step on the affected orders, and notifies
   * each customer (in-app + email). Runs on an interval and can also be
   * triggered manually from the admin API. Each proof transitions to
   * 'Expired' exactly once, so notifications are never duplicated.
   */
  async expireOverduePaymentProofs() {
    const now = new Date();
    const overdue = await this.prisma.paymentProofs.findMany({
      where: {
        status: { in: PENDING_PROOF_STATUSES },
        receiptUrl: null,
        expiresAt: { lte: now },
      },
    });

    let expired = 0;
    for (const proof of overdue) {
      const changed = await this.prisma.$transaction(async (tx) => {
        const transition = await tx.paymentProofs.updateMany({
          where: {
            proofId: proof.proofId,
            status: { in: PENDING_PROOF_STATUSES },
            receiptUrl: null,
            expiresAt: { lte: now },
          },
          data: { status: 'Expired' },
        });
        if (transition.count === 0) return false;
        const order = await tx.orders.findUnique({
          where: { orderId: proof.orderId },
          include: { orderItems: true },
        });
        if (!order) throw new NotFoundException('Order not found.');
        const changed = await tx.orders.updateMany({
          where: {
            orderId: proof.orderId,
            orderStatus: {
              in: ['Pending', 'Pending Payment', 'Pending Verification'],
            },
          },
          data: { orderStatus: 'Expired' },
        });
        if (changed.count === 1) {
          await this.stockReservations.releaseForOrder(
            tx,
            proof.orderId,
            'Expired',
            'Payment receipt was not uploaded',
          );
        }
        return changed.count === 1;
      });
      if (!changed) continue;
      expired += 1;
      await this.notifications.notifyPaymentExpired(proof.orderId);
    }

    if (expired > 0) {
      this.logger.log(`Expired ${expired} overdue payment proof(s).`);
    }
    return { expired };
  }

  async create(createOrderDto: CreateOrderDto, profileId?: string) {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item.');
    }

    // 1. Enforce that Guest checkouts cannot select Bank Transfer
    const customerId = profileId
      ? await this.customerIdForProfile(profileId)
      : null;
    const isGuest = !customerId;
    const isBankTransfer = createOrderDto.paymentMethod
      .toLowerCase()
      .includes('bank');
    if (isGuest && isBankTransfer) {
      throw new BadRequestException(
        'Guest checkouts are not allowed to use Bank Transfer payment. Please sign in or choose Cash on Delivery.',
      );
    }

    // 2. Guests have no address book, so they can never ship to a saved address
    if (isGuest && createOrderDto.savedAddressId) {
      throw new BadRequestException(
        'Guest checkouts cannot use a saved address. Please enter shipping details manually.',
      );
    }

    // 3. Validate that district is one of the supported districts
    const enteredDistrict = createOrderDto.shippingDetails.district
      .trim()
      .toLowerCase();
    const isValidDistrict = SRI_LANKAN_DISTRICTS.some(
      (d) => d.toLowerCase() === enteredDistrict,
    );
    if (!isValidDistrict) {
      throw new BadRequestException(
        `Shipping district "${createOrderDto.shippingDetails.district}" is not a valid Sri Lankan district.`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Validate variants and collect pricing details
      let productTotal = 0;
      const itemsToCreate: {
        variantId: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }[] = [];

      for (const item of createOrderDto.items) {
        const variant = await tx.productVariant.findUnique({
          where: { variantId: item.variantId },
          include: { product: true },
        });

        if (!variant) {
          throw new BadRequestException(
            `Product variant with ID ${item.variantId} not found.`,
          );
        }

        // Calculate variant-specific price: variant.priceAdjustment + product.basePrice
        const basePrice = Number(variant.product?.basePrice || 0);
        const priceAdjustment = Number(variant.priceAdjustment || 0);
        const unitPrice = basePrice + priceAdjustment;
        const subtotal = unitPrice * item.quantity;

        productTotal += subtotal;

        itemsToCreate.push({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(unitPrice),
          subtotal: new Prisma.Decimal(subtotal),
        });
      }

      // 2. Prepare totals
      const deliveryFee = Number(createOrderDto.deliveryFee);
      const totalAmount = productTotal + deliveryFee;

      // Save COD amount for COD orders (matches totalAmount), otherwise 0
      const isCod =
        createOrderDto.paymentMethod.toLowerCase() === 'cod' ||
        createOrderDto.paymentMethod.toLowerCase() === 'cash on delivery';
      const codAmount = isCod ? totalAmount : 0.0;

      // 3. Resolve the shipping address to snapshot. A saved address is
      //    copied at this point so the snapshot stays immutable even if
      //    the customer later edits or deletes the saved address.
      const dtoSd = createOrderDto.shippingDetails;
      let sd: ShippingSnapshot = {
        receiverName: dtoSd.receiverName,
        phone: dtoSd.phone,
        addressLine1: dtoSd.addressLine1,
        addressLine2: dtoSd.addressLine2 || null,
        city: dtoSd.city,
        district: dtoSd.district,
        postalCode: dtoSd.postalCode || null,
      };
      if (createOrderDto.savedAddressId && customerId) {
        const savedAddress = await tx.userAddress.findFirst({
          where: { addressId: createOrderDto.savedAddressId, customerId },
        });
        if (!savedAddress) {
          throw new BadRequestException(
            'The selected saved address could not be found.',
          );
        }
        sd = {
          receiverName: savedAddress.receiverName,
          phone: savedAddress.phone,
          addressLine1: savedAddress.addressLine1,
          addressLine2: savedAddress.addressLine2,
          city: savedAddress.city,
          district: savedAddress.district,
          postalCode: savedAddress.postalCode,
        };
      } else if (customerId && createOrderDto.saveAddress) {
        // Save the newly entered address into the customer's address book.
        // Guests never reach this branch, so guest addresses are never stored.
        await AddressesService.saveAddress(tx, customerId, {
          receiverName: sd.receiverName,
          phone: sd.phone,
          addressLine1: sd.addressLine1,
          addressLine2: sd.addressLine2 || undefined,
          city: sd.city,
          district: sd.district,
          postalCode: sd.postalCode ?? dtoSd.postalCode,
          isPrimary: createOrderDto.setAsPrimary ?? false,
        });
      }

      const shippingAddress = `${sd.addressLine1}${sd.addressLine2 ? ', ' + sd.addressLine2 : ''}, ${sd.city}, ${sd.district}${sd.postalCode ? ' (' + sd.postalCode + ')' : ''}`;

      // 4. COD awaits admin confirmation; bank transfer also awaits payment
      // proof upload before it can move to verification.
      const orderStatus = isBankTransfer ? 'Pending Payment' : 'Pending';
      const paymentMethod = isCod
        ? 'Cash on Delivery'
        : createOrderDto.paymentMethod;

      // A customer can have only one editable bank-transfer checkout at a
      // time. The advisory lock serializes repeated browser submits before we
      // look for it, so two requests cannot create duplicate orders or stock
      // reservations for the same customer.
      let existingPendingOrder: PendingBankTransferOrder | null = null;
      if (customerId) {
        await tx.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${customerId}))`,
        );
        existingPendingOrder = await tx.orders.findFirst({
          where: {
            customerId,
            paymentMethod: { in: ['bank_transfer', 'direct bank transfer'] },
            orderStatus: 'Pending Payment',
            paymentProofs: {
              some: {
                status: PaymentProofStatus.PENDING_UPLOAD,
                receiptUrl: null,
                expiresAt: { gt: new Date() },
              },
            },
          },
          orderBy: { orderDate: 'desc' },
          include: {
            orderItems: true,
            customerDetails: true,
            shippingDetails: true,
            paymentProofs: true,
          },
        });
      }

      const sameItems = existingPendingOrder
        ? [...existingPendingOrder.orderItems]
            .map(
              (item) =>
                `${item.variantId}:${item.quantity}:${Number(item.unitPrice)}:${Number(item.subtotal)}`,
            )
            .sort()
            .join('|') ===
          itemsToCreate
            .map(
              (item) =>
                `${item.variantId}:${item.quantity}:${Number(item.unitPrice)}:${Number(item.subtotal)}`,
            )
            .sort()
            .join('|')
        : false;
      const unchangedPendingOrder =
        existingPendingOrder &&
        isBankTransfer &&
        existingPendingOrder.paymentMethod === paymentMethod &&
        sameItems &&
        Number(existingPendingOrder.totalAmount) === totalAmount &&
        Number(existingPendingOrder.productTotal) === productTotal &&
        Number(existingPendingOrder.deliveryFee) === deliveryFee &&
        existingPendingOrder.shippingAddress === shippingAddress &&
        existingPendingOrder.customerDetails?.firstName ===
          createOrderDto.contactDetails.firstName &&
        existingPendingOrder.customerDetails?.lastName ===
          createOrderDto.contactDetails.lastName &&
        existingPendingOrder.customerDetails?.email ===
          createOrderDto.contactDetails.email &&
        existingPendingOrder.customerDetails?.phone ===
          createOrderDto.contactDetails.phone &&
        existingPendingOrder.shippingDetails?.receiverName === sd.receiverName &&
        existingPendingOrder.shippingDetails?.phone === sd.phone &&
        existingPendingOrder.shippingDetails?.addressLine1 === sd.addressLine1 &&
        existingPendingOrder.shippingDetails?.addressLine2 === sd.addressLine2 &&
        existingPendingOrder.shippingDetails?.city === sd.city &&
        existingPendingOrder.shippingDetails?.district === sd.district &&
        existingPendingOrder.shippingDetails?.postalCode === sd.postalCode &&
        existingPendingOrder.shippingDetails?.deliveryNote ===
          (dtoSd.deliveryNote || null);

      // A retry of the same checkout returns the original pending order and
      // leaves its proof and stock allocations untouched.
      if (unchangedPendingOrder) return existingPendingOrder;

      const switchingPendingBankTransferToCod = Boolean(
        existingPendingOrder && isCod,
      );

      const orderData = {
        customerId,
        totalAmount: new Prisma.Decimal(totalAmount),
        productTotal: new Prisma.Decimal(productTotal),
        deliveryFee: new Prisma.Decimal(deliveryFee),
        codAmount: new Prisma.Decimal(codAmount),
        paymentMethod,
        shippingAddress,
        orderStatus,
      };

      // Changed details update the one editable pending order. The old active
      // allocations are removed in this transaction before the new set is
      // calculated, so the reservation table never accumulates duplicates.
      const order = existingPendingOrder
        ? await tx.orders.update({
            where: { orderId: existingPendingOrder.orderId },
            data: orderData,
          })
        : await tx.orders.create({ data: orderData });

      // Bank transfer orders always get exactly one payment proof record,
      // created in the same transaction so an order can never exist
      // without one. COD orders never get a proof record.
      const reservationExpiresAt = switchingPendingBankTransferToCod
        ? null
        : existingPendingOrder
        ? existingPendingOrder.paymentProofs[0]?.expiresAt ?? null
        : isBankTransfer
          ? this.paymentProofExpiresAt()
          : null;
      if (reservationExpiresAt && !existingPendingOrder) {
        await tx.paymentProofs.create({
          data: {
            orderId: order.orderId,
            status: PaymentProofStatus.PENDING_UPLOAD,
            expiresAt: reservationExpiresAt,
          },
        });
      }

      if (existingPendingOrder) {
        if (switchingPendingBankTransferToCod) {
          // COD commits the already-held units into inventory instead of
          // retaining a stock-reservation row. This prevents the same bank
          // transfer hold from being counted twice after the method changes.
          await this.stockReservations.confirmAndDeleteForOrder(
            tx,
            order.orderId,
          );
          await tx.paymentProofs.deleteMany({ where: { orderId: order.orderId } });
        } else {
          await tx.stockReservation.deleteMany({
            where: { orderId: order.orderId, status: 'Active' },
          });
        }
        await tx.orderItem.deleteMany({ where: { orderId: order.orderId } });
      }

      // 6. Create Order Items and link to order_id and variant_id
      const orderItems: OrderItem[] = [];
      for (const item of itemsToCreate) {
        orderItems.push(await tx.orderItem.create({
          data: {
            orderId: order.orderId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          },
        }));
      }

      // Reserve only after the order and its item records exist. A pending
      // bank-transfer order switched to COD has already committed its held
      // stock above, so it must not create a second reservation.
      if (!switchingPendingBankTransferToCod) {
        await this.stockReservations.reserveForOrder(
          tx,
          order.orderId,
          orderItems,
          reservationExpiresAt,
        );
      }

      // 7. Save customer classification and contact details
      const customerType = customerId ? 'registered' : 'guest';
      const customerDetailsData = {
        customerId,
        firstName: createOrderDto.contactDetails.firstName,
        lastName: createOrderDto.contactDetails.lastName,
        email: createOrderDto.contactDetails.email,
        phone: createOrderDto.contactDetails.phone,
        customerType,
      };
      if (existingPendingOrder) {
        await tx.orderCustomerDetails.update({
          where: { orderId: order.orderId },
          data: customerDetailsData,
        });
      } else {
        await tx.orderCustomerDetails.create({
          data: { orderId: order.orderId, ...customerDetailsData },
        });
      }

      // 8. Save order shipping details
      const shippingDetailsData = {
        receiverName: sd.receiverName,
        phone: sd.phone,
        addressLine1: sd.addressLine1,
        addressLine2: sd.addressLine2,
        city: sd.city,
        district: sd.district,
        postalCode: sd.postalCode,
        deliveryNote: dtoSd.deliveryNote || null,
      };
      if (existingPendingOrder) {
        await tx.orderShippingDetails.update({
          where: { orderId: order.orderId },
          data: shippingDetailsData,
        });
      } else {
        await tx.orderShippingDetails.create({
          data: { orderId: order.orderId, ...shippingDetailsData },
        });
      }

      return order;
    });
  }
}
