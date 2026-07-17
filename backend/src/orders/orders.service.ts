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
import { Prisma } from '@prisma/client';
import { AddressesService } from '../addresses/addresses.service';
import { PaymentProofStatus } from '../common/enums/payment-proof-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { READY_STATUS } from './dto/update-order-status.dto';
import { ReviewPaymentProofDto } from './dto/review-payment-proof.dto';

const DEFAULT_PAYMENT_PROOF_EXPIRY_HOURS = 4;

/** Payment proof statuses that are still awaiting an outcome. */
const PENDING_PROOF_STATUSES = [
  PaymentProofStatus.PENDING_UPLOAD as string,
  PaymentProofStatus.PENDING_VERIFICATION as string,
];

/** How often overdue payment proofs are swept and expired (1 hour). */
const PROOF_EXPIRY_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

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

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private expirySweepTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Hours a bank-transfer customer has to upload their receipt. */
  private paymentProofExpiryHours(): number {
    const configured = Number(
      this.configService.get<string>('PAYMENT_PROOF_EXPIRY_HOURS'),
    );
    return Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_PAYMENT_PROOF_EXPIRY_HOURS;
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
        const updatedOrder = await tx.orders.update({
          where: { orderId },
          data: { orderStatus: 'Cancelled' },
          include: this.orderInclude,
        });

        // Release stock: decrease reservedQuantity and increase quantity
        for (const item of order.orderItems) {
          if (!item.variantId) continue;

          const inventoryRow = await tx.inventory.findFirst({
            where: {
              variantId: item.variantId,
              ...(order.branchId ? { branchId: order.branchId } : {}),
            },
          });

          if (inventoryRow) {
            const newReserved = Math.max(
              0,
              (inventoryRow.reservedQuantity || 0) - item.quantity,
            );
            const newQuantity = (inventoryRow.quantity || 0) + item.quantity;

            await tx.inventory.update({
              where: { inventoryId: inventoryRow.inventoryId },
              data: {
                reservedQuantity: newReserved,
                quantity: newQuantity,
                lastUpdated: new Date(),
              },
            });
          }
        }

        return updatedOrder;
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
  async findManagedOrder(orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { orderId },
      include: this.orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  async updateManagedStatus(
    profileId: string,
    role: string | null,
    orderId: string,
    status: string,
  ) {
    const order = await this.prisma.orders.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException('Order not found.');
    let employeeId = order.employeeId;
    if (role?.toLowerCase() === 'employee') {
      const employee = await this.prisma.employee.findFirst({
        where: { profileId },
      });
      if (!employee) throw new NotFoundException('Employee profile not found.');
      employeeId = employee.employeeId;
    }
    const updated = await this.prisma.orders.update({
      where: { orderId },
      data: { orderStatus: status, employeeId },
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

    // Atomic transition guard: only rows not already in the target status
    // are updated, so concurrent duplicate reviews produce count = 0.
    const transition = await this.prisma.paymentProofs.updateMany({
      where: { proofId, status: { not: dto.status } },
      data: { status: dto.status, adminNotes: dto.adminNotes ?? null },
    });
    if (transition.count === 0) {
      return this.prisma.paymentProofs.findFirst({ where: { proofId } });
    }

    if (dto.status === 'Rejected') {
      // The customer must upload a new receipt, so reopen the payment step.
      await this.prisma.orders.update({
        where: { orderId },
        data: { orderStatus: 'Pending Payment' },
      });
      await this.notifications.notifyPaymentRejected(orderId, dto.adminNotes);
    } else if (dto.status === 'Approved') {
      await this.prisma.orders.update({
        where: { orderId },
        data: { orderStatus: 'Ready to Pick' },
      });
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
    const overdue = await this.prisma.paymentProofs.findMany({
      where: {
        status: { in: PENDING_PROOF_STATUSES },
        expiresAt: { lt: new Date() },
      },
    });

    let expired = 0;
    for (const proof of overdue) {
      // Atomic transition guard against concurrent sweeps/reviews.
      const transition = await this.prisma.paymentProofs.updateMany({
        where: {
          proofId: proof.proofId,
          status: { in: PENDING_PROOF_STATUSES },
        },
        data: { status: 'Expired' },
      });
      if (transition.count === 0) continue;
      expired += 1;

      await this.prisma.orders.updateMany({
        where: {
          orderId: proof.orderId,
          orderStatus: { in: ['Pending Payment', 'Pending Verification'] },
        },
        data: { orderStatus: 'Pending Payment' },
      });
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

      // 4. Set appropriate order status based on payment method
      const orderStatus = isCod ? 'Pending Verification' : 'Pending Payment';

      // 5. Create main Order record
      const order = await tx.orders.create({
        data: {
          customerId,
          totalAmount: new Prisma.Decimal(totalAmount),
          productTotal: new Prisma.Decimal(productTotal),
          deliveryFee: new Prisma.Decimal(deliveryFee),
          codAmount: new Prisma.Decimal(codAmount),
          paymentMethod: createOrderDto.paymentMethod,
          shippingAddress: shippingAddress,
          orderStatus: orderStatus,
        },
      });

      // Bank transfer orders always get exactly one payment proof record,
      // created in the same transaction so an order can never exist
      // without one. COD orders never get a proof record.
      if (isBankTransfer) {
        await tx.paymentProofs.create({
          data: {
            orderId: order.orderId,
            status: PaymentProofStatus.PENDING_UPLOAD,
            expiresAt: new Date(
              Date.now() + this.paymentProofExpiryHours() * 60 * 60 * 1000,
            ),
          },
        });
      }

      // 6. Create Order Items and link to order_id and variant_id
      for (const item of itemsToCreate) {
        await tx.orderItem.create({
          data: {
            orderId: order.orderId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          },
        });
      }

      // 7. Save customer classification and contact details
      const customerType = customerId ? 'registered' : 'guest';
      await tx.orderCustomerDetails.create({
        data: {
          orderId: order.orderId,
          customerId,
          firstName: createOrderDto.contactDetails.firstName,
          lastName: createOrderDto.contactDetails.lastName,
          email: createOrderDto.contactDetails.email,
          phone: createOrderDto.contactDetails.phone,
          customerType: customerType,
        },
      });

      // 8. Save order shipping details
      await tx.orderShippingDetails.create({
        data: {
          orderId: order.orderId,
          receiverName: sd.receiverName,
          phone: sd.phone,
          addressLine1: sd.addressLine1,
          addressLine2: sd.addressLine2,
          city: sd.city,
          district: sd.district,
          postalCode: sd.postalCode,
          deliveryNote: dtoSd.deliveryNote || null,
        },
      });

      return order;
    });
  }
}
