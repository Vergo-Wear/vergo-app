import { Module } from '@nestjs/common';
import { ProductCatalogueService } from './product-catalogue.service';
import { ProductCatalogueController } from './product-catalogue.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductCatalogueController],
  providers: [ProductCatalogueService],
  exports: [ProductCatalogueService],
})
export class ProductCatalogueModule {}
