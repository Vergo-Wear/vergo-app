import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsUUID()
  @IsNotEmpty()
  profileId: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

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
