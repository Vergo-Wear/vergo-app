import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsInt,
  IsIn,
  Matches,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export const SRI_LANKAN_DISTRICTS = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Moneragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Tech District',
  'Trincomalee',
  'Vavuniya',
];

export const VALID_PAYMENT_METHODS = [
  'cod',
  'cash on delivery',
  'bank_transfer',
  'direct bank transfer',
];

export class ContactDetailsDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName: string;

  @IsEmail({}, { message: 'Invalid email address format.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Contact phone number is required.' })
  @Matches(/^(?:\+94|0)?[1-9][0-9]{8}$/, {
    message:
      'Phone number must be a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).',
  })
  phone: string;
}

export class ShippingDetailsDto {
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
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  deliveryNote?: string;
}

export class OrderItemDto {
  @IsUUID(4, { message: 'Invalid product variant ID format.' })
  @IsNotEmpty({ message: 'Product variant ID is required.' })
  variantId: string;

  @IsInt({ message: 'Quantity must be an integer.' })
  @Min(1, { message: 'Quantity must be at least 1.' })
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Payment method is required.' })
  @IsIn(VALID_PAYMENT_METHODS, {
    message: 'Payment method must be either "cod" or "bank_transfer".',
  })
  paymentMethod: string;

  @IsNumber({}, { message: 'Delivery fee must be a number.' })
  @Min(0, { message: 'Delivery fee cannot be negative.' })
  deliveryFee: number;

  @ValidateNested()
  @Type(() => ContactDetailsDto)
  @IsNotEmpty({ message: 'Contact details are required.' })
  contactDetails: ContactDetailsDto;

  @ValidateNested()
  @Type(() => ShippingDetailsDto)
  @IsNotEmpty({ message: 'Shipping details are required.' })
  shippingDetails: ShippingDetailsDto;

  @IsArray({ message: 'Items list must be an array.' })
  @ArrayMinSize(1, { message: 'Order must contain at least 1 item.' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
