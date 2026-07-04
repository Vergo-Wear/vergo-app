import { products as fallbackProducts, type Product } from "@/data/product";
import { createSupabaseClient, supabaseTableName } from "@/lib/supabase";

type ProductRow = Record<string, unknown>;

function readString(row: ProductRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return fallback;
}

function readBoolean(row: ProductRow, keys: string[], fallback = false) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }
    if (typeof value === "number") {
      return value !== 0;
    }
  }

  return fallback;
}

function parseArrayValue(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean);
    }
  } catch {
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return fallback;
}

function toNumberId(value: unknown, fallbackId: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallbackId;
}

function normalizeProduct(row: ProductRow): Product {
  const id = toNumberId(row.id, 0);
  const fallback = fallbackProducts.find((item) => item.id === id);
  const image = readString(row, ["image", "image_url", "imageUrl"], fallback?.image || "");
  const images = parseArrayValue(row.images ?? row.image_urls ?? row.imageUrls, fallback?.images || (image ? [image] : []));

  return {
    id,
    name: readString(row, ["name"], fallback?.name || `Product ${id}`),
    price: readString(row, ["price"], fallback?.price || ""),
    lkrPrice: readString(row, ["lkrPrice", "lkr_price"], fallback?.lkrPrice || ""),
    isAvailable: readBoolean(row, ["isAvailable", "is_available"], fallback?.isAvailable ?? true),
    image,
    category: readString(row, ["category"], fallback?.category || "Uncategorized"),
    subTitle: readString(row, ["subTitle", "subtitle", "sub_title"], fallback?.subTitle || ""),
    badge: readString(row, ["badge"], fallback?.badge || ""),
    description: readString(row, ["description"], fallback?.description || ""),
    features: parseArrayValue(row.features, fallback?.features || []),
    images: images.length > 0 ? images : fallback?.images,
    sizes: parseArrayValue(row.sizes, fallback?.sizes || []),
    colors: parseArrayValue(row.colors, fallback?.colors || []),
    isAdminSelected: readBoolean(row, ["isAdminSelected", "is_admin_selected"], fallback?.isAdminSelected ?? false),
  };
}

export async function loadProducts() {
  const supabase = createSupabaseClient();

  if (!supabase) {
    return fallbackProducts;
  }

  const { data, error } = await supabase.from(supabaseTableName).select("*").order("id", { ascending: true });

  if (error || !data) {
    return fallbackProducts;
  }

  const normalized = data
    .map((row) => normalizeProduct(row as ProductRow))
    .filter((product) => product.id > 0 && Boolean(product.name));

  return normalized.length > 0 ? normalized : fallbackProducts;
}

export function getFallbackProducts() {
  return fallbackProducts;
}