import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VariantStockAllocationItemDto {
  @IsUUID('4', { message: 'Variant ID must be a valid UUID.' })
  @IsNotEmpty()
  variantId: string;

  @IsInt({ message: 'Quantity must be an integer.' })
  @Min(0, { message: 'Quantity must be greater than or equal to 0.' })
  quantity: number;
}

export class DistributeStockDto {
  @IsIn(['single', 'all'], {
    message: 'Target mode must be either "single" or "all".',
  })
  @IsNotEmpty()
  targetMode: 'single' | 'all';

  @IsOptional()
  @IsUUID('4', { message: 'Employee ID must be a valid UUID.' })
  employeeId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each employee ID must be a valid UUID.' })
  employeeIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantStockAllocationItemDto)
  allocations: VariantStockAllocationItemDto[];
}
