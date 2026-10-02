import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetTempPasswordDto {
  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'A valid email is required.' })
  email: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  tempPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters long.' })
  newPassword?: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;
}
