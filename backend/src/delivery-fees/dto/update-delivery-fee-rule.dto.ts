import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateDeliveryFeeRuleDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseDeliveryFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  baseItemLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  additionalItemBlockSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalBlockFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  fuelSurchargePercentage?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
