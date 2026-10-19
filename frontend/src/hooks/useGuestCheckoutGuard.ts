"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useGuestCheckoutGuard(cartLength: number, isCartLoaded: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!isCartLoaded) return;
    const isGuest = sessionStorage.getItem("vergo_is_logged_in") !== "true";
    if (!isGuest || cartLength > 0) return;

    localStorage.removeItem("vergo_checkout_contact");
    localStorage.removeItem("vergo_checkout_shipping");
    localStorage.removeItem("vergo_checkout_as_guest");
    router.replace("/collection");
  }, [cartLength, isCartLoaded, router]);
}
