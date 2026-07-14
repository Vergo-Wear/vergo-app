"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { type Product } from "@/data/product";
import { logoutExpiredSession } from "@/lib/authenticated-fetch";

export interface CartItem {
  product: Product;
  size: string;
  color?: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  isLoaded: boolean;
  addToCart: (product: Product, size: string, quantity?: number, color?: string) => void;
  removeFromCart: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  formatLkr: (value: number) => string;
}

type CartOwner = "guest" | "customer";

const GUEST_CART_KEY = "vergo_guest_cart";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const CartContext = createContext<CartContextType | undefined>(undefined);

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return Boolean(
    item.product &&
      typeof item.product.id === "string" &&
      typeof item.size === "string" &&
      typeof item.quantity === "number" &&
      item.quantity > 0,
  );
}

function readCart(value: string | null): CartItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    return [];
  }
}

function mergeCarts(primary: CartItem[], incoming: CartItem[]): CartItem[] {
  const merged = primary.map((item) => ({ ...item }));
  for (const item of incoming) {
    const existing = merged.find(
      (candidate) =>
        candidate.product.id === item.product.id &&
        candidate.size === item.size &&
        candidate.color === item.color,
    );
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + item.quantity);
    } else {
      merged.push({ ...item });
    }
  }
  return merged;
}

function getCustomerSession() {
  const isLoggedIn = sessionStorage.getItem("vergo_is_logged_in") === "true";
  const token = sessionStorage.getItem("vergo_access_token");
  const rawUser = sessionStorage.getItem("vergo_user");
  if (!isLoggedIn || !token || !rawUser) return null;

  try {
    const user = JSON.parse(rawUser) as { role?: string };
    return user.role?.toLowerCase() === "customer" ? { token } : null;
  } catch {
    return null;
  }
}

async function requestCart(token: string, init?: RequestInit) {
  const send = (accessToken: string) => fetch(`${API_URL}/cart`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  let response = await send(token);
  if (response.status === 401) {
    const refreshToken = sessionStorage.getItem("vergo_refresh_token");
    if (refreshToken) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshResponse.ok) {
        const refreshed = (await refreshResponse.json()) as {
          accessToken: string;
          refreshToken: string;
        };
        sessionStorage.setItem("vergo_access_token", refreshed.accessToken);
        sessionStorage.setItem("vergo_refresh_token", refreshed.refreshToken);
        response = await send(refreshed.accessToken);
      }
    }
  }
  if (response.status === 401) {
    logoutExpiredSession();
  }
  if (!response.ok) {
    throw new Error(`Cart request failed with status ${response.status}.`);
  }
  return response.json() as Promise<{ items: unknown }>;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [owner, setOwner] = useState<CartOwner>("guest");
  const [isLoaded, setIsLoaded] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const lastPersistedRef = useRef("[]");

  useEffect(() => {
    let active = true;

    const loadCart = async () => {
      setIsLoaded(false);
      const session = getCustomerSession();

      if (!session) {
        const navigation = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming | undefined;
        if (navigation?.type === "reload") {
          sessionStorage.removeItem(GUEST_CART_KEY);
        }
        const guestCart = readCart(sessionStorage.getItem(GUEST_CART_KEY));
        if (!active) return;
        tokenRef.current = null;
        lastPersistedRef.current = JSON.stringify(guestCart);
        setOwner("guest");
        setCart(guestCart);
        setIsLoaded(true);
        return;
      }

      tokenRef.current = session.token;
      setOwner("customer");
      const guestCart = readCart(sessionStorage.getItem(GUEST_CART_KEY));

      try {
        const result = await requestCart(session.token);
        tokenRef.current = sessionStorage.getItem("vergo_access_token");
        const databaseCart = Array.isArray(result.items)
          ? result.items.filter(isCartItem)
          : [];
        const nextCart = mergeCarts(databaseCart, guestCart);

        if (guestCart.length > 0) {
          await requestCart(session.token, {
            method: "PUT",
            body: JSON.stringify({ items: nextCart }),
          });
          sessionStorage.removeItem(GUEST_CART_KEY);
        }

        if (!active) return;
        lastPersistedRef.current = JSON.stringify(nextCart);
        setCart(nextCart);
      } catch (error) {
        if (!active) return;
        if (!getCustomerSession()) {
          const nextGuestCart = readCart(sessionStorage.getItem(GUEST_CART_KEY));
          tokenRef.current = null;
          setOwner("guest");
          lastPersistedRef.current = JSON.stringify(nextGuestCart);
          setCart(nextGuestCart);
          return;
        }
        console.error("Unable to load the customer cart:", error);
        lastPersistedRef.current = "[]";
        setCart([]);
      } finally {
        if (active) setIsLoaded(true);
      }
    };

    void loadCart();
    window.addEventListener("vergo-auth-change", loadCart);
    return () => {
      active = false;
      window.removeEventListener("vergo-auth-change", loadCart);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const serialized = JSON.stringify(cart);
    if (serialized === lastPersistedRef.current) return;

    if (owner === "guest") {
      sessionStorage.setItem(GUEST_CART_KEY, serialized);
      lastPersistedRef.current = serialized;
      window.dispatchEvent(new Event("vergo-cart-change"));
      return;
    }

    const token = tokenRef.current;
    if (!token) return;
    const timeout = window.setTimeout(async () => {
      try {
        await requestCart(token, {
          method: "PUT",
          body: JSON.stringify({ items: cart }),
        });
        lastPersistedRef.current = serialized;
        window.dispatchEvent(new Event("vergo-cart-change"));
      } catch (error) {
        console.error("Unable to save the customer cart:", error);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [cart, isLoaded, owner]);

  const addToCart = (product: Product, size: string, quantity = 1, color?: string) => {
    setCart((previous) => {
      const index = previous.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.size === size &&
          item.color === color,
      );
      if (index < 0) return [...previous, { product, size, color, quantity }];
      const next = previous.map((item) => ({ ...item }));
      next[index].quantity = Math.min(99, next[index].quantity + quantity);
      return next;
    });
  };

  const removeFromCart = (productId: string, size: string) => {
    setCart((previous) =>
      previous.filter(
        (item) => !(item.product.id === productId && item.size === size),
      ),
    );
  };

  const updateQuantity = (productId: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }
    setCart((previous) =>
      previous.map((item) =>
        item.product.id === productId && item.size === size
          ? { ...item, quantity: Math.min(99, quantity) }
          : item,
      ),
    );
  };

  const clearCart = () => setCart([]);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
  const cartSubtotal = cart.reduce((total, item) => {
    const value = Number.parseFloat(
      item.product.lkrPrice.replace(/LKR/g, "").replace(/,/g, "").trim(),
    );
    return total + (Number.isFinite(value) ? value * item.quantity : 0);
  }, 0);
  const formatLkr = (value: number) =>
    `LKR ${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoaded,
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
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
