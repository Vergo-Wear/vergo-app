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

  @Patch('me/availability')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('Employee')
  updateAvailability(
    @CurrentUser() profileId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.employeesService.updateAvailability(profileId, dto.status);
  }

  @Post()
  async create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get('profile/:profileId')
  async findByProfileId(@Param('profileId') profileId: string) {
    return this.employeesService.findByProfileId(profileId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }
}
