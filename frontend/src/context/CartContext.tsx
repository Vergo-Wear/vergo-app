"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { type Product } from "@/data/product";

export interface CartItem {
  product: Product;
  size: string;
  color?: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, size: string, quantity?: number, color?: string) => void;
  removeFromCart: (productId: number, size: string) => void;
  updateQuantity: (productId: number, size: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  formatLkr: (value: number) => string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount (safe for Next.js SSR)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCart = localStorage.getItem("vergo_cart");
      if (storedCart) {
        try {
          const parsed = JSON.parse(storedCart);
          if (Array.isArray(parsed)) {
            const validCart = parsed.filter(
              (item) => item && item.product && (item.product.lkrPrice || item.product.price)
            );
            setCart(validCart);
          } else {
            setCart([]);
          }
        } catch (e) {
          console.error("Failed to parse cart from localStorage:", e);
        }
      } else {
        // Pre-populate with the exact Figma design items on first load!
        const defaultCart: CartItem[] = [
          {
            product: {
              id: 101,
              name: "ESSENTIAL OVERSIZED TEE",
              price: "$15.00",
              lkrPrice: "LKR 4,500.00",
              isAvailable: true,
              image: "/images/boxy_tee.png",
              category: "T-Shirts",
              sizes: ["S", "M", "L", "XL"],
              colors: ["Phantom Black"],
            },
            size: "XL",
            color: "PHANTOM BLACK",
            quantity: 1
          },
          {
            product: {
              id: 102,
              name: "ARCHIE HEAVY HOODIE",
              price: "$30.00",
              lkrPrice: "LKR 8,900.00",
              isAvailable: true,
              image: "/images/oversized_hoodie.png",
              category: "Hoodies & Sweatshirts",
              sizes: ["S", "M", "L", "XL"],
              colors: ["Cement Grey"],
            },
            size: "L",
            color: "CEMENT GREY",
            quantity: 1
          },
          {
            product: {
              id: 103,
              name: "ERGO UTILITY TOTE",
              price: "$8.00",
              lkrPrice: "LKR 2,400.00",
              isAvailable: true,
              image: "/images/vergo_tote.png",
              category: "Accessories",
              sizes: ["OS"],
              colors: ["Matte Black"],
            },
            size: "OS",
            color: "MATTE BLACK",
            quantity: 1
          }
        ];
        setCart(defaultCart);
        localStorage.setItem("vergo_cart", JSON.stringify(defaultCart));
      }
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("vergo_cart", JSON.stringify(cart));
      // Dispatch standard storage event or a custom event to notify other tabs/components
      window.dispatchEvent(new Event("vergo-cart-change"));
    }
  }, [cart, isLoaded]);

  // Sync state between tabs/components
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleCartChange = () => {
      const storedCart = localStorage.getItem("vergo_cart");
      if (storedCart) {
        try {
          const parsed = JSON.parse(storedCart);
          // Check if it's actually different before setting to avoid infinite loop
          if (JSON.stringify(parsed) !== JSON.stringify(cart)) {
            setCart(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener("vergo-cart-change", handleCartChange);
    window.addEventListener("storage", handleCartChange);

    return () => {
      window.removeEventListener("vergo-cart-change", handleCartChange);
      window.removeEventListener("storage", handleCartChange);
    };
  }, [cart]);

  const addToCart = (product: Product, size: string, quantity: number = 1, color?: string) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.product.id === product.id && item.size === size
      );

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += quantity;
        return newCart;
      }

      return [...prevCart, { product, size, color, quantity }];
    });
  };

  const removeFromCart = (productId: number, size: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => !(item.product.id === productId && item.size === size))
    );
  };

  const updateQuantity = (productId: number, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId && item.size === size
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Helper to parse price string to number, e.g. "LKR 4,500.00" -> 4500
  const parseLkrPrice = (lkrPriceStr: string): number => {
    if (!lkrPriceStr) return 0;
    const cleanStr = lkrPriceStr.replace(/LKR/g, "").replace(/,/g, "").trim();
    const value = parseFloat(cleanStr);
    return isNaN(value) ? 0 : value;
  };

  const cartSubtotal = cart.reduce((total, item) => {
    if (!item || !item.product || !item.product.lkrPrice) return total;
    const priceNum = parseLkrPrice(item.product.lkrPrice);
    return total + priceNum * item.quantity;
  }, 0);

  const formatLkr = (value: number): string => {
    return `LKR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        formatLkr,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
