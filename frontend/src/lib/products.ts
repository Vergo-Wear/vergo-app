import { type Product } from "@/data/product";

interface CatalogueVariant {
  variant_id: string;
  status: "show" | "hidden";
  sku: string;
  size: string;
  colour: string;
  price: number;
  inventory: { quantity: number; reserved_quantity: number };
  images: Array<{ image_id: string; url: string }>;
}

interface CatalogueProduct {
  product_id: string;
  status: "live" | "hold";
  name: string;
  description: string | null;
  category: { category_id: string; name: string; description: string | null } | null;
  images: Array<{ image_id: string; url: string }>;
  variants: CatalogueVariant[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function formatLkr(value: number) {
  return `LKR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function loadProducts(): Promise<Product[]> {
  const response = await fetch(`${API_URL}/product-catalogue`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load products (${response.status}).`);
  const items = (await response.json()) as CatalogueProduct[];

  return items.map((item) => {
    const allVariants = item.variants
      .filter((v) => v.status === "show")
      .map((v) => ({
        variantId: v.variant_id,
        sku: v.sku,
        size: v.size,
        color: v.colour,
        price: v.price,
        availableQuantity:
          item.status === "hold"
            ? 0
            : Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reserved_quantity ?? 0)),
        images: v.images.map((img) => img.url),
      }));

    const allImages = [
      ...item.images.map((i) => i.url),
      ...allVariants.flatMap((v) => v.images),
    ].filter((url, index, all) => Boolean(url) && all.indexOf(url) === index);

    const prices = allVariants.map((v) => v.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return {
      id: item.product_id,
      name: item.name,
      price: formatLkr(minPrice),
      lkrPrice: formatLkr(minPrice),
      isAvailable: item.status === "live" && allVariants.some((v) => v.availableQuantity > 0),
      image: allImages[0] || "/logo.png",
      category: item.category?.name || "Apparel",
      subTitle: item.category?.name || "ESSENTIALS",
      description: item.description || undefined,
      images: allImages.length > 0 ? allImages : ["/logo.png"],
      sizes: sortSizes([...new Set(allVariants.map((v) => v.size))]),
      colors: [...new Set(allVariants.map((v) => v.color))],
      variants: allVariants,
    };
  });
}

const STANDARD_SIZE_ORDER: Record<string, number> = {
  "3XS": 5,
  "XXXS": 5,
  "2XS": 10,
  "XXS": 10,
  "XS": 20,
  "EXTRA SMALL": 20,
  "S": 30,
  "SMALL": 30,
  "M": 40,
  "MEDIUM": 40,
  "L": 50,
  "LARGE": 50,
  "XL": 60,
  "1XL": 60,
  "EXTRA LARGE": 60,
  "2XL": 70,
  "XXL": 70,
  "3XL": 80,
  "XXXL": 80,
  "4XL": 90,
  "XXXXL": 90,
  "5XL": 100,
  "6XL": 110,
  "7XL": 120,
  "8XL": 130,
  "9XL": 140,
  "10XL": 150,
  "FREE SIZE": 999,
  "FREE": 999,
  "ONE SIZE": 999,
  "OS": 999,
};

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const normA = String(a).trim().toUpperCase();
    const normB = String(b).trim().toUpperCase();

    const rankA = STANDARD_SIZE_ORDER[normA];
    const rankB = STANDARD_SIZE_ORDER[normB];

    if (rankA !== undefined && rankB !== undefined) {
      return rankA - rankB;
    }
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;

    const numMatchA = normA.match(/\d+(\.\d+)?/);
    const numMatchB = normB.match(/\d+(\.\d+)?/);

    if (numMatchA && numMatchB) {
      const valA = parseFloat(numMatchA[0]);
      const valB = parseFloat(numMatchB[0]);
      if (valA !== valB) {
        return valA - valB;
      }
    }

    return normA.localeCompare(normB, undefined, { numeric: true, sensitivity: "base" });
  });
}

export function getInitialProducts(): Product[] {
  return [];
}

