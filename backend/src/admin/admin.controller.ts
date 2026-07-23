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
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { AdminService } from './admin.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeAccountDto } from '../employees/dto/create-employee-account.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('Admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly employeesService: EmployeesService,
  ) {}

  @Get('overview')
  overview() {
    return this.adminService.overview();
  }

  @Patch('inventory/:id')
  updateInventory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.adminService.updateInventory(id, dto.quantity);
  }

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Get('branches')
  listBranches() {
    return this.employeesService.listBranches();
  }

  @Post('employees')
  createEmployee(
    @CurrentUser() adminProfileId: string,
    @Body() dto: CreateEmployeeAccountDto,
  ) {
    return this.employeesService.createEmployeeAccount(dto, adminProfileId);
  }

  @Delete('employees/:id')
  removeEmployee(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.employeesService.removeEmployeeAccount(id);
  }
}
