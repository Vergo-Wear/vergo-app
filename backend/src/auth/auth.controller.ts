import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CustomerSignupDto } from './dto/customer-signup.dto';
import { SigninDto } from './dto/signin.dto';
import { GoogleCompleteProfileDto } from './dto/google-complete-profile.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshSession(@Body() dto: RefreshSessionDto) {
    return this.authService.refreshSession(dto.refreshToken);
  }

  /**
   * Registers a new customer and returns the created customer and profile details.
   */
  @Post('customer/signup')
  async customerSignup(@Body() dto: CustomerSignupDto) {
    return this.authService.customerSignup(dto);
  }

  /**
   * Authenticats a customer with email or phone number and password.
   */
  @Post('customer/signin')
  @HttpCode(HttpStatus.OK)
  async customerSignin(@Body() dto: SigninDto) {
    return this.authService.signin(dto, 'Customer');
  }

  /**
   * Authenticats an employee with email or phone number and password.
   */
  @Post('employee/signin')
  @HttpCode(HttpStatus.OK)
  async employeeSignin(@Body() dto: SigninDto) {
    return this.authService.signin(dto, 'Employee');
  }

  @Post('employee/reset-temp-password')
  @HttpCode(HttpStatus.OK)
  async employeeResetTempPassword(
    @Body()
    dto: {
      email: string;
      currentPassword?: string;
      newPassword?: string;
      tempPassword?: string;
    },
  ) {
    return this.authService.resetTempPassword(dto);
  }

  /**
   * Authenticats an admin with email or phone number and password.
   */
  @Post('admin/signin')
  @HttpCode(HttpStatus.OK)
  async adminSignin(@Body() dto: SigninDto) {
    return this.authService.signin(dto, 'Admin');
  }

  /**
   * Called after the client-side Google OAuth flow completes.
   *
   * Returns one of two responses:
   * - { needsOnboarding: false, user, profile } — existing customer, login complete.
   * - { needsOnboarding: true, user }            — new user, redirect to complete-profile page.
   */
  @Post('customer/google-signin')
  @HttpCode(HttpStatus.OK)
  async customerGoogleSignin(@Body('accessToken') accessToken: string) {
    if (!accessToken) {
      throw new UnauthorizedException('accessToken is required.');
    }
    return this.authService.googleSignin(accessToken);
  }

  /**
   * Completes onboarding for a new Google OAuth customer.
   * Creates the profile and customer records using the verified Google identity.
   * Must be called after /customer/google-signin returns { needsOnboarding: true }.
   */
  @Post('customer/google-complete-profile')
  async customerGoogleCompleteProfile(@Body() dto: GoogleCompleteProfileDto) {
    return this.authService.googleCompleteProfile(dto);
  }
}
