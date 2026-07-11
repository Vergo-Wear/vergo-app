import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CustomerSignupDto } from './dto/customer-signup.dto';
import { SigninDto } from './dto/signin.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  /**
   * Authenticats an admin with email or phone number and password.
   */
  @Post('admin/signin')
  @HttpCode(HttpStatus.OK)
  async adminSignin(@Body() dto: SigninDto) {
    return this.authService.signin(dto, 'Admin');
  }
}
