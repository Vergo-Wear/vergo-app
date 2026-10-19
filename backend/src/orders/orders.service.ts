import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderItem, Prisma } from '@prisma/client';
import { AddressesService } from '../addresses/addresses.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockReservationService } from '../stock-reservation/stock-reservation.service';
import { CreateOrderDto, SRI_LANKAN_DISTRICTS } from './dto/create-order.dto';
import { ReviewPaymentProofDto } from './dto/review-payment-proof.dto';
import { READY_STATUS } from './dto/update-order-status.dto';
import { DeliveryFeesService } from '../delivery-fees/delivery-fees.service';

const BANK_TRANSFER_HOLD_MINUTES = 15;
const PROOF_EXPIRY_SWEEP_INTERVAL_MS = 60 * 1000;
const PROOF_EXPIRY_SWEEP_MAX_ATTEMPTS = 3;
const PROOF_EXPIRY_SWEEP_RETRY_DELAY_MS = 2 * 1000;
const OPEN_CHECKOUT_STATUSES = [
  'Awaiting Payment',
  'Pending Confirmation',
  'Pending Verification',
];
const EMPLOYEE_PROCESSING_STATUSES = [
  'Ready to Process',
  'Admin Approved',
  'Processing',
  'Paid',
  'Pending Verification',
  'Order Placed',
  'Claimed',
  'Preparing',
  'Package Prepared',
  'Ready for Pickup',
  'Ready for Courier Pickup',
  'Handed to Citypak Courier',
  'Sent',
  'Returned',
  'Finished',
  'Delivered',
  'Completed',
];
const EMPLOYEE_CLAIMABLE_STATUSES = [
  'Ready to Process',
  'Admin Approved',
  'Processing',
  'Paid',
  'Pending Verification',
  'Order Placed',
];
const ALL_STATUSES = [
  'Ready to Process',
  'Admin Approved',
  'Processing',
  'Paid',
  'Pending Verification',
  'Order Placed',
  'Claimed',
  'Preparing',
  'Package Preparing',
  'Package Prepared',
  'Ready for Pickup',
  'Ready for Courier Pickup',
  'Handed to Courier',
  'Handed to Citypak Courier',
  'Sent',
  'Returned',
  'Finished',
  'Delivered',
  'Cancelled',
  'Completed',
];
const EMPLOYEE_STATUS_TRANSITIONS: Record<string, string[]> = {
  'Order Placed': ALL_STATUSES,
  'Admin Approved': ALL_STATUSES,
  'Ready to Process': ALL_STATUSES,
  'Paid': ALL_STATUSES,
  'Processing': ALL_STATUSES,
  'Pending Verification': ALL_STATUSES,
  'Claimed': ALL_STATUSES,
  'Preparing': ALL_STATUSES,
  'Package Preparing': ALL_STATUSES,
  'Package Prepared': ALL_STATUSES,
  'Ready for Pickup': ALL_STATUSES,
  'Ready for Courier Pickup': ALL_STATUSES,
  'Handed to Courier': ALL_STATUSES,
  'Handed to Citypak Courier': ALL_STATUSES,
  'Sent': ALL_STATUSES,
  'Returned': ALL_STATUSES,
  'Finished': ALL_STATUSES,
  'Delivered': ALL_STATUSES,
  'Completed': ALL_STATUSES,
};

interface ShippingSnapshot {
  receiverName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  postalCode: string | null;
  deliveryNote: string | null;
}

interface PreparedCheckout {
  items: {
    variantId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    subtotal: Prisma.Decimal;
  }[];
  productTotal: number;
  deliveryFee: number;
  totalAmount: number;
  shipping: ShippingSnapshot;
}

