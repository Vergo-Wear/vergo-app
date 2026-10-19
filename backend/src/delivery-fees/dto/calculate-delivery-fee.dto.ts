import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CalculateDeliveryFeeDto {
  @IsString()
  @IsNotEmpty()
  district: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalQuantity: number;
}
