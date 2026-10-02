import { IsEmail, IsNotEmpty } from 'class-validator';

export class SubscribeNewsletterDto {
  @IsNotEmpty({ message: 'Email address is required.' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;
}
