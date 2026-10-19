import { Controller, ForbiddenException, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRoleService, UserIdentificationResult } from './user-role.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('user-role')
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  /**
   * Protected endpoint: Returns identity details. Callers can only request their
   * own user identity.
   */
  @Get('identify/:userId')
  @UseGuards(SupabaseAuthGuard)
  async identifyUser(
    @Param('userId') userId: string,
    @CurrentUser() requesterId: string,
  ): Promise<UserIdentificationResult> {
    if (requesterId !== userId) {
      throw new ForbiddenException('You can only identify your own user account.');
    }
    return this.userRoleService.identifyUser(userId);
  }

  /**
   * Protected against account enumeration via rate-limiting.
   */
  @Get('customer/check-email')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async checkCustomerByEmail(
    @Query('email') email: string,
  ): Promise<{ exists: boolean }> {
    const exists = await this.userRoleService.checkCustomerByEmail(email);
    return { exists };
  }

  /**
   * Protected against account enumeration via rate-limiting.
   */
  @Get('customer/check-phone')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async checkCustomerByPhone(
    @Query('phone') phone: string,
  ): Promise<{ exists: boolean }> {
    const exists = await this.userRoleService.checkCustomerByPhone(phone);
    return { exists };
  }
}
