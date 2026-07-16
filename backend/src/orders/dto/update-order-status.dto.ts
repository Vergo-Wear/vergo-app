import { IsIn, IsString } from 'class-validator';

/** Order status meaning the product is READY for the customer to collect. */
export const READY_STATUS = 'Ready for Pickup';

export const MANAGED_ORDER_STATUSES = [
  'Pending Payment',
  'Pending Verification',
  'Ready to Pick',
  'Claimed',
  'Preparing',
  'Ready for Pickup',
  'Sent',
  'Delivered',
  'Cancelled',
];

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(MANAGED_ORDER_STATUSES)
  status: string;
}
