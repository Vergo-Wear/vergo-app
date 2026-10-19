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

export function invalidateProductsCache() {
  cachedProducts = null;
  cachedProductsTimestamp = 0;
  inflightCataloguePromise = null;
  individualProductCache.clear();
  inflightProductPromises.clear();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("vergo_inventory_updated"));
    try {
      localStorage.setItem("vergo_inventory_updated", Date.now().toString());
    } catch {}
  }
}

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

    async function fetchProducts(forceBypass = false) {
      if (!forceBypass && cachedProducts && Date.now() - cachedProductsTimestamp < CLIENT_CACHE_TTL_MS) {
        setProducts(cachedProducts);
        setIsLoading(false);
        return;
      }

      try {
        if (forceBypass) {
          cachedProducts = null;
          cachedProductsTimestamp = 0;
          inflightCataloguePromise = null;
        }

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

    const handleUpdate = () => {
      fetchProducts(true);
    };

    window.addEventListener("vergo_inventory_updated", handleUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vergo_inventory_updated") {
        fetchProducts(true);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("vergo_inventory_updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
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

    async function fetchSingleProduct(forceRefresh = false) {
      if (forceRefresh) {
        individualProductCache.delete(productId);
        inflightProductPromises.delete(productId);
      }
      try {
        let fetchPromise = inflightProductPromises.get(productId);
        if (!fetchPromise || forceRefresh) {
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

    const handleUpdate = () => {
      fetchSingleProduct(true);
    };

    window.addEventListener("vergo_inventory_updated", handleUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vergo_inventory_updated") {
        fetchSingleProduct(true);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("vergo_inventory_updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [productId, cachedFromIndividual]);

  return { product, isLoading, error };
}

