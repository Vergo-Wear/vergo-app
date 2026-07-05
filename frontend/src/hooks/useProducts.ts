"use client";

import { useEffect, useState } from "react";
import { type Product } from "@/data/product";
import { getFallbackProducts, loadProducts } from "@/lib/products";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(getFallbackProducts());

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      const nextProducts = await loadProducts();

      if (isMounted) {
        setProducts(nextProducts);
      }
    }

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  return products;
}