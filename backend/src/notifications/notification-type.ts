/** Supported customer notification event types. */
export const NotificationType = {
  ORDER_READY: 'ORDER_READY',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

/**
 * Human-friendly short order reference used in notification and email copy
 * (full UUIDs are too noisy for customer-facing messages).
 */
export const orderNumber = (orderId: string) =>
  `#${orderId.slice(0, 8).toUpperCase()}`;
