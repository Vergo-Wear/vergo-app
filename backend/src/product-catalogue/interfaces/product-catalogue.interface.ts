export interface CategorySummary {
  category_id: string;
  name: string;
  description: string | null;
}

export interface SupplierSummary {
  supplier_id: string;
  name: string;
}

export interface ProductImage {
  image_id: string;
  url: string;
}

export interface VariantInventory {
  quantity: number;
  reserved_quantity: number;
}

export interface ProductVariantSummary {
  variant_id: string;
  sku: string;
  size: string;
  colour: string;
  price: number;
  inventory: VariantInventory;
  images: ProductImage[];
}

export interface ProductCatalogueItem {
  product_id: string;
  name: string;
  description: string | null;
  category: CategorySummary | null;
  supplier: SupplierSummary | null;
  images: ProductImage[];
  variants: ProductVariantSummary[];
}
