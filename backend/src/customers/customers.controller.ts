import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  findMe(@CurrentUser() profileId: string) {
    return this.customersService.findByProfileId(profileId);
  }

  @Patch('me')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Customer')
  updateMe(@CurrentUser() profileId: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.updateByProfileId(profileId, dto);
  }

  @Post()
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get('profile/:profileId')
  async findByProfileId(@Param('profileId') profileId: string) {
    return this.customersService.findByProfileId(profileId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }
}
