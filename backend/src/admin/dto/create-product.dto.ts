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

class CreateVariantDto {
  @IsString() sku: string;
  @IsString() color: string;
  @IsString() size: string;
  @IsNumber() priceAdjustment: number;
  @IsInt() @Min(0) quantity: number;
  @IsOptional() @IsUrl({ require_tld: false }) imageUrl?: string;
}

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsNumber() @Min(0) basePrice: number;
  @IsIn(['active', 'draft']) status: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
