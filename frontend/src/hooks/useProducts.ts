"use client";

import { useEffect, useState } from "react";
import { type Product } from "@/data/product";
import { getInitialProducts, loadProducts } from "@/lib/products";

export function useProducts() {
  return useProductsState().products;
}

export function useProductsState() {
  const [products, setProducts] = useState<Product[]>(getInitialProducts());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      try {
        const nextProducts = await loadProducts();
        if (isMounted) {
          setProducts(nextProducts);
          setError(null);
        }
      } catch (error) {
        console.error("Unable to retrieve products from the database:", error);
        if (isMounted) {
          setProducts([]);
          setError(error instanceof Error ? error : new Error("Unable to load products."));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  return { products, isLoading, error };
}
