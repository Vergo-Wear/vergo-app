import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemDto {
  @IsObject()
  product: Record<string, unknown>;

  @IsString()
  size: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

export class SaveCartDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
