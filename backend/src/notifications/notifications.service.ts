import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationType, orderNumber } from './notification-type';

/** Fields returned to the customer for every notification endpoint. */
const notificationSelect = {
  notificationId: true,
  orderId: true,
  checkoutId: true,
  type: true,
  title: true,
  message: true,
  channel: true,
  status: true,
  sentAt: true,
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

  /** All notifications belonging to the authenticated customer, newest first. */
  async findCustomerNotifications(profileId: string) {
    return this.prisma.notification.findMany({
      where: { recipientProfileId: profileId },
      select: notificationSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** A single notification — only visible to the customer who owns it. */
  async findCustomerNotification(profileId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { notificationId, recipientProfileId: profileId },
      select: notificationSelect,
    });
    if (!notification) throw new NotFoundException('Notification not found.');
    return notification;
  }

  /** Number of unread notifications for the authenticated customer. */
  async unreadCount(profileId: string) {
    const count = await this.prisma.notification.count({
      where: { recipientProfileId: profileId, isRead: false },
    });
    return { count };
  }

  /**
   * Marks a notification as read. The customerId filter guarantees a
   * customer can never mark another customer's notification.
   */
  async markAsRead(profileId: string, notificationId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { notificationId, recipientProfileId: profileId },
      data: { isRead: true },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification not found.');
    }
    return this.prisma.notification.findFirst({
      where: { notificationId, recipientProfileId: profileId },
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
    recipientProfileId: string | null;
    orderId?: string | null;
    checkoutId?: string | null;
    channel?: 'IN_APP' | 'EMAIL' | 'SMS';
    type: NotificationType;
    title: string;
    message: string;
    once?: boolean;
  }) {
    const {
      recipientProfileId,
      orderId,
      checkoutId,
      channel = 'IN_APP',
      type,
      title,
      message,
      once,
    } = params;
    if (once) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          orderId: orderId ?? undefined,
          checkoutId: checkoutId ?? undefined,
          type,
        },
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
        data: {
          recipientProfileId,
          orderId,
          checkoutId,
          type,
          title,
          message,
          channel,
          status: channel === 'IN_APP' ? 'Sent' : 'Pending',
          sentAt: channel === 'IN_APP' ? new Date() : null,
        },
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

  /** Resolves either an account profile or the immutable guest order snapshot. */
  private async orderCustomer(orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        customerId: true,
        customer: {
          select: {
            customerId: true,
            profileId: true,
            firstName: true,
            email: true,
          },
        },
        customerDetails: {
          select: {
            firstName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    if (!order) return null;
    if (order.customer) {
      return {
        profileId: order.customer.profileId,
        firstName: order.customer.firstName,
        email: order.customer.email,
        phone: order.customerDetails?.phone ?? null,
      };
    }
    if (!order.customerDetails?.email) return null;
    return {
      profileId: null,
      firstName: order.customerDetails.firstName,
      email: order.customerDetails.email,
      phone: order.customerDetails.phone,
    };
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
        recipientProfileId: customer.profileId,
        orderId,
        channel: customer.profileId ? 'IN_APP' : 'EMAIL',
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
        recipientProfileId: customer.profileId,
        orderId,
        channel: customer.profileId ? 'IN_APP' : 'EMAIL',
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
        recipientProfileId: customer.profileId,
        orderId,
        channel: customer.profileId ? 'IN_APP' : 'EMAIL',
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

  /**
   * Notifies an account customer in-app or queues an email notification for
   * the immutable guest checkout contact after Admin review.
   */
  async notifyCheckoutReviewed(checkoutId: string): Promise<void> {
    try {
      const checkout = await this.prisma.pendingCheckout.findUnique({
        where: { checkoutId },
        select: {
          checkoutId: true,
          customerId: true,
          paymentMethod: true,
          status: true,
          adminNotes: true,
          customer: {
            select: {
              customerId: true,
              profileId: true,
              firstName: true,
              email: true,
            },
          },
          customerDetails: {
            select: {
              firstName: true,
              email: true,
              phone: true,
            },
          },
          order: { select: { orderId: true } },
        },
      });
      if (!checkout) return;
      const recipient = checkout.customer
        ? {
            profileId: checkout.customer.profileId,
            firstName: checkout.customer.firstName,
            email: checkout.customer.email,
          }
        : checkout.customerDetails?.email
          ? {
              profileId: null,
              firstName: checkout.customerDetails.firstName,
              email: checkout.customerDetails.email,
            }
          : null;
      if (!recipient) return;

      const isBank = checkout.paymentMethod.toLowerCase().includes('bank');
      const approved = checkout.status === 'Approved';
      const type = approved
        ? isBank
          ? NotificationType.PAYMENT_APPROVED
          : NotificationType.COD_CONFIRMED
        : isBank
          ? NotificationType.PAYMENT_REJECTED
          : NotificationType.COD_REJECTED;
      const reference = checkout.order?.orderId
        ? orderNumber(checkout.order.orderId)
        : `#${checkout.checkoutId.slice(0, 8).toUpperCase()}`;
      const title = approved
        ? isBank
          ? 'Payment Approved'
          : 'COD Order Confirmed'
        : isBank
          ? 'Payment Rejected'
          : 'COD Order Rejected';
      const message = approved
        ? `${isBank ? 'Your bank transfer payment' : 'Your Cash on Delivery order'} ${reference} has been approved and is ready for processing.`
        : `${isBank ? 'Your bank transfer payment' : 'Your Cash on Delivery order'} ${reference} has been rejected.${checkout.adminNotes ? ` Reason: ${checkout.adminNotes}` : ''}`;

      await this.createNotification({
        recipientProfileId: recipient.profileId,
        orderId: checkout.order?.orderId ?? null,
        checkoutId,
        channel: recipient.profileId ? 'IN_APP' : 'EMAIL',
        type,
        title,
        message,
        once: true,
      });

      if (isBank && !approved) {
        await this.email.sendPaymentRejectedEmail({
          to: recipient.email,
          customerName: recipient.firstName,
          orderNumber: reference,
          reason: checkout.adminNotes,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to create checkout review notification for ${checkoutId}`,
        error,
      );
    }
  }
}
