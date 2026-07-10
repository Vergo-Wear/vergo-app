import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserRoleService, UserIdentificationResult } from './user-role.service';

@Controller('user-role')
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  /**
   * SECURITY WARNING: This endpoint is unauthenticated and accepts arbitrary user IDs.
   * In a production environment, this endpoint MUST be protected by an authentication
   * guard (e.g., Supabase Auth Guard / JWT verification) and authorization checks.
   * Access should only be allowed if:
   * 1. The caller is requesting their own identity details.
   * 2. The caller is an Admin / authorized Employee.
   */
  @Get('identify/:userId')
  async identifyUser(
    @Param('userId') userId: string,
  ): Promise<UserIdentificationResult> {
    return this.userRoleService.identifyUser(userId);
  }

  /**
   * SECURITY WARNING: This endpoint is prone to account enumeration attacks.
   * Consider implementing rate-limiting (e.g., using NestJS ThrottlerGuard) to throttle
   * requests based on IP/fingerprint to prevent automated registration probing.
   */
  @Get('customer/check-email')
  async checkCustomerByEmail(
    @Query('email') email: string,
  ): Promise<{ exists: boolean }> {
    const exists = await this.userRoleService.checkCustomerByEmail(email);
    return { exists };
  }

  /**
   * SECURITY WARNING: This endpoint is prone to account enumeration attacks.
   * Consider implementing rate-limiting (e.g., using NestJS ThrottlerGuard) to throttle
   * requests based on IP/fingerprint to prevent automated registration probing.
   */
  @Get('customer/check-phone')
  async checkCustomerByPhone(
    @Query('phone') phone: string,
  ): Promise<{ exists: boolean }> {
    const exists = await this.userRoleService.checkCustomerByPhone(phone);
    return { exists };
  }
}
