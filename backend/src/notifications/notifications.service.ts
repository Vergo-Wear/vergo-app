import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios from 'axios';
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
    return this.setReadStatus(profileId, notificationId, true);
  }

  async setReadStatus(profileId: string, notificationId: string, isRead: boolean) {
    const result = await this.prisma.notification.updateMany({
      where: { notificationId, recipientProfileId: profileId },
      data: { isRead },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification not found.');
    }
    return this.prisma.notification.findFirst({
      where: { notificationId, recipientProfileId: profileId },
      select: notificationSelect,
    });
  }

  async deleteNotification(profileId: string, notificationId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        notificationId,
        recipientProfileId: profileId,
      },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification not found.');
    }
    return { success: true };
  }

  async deleteAllNotifications(profileId: string) {
    try {
      await this.prisma.notification.deleteMany({
        where: {
          recipientProfileId: profileId,
        },
      });
    } catch (e) {
      this.logger.error(`Error deleting all notifications for profile ${profileId}`, e);
    }
    return { success: true };
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
   * Generic Status Update Notification for Logged-In Customers ONLY.
   * Fired whenever an Admin or Employee updates the status of an order.
   * IGNORES guest customers completely (only sends if order.customerId / recipientProfileId exists).
   */
  async notifyOrderStatusUpdate(
    orderId: string,
    newStatus: string,
  ): Promise<void> {
    try {
      const order = await this.prisma.orders.findUnique({
        where: { orderId },
        select: {
          orderId: true,
          customerId: true,
          customer: {
            select: {
              profileId: true,
              firstName: true,
              email: true,
            },
          },
        },
      });

      // Strictly enforce: No notifications sent to guest customers (only logged-in registered customers with customerId & profileId)
      if (!order || !order.customerId || !order.customer?.profileId) {
        return;
      }

      const profileId = order.customer.profileId;
      const formattedNum = orderNumber(orderId);

      let title = `Order Status Update: ${newStatus}`;
      let message = `Your order ${formattedNum} status has been updated to "${newStatus}".`;

      const st = newStatus.trim().toLowerCase();
      if (st.includes('approved')) {
        title = 'Order Approved';
        message = `Your order ${formattedNum} has been approved by the store manager.`;
      } else if (st.includes('preparing') || st.includes('package preparing') || st.includes('package prepared')) {
        title = 'Package Preparing';
        message = `Our team is now preparing the items for order ${formattedNum}.`;
      } else if (st.includes('ready')) {
        title = 'Ready for Courier Pickup';
        message = `Order ${formattedNum} is packed and staged for courier pickup.`;
      } else if (st.includes('handed') || st.includes('sent')) {
        title = 'Handed to Courier';
        message = `Order ${formattedNum} has been handed to Citypak Courier and is on its way!`;
      } else if (st.includes('returned')) {
        title = 'Parcel Returned';
        message = `Delivery attempt for order ${formattedNum} was returned to the warehouse.`;
      } else if (st.includes('complete') || st.includes('finish') || st.includes('deliver')) {
        title = 'Order Completed';
        message = `Order ${formattedNum} has been successfully completed. Thank you for shopping with Vergo Wear!`;
      }

      await this.createNotification({
        recipientProfileId: profileId,
        orderId,
        channel: 'IN_APP',
        type: NotificationType.ORDER_READY,
        title,
        message,
      });

      this.logger.log(
        `Sent status update (${newStatus}) notification to logged-in customer ${profileId} for order ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send status update notification for order ${orderId}`,
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
          totalAmount: true,
          createdAt: true,
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                  color: true,
                  size: true,
                },
              },
            },
          },
          shippingDetails: true,
          customer: {
            select: {
              customerId: true,
              profileId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          customerDetails: {
            select: {
              firstName: true,
              lastName: true,
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
        : orderNumber(checkout.checkoutId);
      const cleanOrderId = reference.replace(/^#/, '');
      const rawUniqueId = checkout.order?.orderId || checkout.checkoutId;

      const customerFullName = checkout.customer
        ? `${checkout.customer.firstName || ''} ${checkout.customer.lastName || ''}`.trim()
        : checkout.customerDetails
          ? `${checkout.customerDetails.firstName || ''} ${checkout.customerDetails.lastName || ''}`.trim()
          : recipient.firstName;

      const orderItems =
        checkout.items && checkout.items.length > 0
          ? checkout.items
              .map((item) => {
                const title = item.variant?.product?.name || 'Item';
                const color = item.variant?.color?.name ? ` (${item.variant.color.name})` : '';
                const size = item.variant?.size?.name ? ` - Size: ${item.variant.size.name}` : '';
                return `${title}${color}${size} x${item.quantity}`;
              })
              .join(', ')
          : 'Items details pending';

      const shipping = checkout.shippingDetails;
      const deliveryAddress = shipping
        ? [
            shipping.addressLine1,
            shipping.addressLine2,
            shipping.city,
            shipping.district,
            shipping.postalCode,
          ]
            .filter(Boolean)
            .join(', ')
        : 'Address not provided';

      const orderDate = checkout.createdAt
        ? checkout.createdAt.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const formattedTotal = Number(checkout.totalAmount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const rejectionReason = checkout.adminNotes || 'Verification could not be completed';

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

      if (approved) {
        await this.notifyEmployees(
          'New Order Approved',
          `Order ${reference} has been approved by admin and is ready for processing.`,
          checkout.order?.orderId ?? null,
          checkoutId,
          NotificationType.ORDER_CREATED,
        );

        // Send Order Approved email to customer (Resend template)
        await this.email.sendOrderApprovedEmail({
          to: recipient.email,
          customerName: customerFullName || recipient.firstName,
          orderReference: reference,
          idempotencyKey: `order-approved-${checkoutId}`,
          variables: {
            order_id: cleanOrderId,
            order_reference: reference,
            unique_order_id: rawUniqueId,
            UNIQUE_ORDER_ID: rawUniqueId,
            customer_name: customerFullName || recipient.firstName,
            CUSTOMER_NAME: customerFullName || recipient.firstName,
            ORDER_REFERENCE: reference,
            order_items: orderItems,
            ordered_products: orderItems,
            ORDER_ITEMS: orderItems,
            total_amount: formattedTotal,
            TOTAL_AMOUNT: formattedTotal,
            order_date: orderDate,
            delivery_address: deliveryAddress,
            payment_method: checkout.paymentMethod,
          },
        });
      } else {
        // Order Rejection email to customer (Resend template)
        await this.email.sendOrderRejectedEmail({
          to: recipient.email,
          customerName: customerFullName || recipient.firstName,
          orderReference: reference,
          idempotencyKey: `order-rejected-${checkoutId}`,
          variables: {
            order_id: cleanOrderId,
            order_reference: reference,
            unique_order_id: rawUniqueId,
            UNIQUE_ORDER_ID: rawUniqueId,
            customer_name: customerFullName || recipient.firstName,
            CUSTOMER_NAME: customerFullName || recipient.firstName,
            ORDER_REFERENCE: reference,
            order_items: orderItems,
            ordered_products: orderItems,
            ORDER_ITEMS: orderItems,
            rejection_reason: rejectionReason,
            REJECTION_REASON: rejectionReason,
            total_amount: formattedTotal,
            TOTAL_AMOUNT: formattedTotal,
            order_date: orderDate,
            delivery_address: deliveryAddress,
            payment_method: checkout.paymentMethod,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to create checkout review notification for ${checkoutId}`,
        error,
      );
    }
  }

  async notifyOrderCreated(checkoutId: string): Promise<void> {
    try {
      await this.notifyAdmins(
        'New Order Received',
        `A new order ${orderNumber(checkoutId)} has been placed by a customer.`,
        checkoutId,
        NotificationType.ORDER_CREATED,
        true,
      );

      // Fetch pending checkout details to send emails to admin and customer
      const checkout = await this.prisma.pendingCheckout.findUnique({
        where: { checkoutId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                  color: true,
                  size: true,
                },
              },
            },
          },
          customerDetails: true,
          shippingDetails: true,
          customer: true,
          paymentProof: true,
        },
      });

      if (!checkout) return;

      const customerEmail =
        checkout.customer?.email || checkout.customerDetails?.email;
      const customerFirstName =
        checkout.customer?.firstName ||
        checkout.customerDetails?.firstName ||
        'Valued Customer';
      const customerLastName =
        checkout.customer?.lastName ||
        checkout.customerDetails?.lastName ||
        '';
      const customerName = `${customerFirstName} ${customerLastName}`.trim();
      const customerPhone =
        checkout.customerDetails?.phone ||
        checkout.customer?.phone ||
        'Not provided';
      const reference = orderNumber(checkoutId);
      const cleanOrderId = reference.replace(/^#/, '');
      const shipping = checkout.shippingDetails;
      const orderDate = checkout.createdAt
        ? checkout.createdAt.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const orderedProducts =
        checkout.items && checkout.items.length > 0
          ? checkout.items
              .map((item) => {
                const title = item.variant?.product?.name || 'Item';
                const color = item.variant?.color?.name ? ` (${item.variant.color.name})` : '';
                const size = item.variant?.size?.name ? ` - Size: ${item.variant.size.name}` : '';
                return `${title}${color}${size} x${item.quantity}`;
              })
              .join(', ')
          : 'Items details pending';

      const deliveryAddress = shipping
        ? [
            shipping.addressLine1,
            shipping.addressLine2,
            shipping.city,
            shipping.district,
            shipping.postalCode,
          ]
            .filter(Boolean)
            .join(', ')
        : 'Address not provided';

      const formattedTotal = Number(checkout.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // 1. Send Order Received Email to Customer
      if (customerEmail) {
        let attachmentBuffer: Buffer | undefined;
        let attachmentFilename: string | undefined;

        // For Bank Transfer, attach uploaded payment proof receipt if available
        if (checkout.paymentProof?.fileUrl) {
          try {
            const proofRes = await axios.get<ArrayBuffer>(checkout.paymentProof.fileUrl, {
              responseType: 'arraybuffer',
              timeout: 15000,
            });
            attachmentBuffer = Buffer.from(proofRes.data);
            attachmentFilename =
              checkout.paymentProof.fileName ||
              `receipt-${reference.replace(/^#/, '')}.jpg`;
          } catch (receiptErr) {
            this.logger.error(
              `Failed to fetch payment proof receipt for checkout ${checkoutId}:`,
              receiptErr,
            );
          }
        }

        await this.email.sendOrderReceivedEmail({
          to: customerEmail,
          customerName,
          orderReference: reference,
          idempotencyKey: `order-received-${checkoutId}`,
          attachmentBuffer,
          attachmentFilename,
          variables: {
            order_id: cleanOrderId,
            order_reference: reference,
            unique_order_id: checkoutId,
            UNIQUE_ORDER_ID: checkoutId,
            customer_name: customerName,
            order_date: orderDate,
            payment_method: checkout.paymentMethod,
            order_items: orderedProducts,
            ordered_products: orderedProducts,
            total_amount: formattedTotal,
            delivery_address: deliveryAddress,
            ORDER_ITEMS: orderedProducts,
            TOTAL_AMOUNT: formattedTotal,
          },
        });
      }

      // 2. Send New Order Notification to Administrator
      const adminEmail = process.env.VERGO_ADMIN_EMAIL;
      const frontendUrl = process.env.FRONTEND_URL;
      const adminDashboardUrl = frontendUrl ? `${frontendUrl.replace(/\/$/, '')}/admin/orders` : undefined;

      if (adminEmail) {
        await this.email.sendNewOrderAdminEmail({
          to: adminEmail,
          variables: {
            // Reference & ID variables
            order_reference: reference,
            order_id: checkoutId,
            unique_order_id: checkoutId,
            clean_order_id: cleanOrderId,

            // Order details
            order_date: orderDate,
            customer_name: customerName,
            customer_email: customerEmail || 'Not provided',
            customer_phone: customerPhone,
            payment_method: checkout.paymentMethod,
            payment_status: checkout.status,
            order_status: checkout.status,
            total_amount: formattedTotal,
            order_items: orderedProducts,
            ordered_products: orderedProducts,
            delivery_address: deliveryAddress,
            admin_dashboard_url: adminDashboardUrl || '',

            // Uppercase aliases for complete compatibility
            ORDER_REFERENCE: reference,
            ORDER_ID: checkoutId,
            UNIQUE_ORDER_ID: checkoutId,
            CUSTOMER_NAME: customerName,
            CUSTOMER_EMAIL: customerEmail || 'Not provided',
            CUSTOMER_PHONE: customerPhone,
            ORDER_DATE: orderDate,
            ORDERED_PRODUCTS: orderedProducts,
            ORDER_ITEMS: orderedProducts,
            PAYMENT_METHOD: checkout.paymentMethod,
            PAYMENT_STATUS: checkout.status,
            ORDER_STATUS: checkout.status,
            TOTAL_AMOUNT: formattedTotal,
            DELIVERY_ADDRESS: deliveryAddress,
            ADMIN_DASHBOARD_URL: adminDashboardUrl || '',
          },
          idempotencyKey: `new-order-admin-${checkoutId}`,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify admins for new order ${checkoutId}`, error);
    }
  }

  private async notifyAdmins(
    title: string,
    message: string,
    id: string | null = null,
    type: NotificationType = NotificationType.ORDER_CREATED,
    isCheckout = false,
  ) {
    try {
      const adminProfiles = await this.prisma.profiles.findMany({
        where: {
          role: {
            roleName: { in: ['Admin', 'admin', 'ADMIN'], mode: 'insensitive' },
          },
        },
        select: { id: true },
      });

      for (const admin of adminProfiles) {
        await this.createNotification({
          recipientProfileId: admin.id,
          orderId: isCheckout ? null : id,
          checkoutId: isCheckout ? id : null,
          channel: 'IN_APP',
          type,
          title: `[Logistics Alert] ${title}`,
          message,
        });
      }
    } catch (err) {
      this.logger.error(`Failed to notify admins for ${id}`, err);
    }
  }

  private async notifyEmployees(
    title: string,
    message: string,
    orderId?: string | null,
    checkoutId?: string | null,
    type: NotificationType = NotificationType.ORDER_CREATED,
  ) {
    try {
      const employeeProfiles = await this.prisma.profiles.findMany({
        where: {
          role: {
            roleName: {
              equals: 'Employee',
              mode: 'insensitive',
            },
          },
        },
        select: { id: true },
      });

      for (const employee of employeeProfiles) {
        await this.createNotification({
          recipientProfileId: employee.id,
          orderId: orderId ?? null,
          checkoutId: checkoutId ?? null,
          channel: 'IN_APP',
          type,
          title: `[Order Update] ${title}`,
          message,
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to notify employees for ${orderId || checkoutId}`,
        err,
      );
    }
  }

  /**
   * ORDER_DISPATCHED — fired when Citypak scans FIRST MILE RECEIVE SCAN
   */
  async notifyOrderDispatched(orderId: string, trackingNumber: string): Promise<void> {
    try {
      const customer = await this.orderCustomer(orderId);
      if (customer) {
        await this.createNotification({
          recipientProfileId: customer.profileId,
          orderId,
          channel: customer.profileId ? 'IN_APP' : 'EMAIL',
          type: NotificationType.ORDER_DISPATCHED,
          title: 'Order Dispatched with Citypak',
          message: `Your order ${orderNumber(orderId)} has been collected by Citypak and is on the way! Tracking: ${trackingNumber}`,
          once: true,
        });

        // Send delivery notification email to customer via Resend template
        if (customer.email) {
          await this.email.sendDeliveryNotificationEmail({
            to: customer.email,
            customerName: customer.firstName || 'Valued Customer',
            orderReference: orderNumber(orderId),
            idempotencyKey: `delivery-dispatched-${orderId}`,
          });
        }
      }

      await this.notifyAdmins(
        'Order Dispatched',
        `Order ${orderNumber(orderId)} was collected by Citypak. Tracking #${trackingNumber}`,
        orderId,
        NotificationType.ORDER_DISPATCHED,
      );
    } catch (error) {
      this.logger.error(`Failed to create ORDER_DISPATCHED notification for ${orderId}`, error);
    }
  }

  /**
   * OUT_FOR_DELIVERY — fired when Citypak status is OUT FOR DELIVERY
   */
  async notifyOutForDelivery(orderId: string, trackingNumber: string): Promise<void> {
    try {
      const customer = await this.orderCustomer(orderId);
      if (customer) {
        await this.createNotification({
          recipientProfileId: customer.profileId,
          orderId,
          channel: customer.profileId ? 'IN_APP' : 'EMAIL',
          type: NotificationType.OUT_FOR_DELIVERY,
          title: 'Out for Delivery',
          message: `Your order ${orderNumber(orderId)} is out for delivery with Citypak today! Tracking: ${trackingNumber}`,
          once: true,
        });
      }

      await this.notifyAdmins(
        'Out for Delivery',
        `Order ${orderNumber(orderId)} is out for delivery today with Citypak. Tracking #${trackingNumber}`,
        orderId,
        NotificationType.OUT_FOR_DELIVERY,
      );
    } catch (error) {
      this.logger.error(`Failed to create OUT_FOR_DELIVERY notification for ${orderId}`, error);
    }
  }

  /**
   * ORDER_DELIVERED — fired when Citypak delivers the parcel (DL)
   */
  async notifyOrderDelivered(orderId: string, trackingNumber: string): Promise<void> {
    try {
      const customer = await this.orderCustomer(orderId);
      if (customer) {
        await this.createNotification({
          recipientProfileId: customer.profileId,
          orderId,
          channel: customer.profileId ? 'IN_APP' : 'EMAIL',
          type: NotificationType.ORDER_DELIVERED,
          title: 'Order Delivered',
          message: `Your order ${orderNumber(orderId)} has been successfully delivered! Thank you for shopping with Vergo Wear.`,
          once: true,
        });
      }

      await this.notifyAdmins(
        'Order Delivered',
        `Order ${orderNumber(orderId)} was successfully delivered by Citypak. Tracking #${trackingNumber}`,
        orderId,
        NotificationType.ORDER_DELIVERED,
      );
    } catch (error) {
      this.logger.error(`Failed to create ORDER_DELIVERED notification for ${orderId}`, error);
    }
  }

  /**
   * ORDER_RETURNED — fired when courier status is Returned To Merchant (RTM)
   */
  async notifyOrderReturned(orderId: string): Promise<void> {
    try {
      const customer = await this.orderCustomer(orderId);
      if (customer) {
        await this.createNotification({
          recipientProfileId: customer.profileId,
          orderId,
          channel: customer.profileId ? 'IN_APP' : 'EMAIL',
          type: NotificationType.ORDER_RETURNED,
          title: 'Order Returned to Merchant',
          message: `Your order ${orderNumber(orderId)} could not be delivered and has been returned to our warehouse. Please contact support.`,
          once: true,
        });
      }

      await this.notifyAdmins(
        'Order Returned (RTM)',
        `Order ${orderNumber(orderId)} could not be delivered and has returned to merchant.`,
        orderId,
        NotificationType.ORDER_RETURNED,
      );
    } catch (error) {
      this.logger.error(`Failed to create ORDER_RETURNED notification for ${orderId}`, error);
    }
  }

  /**
   * ORDER_CLAIMED — fired when an employee claims an order.
   * Sends an admin notification: "Order <id> is taken by <employee name> (<branch name>)"
   */
  async notifyOrderClaimed(
    orderId: string,
    employeeName: string,
    branchName?: string,
  ): Promise<void> {
    try {
      const displayOrderId = orderNumber(orderId);
      const branchText = branchName ? ` (${branchName})` : '';
      const message = `Order ${displayOrderId} is taken by ${employeeName}${branchText}`;

      await this.notifyAdmins(
        'Order Taken',
        message,
        orderId,
        NotificationType.ORDER_READY,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create ORDER_CLAIMED notification for order ${orderId}`,
        error,
      );
    }
  }

  /**
   * STOCK_REQUEST — fired when an employee requests stock from Admin.
   * Sends an admin notification detailing the requested product, SKU, quantity, and employee info.
   */
  async requestStock(
    profileId: string,
    dto: {
      sku: string;
      productName?: string;
      size?: string;
      color?: string;
      quantity: number;
      notes?: string;
    },
  ) {
    let employeeName = 'Employee';
    let employeeIdDisplay = 'EMP-VERGO';
    let branchName = 'Main Warehouse';
    let employeeEmail = 'N/A';

    try {
      const employee = await this.prisma.employee.findFirst({
        where: { profileId },
        include: {
          branch: true,
          profile: true,
        },
      });

      if (employee) {
        employeeName = `${employee.firstName} ${employee.lastName}`.trim();
        employeeIdDisplay = employee.employeeId
          ? `EMP-${employee.employeeId.slice(0, 8).toUpperCase()}`
          : 'EMP-VERGO';
        branchName = employee.branch?.name || 'Main Warehouse';
        employeeEmail = (employee.profile as any)?.email || employee.phone || 'N/A';
      } else {
        const profile = await this.prisma.profiles.findUnique({
          where: { id: profileId },
        });
        if (profile) {
          employeeName = (profile as any).email || profile.username || 'Employee';
          employeeEmail = (profile as any).email || 'N/A';
        }
      }
    } catch (e) {
      this.logger.warn(`Could not resolve employee profile for ${profileId}`, e);
    }

    const title = `Stock Request: ${dto.productName || dto.sku}`;
    const variantInfo = [dto.size ? `Size: ${dto.size}` : null, dto.color ? `Color: ${dto.color}` : null]
      .filter(Boolean)
      .join(' / ');
    const variantText = variantInfo ? ` (${variantInfo})` : '';
    const notesText = dto.notes ? ` Notes: ${dto.notes}` : '';
    const message = `${employeeName} requested ${dto.quantity} units of ${dto.productName || 'product'} [SKU: ${dto.sku}]${variantText}.${notesText}`;

    // 1. In-app admin notification
    await this.notifyAdmins(
      title,
      message,
      null,
      NotificationType.STOCK_REQUEST,
    );

    // 2. Email notification to Admin via Resend
    const adminEmail = process.env.VERGO_ADMIN_EMAIL;
    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const adminInventoryUrl = frontendUrl ? `${frontendUrl}/admin/inventory` : 'https://www.vergo.lk/admin/inventory';
    const requestDate = new Date().toISOString().split('T')[0];

    if (adminEmail) {
      try {
        await this.email.sendStockRequestAdminEmail({
          to: adminEmail,
          variables: {
            EMPLOYEE_NAME: employeeName,
            employee_name: employeeName,
            EMPLOYEE_ID: employeeIdDisplay,
            employee_id: employeeIdDisplay,
            BRANCH_NAME: branchName,
            branch_name: branchName,
            EMPLOYEE_EMAIL: employeeEmail,
            employee_email: employeeEmail,
            PRODUCT_NAME: dto.productName || 'Product Variant',
            product_name: dto.productName || 'Product Variant',
            SKU: dto.sku,
            sku: dto.sku,
            QUANTITY: String(dto.quantity),
            quantity: String(dto.quantity),
            SIZE: dto.size || 'N/A',
            size: dto.size || 'N/A',
            COLOR: dto.color || 'N/A',
            color: dto.color || 'N/A',
            NOTES: dto.notes || 'None',
            notes: dto.notes || 'None',
            REQUEST_DATE: requestDate,
            request_date: requestDate,
            ADMIN_INVENTORY_URL: adminInventoryUrl,
            admin_inventory_url: adminInventoryUrl,
          },
        });
      } catch (emailErr) {
        this.logger.error(`Failed to send stock request email to admin:`, emailErr);
      }
    }

    return { success: true, message: 'Stock request notification sent to Admin.' };
  }
}
