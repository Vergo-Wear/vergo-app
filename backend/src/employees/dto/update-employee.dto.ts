import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateEmployeeDto {
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsNumber()
  @IsOptional()
  salary?: number;

  @IsDateString()
  @IsOptional()
  hireDate?: string;
}
