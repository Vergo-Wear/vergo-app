import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('me')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee')
  findMe(@CurrentUser() profileId: string) {
    return this.employeesService.findByProfileId(profileId);
  }

  @Get('leaderboard')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee', 'Admin', 'Branch Manager')
  getLeaderboard() {
    return this.employeesService.getLeaderboard();
  }

  @Patch('me/availability')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee')
  updateAvailability(
    @CurrentUser() profileId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.employeesService.updateAvailability(profileId, dto.status);
  }

  @Post('me/check-in')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee')
  checkIn(@CurrentUser() profileId: string) {
    return this.employeesService.checkIn(profileId);
  }

  @Post('me/check-out')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee')
  checkOut(@CurrentUser() profileId: string) {
    return this.employeesService.checkOut(profileId);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin')
  async create(
    @CurrentUser() adminProfileId: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(dto, adminProfileId);
  }

  @Get('profile/:profileId')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee', 'Admin', 'Branch Manager')
  async findByProfileId(@Param('profileId') profileId: string) {
    return this.employeesService.findByProfileId(profileId);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Admin')
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }
}
