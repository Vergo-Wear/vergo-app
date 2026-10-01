"use client";

import { useEffect, useState } from "react";
import { type Product } from "@/data/product";
import { getInitialProducts, loadProducts, loadProductById } from "@/lib/products";

// Module-level memory cache for instantaneous page transitions
let cachedProducts: Product[] | null = null;
let cachedProductsTimestamp = 0;
let inflightCataloguePromise: Promise<Product[]> | null = null;

const individualProductCache = new Map<string, { product: Product; timestamp: number }>();
const inflightProductPromises = new Map<string, Promise<Product | null>>();

const CLIENT_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function useProducts() {
  return useProductsState().products;
}

export function useProductsState() {
  const isCacheValid = cachedProducts && Date.now() - cachedProductsTimestamp < CLIENT_CACHE_TTL_MS;
  const [products, setProducts] = useState<Product[]>(
    isCacheValid && cachedProducts ? cachedProducts : getInitialProducts()
  );
  const [isLoading, setIsLoading] = useState(!isCacheValid);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      if (cachedProducts && Date.now() - cachedProductsTimestamp < CLIENT_CACHE_TTL_MS) {
        setProducts(cachedProducts);
        setIsLoading(false);
        return;
      }

      try {
        if (!inflightCataloguePromise) {
          inflightCataloguePromise = loadProducts();
        }

        const nextProducts = await inflightCataloguePromise;
        cachedProducts = nextProducts;
        cachedProductsTimestamp = Date.now();

        // Index individual products in cache as well
        for (const p of nextProducts) {
          individualProductCache.set(p.id, { product: p, timestamp: Date.now() });
        }

        if (isMounted) {
          setProducts(nextProducts);
          setError(null);
        }
      } catch (err) {
        console.error("Unable to retrieve products from the database:", err);
        if (isMounted) {
          if (!cachedProducts) setProducts([]);
          setError(err instanceof Error ? err : new Error("Unable to load products."));
        }
      } finally {
        inflightCataloguePromise = null;
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

export function useProduct(productId: string) {
  const cachedFromIndividual = individualProductCache.get(productId);
  const isIndividualValid =
    cachedFromIndividual && Date.now() - cachedFromIndividual.timestamp < CLIENT_CACHE_TTL_MS;

  // Also check if available in overall cached products
  const cachedFromList = cachedProducts?.find((p) => p.id === productId);

  const initialProduct = isIndividualValid
    ? cachedFromIndividual.product
    : cachedFromList || null;

  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productId) return;

    let isMounted = true;

    // If already in list or valid cache, set immediately
    if (cachedFromIndividual && Date.now() - cachedFromIndividual.timestamp < CLIENT_CACHE_TTL_MS) {
      setProduct(cachedFromIndividual.product);
      setIsLoading(false);
      return;
    }

    if (cachedProducts) {
      const found = cachedProducts.find((p) => p.id === productId);
      if (found) {
        individualProductCache.set(productId, { product: found, timestamp: Date.now() });
        setProduct(found);
        setIsLoading(false);
        return;
      }
    }

    async function fetchSingleProduct() {
      try {
        let fetchPromise = inflightProductPromises.get(productId);
        if (!fetchPromise) {
          fetchPromise = loadProductById(productId);
          inflightProductPromises.set(productId, fetchPromise);
        }

        const data = await fetchPromise;
        if (data) {
          individualProductCache.set(productId, { product: data, timestamp: Date.now() });
        }

        if (isMounted) {
          setProduct(data);
          setError(data ? null : new Error("Product not found"));
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unable to load product."));
        }
      } finally {
        inflightProductPromises.delete(productId);
        if (isMounted) setIsLoading(false);
      }
    }

    fetchSingleProduct();

    return () => {
      isMounted = false;
    };
  }, [productId, cachedFromIndividual]);

  return { product, isLoading, error };
}

