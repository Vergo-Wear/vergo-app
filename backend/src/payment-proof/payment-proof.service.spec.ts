import { BadRequestException } from '@nestjs/common';
import { PaymentProofService } from './payment-proof.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';

describe('PaymentProofService normalized checkout proof flow', () => {
  const profileId = '0b9adb71-9b7a-4a2f-9c3f-6a1d9dbb1111';
  const checkoutId = '6b133395-0982-4201-8c62-3edc62b66666';
  const prisma = { orders: { findFirst: jest.fn() } };
  const cloudinary = { uploadBuffer: jest.fn(), deleteAsset: jest.fn() };
  const ordersService = { finalizeBankTransferReservation: jest.fn() };
  const receipt = {
    originalname: 'receipt.png',
    mimetype: 'image/png',
    buffer: Buffer.from('receipt-bytes'),
    size: 13,
  };
  const checkout: CreateOrderDto = {
    paymentMethod: 'bank_transfer',
    deliveryFee: 350,
    contactDetails: {
      firstName: 'Julian',
      lastName: 'Verso',
      email: 'julian@example.com',
      phone: '0771234567',
    },
    shippingDetails: {
      receiverName: 'Julian Verso',
      phone: '0771234567',
      addressLine1: '12 Galle Road',
      city: 'Colombo',
      district: 'Colombo',
      postalCode: '10100',
    },
    items: [{ variantId: 'e335e75a-f87d-4937-a765-712f3ad93333', quantity: 2 }],
  };
  let service: PaymentProofService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentProofService(
      prisma as never,
      cloudinary as never,
      ordersService as never,
    );
    cloudinary.uploadBuffer.mockResolvedValue({
      secure_url: 'https://example.com/receipt.png',
      public_id: 'new-receipt',
    });
    cloudinary.deleteAsset.mockResolvedValue(undefined);
    ordersService.finalizeBankTransferReservation.mockResolvedValue({
      checkout: {
        checkoutId,
        receiptUrl: 'https://example.com/receipt.png',
        status: 'Pending Verification',
      },
      replacedStoragePublicId: null,
    });
  });

  it('uploads and stores a receipt against checkout_id without creating an order', async () => {
    const result = await service.uploadReservationReceipt(
      profileId,
      checkoutId,
      checkout,
      receipt,
    );
    expect(cloudinary.uploadBuffer).toHaveBeenCalledWith(receipt.buffer, {
      folder: 'vergo/payment-receipts',
      public_id: expect.stringMatching(new RegExp(`^${checkoutId}-`)),
      use_filename: false,
      unique_filename: true,
    });
    expect(ordersService.finalizeBankTransferReservation).toHaveBeenCalledWith(
      profileId,
      checkoutId,
      checkout,
      {
        fileUrl: 'https://example.com/receipt.png',
        fileName: 'receipt.png',
        mimeType: 'image/png',
        fileSizeBytes: 13,
        storagePublicId: 'new-receipt',
        uploadedAt: expect.any(Date),
      },
    );
    expect(result).toEqual(
      expect.objectContaining({ checkoutId, status: 'Pending Verification' }),
    );
  });

  it('deletes the old stored file only after a replacement succeeds', async () => {
    ordersService.finalizeBankTransferReservation.mockResolvedValue({
      checkout: { checkoutId, status: 'Pending Verification' },
      replacedStoragePublicId: 'old-receipt',
    });
    await service.uploadReservationReceipt(
      profileId,
      checkoutId,
      checkout,
      receipt,
    );
    expect(cloudinary.deleteAsset).toHaveBeenCalledWith('old-receipt');
  });

  it('deletes the newly uploaded file when the database transition fails', async () => {
    ordersService.finalizeBankTransferReservation.mockRejectedValue(
      new BadRequestException('The payment window has expired.'),
    );
    await expect(
      service.uploadReservationReceipt(
        profileId,
        checkoutId,
        checkout,
        receipt,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(cloudinary.deleteAsset).toHaveBeenCalledWith('new-receipt');
  });
});
