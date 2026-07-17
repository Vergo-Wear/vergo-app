import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentProofService } from './payment-proof.service';
import { PaymentProofStatus } from '../common/enums/payment-proof-status.enum';

describe('PaymentProofService', () => {
  const customerDelegate = { findFirst: jest.fn() };
  const ordersDelegate = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const paymentProofsDelegate = {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const inventoryDelegate = { findMany: jest.fn(), updateMany: jest.fn() };

  const prisma = {
    customer: customerDelegate,
    orders: ordersDelegate,
    paymentProofs: paymentProofsDelegate,
    inventory: inventoryDelegate,
    $transaction: jest.fn(
      (operations: Promise<unknown>[] | ((tx: unknown) => unknown)) =>
        typeof operations === 'function'
          ? operations(prisma)
          : Promise.all(operations),
    ),
  };

  const cloudinary = { uploadBuffer: jest.fn() };
  const notifications = { notifyPaymentExpired: jest.fn() };
  const stockReservations = { releaseForOrder: jest.fn() };

  let service: PaymentProofService;

  const profileId = '0b9adb71-9b7a-4a2f-9c3f-6a1d9dbb1111';
  const customerId = '9f3a2c83-1a28-4e4d-82b7-805c91642222';
  const orderId = '4be0cbd5-2f43-45ff-9f2c-1f0ce8ab4444';
  const proofId = '7c1de9f2-30aa-45cd-8f27-b5c07b8f5555';

  const receiptFile = {
    originalname: 'receipt.png',
    mimetype: 'image/png',
    buffer: Buffer.from('receipt-bytes'),
  };

  const futureDate = () => new Date(Date.now() + 60 * 60 * 1000);
  const pastDate = () => new Date(Date.now() - 60 * 60 * 1000);

  const bankTransferOrder = (proofOverrides: Record<string, unknown> = {}) => ({
    orderId,
    customerId,
    paymentMethod: 'bank_transfer',
    paymentProofs: [
      {
        proofId,
        orderId,
        receiptUrl: null,
        uploadedAt: null,
        expiresAt: futureDate(),
        status: PaymentProofStatus.PENDING_UPLOAD as string,
        ...proofOverrides,
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentProofService(
      prisma as never,
      cloudinary as never,
      notifications as never,
      stockReservations as never,
    );

    customerDelegate.findFirst.mockResolvedValue({ customerId });
    cloudinary.uploadBuffer.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/receipt.png',
      public_id: 'payment-proofs/receipt',
    });
    paymentProofsDelegate.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          proofId,
          orderId,
          expiresAt: futureDate(),
          ...data,
        }),
    );
    ordersDelegate.update.mockResolvedValue({ orderId });
    ordersDelegate.updateMany.mockResolvedValue({ count: 1 });
    ordersDelegate.findUnique.mockResolvedValue({ orderId, orderItems: [] });
    paymentProofsDelegate.updateMany.mockResolvedValue({ count: 1 });
    paymentProofsDelegate.findUnique.mockResolvedValue({
      proofId,
      orderId,
      expiresAt: pastDate(),
      status: PaymentProofStatus.EXPIRED,
    });
    paymentProofsDelegate.findUniqueOrThrow.mockResolvedValue({
      proofId,
      orderId,
      receiptUrl: 'https://res.cloudinary.com/demo/receipt.png',
      uploadedAt: new Date(),
      expiresAt: futureDate(),
      status: PaymentProofStatus.PENDING_VERIFICATION,
    });
    inventoryDelegate.findMany.mockResolvedValue([]);
    inventoryDelegate.updateMany.mockResolvedValue({ count: 1 });
    stockReservations.releaseForOrder.mockResolvedValue(undefined);
  });

  describe('uploadReceipt', () => {
    it('uploads to Cloudinary and stores the secure URL, uploadedAt and status', async () => {
      ordersDelegate.findFirst.mockResolvedValue(bankTransferOrder());

      const result = await service.uploadReceipt(
        profileId,
        orderId,
        receiptFile,
      );

      expect(cloudinary.uploadBuffer).toHaveBeenCalledWith(
        receiptFile.buffer,
        expect.objectContaining({ folder: `payment-proofs/${orderId}` }),
      );
      expect(paymentProofsDelegate.updateMany).toHaveBeenCalledWith({
        where: {
          proofId,
          status: PaymentProofStatus.PENDING_UPLOAD,
          receiptUrl: null,
          expiresAt: { gt: expect.any(Date) },
        },
        data: expect.objectContaining({
          receiptUrl: 'https://res.cloudinary.com/demo/receipt.png',
          uploadedAt: expect.any(Date),
          status: PaymentProofStatus.PENDING_VERIFICATION,
        }),
      });
      expect(ordersDelegate.update).toHaveBeenCalledWith({
        where: { orderId },
        data: { orderStatus: PaymentProofStatus.PENDING_VERIFICATION },
      });
      expect(result).toEqual({
        receiptUrl: 'https://res.cloudinary.com/demo/receipt.png',
        uploadedAt: expect.any(Date),
        status: PaymentProofStatus.PENDING_VERIFICATION,
      });
    });

    it("rejects uploads for another customer's order", async () => {
      ordersDelegate.findFirst.mockResolvedValue(null);

      await expect(
        service.uploadReceipt(profileId, orderId, receiptFile),
      ).rejects.toThrow(NotFoundException);
      expect(cloudinary.uploadBuffer).not.toHaveBeenCalled();
      expect(paymentProofsDelegate.update).not.toHaveBeenCalled();
    });

    it('rejects uploads for COD orders', async () => {
      ordersDelegate.findFirst.mockResolvedValue({
        orderId,
        customerId,
        paymentMethod: 'cod',
        paymentProofs: [],
      });

      await expect(
        service.uploadReceipt(profileId, orderId, receiptFile),
      ).rejects.toThrow(BadRequestException);
      expect(cloudinary.uploadBuffer).not.toHaveBeenCalled();
    });

    it('rejects when the bank transfer order has no proof record', async () => {
      ordersDelegate.findFirst.mockResolvedValue({
        orderId,
        customerId,
        paymentMethod: 'bank_transfer',
        paymentProofs: [],
      });

      await expect(
        service.uploadReceipt(profileId, orderId, receiptFile),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows only one receipt submission per order', async () => {
      ordersDelegate.findFirst.mockResolvedValue(
        bankTransferOrder({
          receiptUrl: 'https://res.cloudinary.com/demo/first.png',
          uploadedAt: new Date(),
          status: PaymentProofStatus.PENDING_VERIFICATION,
        }),
      );

      await expect(
        service.uploadReceipt(profileId, orderId, receiptFile),
      ).rejects.toThrow(ConflictException);
      expect(cloudinary.uploadBuffer).not.toHaveBeenCalled();
      expect(paymentProofsDelegate.update).not.toHaveBeenCalled();
    });

    it('rejects a new upload after the receipt was rejected', async () => {
      ordersDelegate.findFirst.mockResolvedValue(
        bankTransferOrder({
          receiptUrl: 'https://res.cloudinary.com/demo/first.png',
          uploadedAt: new Date(),
          status: PaymentProofStatus.REJECTED,
        }),
      );

      await expect(
        service.uploadReceipt(profileId, orderId, receiptFile),
      ).rejects.toThrow(ConflictException);
      expect(cloudinary.uploadBuffer).not.toHaveBeenCalled();
    });

    it('never overwrites an approved payment', async () => {
      ordersDelegate.findFirst.mockResolvedValue(
        bankTransferOrder({ status: PaymentProofStatus.APPROVED }),
      );

      await expect(
        service.uploadReceipt(profileId, orderId, receiptFile),
      ).rejects.toThrow(ForbiddenException);
      expect(cloudinary.uploadBuffer).not.toHaveBeenCalled();
      expect(paymentProofsDelegate.update).not.toHaveBeenCalled();
    });

    it('marks a lapsed Pending Upload proof as Expired and rejects the upload', async () => {
      ordersDelegate.findFirst.mockResolvedValue(
        bankTransferOrder({ expiresAt: pastDate() }),
      );

      await expect(
        service.uploadReceipt(profileId, orderId, receiptFile),
      ).rejects.toThrow(BadRequestException);
      expect(paymentProofsDelegate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            proofId,
            status: PaymentProofStatus.PENDING_UPLOAD,
          }),
          data: { status: PaymentProofStatus.EXPIRED },
        }),
      );
      expect(cloudinary.uploadBuffer).not.toHaveBeenCalled();
    });

    it('leaves the database untouched when the Cloudinary upload fails', async () => {
      ordersDelegate.findFirst.mockResolvedValue(bankTransferOrder());
      cloudinary.uploadBuffer.mockRejectedValue(
        new InternalServerErrorException('File upload failed: network error'),
      );

      await expect(
        service.uploadReceipt(profileId, orderId, receiptFile),
      ).rejects.toThrow(InternalServerErrorException);
      expect(paymentProofsDelegate.update).not.toHaveBeenCalled();
      expect(ordersDelegate.update).not.toHaveBeenCalled();
    });
  });

  describe('getForCustomerOrder', () => {
    it('returns proof details for a bank transfer order', async () => {
      const order = bankTransferOrder({
        receiptUrl: 'https://res.cloudinary.com/demo/receipt.png',
        uploadedAt: new Date(),
        status: PaymentProofStatus.PENDING_VERIFICATION,
      });
      ordersDelegate.findFirst.mockResolvedValue(order);

      const result = await service.getForCustomerOrder(profileId, orderId);

      expect(result).toEqual(
        expect.objectContaining({
          orderId,
          paymentMethod: 'bank_transfer',
          receiptUrl: 'https://res.cloudinary.com/demo/receipt.png',
          status: PaymentProofStatus.PENDING_VERIFICATION,
        }),
      );
    });

    it('uses the active stock reservation expiry for the payment countdown', async () => {
      const reservationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const order = {
        ...bankTransferOrder(),
        stockReservations: [{ expiresAt: reservationExpiresAt }],
      };
      ordersDelegate.findFirst.mockResolvedValue(order);

      const result = await service.getForCustomerOrder(profileId, orderId);

      expect(result.reservationExpiresAt).toEqual(reservationExpiresAt);
    });

    it('returns null proof fields for COD orders', async () => {
      ordersDelegate.findFirst.mockResolvedValue({
        orderId,
        customerId,
        paymentMethod: 'cod',
        paymentProofs: [],
      });

      const result = await service.getForCustomerOrder(profileId, orderId);

      expect(result).toEqual({
        orderId,
        paymentMethod: 'cod',
        receiptUrl: null,
        uploadedAt: null,
        expiresAt: null,
        reservationExpiresAt: null,
        status: null,
      });
    });

    it('lazily expires a lapsed Pending Upload proof on read', async () => {
      ordersDelegate.findFirst.mockResolvedValue(
        bankTransferOrder({ expiresAt: pastDate() }),
      );
      ordersDelegate.findUnique.mockResolvedValue({
        orderId,
        orderItems: [{ variantId: 'variant-1', quantity: 2 }],
      });
      inventoryDelegate.findMany.mockResolvedValue([
        {
          inventoryId: 'inventory-1',
          variantId: 'variant-1',
          quantity: 10,
          reservedQuantity: 2,
        },
      ]);

      const result = await service.getForCustomerOrder(profileId, orderId);

      expect(paymentProofsDelegate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            proofId,
            status: PaymentProofStatus.PENDING_UPLOAD,
          }),
          data: { status: PaymentProofStatus.EXPIRED },
        }),
      );
      expect(stockReservations.releaseForOrder).toHaveBeenCalledWith(
        prisma,
        orderId,
        'Expired',
        'Payment receipt was not uploaded',
      );
      expect(result.status).toBe(PaymentProofStatus.EXPIRED);
      expect(notifications.notifyPaymentExpired).toHaveBeenCalledWith(orderId);
    });

    it('does not revive a proof that expires while its file is uploading', async () => {
      ordersDelegate.findFirst.mockResolvedValue(bankTransferOrder());
      paymentProofsDelegate.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.uploadReceipt(profileId, orderId, receiptFile),
      ).rejects.toThrow(BadRequestException);

      expect(ordersDelegate.update).not.toHaveBeenCalled();
      expect(paymentProofsDelegate.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it("denies access to another customer's order", async () => {
      ordersDelegate.findFirst.mockResolvedValue(null);

      await expect(
        service.getForCustomerOrder(profileId, orderId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
