import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserRoleModule } from './user-role/user-role.module';
import { ProductCatalogueModule } from './product-catalogue/product-catalogue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UserRoleModule,
    ProductCatalogueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
