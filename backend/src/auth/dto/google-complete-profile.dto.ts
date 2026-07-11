import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleCompleteProfileDto {
  /**
   * The Supabase access token returned after the Google OAuth flow completes.
   * Used to identify and verify the authenticated user.
   */
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  defaultShippingAddress?: string;
}
