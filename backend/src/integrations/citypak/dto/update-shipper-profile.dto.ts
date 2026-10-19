import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateShipperProfileDto {
  @IsNotEmpty({ message: 'Shipper name is required' })
  @IsString()
  shipperName: string;

  @IsNotEmpty({ message: 'Address Line 1 is required' })
  @IsString()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  addressLine3?: string;

  @IsOptional()
  @IsString()
  addressLine4?: string;

  @IsNotEmpty({ message: 'Address City is required' })
  @IsString()
  addressLine4City: string;

  @IsNotEmpty({ message: 'Contact Number 1 is required' })
  @IsString()
  contactNumber1: string;

  @IsOptional()
  @IsString()
  contactNumber2?: string;
}
