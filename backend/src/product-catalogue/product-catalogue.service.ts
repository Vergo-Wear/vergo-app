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
  private catalogueCache: {
    data: ProductCatalogueItem[];
    expiresAt: number;
  } | null = null;
  private productCache = new Map<
    string,
    { data: ProductCatalogueItem; expiresAt: number }
  >();
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

  constructor(private readonly prisma: PrismaService) {}

  clearCache(): void {
    this.catalogueCache = null;
    this.productCache.clear();
  }

  async getCatalogue(): Promise<ProductCatalogueItem[]> {
    const now = Date.now();
    if (this.catalogueCache && this.catalogueCache.expiresAt > now) {
      return this.catalogueCache.data;
    }

    const products = await this.prisma.product.findMany({
      where: { status: { in: ['live', 'hold'] } },
      include: CATALOGUE_INCLUDE,
    });

    const mapped = (products as ProductWithRelations[]).map(
      toProductCatalogueItem,
    );

    this.catalogueCache = {
      data: mapped,
      expiresAt: now + this.CACHE_TTL_MS,
    };

    // Also populate individual product caches
    for (const item of mapped) {
      this.productCache.set(item.product_id, {
        data: item,
        expiresAt: now + this.CACHE_TTL_MS,
      });
    }

    return mapped;
  }

  async getProductById(productId: string): Promise<ProductCatalogueItem> {
    const now = Date.now();
    const cached = this.productCache.get(productId);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const product = await this.prisma.product.findUnique({
      where: { productId },
      include: CATALOGUE_INCLUDE,
    });

    if (!product || !['live', 'hold'].includes(product.status)) {
      throw new NotFoundException('Product not found');
    }

    const mapped = toProductCatalogueItem(product as ProductWithRelations);
    this.productCache.set(productId, {
      data: mapped,
      expiresAt: now + this.CACHE_TTL_MS,
    });

    return mapped;
  }
}

