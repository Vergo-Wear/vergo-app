import { Prisma } from '@prisma/client';
import { isValidImageUrl } from '../helpers/image.helper';
import {
  ProductCatalogueItem,
  ProductImage,
  ProductVariantSummary,
} from '../interfaces/product-catalogue.interface';

export const productWithRelations =
  Prisma.validator<Prisma.ProductDefaultArgs>()({
    include: {
      category: true,
      supplier: true,
      variants: {
        include: {
          inventory: {
            include: {
              stockReservations: {
                where: { status: { in: ['Active', 'Pending Verification'] } },
                select: { quantity: true },
              },
            },
          },
          images: true,
        },
      },
    },
  });

export type ProductWithRelations = Prisma.ProductGetPayload<
  typeof productWithRelations
>;

function mapVariant(
  variant: ProductWithRelations['variants'][number],
  basePrice: Prisma.Decimal,
): ProductVariantSummary {
  const quantity = variant.inventory.reduce(
    (sum, inv) => sum + (inv.quantity ?? 0),
    0,
  );
  const reservedQuantity = variant.inventory.reduce(
    (sum, inv) =>
      sum + inv.stockReservations.reduce((reserved, hold) => reserved + hold.quantity, 0),
    0,
  );
  const price = basePrice.plus(variant.priceAdjustment ?? 0).toNumber();
  const images = variant.images
    .filter((image) => isValidImageUrl(image.imageUrl))
    .map((image) => ({
      image_id: image.id.toString(),
      url: image.imageUrl.trim(),
    }));

  return {
    variant_id: variant.variantId,
    sku: variant.sku,
    size: variant.size,
    colour: variant.color,
    price,
    inventory: {
      quantity,
      reserved_quantity: reservedQuantity,
    },
    images,
  };
}

function mapImages(product: ProductWithRelations): ProductImage[] {
  const seen = new Set<string>();
  const images: ProductImage[] = [];

  for (const variant of product.variants) {
    for (const image of variant.images) {
      if (!isValidImageUrl(image.imageUrl)) continue;
      const url = image.imageUrl.trim();
      if (seen.has(url)) continue;
      seen.add(url);
      images.push({ image_id: image.id.toString(), url });
    }
  }

  return images;
}

export function toProductCatalogueItem(
  product: ProductWithRelations,
): ProductCatalogueItem {
  return {
    product_id: product.productId,
    name: product.name,
    description: product.description,
    category: product.category
      ? {
          category_id: product.category.categoryId,
          name: product.category.name,
          description: product.category.description,
        }
      : null,
    supplier: product.supplier
      ? {
          supplier_id: product.supplier.supplierId,
          name: product.supplier.name,
        }
      : null,
    images: mapImages(product),
    variants: product.variants.map((variant) =>
      mapVariant(variant, product.basePrice),
    ),
  };
}
