import { Prisma } from '@prisma/client';
import { isValidImageUrl } from '../helpers/image.helper';
import {
  ProductCatalogueItem,
  ProductImage,
  ProductVariantSummary,
} from '../interfaces/product-catalogue.interface';

const productWithRelations = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: {
    category: true,
    supplier: true,
    variants: {
      include: {
        inventory: true,
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
    (sum, inv) => sum + (inv.reservedQuantity ?? 0),
    0,
  );
  const price = basePrice.plus(variant.priceAdjustment ?? 0).toNumber();

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
  };
}

function mapImages(product: ProductWithRelations): ProductImage[] {
  const seen = new Set<string>();
  const images: ProductImage[] = [];

  for (const variant of product.variants) {
    for (const image of variant.images) {
      if (!isValidImageUrl(image.imageUrl)) continue;
      if (seen.has(image.imageUrl)) continue;
      seen.add(image.imageUrl);
      images.push({ image_id: image.id.toString(), url: image.imageUrl });
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
      ? { category_id: product.category.categoryId, name: product.category.name }
      : null,
    supplier: product.supplier
      ? { supplier_id: product.supplier.supplierId, name: product.supplier.name }
      : null,
    images: mapImages(product),
    variants: product.variants.map((variant) =>
      mapVariant(variant, product.basePrice),
    ),
  };
}
