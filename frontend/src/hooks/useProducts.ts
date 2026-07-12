"use client";

import { useEffect, useState } from "react";
import { type Product } from "@/data/product";
import { getInitialProducts, loadProducts } from "@/lib/products";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(getInitialProducts());

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      try {
        const nextProducts = await loadProducts();
        if (isMounted) setProducts(nextProducts);
      } catch (error) {
        console.error("Unable to retrieve products from the database:", error);
        if (isMounted) setProducts([]);
      }
    }

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  return products;
}
