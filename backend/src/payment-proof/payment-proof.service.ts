import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { OrdersService } from '../orders/orders.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { PrismaService } from '../prisma/prisma.service';

export type UploadedReceiptFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class PaymentProofService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly orders: OrdersService,
  ) {}

  async getForCustomerOrder(profileId: string, orderId: string) {
    const order = await this.prisma.orders.findFirst({
      where: { orderId, customer: { profileId } },
      include: { checkout: { include: { paymentProof: true } } },
    });
    if (!order) throw new NotFoundException('Order not found.');
    if (!order.paymentMethod.toLowerCase().includes('bank')) {
      throw new BadRequestException('This order does not use Bank Transfer.');
    }
    if (!order.checkout.paymentProof) {
      throw new NotFoundException('Payment proof not found.');
    }
    return {
      ...order.checkout.paymentProof,
      orderId,
      expiresAt: order.checkout.expiresAt,
      status: 'Approved',
      adminNotes: order.checkout.adminNotes,
    };
  }

  async uploadReceipt(
    _profileId: string,
    _orderId: string,
    _receipt: UploadedReceiptFile,
  ) {
    throw new BadRequestException(
      'Payment receipts must be uploaded before an order is approved.',
    );
  }

  async uploadReservationReceipt(
    profileId: string,
    checkoutId: string,
    checkout: CreateOrderDto,
    receipt: UploadedReceiptFile,
  ) {
    const upload = await this.cloudinary.uploadBuffer(receipt.buffer, {
      folder: 'vergo/payment-receipts',
      public_id: `${checkoutId}-${Date.now()}`,
      use_filename: false,
      unique_filename: true,
    });
    try {
      const finalized = await this.orders.finalizeBankTransferReservation(
        profileId,
        checkoutId,
        checkout,
        {
          receiptUrl: upload.secure_url,
          storagePublicId: upload.public_id,
          uploadedAt: new Date(),
        },
      );
      if (
        finalized.replacedStoragePublicId &&
        finalized.replacedStoragePublicId !== upload.public_id
      ) {
        await this.cloudinary.deleteAsset(finalized.replacedStoragePublicId);
      }
      return {
        ...finalized.checkout,
        message: 'Receipt submitted. Your checkout is pending verification.',
      };
    } catch (error) {
      await this.cloudinary.deleteAsset(upload.public_id).catch(() => undefined);
      throw error;
    }
  }
}
