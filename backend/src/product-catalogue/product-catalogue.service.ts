import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductCatalogueItem } from './interfaces/product-catalogue.interface';
import {
  ProductWithRelations,
  toProductCatalogueItem,
} from './mapper/product-catalogue.mapper';

const CATALOGUE_INCLUDE = {
  category: true,
  supplier: true,
  variants: {
    include: {
      color: true,
      size: true,
      inventory: {
        include: {
          stockReservations: {
            where: {
              status: { in: ['Active', 'Pending Verification'] as string[] },
            },
            select: { quantity: true },
          },
        },
      },
      images: true,
    },
  },
} as const;

@Injectable()
export class ProductCatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalogue(): Promise<ProductCatalogueItem[]> {
    const products = await this.prisma.product.findMany({
      where: { status: { in: ['live', 'hold'] } },
      include: CATALOGUE_INCLUDE,
    });

    return (products as ProductWithRelations[]).map(toProductCatalogueItem);
  }

  async getProductById(productId: string): Promise<ProductCatalogueItem> {
    const product = await this.prisma.product.findUnique({
      where: { productId },
      include: CATALOGUE_INCLUDE,
    });

    if (!product || !['live', 'hold'].includes(product.status)) {
      throw new NotFoundException('Product not found');
    }

    return toProductCatalogueItem(product as ProductWithRelations);
  }
}
