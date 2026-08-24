import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { AdminService } from './admin.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { UpdateInventoryRecordDto } from './dto/update-inventory-record.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeAccountDto } from '../employees/dto/create-employee-account.dto';
import { UpdateEmployeeDto } from '../employees/dto/update-employee.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('Admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly employeesService: EmployeesService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Get('overview')
  overview() {
    return this.adminService.overview();
  }

  @Get('inventory/catalog')
  inventoryCatalog() {
    return this.adminService.inventoryCatalog();
  }

  @Patch('inventory/records/:id')
  updateInventoryRecord(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateInventoryRecordDto,
  ) {
    return this.adminService.updateInventoryRecord(id, dto);
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

  @Put('products/:id')
  updateProductWhole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.adminService.updateProductWhole(id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.deleteProduct(id);
  }

  @Patch('products/:id/visibility')
  updateProductVisibility(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateProductVisibility(id, status);
  }

  @Patch('products/:id/gallery/:colorId')
  updateColorGallery(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('colorId', new ParseUUIDPipe({ version: '4' })) colorId: string,
    @Body('imageUrls') imageUrls: string[],
  ) {
    return this.adminService.updateColorGallery(id, colorId, imageUrls || []);
  }

  @Post('products/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadProductImage(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
            message: 'Image file must be under 5MB.',
          }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
        ],
      }),
    )
    image?: { buffer: Buffer },
  ) {
    if (!image?.buffer) {
      throw new BadRequestException('No image uploaded.');
    }
    const result = await this.cloudinaryService.uploadBuffer(image.buffer, {
      folder: 'products',
    });
    return { secure_url: result.secure_url };
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.deleteCategory(id);
  }

  @Post('colors')
  createColor(@Body() dto: CreateColorDto) {
    return this.adminService.createColor(dto);
  }

  @Patch('colors/:id')
  updateColor(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateColorDto,
  ) {
    return this.adminService.updateColor(id, dto);
  }

  @Delete('colors/:id')
  deleteColor(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.deleteColor(id);
  }

  @Post('sizes')
  createSize(@Body() dto: CreateSizeDto) {
    return this.adminService.createSize(dto);
  }

  @Patch('sizes/:id')
  updateSize(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSizeDto,
  ) {
    return this.adminService.updateSize(id, dto);
  }

  @Delete('sizes/:id')
  deleteSize(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.deleteSize(id);
  }

  @Get('suppliers')
  listSuppliers() {
    return this.adminService.listSuppliers();
  }

  @Post('suppliers')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.adminService.createSupplier(dto);
  }

  @Patch('suppliers/:id')
  updateSupplier(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.adminService.updateSupplier(id, dto);
  }

  @Get('branches')
  listBranches() {
    return this.adminService.listBranches();
  }

  @Post('branches')
  createBranch(@Body() dto: CreateBranchDto) {
    return this.adminService.createBranch(dto);
  }

  @Patch('branches/:id')
  updateBranch(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.adminService.updateBranch(id, dto);
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

  @Patch('employees/:id')
  updateEmployee(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, dto);
  }

  @Get('parcel-analytics')
  getParcelAnalytics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getParcelAnalytics(from, to);
  }

  @Get('employee-logistics')
  getEmployeeLogistics() {
    return this.adminService.getCentralizedEmployeeLogistics();
  }

  @Get('branches/:branchId/shipper-profile')
  getBranchShipperProfile(
    @Param('branchId', new ParseUUIDPipe({ version: '4' })) branchId: string,
  ) {
    return this.adminService.getBranchShipperProfile(branchId);
  }

  @Post('branches/:branchId/shipper-profile')
  upsertBranchShipperProfile(
    @Param('branchId', new ParseUUIDPipe({ version: '4' })) branchId: string,
    @Body() dto: {
      shipperName: string;
      addressLine1: string;
      addressLine2?: string;
      addressLine3?: string;
      addressLine4City: string;
      contactName: string;
      contactNumber1: string;
      contactNumber2?: string;
    },
  ) {
    return this.adminService.upsertBranchShipperProfile(branchId, dto);
  }
}
