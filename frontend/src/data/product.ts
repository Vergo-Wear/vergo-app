export interface ProductVariant {
  variantId: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  availableQuantity: number;
  images?: string[];
}

export interface Product {
  id: string;
  name: string;
  price: string;
  lkrPrice: string;
  isAvailable: boolean;
  image: string;
  category: string;
  subTitle?: string;
  description?: string;
  features?: string[];
  images?: string[];
  sizes?: string[];
  colors?: string[];
  variants: ProductVariant[];
}

export const products: Product[] = [];
