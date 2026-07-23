"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { hasCompletedContact, hasCompletedShipping } from "@/lib/checkout-progress";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { useGuestCheckoutGuard } from "@/hooks/useGuestCheckoutGuard";
import "@/styles/checkout.css";

// Standard Sri Lankan Districts list plus Figma custom "Tech District"
const DISTRICTS = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Moneragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Tech District",
  "Trincomalee",
  "Vavuniya",
];

// Saved address record returned by GET /addresses/mine
interface SavedAddress {
  addressId: string;
  receiverName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  district: string;
  postalCode?: string | null;
  isPrimary?: boolean | null;
}

interface CustomerProfile {
  firstName: string;
  lastName: string;
  phone: string | null;
}

export default function ShippingPage() {
  const router = useRouter();
  const { cart, cartSubtotal, formatLkr, isLoaded: isCartLoaded } = useCart();
  useGuestCheckoutGuard(cart.length, isCartLoaded);

  // User auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Form fields state
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");

  // Saved address book (registered customers only)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Logic flags
  const [setAsPrimary, setSetAsPrimary] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [shippingComplete, setShippingComplete] = useState(false);

  useEffect(() => {
    if (!hasCompletedContact()) {
      router.replace("/checkout");
      return;
    }
    setShippingComplete(hasCompletedShipping());
  }, [router]);

  // Delivery calculation state
  const [baseShipping, setBaseShipping] = useState<number | null>(null);
  const [regionalSurcharge, setRegionalSurcharge] = useState<number | null>(null);
  const [totalDeliveryFee, setTotalDeliveryFee] = useState<number | null>(null);

  // Fill the form from a saved address and lock the fields to it
  const applySavedAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.addressId);
    setReceiverName(address.receiverName);
    setReceiverPhone(address.phone);
    setAddressLine1(address.addressLine1);
    setAddressLine2(address.addressLine2 || "");
    setCity(address.city);
    setDistrict(address.district);
    setPostalCode(address.postalCode || "");
    setSetAsPrimary(false);
    setErrors({});
  };

  // Load auth status and contact details from checkout step 1
  useEffect(() => {
    if (typeof window !== "undefined") {
      const loggedIn = sessionStorage.getItem("vergo_is_logged_in") === "true";
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        const storedUser = sessionStorage.getItem("vergo_user");
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUserProfile(parsedUser);

            // By default, pre-fill receiver name with logged-in user name
            if (parsedUser.name) {
              setReceiverName(parsedUser.name);
            }
            if (parsedUser.phone) {
              setReceiverPhone(parsedUser.phone);
            }
          } catch (e) {
            console.error("Error parsing user profile details:", e);
          }
        }

        // Refresh account contact details from the database. Some login paths
        // do not include the customer's phone number in vergo_user.
        const token = sessionStorage.getItem("vergo_access_token");
        if (token) {
          void authenticatedFetch("/customers/me", { cache: "no-store" })
            .then(async (response) => {
              if (!response?.ok) return null;
              return response.json() as Promise<CustomerProfile>;
            })
            .then((profile) => {
              if (!profile) return;
              const accountUser = {
                name: `${profile.firstName} ${profile.lastName}`.trim(),
                phone: profile.phone || "",
              };
              setUserProfile(accountUser);
              setReceiverName((current) => current || accountUser.name);
              setReceiverPhone((current) => current || accountUser.phone);
            })
            .catch(() => undefined);
        }

        // Load the customer's saved address book and auto-select the primary
        const loadSavedAddresses = async () => {
          if (!token) return;
          try {
            const response = await authenticatedFetch("/addresses/mine");
            if (!response?.ok) return;
            const addresses: SavedAddress[] = await response.json();
            setSavedAddresses(addresses);
            const primary = addresses.find((a) => a.isPrimary);
            if (primary) {
              applySavedAddress(primary);
            }
          } catch (e) {
            console.error("Failed to load saved addresses:", e);
          }
        };
        void loadSavedAddresses();
      } else {
        // For guest, we can pre-fill name/phone from the checkout step 1 details if they exist
        const contactStr = localStorage.getItem("vergo_checkout_contact");
        if (contactStr) {
          try {
            const contact = JSON.parse(contactStr);
            if (contact.firstName || contact.lastName) {
              setReceiverName(`${contact.firstName || ""} ${contact.lastName || ""}`.trim());
            }
            if (contact.phone) {
              setReceiverPhone(contact.phone);
            }
          } catch (e) {
            console.error("Error parsing contact info:", e);
          }
        }
      }
    }
  }, []);

  // Recalculate delivery fee when district changes
  useEffect(() => {
    if (!district) {
      setBaseShipping(null);
      setRegionalSurcharge(null);
      setTotalDeliveryFee(null);
      return;
    }

    // Base shipping is 350 LKR
    const base = 350;
    let surcharge = 250; // default for other districts

    const lowerDistrict = district.toLowerCase();
    if (lowerDistrict === "colombo" || lowerDistrict === "tech district") {
      surcharge = 0;
    } else if (lowerDistrict === "gampaha" || lowerDistrict === "kalutara") {
      surcharge = 100;
    } else if (
      ["kandy", "galle", "matara", "kegalle", "ratnapura", "kurunegala"].includes(lowerDistrict)
    ) {
      surcharge = 150;
    }

    setBaseShipping(base);
    setRegionalSurcharge(surcharge);
    setTotalDeliveryFee(base + surcharge);
  }, [district]);

  // Switch back to entering a completely new address
  const handleUseNewAddress = () => {
    setSelectedAddressId(null);
    setReceiverName(userProfile?.name || "");
    setReceiverPhone(userProfile?.phone || "");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setDistrict("");
    setPostalCode("");
    setErrors({});
  };

  const usingSavedAddress = selectedAddressId !== null;

  const handleInputChange = (field: string, value: string) => {
    if (field === "receiverName") setReceiverName(value);
    if (field === "receiverPhone") setReceiverPhone(value);
    if (field === "addressLine1") setAddressLine1(value);
    if (field === "addressLine2") setAddressLine2(value);
    if (field === "city") setCity(value);
    if (field === "district") setDistrict(value);
    if (field === "postalCode") setPostalCode(value);
    if (field === "deliveryNote") setDeliveryNote(value);

    // Clear specific error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    const newErrors: Record<string, string> = {};
    const nameRegex = /^[a-zA-Z\s\-'\.]+$/;

    if (!receiverName.trim()) {
      newErrors.receiverName = "Receiver name is required";
    } else if (receiverName.trim().length < 2) {
      newErrors.receiverName = "Receiver name must be at least 2 characters";
    } else if (!nameRegex.test(receiverName.trim())) {
      newErrors.receiverName = "Receiver name contains invalid characters";
    }

    // Sri Lankan phone format validation: optional +94 or 0, followed by 9 digits
    const cleanPhone = receiverPhone.trim();
    const lkPhoneRegex = /^(?:\+94|0)?[1-9][0-9]{8}$/;
    if (!cleanPhone) {
      newErrors.receiverPhone = "Receiver phone number is required";
    } else if (!lkPhoneRegex.test(cleanPhone)) {
      newErrors.receiverPhone = "Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)";
    }

    if (!addressLine1.trim()) {
      newErrors.addressLine1 = "Address Line 1 is required";
    } else if (addressLine1.trim().length < 5) {
      newErrors.addressLine1 = "Address must be at least 5 characters";
    }

    if (!city.trim()) {
      newErrors.city = "City is required";
    } else if (city.trim().length < 2) {
      newErrors.city = "City must be at least 2 characters";
    }

    if (!district) {
      newErrors.district = "Please select a district for shipping calculation";
    } else if (!DISTRICTS.includes(district)) {
      newErrors.district = "Please select a valid Sri Lankan district";
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = "Postal code is required";
    } else if (!/^\d{5}$/.test(postalCode.trim())) {
      newErrors.postalCode = "Enter a valid 5-digit Sri Lankan postal code";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    // Prepare data for order_shipping_details. New addresses entered by
    // registered customers are saved to their address book by the backend
    // inside the order transaction; guests never persist addresses.
    const shippingDetails = {
      receiverName,
      receiverPhone,
      addressLine1,
      addressLine2,
      city,
      district,
      postalCode: postalCode.trim(),
      deliveryNote: deliveryNote.trim() || undefined,
      deliveryFee: totalDeliveryFee || 0,
      baseShipping: baseShipping || 0,
      regionalSurcharge: regionalSurcharge || 0,
      savedAddressId: usingSavedAddress ? selectedAddressId : undefined,
      saveAddress: isLoggedIn && !usingSavedAddress,
      setAsPrimary: isLoggedIn && !usingSavedAddress && setAsPrimary,
    };

    // Save details to localStorage
    localStorage.setItem("vergo_checkout_shipping", JSON.stringify(shippingDetails));
    setShippingComplete(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        router.push("/checkout/payment");
      }, 1500);
    }, 1000);
  };

  const itemsToDisplay = cart;
  const subtotalLkr = cartSubtotal;
  const displayTotalLkr = subtotalLkr + (totalDeliveryFee || 0);

  return (
    <div className="checkout-wrapper">
      {/* Progress Steps */}
      <div className="checkout-progress">
        <button type="button" className="step-item completed-step" onClick={() => router.push("/checkout")}>
          <span className="step-circle">1</span>
          <span className="step-label">Details</span>
        </button>
        <div className="progress-line"></div>
        <button type="button" className="step-item active-green" onClick={() => router.push("/checkout/shipping")} aria-current="step">
          <span className="step-circle">2</span>
          <span className="step-label">Shipping</span>
        </button>
        <div className="progress-line"></div>
        <button type="button" className="step-item" disabled={!shippingComplete} onClick={() => router.push("/checkout/payment")}>
          <span className="step-circle">3</span>
          <span className="step-label">Payment</span>
        </button>
      </div>

      {/* Main Container */}
      <main className="checkout-container">
        {/* Left Column: Shipping Form */}
        <section className="checkout-form-section">
          <h1 className="checkout-form-title">Shipping</h1>
          <p className="form-subtitle">
            Configure your delivery destination and optimization route parameters.
          </p>

          {/* Member Section: Saved Address Book */}
          {isLoggedIn && savedAddresses.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {savedAddresses.map((address) => {
                const isSelected = selectedAddressId === address.addressId;
                return (
                  <button
                    key={address.addressId}
                    type="button"
                    className="address-toggle-card"
                    onClick={() => applySavedAddress(address)}
                    style={{
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      border: isSelected
                        ? "1px solid #00FF9D"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <div className="address-toggle-info">
                      <div className="address-toggle-icon-box">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                          width={20}
                          height={20}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                          />
                        </svg>
                      </div>
                      <div className="address-toggle-text">
                        <span className="address-toggle-title">
                          {address.receiverName}
                          {address.isPrimary ? " · Primary" : ""}
                        </span>
                        <span className="address-toggle-subtitle">
                          {address.addressLine1}
                          {address.addressLine2 ? `, ${address.addressLine2}` : ""}, {address.city}, {address.district}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ color: "#00FF9D", fontWeight: 700, fontSize: "13px" }}>✓</span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                className="address-toggle-card"
                onClick={handleUseNewAddress}
                style={{
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  border: !usingSavedAddress
                    ? "1px solid #00FF9D"
                    : "1px dashed rgba(255, 255, 255, 0.15)",
                }}
              >
                <div className="address-toggle-info">
                  <div className="address-toggle-icon-box">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      width={20}
                      height={20}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <div className="address-toggle-text">
                    <span className="address-toggle-title">Use a new address</span>
                    <span className="address-toggle-subtitle">
                      Enter a different shipping destination below
                    </span>
                  </div>
                </div>
                {!usingSavedAddress && (
                  <span style={{ color: "#00FF9D", fontWeight: 700, fontSize: "13px" }}>✓</span>
                )}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="checkout-form" noValidate>
            {/* Row: Receiver Name & Phone Number */}
            <div className="form-row-half">
              <div className="form-group">
                <label className="form-label" htmlFor="receiverName">
                  Receiver Name
                </label>
                <input
                  id="receiverName"
                  type="text"
                  placeholder="Full Name"
                  disabled={usingSavedAddress}
                  className={`form-input ${errors.receiverName ? "input-error" : ""}`}
                  aria-invalid={Boolean(errors.receiverName)}
                  value={receiverName}
                  onChange={(e) => handleInputChange("receiverName", e.target.value)}
                />
                {errors.receiverName && (
                  <span className="error-message">{errors.receiverName}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="receiverPhone">
                  Phone Number
                </label>
                <input
                  id="receiverPhone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  disabled={usingSavedAddress}
                  className={`form-input ${errors.receiverPhone ? "input-error" : ""}`}
                  aria-invalid={Boolean(errors.receiverPhone)}
                  value={receiverPhone}
                  onChange={(e) => handleInputChange("receiverPhone", e.target.value)}
                />
                {errors.receiverPhone && (
                  <span className="error-message">{errors.receiverPhone}</span>
                )}
              </div>
            </div>

            {/* Address Line 1 */}
            <div className="form-group">
              <label className="form-label" htmlFor="addressLine1">
                Address Line 1
              </label>
              <input
                id="addressLine1"
                type="text"
                placeholder="Street address, P.O. box, company name"
                disabled={usingSavedAddress}
                className={`form-input ${errors.addressLine1 ? "input-error" : ""}`}
                aria-invalid={Boolean(errors.addressLine1)}
                value={addressLine1}
                onChange={(e) => handleInputChange("addressLine1", e.target.value)}
              />
              {errors.addressLine1 && (
                <span className="error-message">{errors.addressLine1}</span>
              )}
            </div>

            {/* Address Line 2 (Optional) */}
            <div className="form-group">
              <label className="form-label" htmlFor="addressLine2">
                Address Line 2 (Optional)
              </label>
              <input
                id="addressLine2"
                type="text"
                placeholder="Apartment, suite, unit, building, floor, etc."
                disabled={usingSavedAddress}
                className="form-input"
                value={addressLine2}
                onChange={(e) => handleInputChange("addressLine2", e.target.value)}
              />
            </div>

            {/* Row: City & District */}
            <div className="form-row-half">
              <div className="form-group">
                <label className="form-label" htmlFor="city">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  placeholder="City"
                  disabled={usingSavedAddress}
                  className={`form-input ${errors.city ? "input-error" : ""}`}
                  aria-invalid={Boolean(errors.city)}
                  value={city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
                {errors.city && <span className="error-message">{errors.city}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="district">
                  District
                </label>
                <select
                  id="district"
                  disabled={usingSavedAddress}
                  className={`form-input form-select district-select ${errors.district ? "input-error" : ""} ${!district ? "placeholder-color" : ""}`}
                  aria-invalid={Boolean(errors.district)}
                  value={district}
                  onChange={(e) => handleInputChange("district", e.target.value)}
                >
                  <option value="" disabled>
                    Select District
                  </option>
                  {DISTRICTS.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
                {errors.district && <span className="error-message">{errors.district}</span>}
              </div>
            </div>

            {/* Row: Postal Code & Delivery Note */}
            <div className="form-row-half">
              <div className="form-group">
                <label className="form-label" htmlFor="postalCode">
                  Postal Code
                </label>
                <input
                  id="postalCode"
                  type="text"
                  placeholder="e.g. 10100"
                  disabled={usingSavedAddress}
                  className={`form-input ${errors.postalCode ? "input-error" : ""}`}
                  aria-invalid={Boolean(errors.postalCode)}
                  value={postalCode}
                  onChange={(e) => handleInputChange("postalCode", e.target.value)}
                />
                {errors.postalCode && (
                  <span className="error-message">{errors.postalCode}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="deliveryNote">
                  Delivery Note (Optional)
                </label>
                <textarea
                  id="deliveryNote"
                  placeholder="Notes for courier (e.g. gate codes, directions)"
                  disabled={usingSavedAddress}
                  className="form-textarea"
                  value={deliveryNote}
                  onChange={(e) => handleInputChange("deliveryNote", e.target.value)}
                />
              </div>
            </div>

            {/* Member Section: Save Address Option */}
            {isLoggedIn && !usingSavedAddress && (
              <div style={{ marginTop: "8px" }}>
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={setAsPrimary}
                    onChange={(e) => setSetAsPrimary(e.target.checked)}
                  />
                  <span className="checkbox-custom"></span>
                  Set this as my primary shipping address
                </label>
              </div>
            )}
          </form>
        </section>

        {/* Right Column: Order Summary Card & Logistic Optimization */}
        <aside style={{ display: "flex", flexDirection: "column" }}>
          <div className="order-summary-card">
            <h2 className="summary-card-title">Order Summary</h2>

            {/* Items List */}
            <div className="summary-items-list">
              {itemsToDisplay.map((item, index) => {
                // Parse LKR price string to value
                const cleanPrice = item.product.lkrPrice
                  ? parseFloat(item.product.lkrPrice.replace(/LKR/g, "").replace(/,/g, "").trim())
                  : 0;
                const totalItemPrice = cleanPrice * item.quantity;

                return (
                  <div key={`${item.product.id}-${index}`} className="summary-item">
                    <div className="summary-item-image-wrapper">
                      {item.product.image && (
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          fill
                          className="summary-item-image"
                          sizes="68px"
                        />
                      )}
                    </div>
                    <div className="summary-item-details">
                      <h3 className="summary-item-name">{item.product.name}</h3>
                      <div className="summary-item-meta">
                        Size: {item.size} / Color: {item.color || item.product.colors?.[0] || "Default"}
                      </div>
                      <div className="summary-item-price">{formatLkr(totalItemPrice)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <hr className="summary-card-divider" />

            {/* Subtotal */}
            <div className="summary-calc-row">
              <span className="summary-calc-label">Subtotal</span>
              <span className="summary-calc-value">{formatLkr(subtotalLkr)}</span>
            </div>

            {/* Delivery Calculation */}
            <div className="summary-calc-row">
              <span className="summary-calc-label">Delivery</span>
              {totalDeliveryFee !== null ? (
                <span className="summary-calc-value">
                  <span className="delivery-badge">CITYPAK</span>
                  <span style={{ marginLeft: "8px" }}>{formatLkr(totalDeliveryFee)}</span>
                </span>
              ) : (
                <span className="summary-calc-value italic-muted">Select district</span>
              )}
            </div>

            {/* Taxes */}
            <div className="summary-calc-row">
              <span className="summary-calc-label">Taxes</span>
              <span className="summary-calc-value">{formatLkr(0)}</span>
            </div>

            <hr className="summary-card-divider" />

            {/* Total */}
            <div className="summary-total-row">
              <span className="summary-total-label">Total</span>
              <span className="summary-total-value">{formatLkr(displayTotalLkr)}</span>
            </div>

            {/* Proceed to Payment Button */}
            <div className="submit-btn-container checkout-actions" style={{ marginTop: "24px" }}>
              <button type="button" className="checkout-back-btn" onClick={() => router.push("/checkout")}>
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting || !district}
                className="submit-btn shipping-payment-submit"
                onClick={handleSubmit}
              >
                <span className="shipping-payment-submit-sizer" aria-hidden="true">
                  Proceed to Payment
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" width={14} height={14}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
                <span className="shipping-payment-submit-label">
                  {isSubmitting ? (
                    "Optimizing..."
                  ) : (
                    <>
                      Proceed to Payment
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                        stroke="currentColor"
                        width={14}
                        height={14}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                        />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </div>

          </div>

          {/* Logistic Optimization Widget */}
          <div className="logistic-card">
            <div className="logistic-header">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                width={18}
                height={18}
                style={{ color: "#00FF9D" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.75a1.125 1.125 0 0 1-1.125-1.125V15h1.5a1.5 1.5 0 0 0 1.5-1.5V6.75A2.25 2.25 0 0 1 7.875 4.5h8.25a2.25 2.25 0 0 1 2.25 2.25v7.125m-18 0v-1.5m18 1.5H20.25a1.125 1.125 0 0 0 1.125-1.125V11.25M18 10.5h3.75m-3.75 3h3.75M9 13.5h3.75m-3.75 3h3.75m-3-9h3.75m-3 3h3.75m-3.75 3h3.75m-3-9h3.75m-3 3h3.75"
                />
              </svg>
              <span className="logistic-title">Logistic Optimization</span>
            </div>

            <div className="logistic-details">
              <div className="logistic-row">
                <span>Base Shipping:</span>
                <span className="logistic-row-val">
                  {baseShipping !== null ? formatLkr(baseShipping) : "LKR 0.00"}
                </span>
              </div>
              <div className="logistic-row">
                <span>Regional Surcharge:</span>
                <span className="logistic-row-val">
                  {regionalSurcharge !== null ? formatLkr(regionalSurcharge) : "LKR 0.00"}
                </span>
              </div>
              <hr className="logistic-divider" />
              <div className="logistic-status">
                {district ? (
                  <>Live: Calculating fastest route via Citypak Hubs...</>
                ) : (
                  <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>
                    Select a district to calculate route
                  </span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Success Toast */}
      {showSuccessToast && (
        <div
          style={{
            position: "fixed",
            top: "96px",
            right: "32px",
            backgroundColor: "#0d0d0e",
            border: "1px solid #00FF9D",
            borderRadius: "8px",
            padding: "16px 24px",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 10px 30px rgba(0, 255, 157, 0.15)",
            zIndex: 9999,
          }}
        >
          <span style={{ color: "#00FF9D", fontSize: "18px", fontWeight: "bold" }}>✓</span>
          <span style={{ fontSize: "14px", fontWeight: "600", letterSpacing: "0.02em" }}>
            Shipping details saved successfully!
          </span>
        </div>
      )}
    </div>
  );
}
