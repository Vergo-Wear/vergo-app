import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { SRI_LANKAN_DISTRICTS } from '../../orders/dto/create-order.dto';

export class CreateUserAddressDto {
  @IsString()
  @IsNotEmpty({ message: 'Receiver name is required.' })
  receiverName: string;

  @IsString()
  @IsNotEmpty({ message: 'Receiver phone number is required.' })
  @Matches(/^(?:\+94|0)?[1-9][0-9]{8}$/, {
    message:
      'Receiver phone number must be a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).',
  })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Address Line 1 is required.' })
  addressLine1: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required.' })
  city: string;

  @IsString()
  @IsNotEmpty({ message: 'District is required.' })
  @Matches(new RegExp(`^(${SRI_LANKAN_DISTRICTS.join('|')})$`, 'i'), {
    message: 'District must be a valid Sri Lankan district.',
  })
  district: string;

  @IsString()
  @IsNotEmpty({ message: 'Postal code is required.' })
  @Matches(/^\d{5}$/, {
    message: 'Postal code must be a valid 5-digit Sri Lankan postal code.',
  })
  postalCode: string;

  @IsBoolean({ message: 'isPrimary must be a boolean value.' })
  @IsOptional()
  isPrimary?: boolean;
}
