import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(7)
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(5)
  address: string;

  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: string;
}
