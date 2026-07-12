import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductCatalogueService } from './product-catalogue.service';

describe('ProductCatalogueService', () => {
  const productDelegate = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const prisma = { product: productDelegate };
  let service: ProductCatalogueService;

  const product = {
    productId: '3a2c831a-284e-4d02-b780-5c9164246eb8',
    categoryId: 'ff4b7461-dd1c-4a37-a255-bc9090312067',
    supplierId: 'd47a863c-b846-4d1b-ae89-bfc17bc0865a',
    name: 'Essential Tee',
    description: 'Heavy cotton tee',
    basePrice: new Prisma.Decimal(4500),
    status: 'active',
    category: {
      categoryId: 'ff4b7461-dd1c-4a37-a255-bc9090312067',
      name: 'T-Shirts',
      description: 'Everyday tees',
    },
    supplier: {
      supplierId: 'd47a863c-b846-4d1b-ae89-bfc17bc0865a',
      name: 'Vergo Supply',
    },
    variants: [
      {
        variantId: 'e335e75a-f87d-4937-a765-712f3ad945ad',
        productId: '3a2c831a-284e-4d02-b780-5c9164246eb8',
        sku: 'VGO-TEE-BLK-M',
        size: 'M',
        color: 'Black',
        priceAdjustment: new Prisma.Decimal(250),
        inventory: [
          { quantity: 8, reservedQuantity: 2 },
          { quantity: 5, reservedQuantity: 1 },
        ],
        images: [
          { id: BigInt(1), imageUrl: ' https://cdn.example.com/tee.jpg ' },
          { id: BigInt(2), imageUrl: 'not-a-valid-url' },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductCatalogueService(prisma as never);
  });

  it('returns active products with variants, pricing, stock and valid images', async () => {
    productDelegate.findMany.mockResolvedValue([product]);

    const result = await service.getCatalogue();

    expect(productDelegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'active' } }),
    );
    expect(result[0]).toMatchObject({
      category: {
        name: 'T-Shirts',
        description: 'Everyday tees',
      },
      images: [{ image_id: '1', url: 'https://cdn.example.com/tee.jpg' }],
      variants: [
        {
          sku: 'VGO-TEE-BLK-M',
          size: 'M',
          colour: 'Black',
          price: 4750,
          inventory: { quantity: 13, reserved_quantity: 3 },
          images: [{ image_id: '1', url: 'https://cdn.example.com/tee.jpg' }],
        },
      ],
    });
  });

  it('returns one active product by product_id', async () => {
    productDelegate.findUnique.mockResolvedValue(product);

    const result = await service.getProductById(product.productId);

    expect(result.product_id).toBe(product.productId);
  });

  it.each([null, { ...product, status: 'inactive' }])(
    'returns a clear not-found error for missing or inactive customer products',
    async (value) => {
      productDelegate.findUnique.mockResolvedValue(value);

      await expect(service.getProductById(product.productId)).rejects.toThrow(
        new NotFoundException('Product not found'),
      );
    },
  );
});