interface StockCheckItem {
  variantId: string;
  quantity: number;
  variant?: { sku?: string | null } | null;
}

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private expirySweepTimer: NodeJS.Timeout | null = null;
  private expirySweepInFlight = false;

  constructor(
    private readonly prisma: PrismaService,
    // Retained in the constructor because ConfigModule owns runtime settings
    // used by this module and existing tests construct the service this way.
    private readonly configService: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly stockReservations: StockReservationService,
    private readonly deliveryFeesService: DeliveryFeesService,
  ) {
    void this.configService;
  }

  private readonly checkoutInclude = {
    items: {
      include: {
        variant: { include: { product: true, color: true, size: true, images: true } },
      },
      orderBy: { checkoutItemId: 'asc' as const },
    },
    customerDetails: true,
    shippingDetails: true,
    paymentProof: true,
    reservations: { orderBy: { reservationId: 'asc' as const } },
  } as const;

  private readonly orderInclude = {
    orderItems: {
      include: {
        variant: { include: { product: true, color: true, size: true, images: true } },
      },
    },
    customerDetails: true,
    shippingDetails: true,
    checkout: { include: { paymentProof: true } },
    assignedEmployee: {
      select: {
        employeeId: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    },
  } as const;

  onModuleInit() {
    const sweep = () => void this.runPaymentProofExpirySweep();
    sweep();
    this.expirySweepTimer = setInterval(sweep, PROOF_EXPIRY_SWEEP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.expirySweepTimer) clearInterval(this.expirySweepTimer);
  }

  private paymentProofExpiresAt() {
    return new Date(Date.now() + BANK_TRANSFER_HOLD_MINUTES * 60 * 1000);
  }

  private isTransientDatabaseConnectionError(error: unknown): boolean {
    let current: unknown = error;
    for (let depth = 0; depth < 5 && current; depth += 1) {
      const candidate = current as {
        message?: unknown;
        code?: unknown;
        cause?: unknown;
      };
      const message =
        typeof candidate.message === 'string'
          ? candidate.message.toLowerCase()
          : '';
      const code =
        typeof candidate.code === 'string' ? candidate.code.toUpperCase() : '';
      if (
        message.includes('connection timeout') ||
        message.includes('connection terminated unexpectedly') ||
        message.includes('timeout expired') ||
        message.includes('transaction already closed') ||
        message.includes('expired transaction') ||
        ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH', 'P2028'].includes(code)
      ) {
        return true;
      }
      current = candidate.cause;
    }
    return false;
  }

  private async runPaymentProofExpirySweep() {
    if (this.expirySweepInFlight) return;
    this.expirySweepInFlight = true;
    try {
      for (
        let attempt = 1;
        attempt <= PROOF_EXPIRY_SWEEP_MAX_ATTEMPTS;
        attempt += 1
      ) {
        try {
          await this.expireOverduePaymentProofs();
          return;
        } catch (error) {
          const canRetry =
            attempt < PROOF_EXPIRY_SWEEP_MAX_ATTEMPTS &&
            this.isTransientDatabaseConnectionError(error);
          if (!canRetry) {
            this.logger.error('Payment proof expiry sweep failed', error);
            return;
          }
          this.logger.warn(
            `Payment proof expiry sweep connection attempt ${attempt} failed; retrying.`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, PROOF_EXPIRY_SWEEP_RETRY_DELAY_MS * attempt),
          );
        }
      }
    } finally {
      this.expirySweepInFlight = false;
    }
  }

  private async customerIdForProfile(profileId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { profileId },
      select: { customerId: true },
    });
    if (!customer) throw new NotFoundException('Customer profile not found.');
    return customer.customerId;
  }

  private checkoutDto(checkout: any): CreateOrderDto {
    const details = checkout.customerDetails;
    const shipping = checkout.shippingDetails;
    return {
      paymentMethod: checkout.paymentMethod.toLowerCase().includes('bank')
        ? 'bank_transfer'
        : 'cod',
      deliveryFee: Number(checkout.deliveryFee),
      contactDetails: {
        firstName: details?.firstName ?? '',
        lastName: details?.lastName ?? '',
        email: details?.email ?? '',
        phone: details?.phone ?? '',
      },
      shippingDetails: {
        receiverName: shipping?.receiverName ?? '',
        phone: shipping?.phone ?? '',
        addressLine1: shipping?.addressLine1 ?? '',
        addressLine2: shipping?.addressLine2 ?? undefined,
        city: shipping?.city ?? '',
        district: shipping?.district ?? '',
        postalCode: shipping?.postalCode ?? '',
        deliveryNote: shipping?.deliveryNote ?? undefined,
      },
      items: (checkout.items ?? []).map((item: any) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    };
  }

  private checkoutTotals(checkout: any) {
    const productTotal = (checkout.items ?? []).reduce(
      (sum: number, item: any) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );
    const deliveryFee = Number(checkout.deliveryFee);
    return {
      productTotal,
      deliveryFee,
      totalAmount: productTotal + deliveryFee,
    };
  }

  private presentCheckout(checkout: any) {
    const totals = this.checkoutTotals(checkout);
    const proof = checkout.paymentProof;
    const paymentProofObj = proof
      ? {
          ...proof,
          receiptUrl: proof.fileUrl,
        }
      : null;
    return {
      ...checkout,
      ...totals,
      checkoutPayload: this.checkoutDto(checkout),
      paymentProof: paymentProofObj,
      receiptUrl: checkout.paymentProof?.fileUrl ?? null,
      receiptUploadedAt: checkout.paymentProof?.uploadedAt ?? null,
      // Compatibility alias: the checkout is now the reservation owner.
      reservationId: checkout.checkoutId,
    };
  }

  private presentOrder(order: any) {
    const shipping = order.shippingDetails;
    const shippingAddress = shipping
      ? `${shipping.addressLine1}${shipping.addressLine2 ? `, ${shipping.addressLine2}` : ''}, ${shipping.city}, ${shipping.district}${shipping.postalCode ? ` (${shipping.postalCode})` : ''}`
      : '';
    const proof = order.checkout?.paymentProof;
    return {
      ...order,
      shippingAddress,
      confirmationStatus: 'Approved',
      confirmedAt: order.checkout?.reviewedAt ?? order.orderDate,
      confirmedBy: order.checkout?.reviewedByProfileId ?? null,
      rejectionReason: null,
      codAmount: order.paymentMethod.toLowerCase().includes('cash')
        ? order.totalAmount
        : new Prisma.Decimal(0),
      paymentProofs: proof
        ? [
            {
              ...proof,
              receiptUrl: proof.fileUrl,
              orderId: order.orderId,
              expiresAt: order.checkout.expiresAt,
              status: proof.status,
              adminNotes: order.checkout.adminNotes,
            },
          ]
        : [],
    };
  }

  private presentPendingCheckoutOrder(checkout: any) {
    const presented = this.presentCheckout(checkout);
    const shipping = checkout.shippingDetails;
    const shippingAddress = shipping
      ? `${shipping.addressLine1}${shipping.addressLine2 ? `, ${shipping.addressLine2}` : ''}, ${shipping.city}, ${shipping.district}${shipping.postalCode ? ` (${shipping.postalCode})` : ''}`
      : '';
    const proof = checkout.paymentProof;
    return {
      ...presented,
      orderId: checkout.checkoutId,
      customerId: checkout.customerId,
      employeeId: null,
      branchId: null,
      orderDate: checkout.createdAt,
      orderStatus: checkout.status,
      shippingAddress,
      confirmationStatus: checkout.status,
      confirmedAt: checkout.reviewedAt,
      confirmedBy: checkout.reviewedByProfileId,
      rejectionReason: checkout.adminNotes,
      pendingCheckout: true as const,
      orderItems: checkout.items.map((item: any) => ({
        orderItemId: item.checkoutItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: new Prisma.Decimal(item.unitPrice).mul(item.quantity),
        variant: item.variant,
      })),
      paymentProofs: proof
        ? [
            {
              ...proof,
              proofId: proof.paymentProofId,
              receiptUrl: proof.fileUrl,
              expiresAt: checkout.expiresAt,
              adminNotes: checkout.adminNotes,
            },
          ]
        : [],
    };
  }

  private async loadCheckout(tx: Prisma.TransactionClient, checkoutId: string) {
    return tx.pendingCheckout.findUnique({
      where: { checkoutId },
      include: this.checkoutInclude,
    });
  }

  private validateCheckout(dto: CreateOrderDto, customerId: string | null) {
    if (!dto.items?.length)
      throw new BadRequestException('Order must contain at least one item.');
    if (!customerId && dto.savedAddressId) {
      throw new BadRequestException(
        'Guest checkouts cannot use a saved address. Please enter shipping details manually.',
      );
    }
    const district = dto.shippingDetails.district.trim().toLowerCase();
    if (
      !SRI_LANKAN_DISTRICTS.some((value) => value.toLowerCase() === district)
    ) {
      throw new BadRequestException(
        `Shipping district "${dto.shippingDetails.district}" is not a valid Sri Lankan district.`,
      );
    }
  }

  private async prepareCheckout(
    tx: Prisma.TransactionClient,
    dto: CreateOrderDto,
    customerId: string | null,
    persistSavedAddress: boolean,
  ): Promise<PreparedCheckout> {
    const grouped = new Map<string, number>();
    for (const item of dto.items) {
      grouped.set(
        item.variantId,
        (grouped.get(item.variantId) ?? 0) + item.quantity,
      );
    }
    const items: PreparedCheckout['items'] = [];
    let productTotal = 0;
    for (const [variantId, quantity] of grouped) {
      const variant = await tx.productVariant.findUnique({
        where: { variantId },
        include: { product: true },
      });
      if (!variant?.product) {
        throw new BadRequestException(
          `Product variant with ID ${variantId} not found.`,
        );
      }
      const unitPrice =
        Number(variant.product.basePrice) +
        Number(variant.priceAdjustment ?? 0);
      productTotal += unitPrice * quantity;
      items.push({
        variantId,
        quantity,
        unitPrice: new Prisma.Decimal(unitPrice),
        subtotal: new Prisma.Decimal(unitPrice * quantity),
      });
    }

    const entered = dto.shippingDetails;
    let shipping: ShippingSnapshot = {
      receiverName: entered.receiverName,
      phone: entered.phone,
      addressLine1: entered.addressLine1,
      addressLine2: entered.addressLine2 || null,
      city: entered.city,
      district: entered.district,
      postalCode: entered.postalCode || null,
      deliveryNote: entered.deliveryNote || null,
    };
    if (dto.savedAddressId && customerId) {
      const saved = await tx.userAddress.findFirst({
        where: { addressId: dto.savedAddressId, customerId },
      });
      if (!saved)
        throw new BadRequestException(
          'The selected saved address could not be found.',
        );
      shipping = {
        receiverName: saved.receiverName,
        phone: saved.phone,
        addressLine1: saved.addressLine1,
        addressLine2: saved.addressLine2,
        city: saved.city,
        district: saved.district,
        postalCode: saved.postalCode,
        deliveryNote: entered.deliveryNote || null,
      };
    } else if (customerId && dto.saveAddress && persistSavedAddress) {
      await AddressesService.saveAddress(tx, customerId, {
        receiverName: shipping.receiverName,
        phone: shipping.phone,
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2 || undefined,
        city: shipping.city,
        district: shipping.district,
        postalCode: shipping.postalCode || entered.postalCode,
        isPrimary: dto.setAsPrimary ?? false,
      });
    }
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const deliveryCalc = await this.deliveryFeesService.calculateDeliveryFee(
      shipping.district,
      totalQuantity,
    );
    const deliveryFee = deliveryCalc.totalDeliveryFee;
    return {
      items,
      shipping,
      productTotal,
      deliveryFee,
      totalAmount: productTotal + deliveryFee,
    };
  }

  private async writeCheckoutDetails(
    tx: Prisma.TransactionClient,
    checkoutId: string,
    dto: CreateOrderDto,
    prepared: PreparedCheckout,
  ) {
    await tx.pendingCheckoutItem.deleteMany({ where: { checkoutId } });
    await tx.pendingCheckoutItem.createMany({
      data: prepared.items.map((item) => ({
        checkoutId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
    await tx.pendingCheckoutCustomerDetails.upsert({
      where: { checkoutId },
      create: { checkoutId, ...dto.contactDetails },
      update: { ...dto.contactDetails },
    });
    await tx.pendingCheckoutShippingDetails.upsert({
      where: { checkoutId },
      create: { checkoutId, ...prepared.shipping },
      update: { ...prepared.shipping },
    });
    await tx.pendingCheckout.update({
      where: { checkoutId },
      data: {
        productTotal: new Prisma.Decimal(prepared.productTotal),
        deliveryFee: new Prisma.Decimal(prepared.deliveryFee),
        totalAmount: new Prisma.Decimal(prepared.totalAmount),
      },
    });
  }

  private async persistOrder(tx: Prisma.TransactionClient, checkout: any) {
    if (
      !checkout.customerDetails ||
      !checkout.shippingDetails ||
      !checkout.items?.length
    ) {
      throw new ConflictException('The pending checkout is incomplete.');
    }
    const totals = this.checkoutTotals(checkout);
    const order = await tx.orders.create({
      data: {
        checkoutId: checkout.checkoutId,
        customerId: checkout.customerId,
        totalAmount: new Prisma.Decimal(totals.totalAmount),
        productTotal: new Prisma.Decimal(totals.productTotal),
        deliveryFee: new Prisma.Decimal(totals.deliveryFee),
        paymentMethod: checkout.paymentMethod,
        orderStatus: 'Admin Approved',
      },
    });
    const orderItems: OrderItem[] = [];
    for (const item of checkout.items) {
      orderItems.push(
        await tx.orderItem.create({
          data: {
            orderId: order.orderId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: new Prisma.Decimal(item.unitPrice).mul(item.quantity),
          },
        }),
      );
    }
    await tx.orderCustomerDetails.create({
      data: {
        orderId: order.orderId,
        firstName: checkout.customerDetails.firstName,
        lastName: checkout.customerDetails.lastName,
        email: checkout.customerDetails.email,
        phone: checkout.customerDetails.phone,
      },
    });
    await tx.orderShippingDetails.create({
      data: {
        orderId: order.orderId,
        receiverName: checkout.shippingDetails.receiverName,
        phone: checkout.shippingDetails.phone,
        addressLine1: checkout.shippingDetails.addressLine1,
        addressLine2: checkout.shippingDetails.addressLine2,
        city: checkout.shippingDetails.city,
        district: checkout.shippingDetails.district,
        postalCode: checkout.shippingDetails.postalCode,
        deliveryNote: checkout.shippingDetails.deliveryNote,
      },
    });
    return { order, orderItems };
  }

  async create(dto: CreateOrderDto, profileId?: string) {
    const customerId = profileId
      ? await this.customerIdForProfile(profileId)
      : null;
    const isBank = dto.paymentMethod.toLowerCase().includes('bank');
    if (!customerId && isBank) {
      throw new BadRequestException(
        'Guest checkouts are not allowed to use Bank Transfer payment. Please sign in or choose Cash on Delivery.',
      );
    }
    this.validateCheckout(dto, customerId);

    const checkoutId = await this.prisma.$transaction(async (tx) => {
      if (customerId)
        await this.stockReservations.lockCustomerCheckout(tx, customerId);
      const existing = customerId
        ? await tx.pendingCheckout.findFirst({
            where: {
              customerId,
              paymentMethod: 'Bank Transfer',
              status: 'Awaiting Payment',
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          })
        : null;
      const prepared = await this.prepareCheckout(
        tx,
        dto,
        customerId,
        !existing,
      );

      if (existing) {
        await this.writeCheckoutDetails(tx, existing.checkoutId, dto, prepared);
        if (isBank) {
          await this.stockReservations.reserveForCheckout(
            tx,
            existing.checkoutId,
            dto.items,
            existing.expiresAt!,
            true,
          );
          await tx.pendingCheckout.update({
            where: { checkoutId: existing.checkoutId },
            data: { deliveryFee: new Prisma.Decimal(prepared.deliveryFee) },
          });
        } else {
          await this.stockReservations.reserveForCheckout(
            tx,
            existing.checkoutId,
            dto.items,
            null,
            true,
          );
          await tx.paymentProof.deleteMany({
            where: { checkoutId: existing.checkoutId },
          });
          await tx.pendingCheckout.update({
            where: { checkoutId: existing.checkoutId },
            data: {
              paymentMethod: 'Cash on Delivery',
              status: 'Pending Confirmation',
              deliveryFee: new Prisma.Decimal(prepared.deliveryFee),
              expiresAt: null,
            },
          });
          if (customerId) {
            const cart = await tx.cart.findUnique({ where: { customerId } });
            if (cart) {
              await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });
            }
          }
        }
        return existing.checkoutId;
      }

      const expiresAt = isBank ? this.paymentProofExpiresAt() : null;
      const checkout = await tx.pendingCheckout.create({
        data: {
          customerId,
          paymentMethod: isBank ? 'Bank Transfer' : 'Cash on Delivery',
          status: isBank ? 'Awaiting Payment' : 'Pending Confirmation',
          productTotal: new Prisma.Decimal(prepared.productTotal),
          deliveryFee: new Prisma.Decimal(prepared.deliveryFee),
          totalAmount: new Prisma.Decimal(prepared.totalAmount),
          expiresAt,
        },
      });
      await this.writeCheckoutDetails(tx, checkout.checkoutId, dto, prepared);
      await this.stockReservations.reserveForCheckout(
        tx,
        checkout.checkoutId,
        dto.items,
        expiresAt,
      );
      if (!isBank && customerId) {
        const cart = await tx.cart.findUnique({ where: { customerId } });
        if (cart)
          await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });
      }
      return checkout.checkoutId;
    });
    const created = await this.prisma.pendingCheckout.findUnique({
      where: { checkoutId },
      include: this.checkoutInclude,
    });
    if (!created) throw new NotFoundException('Pending checkout not found.');
    await this.notifications.notifyOrderCreated(checkoutId);
    return this.presentCheckout(created);
  }

  async getCurrentBankTransferReservation(profileId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    const checkout = await this.prisma.pendingCheckout.findFirst({
      where: {
        customerId,
        paymentMethod: 'Bank Transfer',
        status: 'Awaiting Payment',
        expiresAt: { gt: new Date() },
      },
      include: this.checkoutInclude,
      orderBy: { createdAt: 'desc' },
    });
    if (!checkout)
      return {
        checkoutId: null,
        reservationId: null,
        expiresAt: null,
        status: null,
      };
    return { ...this.presentCheckout(checkout), status: 'Active' };
  }

  async updateBankTransferReservation(
    profileId: string,
    checkoutId: string,
    dto: CreateOrderDto,
  ) {
    const customerId = await this.customerIdForProfile(profileId);
    if (!dto.paymentMethod.toLowerCase().includes('bank')) {
      throw new BadRequestException(
        'An active Bank Transfer checkout must use Bank Transfer payment.',
      );
    }
    this.validateCheckout(dto, customerId);
    await this.prisma.$transaction(async (tx) => {
      await this.stockReservations.lockCustomerCheckout(tx, customerId);
      const checkout = await tx.pendingCheckout.findFirst({
        where: {
          checkoutId,
          customerId,
          paymentMethod: 'Bank Transfer',
          status: 'Awaiting Payment',
          expiresAt: { gt: new Date() },
        },
      });
      if (!checkout?.expiresAt)
        throw new BadRequestException('The payment window has expired.');
      const prepared = await this.prepareCheckout(tx, dto, customerId, false);
      await this.writeCheckoutDetails(tx, checkoutId, dto, prepared);
      await this.stockReservations.reserveForCheckout(
        tx,
        checkoutId,
        dto.items,
        checkout.expiresAt,
        true,
      );
      await tx.pendingCheckout.update({
        where: { checkoutId },
        data: { deliveryFee: new Prisma.Decimal(prepared.deliveryFee) },
      });
    });
    const updated = await this.prisma.pendingCheckout.findUnique({
      where: { checkoutId },
      include: this.checkoutInclude,
    });
    if (!updated) throw new NotFoundException('Pending checkout not found.');
    return { ...this.presentCheckout(updated), status: 'Active' };
  }

  async getBankTransferReservation(profileId: string, checkoutId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    const checkout = await this.prisma.pendingCheckout.findFirst({
      where: {
        checkoutId,
        customerId,
        paymentMethod: 'Bank Transfer',
        status: { in: ['Awaiting Payment', 'Pending Verification'] },
      },
      include: this.checkoutInclude,
    });
    if (!checkout) throw new NotFoundException('Pending checkout not found.');
    return {
      ...this.presentCheckout(checkout),
      status:
        checkout.status === 'Awaiting Payment' ? 'Active' : checkout.status,
    };
  }

  async finalizeBankTransferReservation(
    profileId: string,
    checkoutId: string,
    dto: CreateOrderDto,
    receipt: {
      fileUrl: string;
      fileName?: string | null;
      mimeType?: string | null;
      fileSizeBytes?: number | null;
      storagePublicId?: string | null;
      uploadedAt: Date;
    },
  ) {
    const customerId = await this.customerIdForProfile(profileId);
    if (!dto.paymentMethod.toLowerCase().includes('bank')) {
      throw new BadRequestException(
        'A Bank Transfer reservation must use Bank Transfer payment.',
      );
    }
    this.validateCheckout(dto, customerId);
    const replacedStoragePublicId = await this.prisma.$transaction(
      async (tx) => {
        await this.stockReservations.lockCustomerCheckout(tx, customerId);
        const checkout = await tx.pendingCheckout.findFirst({
          where: {
            checkoutId,
            customerId,
            paymentMethod: 'Bank Transfer',
            status: { in: ['Awaiting Payment', 'Pending Verification'] },
          },
          include: { paymentProof: true },
        });
        if (
          !checkout?.expiresAt ||
          (checkout.status === 'Awaiting Payment' &&
            checkout.expiresAt <= receipt.uploadedAt)
        ) {
          throw new BadRequestException('The payment window has expired.');
        }
        let deliveryFee: Prisma.Decimal | undefined;
        if (checkout.status === 'Awaiting Payment') {
          const prepared = await this.prepareCheckout(
            tx,
            dto,
            customerId,
            false,
          );
          await this.writeCheckoutDetails(tx, checkoutId, dto, prepared);
          await this.stockReservations.reserveForCheckout(
            tx,
            checkoutId,
            dto.items,
            checkout.expiresAt,
            true,
          );
          await this.stockReservations.markPendingVerification(
            tx,
            checkoutId,
            receipt.uploadedAt,
          );
          deliveryFee = new Prisma.Decimal(prepared.deliveryFee);
        }
        await tx.paymentProof.upsert({
          where: { checkoutId },
          create: {
            checkoutId,
            fileUrl: receipt.fileUrl,
            fileName: receipt.fileName ?? null,
            mimeType: receipt.mimeType ?? null,
            fileSizeBytes: receipt.fileSizeBytes ?? null,
            storagePublicId: receipt.storagePublicId ?? null,
            status: 'Pending Verification',
            uploadedAt: receipt.uploadedAt,
          },
          update: {
            fileUrl: receipt.fileUrl,
            fileName: receipt.fileName ?? null,
            mimeType: receipt.mimeType ?? null,
            fileSizeBytes: receipt.fileSizeBytes ?? null,
            storagePublicId: receipt.storagePublicId ?? null,
            status: 'Pending Verification',
            reviewedByProfileId: null,
            reviewedAt: null,
            rejectionReason: null,
            uploadedAt: receipt.uploadedAt,
          },
        });
        await tx.pendingCheckout.update({
          where: { checkoutId },
          data: {
            status: 'Pending Verification',
            ...(deliveryFee && { deliveryFee }),
          },
        });
        const cart = await tx.cart.findUnique({ where: { customerId } });
        if (cart)
          await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });
        return checkout.paymentProof?.storagePublicId ?? null;
      },
    );
    const updated = await this.prisma.pendingCheckout.findUnique({
      where: { checkoutId },
      include: this.checkoutInclude,
    });
    if (!updated) throw new NotFoundException('Pending checkout not found.');
    return {
      checkout: this.presentCheckout(updated),
      replacedStoragePublicId,
    };
  }

  async findCustomerOrders(profileId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    const [orders, checkouts] = await Promise.all([
      this.prisma.orders.findMany({
        where: { customerId },
        include: this.orderInclude,
        orderBy: { orderDate: 'desc' },
      }),
      this.prisma.pendingCheckout.findMany({
        where: {
          customerId,
          order: null,
          status: {
            in: [
              'Pending Confirmation',
              'Pending Verification',
              'Rejected',
              'Cancelled',
              'Expired',
            ],
          },
        },
        include: this.checkoutInclude,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const history = checkouts.map((checkout) =>
      this.presentPendingCheckoutOrder(checkout),
    );
    return [
      ...orders.map((order) => this.presentOrder(order)),
      ...history,
    ].sort(
      (left, right) =>
        (right.orderDate?.getTime() ?? 0) - (left.orderDate?.getTime() ?? 0),
    );
  }

  async findCustomerOrder(profileId: string, orderId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    const order = await this.prisma.orders.findFirst({
      where: { orderId, customerId },
      include: this.orderInclude,
    });
    if (order) return this.presentOrder(order);

    const checkout = await this.prisma.pendingCheckout.findFirst({
      where: { checkoutId: orderId, customerId, order: null },
      include: this.checkoutInclude,
    });
    if (!checkout) throw new NotFoundException('Order not found.');
    return this.presentPendingCheckoutOrder(checkout);
  }

  async cancelPendingCheckout(profileId: string, checkoutId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    return this.prisma.$transaction(async (tx) => {
      const checkout = await tx.pendingCheckout.findFirst({
        where: {
          checkoutId,
          customerId,
          status: { in: OPEN_CHECKOUT_STATUSES },
        },
      });
      if (!checkout) throw new NotFoundException('Pending checkout not found.');
      if (!checkout.paymentMethod.toLowerCase().includes('cash')) {
        throw new ForbiddenException(
          'Bank Transfer orders cannot be cancelled directly. Please contact support.',
        );
      }
      await this.stockReservations.releasePendingCheckout(tx, checkoutId);
      await tx.pendingCheckout.update({
        where: { checkoutId },
        data: { status: 'Cancelled' },
      });
      return this.presentCheckout(await this.loadCheckout(tx, checkoutId));
    });
  }

  async cancelCustomerOrder(profileId: string, orderId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.orders.findFirst({
        where: { orderId, customerId },
      });
      if (!order) throw new NotFoundException('Order not found.');
      throw new ForbiddenException(
        'Only Cash on Delivery orders awaiting Admin approval can be cancelled directly. Please contact support.',
      );
    });
  }

  async findAllOrders() {
    const orders = await this.prisma.orders.findMany({
      include: this.orderInclude,
      orderBy: { orderDate: 'desc' },
    });
    return orders.map((order) => this.presentOrder(order));
  }

  async findPendingCheckouts() {
    const checkouts = await this.prisma.pendingCheckout.findMany({
      // Approved checkouts are represented by their final orders. All other
      // checkout states remain visible to Admins as database-backed history.
      where: { status: { not: 'Approved' } },
      include: this.checkoutInclude,
      orderBy: { createdAt: 'desc' },
    });
    return checkouts.map((checkout) => this.presentCheckout(checkout));
  }

  async findManagedOrders(profileId: string, role: string | null) {
    let employeeId: string | null = null;
    let branchId: string | null = null;

    try {
      const employee = await this.prisma.employee.findFirst({
        where: { profileId },
        select: { employeeId: true, branchId: true },
      });
      if (employee) {
        employeeId = employee.employeeId;
        branchId = employee.branchId;
      }
    } catch (err) {
      this.logger.warn(`Could not lookup employee record for ${profileId}`, err);
    }

    const isDbAdmin = role?.toLowerCase() === 'admin';
    let whereClause: Prisma.OrdersWhereInput;
    if (isDbAdmin) {
      whereClause = {};
    } else if (employeeId) {
      whereClause = {
        orderStatus: { in: EMPLOYEE_PROCESSING_STATUSES },
        OR: [
          { employeeId },
          {
            employeeId: null,
            orderStatus: { in: EMPLOYEE_CLAIMABLE_STATUSES },
          },
        ],
      };
    } else {
      whereClause = {
        orderStatus: { in: EMPLOYEE_PROCESSING_STATUSES },
      };
    }

    const orders = await this.prisma.orders.findMany({
      where: whereClause,
      include: this.orderInclude,
      orderBy: { orderDate: 'desc' },
    });

    return Promise.all(
      orders.map(async (order) => ({
        ...this.presentOrder(order),
        ...(await this.checkParcelStock(order.orderItems, branchId)),
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
      const inventory = await this.prisma.inventory.findFirst({
        where: { branchId, variantId: item.variantId },
      });
      const held = inventory
        ? await this.prisma.stockReservation.aggregate({
            where: {
              inventoryId: inventory.inventoryId,
              status: { in: ['Active', 'Pending Verification'] },
            },
            _sum: { quantity: true },
          })
        : null;
      const available = Math.max(
        0,
        (inventory?.quantity ?? 0) - (held?._sum.quantity ?? 0),
      );
      if (available < item.quantity) {
        shortages.push(
          `${item.variant?.sku ?? item.variantId}: needs ${item.quantity}, ${available} available`,
        );
      }
    }
    return {
      stockAvailable: shortages.length === 0,
      stockShortages: shortages,
    };
  }

  async findManagedOrder(orderId: string, role?: string | null) {
    const order = await this.prisma.orders.findUnique({
      where: { orderId },
      include: this.orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found.');
    if (
      role?.toLowerCase() === 'employee' &&
      !EMPLOYEE_PROCESSING_STATUSES.includes(order.orderStatus)
    ) {
      throw new ForbiddenException(
        'This order is not approved for employee processing.',
      );
    }
    return this.presentOrder(order);
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
        include: { branch: true },
      });
      if (!employee) throw new NotFoundException('Employee profile not found.');
      if (status === 'Claimed') {
        // Enforce restriction: An employee cannot claim another order until their current Product Preparation order is moved to Delivery Prep (Ready for Pickup) stage.
        const activePrepOrder = await this.prisma.orders.findFirst({
          where: {
            employeeId: employee.employeeId,
            orderStatus: { in: ['Claimed', 'Preparing'] },
          },
          select: { orderId: true, orderStatus: true },
        });

        if (activePrepOrder) {
          throw new ForbiddenException(
            'You cannot claim a new order until your current order in Product Preparation is completed and moved to Delivery Prep stage.',
          );
        }

        const claimedAt = new Date();
        const claimed = await this.prisma.orders.updateMany({
          where: {
            orderId,
            employeeId: null,
            orderStatus: { in: EMPLOYEE_CLAIMABLE_STATUSES },
          },
          data: {
            orderStatus: 'Claimed',
            employeeId: employee.employeeId,
            claimedAt,
          },
        });
        if (claimed.count !== 1) {
          throw new ForbiddenException(
            'This order has already been claimed by another employee.',
          );
        }

        const employeeName = `${employee.firstName} ${employee.lastName}`.trim();
        const branchName = employee.branch?.name;
        await this.notifications.notifyOrderClaimed(
          orderId,
          employeeName,
          branchName,
        );

        return this.findManagedOrder(orderId, role);
      }
      if (order.employeeId !== employee.employeeId) {
        throw new ForbiddenException(
          'Claim this order before updating its status.',
        );
      }
      if (!EMPLOYEE_STATUS_TRANSITIONS[order.orderStatus]?.includes(status)) {
        throw new BadRequestException(
          `Cannot move an order from "${order.orderStatus}" to "${status}".`,
        );
      }
      employeeId = employee.employeeId;
    }

    let dbTargetStatus = status;
    if (['Handed to Courier', 'Handed to Citypak Courier'].includes(status)) {
      dbTargetStatus = 'Sent';
    } else if (['Finished'].includes(status)) {
      dbTargetStatus = 'Completed';
    } else if (['Package Preparing', 'Package Prepared'].includes(status)) {
      dbTargetStatus = 'Preparing';
    } else if (['Ready for Courier Pickup'].includes(status)) {
      dbTargetStatus = 'Ready for Pickup';
    } else if (['Ready to Pick', 'Ready to Process', 'Admin Approved'].includes(status)) {
      dbTargetStatus = 'Admin Approved';
      employeeId = null;
    }

    const transitionedAt = new Date();
    const statusTimestamp =
      dbTargetStatus === 'Claimed' && !order.claimedAt
        ? { claimedAt: transitionedAt }
        : dbTargetStatus === 'Preparing' && !order.preparingAt
          ? { preparingAt: transitionedAt }
          : dbTargetStatus === 'Ready for Pickup' && !order.parcelReadyAt
            ? { parcelReadyAt: transitionedAt }
            : dbTargetStatus === 'Sent' && !order.sentAt
              ? { sentAt: transitionedAt }
              : (dbTargetStatus === 'Completed' || dbTargetStatus === 'Delivered') && !order.completedAt
                ? { completedAt: transitionedAt, deliveredAt: order.deliveredAt || transitionedAt }
                : {};
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dbTargetStatus === 'Admin Approved') {
        const orderItems = (order.orderItems || []).map((i: any) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        }));
        if (orderItems.length > 0) {
          const hasEmployeeStock = await this.verifyEmployeeSufficientStockForCheckout(
            tx,
            order.checkoutId || order.orderId,
            orderItems,
          );
          if (!hasEmployeeStock) {
            throw new ConflictException(
              'Cannot approve order: No employee has sufficient stock in their inventory to fulfill this order.',
            );
          }
        }
      }
      const result = await tx.orders.update({
        where: { orderId },
        data: { orderStatus: dbTargetStatus, employeeId, ...statusTimestamp },
        include: this.orderInclude,
      });
      if ((dbTargetStatus === READY_STATUS || dbTargetStatus === 'Ready for Pickup') && result.employeeId) {
        const employee = await tx.employee.findUnique({
          where: { employeeId: result.employeeId },
          select: { commissionPerParcel: true },
        });
        if (!employee) {
          throw new ConflictException(
            'The assigned employee no longer exists, so commission could not be recorded.',
          );
        }
        await tx.employeeCommission.upsert({
          where: { orderId },
          create: {
            employeeId: result.employeeId,
            orderId,
            rateUsed: employee.commissionPerParcel,
            commissionAmount: employee.commissionPerParcel,
          },
          update: {},
        });
      }
      if (status === 'Cancelled') {
        await this.stockReservations.restoreCommittedForOrder(
          tx,
          orderId,
          rejectionReason ?? `Order changed to ${status}`,
        );
        await tx.employeeCommission.updateMany({
          where: { orderId, status: { not: 'Paid' } },
          data: { status: 'Cancelled' },
        });
      }
      return result;
    });
    if (status === READY_STATUS && order.orderStatus !== READY_STATUS) {
      await this.notifications.notifyOrderReady(orderId);
    }
    // Notify logged-in customer on every status update (skips guest customers)
    await this.notifications?.notifyOrderStatusUpdate?.(orderId, status);
    return this.presentOrder(updated);
  }

  private async verifyEmployeeSufficientStockForCheckout(
    tx: Prisma.TransactionClient,
    checkoutId: string,
    items: { variantId: string; quantity: number }[],
  ): Promise<boolean> {
    if (!items || items.length === 0) return true;

    const reservations = await tx.stockReservation.findMany({
      where: { checkoutId, status: { in: ['Active', 'Pending Verification'] } },
      include: { inventory: true },
    });

    if (reservations.length > 0) {
      const empReservationMap = new Map<string, Map<string, number>>();
      for (const res of reservations) {
        const empId = res.inventory?.employeeId;
        if (!empId) continue;
        if (!empReservationMap.has(empId)) {
          empReservationMap.set(empId, new Map());
        }
        const varMap = empReservationMap.get(empId)!;
        const vId = res.inventory?.variantId || (res as any).variantId;
        varMap.set(vId, (varMap.get(vId) ?? 0) + res.quantity);
      }

      for (const [, varMap] of empReservationMap.entries()) {
        const holdsAll = items.every(
          (item) => (varMap.get(item.variantId) ?? 0) >= item.quantity,
        );
        if (holdsAll) return true;
      }
    }

    const employees = await tx.inventory.findMany({
      where: { employeeId: { not: null }, quantity: { gt: 0 } },
      select: { employeeId: true },
      distinct: ['employeeId'],
    });

    if (employees.length === 0) {
      return true;
    }

    for (const emp of employees) {
      if (!emp.employeeId) continue;
      let hasAll = true;

      for (const item of items) {
        const invRows = await tx.inventory.findMany({
          where: { employeeId: emp.employeeId, variantId: item.variantId },
          select: { inventoryId: true, quantity: true },
        });

        let available = 0;
        for (const inv of invRows) {
          const held = await tx.stockReservation.aggregate({
            where: {
              inventoryId: inv.inventoryId,
              checkoutId: { not: checkoutId },
              status: { in: ['Active', 'Pending Verification'] },
            },
            _sum: { quantity: true },
          });
          const heldQty = held._sum.quantity ?? 0;
          available += Math.max(0, inv.quantity - heldQty);
        }

        if (available < item.quantity) {
          hasAll = false;
          break;
        }
      }

      if (hasAll) return true;
    }

    return false;
  }

  async reviewPendingCheckout(
    checkoutId: string,
    dto: ReviewPaymentProofDto,
    reviewerProfileId: string,
  ) {
    const reviewed = await this.prisma.$transaction(async (tx) => {
      const reviewer = await tx.profiles.findUnique({
        where: { id: reviewerProfileId },
        select: { role: { select: { roleName: true } } },
      });
      if (reviewer?.role?.roleName.toLowerCase() !== 'admin') {
        throw new ForbiddenException(
          'Only an Admin profile can review a pending checkout.',
        );
      }
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${checkoutId}))`,
      );
      const checkout = await this.loadCheckout(tx, checkoutId);
      if (!checkout) throw new NotFoundException('Pending checkout not found.');
      if (
        !['Pending Confirmation', 'Pending Verification'].includes(
          checkout.status,
        )
      ) {
        throw new ConflictException('This checkout has already been reviewed.');
      }
      const reviewedAt = new Date();
      if (dto.status === 'Rejected') {
        await this.stockReservations.releasePendingCheckout(tx, checkoutId);
        if (checkout.paymentProof) {
          await tx.paymentProof.update({
            where: { checkoutId },
            data: {
              status: 'Rejected',
              reviewedByProfileId: reviewerProfileId,
              reviewedAt,
              rejectionReason: dto.adminNotes ?? null,
            },
          });
        }
        const rejected = await tx.pendingCheckout.update({
          where: { checkoutId },
          data: {
            status: 'Rejected',
            reviewedByProfileId: reviewerProfileId,
            reviewedAt,
            adminNotes: dto.adminNotes ?? null,
          },
        });
        return this.presentCheckout({
          ...checkout,
          ...rejected,
          reservations: [],
        });
      }
      const isBank = checkout.paymentMethod.toLowerCase().includes('bank');
      if (
        isBank &&
        (checkout.status !== 'Pending Verification' || !checkout.paymentProof)
      ) {
        throw new ConflictException(
          'The Bank Transfer checkout has no verified receipt or stock hold.',
        );
      }
      const checkoutItems = (checkout.items || []).map((i: any) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      }));
      const hasEmployeeStock = await this.verifyEmployeeSufficientStockForCheckout(
        tx,
        checkoutId,
        checkoutItems,
      );
      if (!hasEmployeeStock) {
        throw new ConflictException(
          'Cannot approve order: No employee has sufficient stock in their inventory to fulfill this order.',
        );
      }
      const result = await this.persistOrder(tx, checkout);
      if (checkout.paymentProof) {
        await tx.paymentProof.update({
          where: { checkoutId },
          data: {
            status: 'Approved',
            reviewedByProfileId: reviewerProfileId,
            reviewedAt,
            rejectionReason: null,
          },
        });
      }
      await this.stockReservations.commitPendingCheckout(
        tx,
        checkoutId,
        result.orderItems,
      );
      await tx.pendingCheckout.update({
        where: { checkoutId },
        data: {
          status: 'Approved',
          reviewedByProfileId: reviewerProfileId,
          reviewedAt,
          adminNotes: dto.adminNotes ?? null,
        },
      });
      const order = await tx.orders.findUnique({
        where: { orderId: result.order.orderId },
        include: this.orderInclude,
      });
      return this.presentOrder(order);
    });
    await this.notifications.notifyCheckoutReviewed(checkoutId);
    return reviewed;
  }

  /** Removes expired holds, marks their checkout expired, and clears DB carts. */
  async expireOverduePaymentProofs() {
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const candidates = await tx.pendingCheckout.findMany({
        where: { status: 'Awaiting Payment', expiresAt: { lte: now } },
        select: { checkoutId: true, customerId: true },
      });
      let checkouts = 0;
      for (const checkout of candidates) {
        if (checkout.customerId) {
          await this.stockReservations.lockCustomerCheckout(
            tx,
            checkout.customerId,
          );
        }
        const transitioned = await tx.pendingCheckout.updateMany({
          where: {
            checkoutId: checkout.checkoutId,
            status: 'Awaiting Payment',
            expiresAt: { lte: now },
          },
          data: { status: 'Expired' },
        });
        if (transitioned.count !== 1) continue;
        checkouts += 1;
        await tx.paymentProof.updateMany({
          where: { checkoutId: checkout.checkoutId },
          data: { status: 'Expired' },
        });
        await this.stockReservations.releasePendingCheckout(
          tx,
          checkout.checkoutId,
        );
        if (checkout.customerId) {
          const cart = await tx.cart.findUnique({
            where: { customerId: checkout.customerId },
          });
          if (cart)
            await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });
        }
      }
      const orphaned = await this.stockReservations.expireActive(tx, now);
      return { expired: orphaned.count, checkouts };
    }, { timeout: 60000, maxWait: 10000 });
    if (result.expired > 0 || result.checkouts > 0) {
      this.logger.log(
        `Expired ${result.checkouts} checkout(s) and deleted ${result.expired} orphaned hold(s).`,
      );
    }
    return result;
  }
}
