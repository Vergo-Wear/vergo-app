import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class CustomerSignupDto {
  @IsEmail({}, { message: 'Invalid email address format.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsOptional()
  @Matches(/^(?:\+94|0)?[1-9][0-9]{8}$/, {
    message:
      'Phone number must be a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).',
  })
  phone?: string;

  @IsOptional()
  @Matches(/^(?:\+94|0)?[1-9][0-9]{8}$/, {
    message:
      'Mobile number must be a valid Sri Lankan mobile number (e.g. 0771234567 or +94771234567).',
  })
  mobileNumber?: string;

}
