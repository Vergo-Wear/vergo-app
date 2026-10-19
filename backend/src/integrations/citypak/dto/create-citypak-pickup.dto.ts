import { ArrayMinSize, IsArray, IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCitypakPickupDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one order must be selected for pickup' })
  @IsString({ each: true })
  orderIds: string[];

  @IsString()
  @IsNotEmpty({ message: 'Pickup address line 1 is required' })
  pickupAddressLine1: string;

  @IsOptional()
  @IsString()
  pickupAddressLine2?: string;

  @IsOptional()
  @IsString()
  pickupAddressLine3?: string;

  @IsString()
  @IsNotEmpty({ message: 'Pickup city is required' })
  pickupAddressLine4City: string;

  @IsString()
  @IsNotEmpty({ message: 'Pickup contact person is required' })
  pickupContactPerson: string;

  @IsString()
  @IsNotEmpty({ message: 'Pickup contact number is required' })
  pickupContactNumber1: string;

  @IsDateString({}, { message: 'Pickup from date/time must be a valid ISO date string' })
  pickupFromDatetime: string;

  @IsDateString({}, { message: 'Pickup to date/time must be a valid ISO date string' })
  pickupToDatetime: string;
}
