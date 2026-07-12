import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

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
