import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { EmployeesModule } from '../employees/employees.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ProductCatalogueModule } from '../product-catalogue/product-catalogue.module';

@Module({
  imports: [AuthModule, EmployeesModule, CloudinaryModule, ProductCatalogueModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule { }

