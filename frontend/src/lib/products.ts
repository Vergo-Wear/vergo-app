import { type Product } from "@/data/product";

interface CatalogueVariant {
  variant_id: string;
  sku: string;
  size: string;
  colour: string;
  price: number;
  inventory: { quantity: number; reserved_quantity: number };
  images: Array<{ image_id: string; url: string }>;
}

interface CatalogueProduct {
  product_id: string;
  name: string;
  description: string | null;
  category: { name: string } | null;
  images: Array<{ image_id: string; url: string }>;
  variants: CatalogueVariant[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function formatLkr(value: number) {
  return `LKR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function mapProduct(product: CatalogueProduct): Product {
  const variants = product.variants.map((variant) => ({
    variantId: variant.variant_id,
    sku: variant.sku,
    size: variant.size,
    color: variant.colour,
    price: variant.price,
    availableQuantity: Math.max(0, variant.inventory.quantity - variant.inventory.reserved_quantity),
  }));
  const images = [
    ...product.images.map((image) => image.url),
    ...product.variants.flatMap((variant) => variant.images.map((image) => image.url)),
  ].filter((url, index, all) => all.indexOf(url) === index);
  const minimumPrice = variants.length ? Math.min(...variants.map((variant) => variant.price)) : 0;

  return {
    id: product.product_id,
    name: product.name,
    price: formatLkr(minimumPrice),
    lkrPrice: formatLkr(minimumPrice),
    isAvailable: variants.some((variant) => variant.availableQuantity > 0),
    image: images[0] || "/logo.png",
    category: product.category?.name || "Uncategorized",
    description: product.description || undefined,
    images,
    sizes: [...new Set(variants.map((variant) => variant.size))],
    colors: [...new Set(variants.map((variant) => variant.color))],
    variants,
  };
}

export async function loadProducts(): Promise<Product[]> {
  const response = await fetch(`${API_URL}/product-catalogue`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load products (${response.status}).`);
  return ((await response.json()) as CatalogueProduct[]).map(mapProduct);
}

export function getInitialProducts(): Product[] {
  return [];
}
