import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Matches,
} from 'class-validator';

export class CreateEmployeeAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName: string;

  @IsEmail({}, { message: 'Invalid email address format.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @IsNotEmpty({ message: 'Phone number is required.' })
  @Matches(/^(?:\+94|0)?[1-9][0-9]{8}$/, {
    message:
      'Phone number must be a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).',
  })
  phone: string;

  @IsUUID('all', { message: 'A valid branch must be selected.' })
  @IsNotEmpty({ message: 'Branch is required.' })
  branchId: string;

  @IsString()
  @IsNotEmpty({ message: 'Position is required.' })
  position: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  commissionPerParcel?: number;
}
