import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('addresses')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('Customer')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get('mine')
  getMyAddresses(@CurrentUser() profileId: string) {
    return this.addressesService.findCustomerAddresses(profileId);
  }

  @Post('mine')
  createMyAddress(
    @CurrentUser() profileId: string,
    @Body() dto: CreateUserAddressDto,
  ) {
    return this.addressesService.createCustomerAddress(profileId, dto);
  }

  @Patch('mine/:id/primary')
  setMyPrimaryAddress(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) addressId: string,
  ) {
    return this.addressesService.setPrimaryAddress(profileId, addressId);
  }

  @Delete('mine/:id')
  deleteMyAddress(
    @CurrentUser() profileId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) addressId: string,
  ) {
    return this.addressesService.deleteCustomerAddress(profileId, addressId);
  }
}
