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
      sizes: [...new Set(allVariants.map((v) => v.size))],
      colors: [...new Set(allVariants.map((v) => v.color))],
      variants: allVariants,
    };
  });
}

export function getInitialProducts(): Product[] {
  return [];
}
