interface CheckoutContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface CheckoutShipping {
  receiverName?: string;
  receiverPhone?: string;
  addressLine1?: string;
  city?: string;
  district?: string;
  postalCode?: string;
}

function readCheckoutValue<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function hasCompletedContact(): boolean {
  const contact = readCheckoutValue<CheckoutContact>("vergo_checkout_contact");
  return Boolean(
    contact?.firstName?.trim() &&
      contact.lastName?.trim() &&
      contact.email?.trim() &&
      contact.phone?.trim(),
  );
}

export function hasCompletedShipping(): boolean {
  const shipping = readCheckoutValue<CheckoutShipping>("vergo_checkout_shipping");
  return Boolean(
    shipping?.receiverName?.trim() &&
      shipping.receiverPhone?.trim() &&
      shipping.addressLine1?.trim() &&
      shipping.city?.trim() &&
      shipping.district?.trim() &&
      /^\d{5}$/.test(shipping.postalCode?.trim() || ""),
  );
}
