import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PaymentProofStatus } from '../common/enums/payment-proof-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { StockReservationService } from '../stock-reservation/stock-reservation.service';
import type { Orders, PaymentProofs, StockReservation } from '@prisma/client';

/** Multer file shape used by the receipt upload endpoint */
export interface UploadedReceiptFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

type OrderWithProofs = Orders & {
  paymentProofs: PaymentProofs[];
  stockReservations: Pick<StockReservation, 'expiresAt'>[];
};

@Injectable()
export class PaymentProofService {
  private readonly logger = new Logger(PaymentProofService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly notifications: NotificationsService,
    private readonly stockReservations: StockReservationService,
  ) {}

  private isBankTransfer(order: Orders) {
    return order.paymentMethod.toLowerCase().includes('bank');
  }

  /** Loads an order (with its proofs) and enforces customer ownership. */
  private async ownedOrder(
    profileId: string,
    orderId: string,
  ): Promise<OrderWithProofs> {
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
      select: { customerId: true },
    });
    if (!customer) throw new NotFoundException('Customer profile not found.');

    const order = await this.prisma.orders.findFirst({
      where: { orderId, customerId: customer.customerId },
      include: {
        paymentProofs: { orderBy: { expiresAt: 'desc' } },
        stockReservations: {
          where: { status: 'Active' },
          orderBy: { expiresAt: 'asc' },
          take: 1,
          select: { expiresAt: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  /**
   * Marks a proof Expired when its upload window has lapsed. Runs lazily on
   * every read/upload so no scheduler is needed; the record itself is kept
   * for payment history.
   */
  private async resolveExpiry(proof: PaymentProofs): Promise<PaymentProofs> {
    const isExpirable =
      proof.status === (PaymentProofStatus.PENDING_UPLOAD as string);
    if (!isExpirable || proof.expiresAt.getTime() > Date.now()) {
      return proof;
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const transition = await tx.paymentProofs.updateMany({
        where: {
          proofId: proof.proofId,
          status: PaymentProofStatus.PENDING_UPLOAD,
          expiresAt: { lte: new Date() },
        },
        data: { status: PaymentProofStatus.EXPIRED },
      });
      if (transition.count === 0) {
        return {
          proof:
            (await tx.paymentProofs.findUnique({
              where: { proofId: proof.proofId },
            })) ?? proof,
          changed: false,
        };
      }

      const orderExpired = await tx.orders.updateMany({
        where: {
          orderId: proof.orderId,
          orderStatus: { in: ['Pending', 'Pending Payment'] },
        },
        data: { orderStatus: 'Expired' },
      });
      if (orderExpired.count === 1) {
        await this.stockReservations.releaseForOrder(
          tx,
          proof.orderId,
          'Expired',
          'Payment receipt was not uploaded',
        );
      }
      return {
        proof: (await tx.paymentProofs.findUnique({
          where: { proofId: proof.proofId },
        })) ?? {
          ...proof,
          status: PaymentProofStatus.EXPIRED,
        },
        changed: true,
      };
    });
    if (result.changed) {
      await this.notifications.notifyPaymentExpired(proof.orderId);
    }
    return result.proof;
  }

  /**
   * Payment summary for the customer's own order. COD orders have no proof
   * record, so the proof fields come back null.
   */
  async getForCustomerOrder(profileId: string, orderId: string) {
    const order = await this.ownedOrder(profileId, orderId);
    let proof = order.paymentProofs[0] ?? null;
    if (proof) proof = await this.resolveExpiry(proof);

    return {
      orderId: order.orderId,
      paymentMethod: order.paymentMethod,
      receiptUrl: proof?.receiptUrl ?? null,
      uploadedAt: proof?.uploadedAt ?? null,
      expiresAt: proof?.expiresAt ?? null,
      reservationExpiresAt:
        order.stockReservations?.[0]?.expiresAt ?? proof?.expiresAt ?? null,
      status: proof?.status ?? null,
    };
  }

  /**
   * Uploads a bank-transfer receipt to Cloudinary and records its secure
   * URL on the order's payment proof. Cloudinary is called before any
   * database write, so a failed upload leaves the proof untouched.
   */
  async uploadReceipt(
    profileId: string,
    orderId: string,
    file: UploadedReceiptFile,
  ) {
    const order = await this.ownedOrder(profileId, orderId);

    if (!this.isBankTransfer(order)) {
      throw new BadRequestException(
        'Receipt upload is only available for Bank Transfer orders.',
      );
    }

    const existing = order.paymentProofs[0];
    if (!existing) {
      throw new NotFoundException(
        'No payment proof record exists for this order.',
      );
    }

    const proof = await this.resolveExpiry(existing);

    if (proof.status === (PaymentProofStatus.APPROVED as string)) {
      throw new ForbiddenException(
        'This payment has already been approved and cannot be modified.',
      );
    }
    if (proof.status === (PaymentProofStatus.EXPIRED as string)) {
      throw new BadRequestException(
        'The payment window for this order has expired.',
      );
    }
    if (proof.status === (PaymentProofStatus.REJECTED as string)) {
      throw new ConflictException(
        'The submitted receipt was rejected. Please contact support for assistance.',
      );
    }
    // One submission per order: once a receipt exists the proof has left
    // Pending Upload and no further uploads are accepted.
    if (
      proof.receiptUrl ||
      proof.status !== (PaymentProofStatus.PENDING_UPLOAD as string)
    ) {
      throw new ConflictException(
        'A receipt has already been submitted for this order. Only one submission is allowed.',
      );
    }

    const upload = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: `payment-proofs/${order.orderId}`,
    });
    this.logger.log(
      `Receipt stored in Cloudinary for order ${order.orderId} (${upload.public_id})`,
    );

    const uploadedAt = new Date();
    const updatedProof = await this.prisma.$transaction(async (tx) => {
      // The expiry sweep may run while Cloudinary is receiving the file. Only
      // Pending Upload proofs that are still inside their window may win this
      // transition, so an expired proof can never be revived by a late upload.
      const transition = await tx.paymentProofs.updateMany({
        where: {
          proofId: proof.proofId,
          status: PaymentProofStatus.PENDING_UPLOAD,
          receiptUrl: null,
          expiresAt: { gt: uploadedAt },
        },
        data: {
          receiptUrl: upload.secure_url,
          uploadedAt,
          status: PaymentProofStatus.PENDING_VERIFICATION,
        },
      });
      if (transition.count !== 1) {
        throw new BadRequestException(
          'The payment window for this order has expired.',
        );
      }
      await tx.orders.update({
        where: { orderId: order.orderId },
        data: { orderStatus: PaymentProofStatus.PENDING_VERIFICATION },
      });
      return tx.paymentProofs.findUniqueOrThrow({
        where: { proofId: proof.proofId },
      });
    });

    return {
      receiptUrl: updatedProof.receiptUrl,
      uploadedAt: updatedProof.uploadedAt,
      status: updatedProof.status,
    };
  }
}
