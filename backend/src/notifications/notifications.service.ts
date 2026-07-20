import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationType, orderNumber } from './notification-type';

/** Fields returned to the customer for every notification endpoint. */
const notificationSelect = {
  notificationId: true,
  orderId: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  createdAt: true,
} as const;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  private async customerIdForProfile(profileId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { profileId },
      select: { customerId: true },
    });
    if (!customer) throw new NotFoundException('Customer profile not found.');
    return customer.customerId;
  }

  /** All notifications belonging to the authenticated customer, newest first. */
  async findCustomerNotifications(profileId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    return this.prisma.notification.findMany({
      where: { order: { customerId } },
      select: notificationSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** A single notification — only visible to the customer who owns it. */
  async findCustomerNotification(profileId: string, notificationId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    const notification = await this.prisma.notification.findFirst({
      where: { notificationId, order: { customerId } },
      select: notificationSelect,
    });
    if (!notification) throw new NotFoundException('Notification not found.');
    return notification;
  }

  /** Number of unread notifications for the authenticated customer. */
  async unreadCount(profileId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    const count = await this.prisma.notification.count({
      where: { order: { customerId }, isRead: false },
    });
    return { count };
  }

  /**
   * Marks a notification as read. The customerId filter guarantees a
   * customer can never mark another customer's notification.
   */
  async markAsRead(profileId: string, notificationId: string) {
    const customerId = await this.customerIdForProfile(profileId);
    const result = await this.prisma.notification.updateMany({
      where: { notificationId, order: { customerId } },
      data: { isRead: true },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification not found.');
    }
    return this.prisma.notification.findFirst({
      where: { notificationId, order: { customerId } },
      select: notificationSelect,
    });
  }

  /**
   * Creates a notification linked to exactly one order. Customer ownership is
   * derived from orders.customer_id so the relationship cannot drift. When
   * `once` is set, the notification is skipped if the same
   * order already has a notification of that type (duplicate-event guard;
   * ORDER_READY additionally has a partial unique index in the database).
   */
  private async createNotification(params: {
    orderId: string;
    type: NotificationType;
    title: string;
    message: string;
    once?: boolean;
  }) {
    const { orderId, type, title, message, once } = params;
    if (once) {
      const existing = await this.prisma.notification.findFirst({
        where: { orderId, type },
        select: { notificationId: true },
      });
      if (existing) {
        this.logger.log(
          `Skipped duplicate ${type} notification for order ${orderId}.`,
        );
        return null;
      }
    }
    try {
      return await this.prisma.notification.create({
        data: { orderId, type, title, message },
      });
    } catch (error: unknown) {
      // P2002 = unique constraint violation (concurrent duplicate event).
      if ((error as { code?: string }).code === 'P2002') {
        this.logger.log(
          `Skipped duplicate ${type} notification for order ${orderId}.`,
        );
        return null;
      }
      throw error;
    }
  }

  /** Loads the account owner (email + name) an order's notifications belong to. */
  private async orderCustomer(orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        customerId: true,
        customer: {
          select: { customerId: true, firstName: true, email: true },
        },
      },
    });
    // Guest orders have no customer account, so there is nobody to notify.
    if (!order?.customer) return null;
    return order.customer;
  }

  /**
   * ORDER_READY — fired after an employee successfully saves the READY
   * status. Never creates a second notification for the same order.
   */
  async notifyOrderReady(orderId: string): Promise<void> {
    try {
      const customer = await this.orderCustomer(orderId);
      if (!customer) return;
      await this.createNotification({
        orderId,
        type: NotificationType.ORDER_READY,
        title: 'Order Ready for Collection',
        message: `Your order ${orderNumber(orderId)} is ready for collection.`,
        once: true,
      });
    } catch (error) {
      // The status change is already saved — never let notification issues
      // break the order workflow.
      this.logger.error(
        `Failed to create ORDER_READY notification for order ${orderId}`,
        error,
      );
    }
  }

  /**
   * PAYMENT_REJECTED — fired when a bank transfer payment proof transitions
   * to Rejected. Creates a notification record and sends the rejection email.
   */
  async notifyPaymentRejected(
    orderId: string,
    reason?: string | null,
  ): Promise<void> {
    try {
      const customer = await this.orderCustomer(orderId);
      if (!customer) return;
      await this.createNotification({
        orderId,
        type: NotificationType.PAYMENT_REJECTED,
        title: 'Payment Rejected',
        message: `Your bank transfer payment for Order ${orderNumber(orderId)} has been rejected. Please upload a new payment receipt.`,
      });
      await this.email.sendPaymentRejectedEmail({
        to: customer.email,
        customerName: customer.firstName,
        orderNumber: orderNumber(orderId),
        reason,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create PAYMENT_REJECTED notification for order ${orderId}`,
        error,
      );
    }
  }

  /**
   * PAYMENT_EXPIRED — fired when a payment proof transitions to Expired.
   * Creates a notification record and sends the expiry email.
   */
  async notifyPaymentExpired(orderId: string): Promise<void> {
    try {
      const customer = await this.orderCustomer(orderId);
      if (!customer) return;
      await this.createNotification({
        orderId,
        type: NotificationType.PAYMENT_EXPIRED,
        title: 'Payment Expired',
        message: `Your payment proof for Order ${orderNumber(orderId)} has expired.`,
      });
      await this.email.sendPaymentExpiredEmail({
        to: customer.email,
        customerName: customer.firstName,
        orderNumber: orderNumber(orderId),
      });
    } catch (error) {
      this.logger.error(
        `Failed to create PAYMENT_EXPIRED notification for order ${orderId}`,
        error,
      );
    }
  }
}
