/** Supported customer notification event types. */
export const NotificationType = {
  ORDER_CREATED: 'ORDER_CREATED',
  COD_CONFIRMED: 'COD_CONFIRMED',
  COD_REJECTED: 'COD_REJECTED',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED',
  ORDER_READY: 'ORDER_READY',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
  ORDER_DISPATCHED: 'ORDER_DISPATCHED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_RETURNED: 'ORDER_RETURNED',
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

/**
 * Human-friendly short order reference used in notification and email copy
 * (full UUIDs are too noisy for customer-facing messages).
 */
export const orderNumber = (orderId: string) =>
  `#${orderId.slice(0, 8).toUpperCase()}`;
