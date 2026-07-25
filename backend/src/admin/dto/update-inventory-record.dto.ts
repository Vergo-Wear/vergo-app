import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateInventoryRecordDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsUUID()
  supplierId: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsIn(['active', 'draft'])
  status: string;

  @IsString()
  @MinLength(1)
  sku: string;

  @IsUUID()
  colorId: string;

  @IsUUID()
  sizeId: string;

  @IsNumber()
  priceAdjustment: number;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsInt()
  @Min(0)
  reorderLevel: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;
}
