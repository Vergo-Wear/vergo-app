import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './notification-type';

describe('NotificationsService', () => {
  const customerDelegate = { findFirst: jest.fn() };
  const ordersDelegate = { findUnique: jest.fn() };
  const pendingCheckoutDelegate = { findUnique: jest.fn() };
  const notificationDelegate = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  };

  const profilesDelegate = { findMany: jest.fn().mockResolvedValue([]) };

  const prisma = {
    customer: customerDelegate,
    orders: ordersDelegate,
    pendingCheckout: pendingCheckoutDelegate,
    notification: notificationDelegate,
    profiles: profilesDelegate,
  };

  const email = {
    sendPaymentRejectedEmail: jest.fn(),
    sendPaymentExpiredEmail: jest.fn(),
  };

  let service: NotificationsService;

  const profileId = '0b9adb71-9b7a-4a2f-9c3f-6a1d9dbb1111';
  const customerId = '9f3a2c83-1a28-4e4d-82b7-805c91642222';
  const orderId = '4be0cbd5-2f43-45ff-9f2c-1f0ce8ab4444';
  const notificationId = '7c1de9f2-30aa-45cd-8f27-b5c07b8f5555';

  const orderWithCustomer = {
    orderId,
    customerId,
    customer: {
      customerId,
      profileId,
      firstName: 'Julian',
      email: 'julian@example.com',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma as never, email as never);
    customerDelegate.findFirst.mockResolvedValue({ customerId });
    notificationDelegate.create.mockResolvedValue({ notificationId });
    notificationDelegate.findFirst.mockResolvedValue(null);
  });

  describe('customer notification access', () => {
    it('lists only the authenticated customer own notifications', async () => {
      notificationDelegate.findMany.mockResolvedValue([]);

      await service.findCustomerNotifications(profileId);

      expect(notificationDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientProfileId: profileId },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('scopes single-notification lookup to the owning customer', async () => {
      notificationDelegate.findFirst.mockResolvedValue({ notificationId });

      await service.findCustomerNotification(profileId, notificationId);

      expect(notificationDelegate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { notificationId, recipientProfileId: profileId },
        }),
      );
    });

    it("rejects access to another customer's notification", async () => {
      notificationDelegate.findFirst.mockResolvedValue(null);

      await expect(
        service.findCustomerNotification(profileId, notificationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('uses the authenticated profile as the notification recipient', async () => {
      notificationDelegate.findMany.mockResolvedValue([]);
      await service.findCustomerNotifications(profileId);
      expect(customerDelegate.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('marks the customer own notification as read', async () => {
      notificationDelegate.updateMany.mockResolvedValue({ count: 1 });
      notificationDelegate.findFirst.mockResolvedValue({
        notificationId,
        isRead: true,
      });

      const result = await service.markAsRead(profileId, notificationId);

      expect(notificationDelegate.updateMany).toHaveBeenCalledWith({
        where: { notificationId, recipientProfileId: profileId },
        data: { isRead: true },
      });
      expect(result).toEqual(
        expect.objectContaining({ notificationId, isRead: true }),
      );
    });

    it("cannot mark another customer's notification as read", async () => {
      notificationDelegate.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.markAsRead(profileId, notificationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('notifyOrderReady', () => {
    beforeEach(() => {
      ordersDelegate.findUnique.mockResolvedValue(orderWithCustomer);
    });

    it('creates a notification linked to the correct customer and order', async () => {
      await service.notifyOrderReady(orderId);

      expect(notificationDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          type: NotificationType.ORDER_READY,
          title: 'Order Ready for Collection',
          message: expect.stringContaining('is ready for collection'),
        }),
      });
    });

    it('never creates a second ORDER_READY notification for the same order', async () => {
      notificationDelegate.findFirst.mockResolvedValue({ notificationId });

      await service.notifyOrderReady(orderId);

      expect(notificationDelegate.create).not.toHaveBeenCalled();
    });

    it('queues an email notification for a guest order snapshot', async () => {
      ordersDelegate.findUnique.mockResolvedValue({
        orderId,
        customerId: null,
        customer: null,
        customerDetails: {
          firstName: 'Guest',
          email: 'guest@example.com',
          phone: '0771234567',
        },
      });

      await service.notifyOrderReady(orderId);

      expect(notificationDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientProfileId: null,
          orderId,
          channel: 'EMAIL',
          status: 'Pending',
          sentAt: null,
          type: NotificationType.ORDER_READY,
        }),
      });
    });
  });

  describe('notifyPaymentRejected', () => {
    beforeEach(() => {
      ordersDelegate.findUnique.mockResolvedValue(orderWithCustomer);
    });

    it('creates the notification and emails the account owner', async () => {
      await service.notifyPaymentRejected(orderId, 'Blurry receipt');

      expect(notificationDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          type: NotificationType.PAYMENT_REJECTED,
          title: 'Payment Rejected',
          message: expect.stringContaining('has been rejected'),
        }),
      });
      expect(email.sendPaymentRejectedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'julian@example.com',
          customerName: 'Julian',
          reason: 'Blurry receipt',
        }),
      );
    });

    it('sends nothing for guest orders', async () => {
      ordersDelegate.findUnique.mockResolvedValue({
        orderId,
        customerId: null,
        customer: null,
      });

      await service.notifyPaymentRejected(orderId);

      expect(notificationDelegate.create).not.toHaveBeenCalled();
      expect(email.sendPaymentRejectedEmail).not.toHaveBeenCalled();
    });
  });

  describe('notifyPaymentExpired', () => {
    beforeEach(() => {
      ordersDelegate.findUnique.mockResolvedValue(orderWithCustomer);
    });

    it('creates the notification and emails the account owner', async () => {
      await service.notifyPaymentExpired(orderId);

      expect(notificationDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          type: NotificationType.PAYMENT_EXPIRED,
          title: 'Payment Expired',
          message: expect.stringContaining('has expired'),
        }),
      });
      expect(email.sendPaymentExpiredEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'julian@example.com',
          customerName: 'Julian',
        }),
      );
    });

    it('swallows a concurrent duplicate (unique constraint) instead of failing', async () => {
      notificationDelegate.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.notifyPaymentExpired(orderId),
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyCheckoutReviewed', () => {
    it('notifies a registered customer after COD approval', async () => {
      pendingCheckoutDelegate.findUnique.mockResolvedValue({
        checkoutId: '6b133395-0982-4201-8c62-3edc62b66666',
        customerId,
        paymentMethod: 'Cash on Delivery',
        status: 'Approved',
        adminNotes: null,
        customer: orderWithCustomer.customer,
        order: { orderId },
      });

      await service.notifyCheckoutReviewed(
        '6b133395-0982-4201-8c62-3edc62b66666',
      );

      expect(notificationDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientProfileId: profileId,
          orderId,
          type: NotificationType.COD_CONFIRMED,
          title: 'COD Order Confirmed',
        }),
      });
    });

    it('queues a guest checkout notification using its contact snapshot', async () => {
      pendingCheckoutDelegate.findUnique.mockResolvedValue({
        checkoutId: '6b133395-0982-4201-8c62-3edc62b66666',
        customerId: null,
        paymentMethod: 'Cash on Delivery',
        status: 'Rejected',
        adminNotes: null,
        customer: null,
        customerDetails: {
          firstName: 'Guest',
          email: 'guest@example.com',
          phone: '0771234567',
        },
        order: null,
      });

      await service.notifyCheckoutReviewed(
        '6b133395-0982-4201-8c62-3edc62b66666',
      );

      expect(notificationDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientProfileId: null,
          checkoutId: '6b133395-0982-4201-8c62-3edc62b66666',
          channel: 'EMAIL',
          status: 'Pending',
          type: NotificationType.COD_REJECTED,
        }),
      });
    });
  });
});
