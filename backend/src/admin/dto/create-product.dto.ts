import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateVariantDto {
  @IsString() sku: string;
  @IsOptional() @IsIn(['show', 'hidden']) status?: string;
  @IsOptional() @IsUUID() colorId?: string;
  @IsOptional() @IsUUID() sizeId?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() size?: string;
  @IsNumber() priceAdjustment: number;
  @IsInt() @Min(0) quantity: number;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsInt() @Min(0) reorderLevel?: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
}

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsNumber() @Min(0) basePrice: number;
  @IsIn(['live', 'hold', 'hidden']) status: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
