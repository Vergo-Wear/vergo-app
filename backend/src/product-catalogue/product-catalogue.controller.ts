import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ProductCatalogueService } from './product-catalogue.service';
import { ProductCatalogueItem } from './interfaces/product-catalogue.interface';

@Controller('product-catalogue')
export class ProductCatalogueController {
  constructor(
    private readonly productCatalogueService: ProductCatalogueService,
  ) {}

  @Get()
  async getCatalogue(): Promise<ProductCatalogueItem[]> {
    return this.productCatalogueService.getCatalogue();
  }

  @Get(':product_id')
  async getProductById(
    @Param('product_id', ParseUUIDPipe) productId: string,
  ): Promise<ProductCatalogueItem> {
    return this.productCatalogueService.getProductById(productId);
  }
}
