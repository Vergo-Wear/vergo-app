import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Order status meaning the product is READY for the customer to collect. */
export const READY_STATUS = 'Ready for Pickup';

export const MANAGED_ORDER_STATUSES = [
  'Ready to Process',
  'Claimed',
  'Preparing',
  'Ready for Pickup',
  'Sent',
  'Delivered',
  'Cancelled',
  'Completed',
];

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(MANAGED_ORDER_STATUSES)
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
