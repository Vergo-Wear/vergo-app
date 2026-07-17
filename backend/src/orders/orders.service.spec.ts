import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService', () => {
  const customerDelegate = { findFirst: jest.fn() };
  const productVariantDelegate = { findUnique: jest.fn() };
  const ordersDelegate = {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const employeeDelegate = { findFirst: jest.fn() };
  const paymentProofsDelegate = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const orderItemDelegate = { create: jest.fn() };
  const orderCustomerDetailsDelegate = { create: jest.fn() };
  const orderShippingDetailsDelegate = { create: jest.fn() };
  const userAddressDelegate = {
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  };

  const prisma = {
    customer: customerDelegate,
    productVariant: productVariantDelegate,
    orders: ordersDelegate,
    employee: employeeDelegate,
    paymentProofs: paymentProofsDelegate,
    orderItem: orderItemDelegate,
    orderCustomerDetails: orderCustomerDetailsDelegate,
    orderShippingDetails: orderShippingDetailsDelegate,
    userAddress: userAddressDelegate,
    // Execute the callback against the same mocked delegates so the whole
    // "transaction" shares state; a thrown error rejects like a rollback.
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback(prisma),
    ),
  };

  const notifications = {
    notifyOrderReady: jest.fn(),
    notifyPaymentRejected: jest.fn(),
    notifyPaymentExpired: jest.fn(),
  };

  let service: OrdersService;

  const profileId = '0b9adb71-9b7a-4a2f-9c3f-6a1d9dbb1111';
  const customerId = '9f3a2c83-1a28-4e4d-82b7-805c91642222';
  const variantId = 'e335e75a-f87d-4937-a765-712f3ad93333';
  const orderId = '4be0cbd5-2f43-45ff-9f2c-1f0ce8ab4444';
  const savedAddressId = '7c1de9f2-30aa-45cd-8f27-b5c07b8f5555';

  const variant = {
    variantId,
    priceAdjustment: new Prisma.Decimal(250),
    product: { basePrice: new Prisma.Decimal(4500) },
  };

  const baseDto = (): CreateOrderDto =>
    ({
      paymentMethod: 'cod',
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
        addressLine2: 'Apt 4',
        city: 'Colombo',
        district: 'Colombo',
        postalCode: '10100',
        deliveryNote: 'Ring the bell',
      },
      items: [{ variantId, quantity: 2 }],
    }) as CreateOrderDto;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrdersService(
      prisma as never,
      {} as never,
      notifications as never,
    );

    productVariantDelegate.findUnique.mockResolvedValue(variant);
    ordersDelegate.create.mockResolvedValue({ orderId });
    orderItemDelegate.create.mockResolvedValue({});
    orderCustomerDetailsDelegate.create.mockResolvedValue({});
    orderShippingDetailsDelegate.create.mockResolvedValue({});
    userAddressDelegate.updateMany.mockResolvedValue({ count: 1 });
    userAddressDelegate.create.mockResolvedValue({});
  });

  describe('guest checkout', () => {
    it('creates guest customer and shipping snapshots without a customer link', async () => {
      await service.create(baseDto());

      expect(orderCustomerDetailsDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          customerId: null,
          customerType: 'guest',
          firstName: 'Julian',
          email: 'julian@example.com',
        }),
      });
      expect(orderShippingDetailsDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          receiverName: 'Julian Verso',
          addressLine1: '12 Galle Road',
          district: 'Colombo',
          deliveryNote: 'Ring the bell',
        }),
      });
    });

    it('never persists guest addresses into user_addresses, even if flags are sent', async () => {
      const dto = baseDto();
      dto.saveAddress = true;
      dto.setAsPrimary = true;

      await service.create(dto);

      expect(userAddressDelegate.create).not.toHaveBeenCalled();
      expect(userAddressDelegate.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a guest checkout that references a saved address', async () => {
      const dto = baseDto();
      dto.savedAddressId = savedAddressId;

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(ordersDelegate.create).not.toHaveBeenCalled();
    });

    it('rejects bank transfer for guests', async () => {
      const dto = baseDto();
      dto.paymentMethod = 'bank_transfer';

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('registered checkout', () => {
    beforeEach(() => {
      customerDelegate.findFirst.mockResolvedValue({ customerId });
    });

    it('creates snapshots linked to the customer with customerType registered', async () => {
      await service.create(baseDto(), profileId);

      expect(ordersDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ customerId }),
      });
      expect(orderCustomerDetailsDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId,
          customerType: 'registered',
        }),
      });
      expect(orderShippingDetailsDelegate.create).toHaveBeenCalled();
    });

    it('snapshots a saved address without re-saving it', async () => {
      userAddressDelegate.findFirst.mockResolvedValue({
        addressId: savedAddressId,
        customerId,
        receiverName: 'Saved Receiver',
        phone: '0719876543',
        addressLine1: '99 Kandy Road',
        addressLine2: null,
        city: 'Kandy',
        district: 'Kandy',
        postalCode: '20000',
      });
      const dto = baseDto();
      dto.savedAddressId = savedAddressId;

      await service.create(dto, profileId);

      expect(userAddressDelegate.findFirst).toHaveBeenCalledWith({
        where: { addressId: savedAddressId, customerId },
      });
      expect(orderShippingDetailsDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          receiverName: 'Saved Receiver',
          addressLine1: '99 Kandy Road',
          city: 'Kandy',
          district: 'Kandy',
          deliveryNote: 'Ring the bell',
        }),
      });
      expect(userAddressDelegate.create).not.toHaveBeenCalled();
    });

    it('rejects a saved address that does not belong to the customer', async () => {
      userAddressDelegate.findFirst.mockResolvedValue(null);
      const dto = baseDto();
      dto.savedAddressId = savedAddressId;

      await expect(service.create(dto, profileId)).rejects.toThrow(
        BadRequestException,
      );
      expect(ordersDelegate.create).not.toHaveBeenCalled();
    });

    it('saves a new address (non-primary) when saveAddress is set', async () => {
      userAddressDelegate.findFirst.mockResolvedValue({
        addressId: 'existing-primary',
        isPrimary: true,
      });
      const dto = baseDto();
      dto.saveAddress = true;

      await service.create(dto, profileId);

      expect(userAddressDelegate.updateMany).not.toHaveBeenCalled();
      expect(userAddressDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId,
          addressLine1: '12 Galle Road',
          isPrimary: false,
        }),
      });
    });

    it('demotes existing primaries before saving a new primary address', async () => {
      const calls: string[] = [];
      userAddressDelegate.findFirst.mockResolvedValue({
        addressId: 'existing-primary',
        isPrimary: true,
      });
      userAddressDelegate.updateMany.mockImplementation(() => {
        calls.push('demote');
        return Promise.resolve({ count: 1 });
      });
      userAddressDelegate.create.mockImplementation(() => {
        calls.push('create');
        return Promise.resolve({});
      });
      const dto = baseDto();
      dto.saveAddress = true;
      dto.setAsPrimary = true;

      await service.create(dto, profileId);

      expect(userAddressDelegate.updateMany).toHaveBeenCalledWith({
        where: { customerId, isPrimary: true },
        data: expect.objectContaining({ isPrimary: false }),
      });
      expect(userAddressDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isPrimary: true }),
      });
      expect(calls).toEqual(['demote', 'create']);
    });
  });

  describe('validation and rollback', () => {
    it('rejects an invalid shipping district', async () => {
      const dto = baseDto();
      dto.shippingDetails.district = 'Atlantis';

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an empty item list', async () => {
      const dto = baseDto();
      dto.items = [];

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('propagates an unknown variant so the transaction rolls back', async () => {
      productVariantDelegate.findUnique.mockResolvedValue(null);

      await expect(service.create(baseDto())).rejects.toThrow(
        BadRequestException,
      );
      expect(ordersDelegate.create).not.toHaveBeenCalled();
      expect(orderCustomerDetailsDelegate.create).not.toHaveBeenCalled();
      expect(orderShippingDetailsDelegate.create).not.toHaveBeenCalled();
    });

    it('propagates a snapshot insert failure so the transaction rolls back', async () => {
      orderShippingDetailsDelegate.create.mockRejectedValue(
        new Error('insert failed'),
      );

      await expect(service.create(baseDto())).rejects.toThrow('insert failed');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('order ready notification', () => {
    beforeEach(() => {
      ordersDelegate.update.mockResolvedValue({
        orderId,
        orderStatus: 'Ready for Pickup',
      });
    });

    it('notifies the customer after the status transitions to READY', async () => {
      ordersDelegate.findUnique.mockResolvedValue({
        orderId,
        orderStatus: 'Preparing',
        employeeId: 'emp-1',
      });

      await service.updateManagedStatus(
        profileId,
        'Admin',
        orderId,
        'Ready for Pickup',
      );

      expect(ordersDelegate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId },
          data: expect.objectContaining({ orderStatus: 'Ready for Pickup' }),
        }),
      );
      expect(notifications.notifyOrderReady).toHaveBeenCalledTimes(1);
      expect(notifications.notifyOrderReady).toHaveBeenCalledWith(orderId);
    });

    it('does not notify again when READY is re-saved as READY', async () => {
      ordersDelegate.findUnique.mockResolvedValue({
        orderId,
        orderStatus: 'Ready for Pickup',
        employeeId: 'emp-1',
      });

      await service.updateManagedStatus(
        profileId,
        'Admin',
        orderId,
        'Ready for Pickup',
      );

      expect(notifications.notifyOrderReady).not.toHaveBeenCalled();
    });

    it('does not notify for non-READY status changes', async () => {
      ordersDelegate.findUnique.mockResolvedValue({
        orderId,
        orderStatus: 'Claimed',
        employeeId: 'emp-1',
      });
      ordersDelegate.update.mockResolvedValue({
        orderId,
        orderStatus: 'Preparing',
      });

      await service.updateManagedStatus(
        profileId,
        'Admin',
        orderId,
        'Preparing',
      );

      expect(notifications.notifyOrderReady).not.toHaveBeenCalled();
    });

    it('does not notify when saving the READY status fails', async () => {
      ordersDelegate.findUnique.mockResolvedValue({
        orderId,
        orderStatus: 'Preparing',
        employeeId: 'emp-1',
      });
      ordersDelegate.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.updateManagedStatus(
          profileId,
          'Admin',
          orderId,
          'Ready for Pickup',
        ),
      ).rejects.toThrow('db down');
      expect(notifications.notifyOrderReady).not.toHaveBeenCalled();
    });
  });

  describe('payment proof review and expiry', () => {
    const proofId = 'a7c15c25-6f8a-4be3-9d41-2f8f1c7a6666';

    describe('payment proof review', () => {
      beforeEach(() => {
        paymentProofsDelegate.findFirst.mockResolvedValue({
          proofId,
          orderId,
          status: 'Pending Verification',
        });
        ordersDelegate.update.mockResolvedValue({ orderId });
      });

      it('rejecting a proof notifies the customer and reopens payment', async () => {
        paymentProofsDelegate.updateMany.mockResolvedValue({ count: 1 });

        await service.reviewPaymentProof(orderId, proofId, {
          status: 'Rejected',
          adminNotes: 'Blurry receipt',
        });

        expect(paymentProofsDelegate.updateMany).toHaveBeenCalledWith({
          where: { proofId, status: { not: 'Rejected' } },
          data: { status: 'Rejected', adminNotes: 'Blurry receipt' },
        });
        expect(ordersDelegate.update).toHaveBeenCalledWith({
          where: { orderId },
          data: { orderStatus: 'Pending Payment' },
        });
        expect(notifications.notifyPaymentRejected).toHaveBeenCalledTimes(1);
        expect(notifications.notifyPaymentRejected).toHaveBeenCalledWith(
          orderId,
          'Blurry receipt',
        );
      });

      it('rejecting an already-rejected proof does not notify again', async () => {
        paymentProofsDelegate.findFirst.mockResolvedValue({
          proofId,
          orderId,
          status: 'Rejected',
        });
        paymentProofsDelegate.updateMany.mockResolvedValue({ count: 0 });

        await service.reviewPaymentProof(orderId, proofId, {
          status: 'Rejected',
        });

        expect(notifications.notifyPaymentRejected).not.toHaveBeenCalled();
        expect(ordersDelegate.update).not.toHaveBeenCalled();
      });

      it('approving a proof never sends a rejection notification', async () => {
        paymentProofsDelegate.updateMany.mockResolvedValue({ count: 1 });

        await service.reviewPaymentProof(orderId, proofId, {
          status: 'Approved',
        });

        expect(notifications.notifyPaymentRejected).not.toHaveBeenCalled();
        expect(ordersDelegate.update).toHaveBeenCalledWith({
          where: { orderId },
          data: { orderStatus: 'Ready to Pick' },
        });
      });
    });

    describe('payment proof expiry', () => {
      it('expires overdue proofs once and notifies each customer', async () => {
        paymentProofsDelegate.findMany.mockResolvedValue([
          { proofId, orderId, status: 'Pending Verification' },
        ]);
        paymentProofsDelegate.updateMany.mockResolvedValue({ count: 1 });
        ordersDelegate.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.expireOverduePaymentProofs();

        expect(result).toEqual({ expired: 1 });
        expect(paymentProofsDelegate.updateMany).toHaveBeenCalledWith({
          where: {
            proofId,
            status: { in: ['Pending Upload', 'Pending Verification'] },
          },
          data: { status: 'Expired' },
        });
        expect(notifications.notifyPaymentExpired).toHaveBeenCalledTimes(1);
        expect(notifications.notifyPaymentExpired).toHaveBeenCalledWith(
          orderId,
        );
      });

      it('an already-expired proof is never expired or notified twice', async () => {
        paymentProofsDelegate.findMany.mockResolvedValue([
          { proofId, orderId, status: 'Pending Verification' },
        ]);
        // Simulates a concurrent sweep having already transitioned the proof.
        paymentProofsDelegate.updateMany.mockResolvedValue({ count: 0 });

        const result = await service.expireOverduePaymentProofs();

        expect(result).toEqual({ expired: 0 });
        expect(notifications.notifyPaymentExpired).not.toHaveBeenCalled();
      });

      it('does nothing when no proofs are overdue', async () => {
        paymentProofsDelegate.findMany.mockResolvedValue([]);

        const result = await service.expireOverduePaymentProofs();

        expect(result).toEqual({ expired: 0 });
        expect(paymentProofsDelegate.updateMany).not.toHaveBeenCalled();
        expect(notifications.notifyPaymentExpired).not.toHaveBeenCalled();
      });
    });
  });
});
