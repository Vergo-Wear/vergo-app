import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserRoleService, UserIdentificationResult } from './user-role.service';

@Controller('user-role')
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  @Get('identify/:userId')
  async identifyUser(
    @Param('userId') userId: string,
  ): Promise<UserIdentificationResult> {
    return this.userRoleService.identifyUser(userId);
  }

  @Get('customer/check-email')
  async checkCustomerByEmail(
    @Query('email') email: string,
  ): Promise<{ exists: boolean }> {
    const exists = await this.userRoleService.checkCustomerByEmail(email);
    return { exists };
  }

  @Get('customer/check-phone')
  async checkCustomerByPhone(
    @Query('phone') phone: string,
  ): Promise<{ exists: boolean }> {
    const exists = await this.userRoleService.checkCustomerByPhone(phone);
    return { exists };
  }
}
