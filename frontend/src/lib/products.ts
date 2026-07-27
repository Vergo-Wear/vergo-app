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
  category: { name: string } | null;
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
  const items = await response.json() as CatalogueProduct[];

  const categoryMap = new Map<string, CatalogueProduct[]>();

  items.forEach(item => {
    const catName = item.category?.name || "Uncategorized";
    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, []);
    }
    categoryMap.get(catName)!.push(item);
  });

  const products: Product[] = [];

  categoryMap.forEach((categoryProducts, categoryName) => {
    const cataloguePrices = categoryProducts.flatMap((product) =>
      product.variants.map((variant) => variant.price),
    );
    const allVariants = categoryProducts.flatMap(p =>
      p.variants.filter((v) => v.status === "show").map((v) => ({
        variantId: v.variant_id,
        sku: v.sku,
        size: v.size,
        color: v.colour,
        price: v.price,
        availableQuantity:
          p.status === "hold"
            ? 0
            : Math.max(
                0,
                v.inventory.quantity - v.inventory.reserved_quantity,
              ),
        images: v.images.map(img => img.url)
      }))
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const description = (categoryProducts[0]?.category as any)?.description || categoryProducts.find(p => p.description)?.description || undefined;

    const images = [
      ...categoryProducts.flatMap(p => p.images.map(i => i.url)),
      ...allVariants.flatMap(v => v.images)
    ].filter((url, index, all) => all.indexOf(url) === index);

    const minimumPrice = cataloguePrices.length
      ? Math.min(...cataloguePrices)
      : 0;

    products.push({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: (categoryProducts[0]?.category as any)?.category_id || categoryName,
      name: categoryName,
      price: formatLkr(minimumPrice),
      lkrPrice: formatLkr(minimumPrice),
      isAvailable: allVariants.some((variant) => variant.availableQuantity > 0),
      image: images[0] || "/logo.png",
      category: categoryName,
      description,
      images,
      sizes: [...new Set(allVariants.map((variant) => variant.size))],
      colors: [...new Set(allVariants.map((variant) => variant.color))],
      variants: allVariants,
    });
  });

  return products;
}

export function getInitialProducts(): Product[] {
  return [];
}
