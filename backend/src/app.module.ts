import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserRoleModule } from './user-role/user-role.module';
import { ProductCatalogueModule } from './product-catalogue/product-catalogue.module';
import { ProfilesModule } from './profiles/profiles.module';
import { CustomersModule } from './customers/customers.module';
import { EmployeesModule } from './employees/employees.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { CartModule } from './cart/cart.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { AddressesModule } from './addresses/addresses.module';
import { CustomizationModule } from './customization/customization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UserRoleModule,
    ProductCatalogueModule,
    ProfilesModule,
    CustomersModule,
    EmployeesModule,
    AuthModule,
    OrdersModule,
    CartModule,
    ReviewsModule,
    AdminModule,
    AddressesModule,
    CustomizationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
