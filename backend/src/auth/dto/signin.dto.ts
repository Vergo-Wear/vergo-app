import { IsNotEmpty, IsString } from 'class-validator';

export class SigninDto {
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
