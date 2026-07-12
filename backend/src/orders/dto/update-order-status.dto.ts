import { IsIn, IsString } from 'class-validator';

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
