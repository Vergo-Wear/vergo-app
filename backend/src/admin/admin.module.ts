import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [AuthModule, EmployeesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
