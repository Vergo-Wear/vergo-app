"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { hasCompletedContact, hasCompletedShipping } from "@/lib/checkout-progress";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { useGuestCheckoutGuard } from "@/hooks/useGuestCheckoutGuard";
import "@/styles/checkout.css";

interface CustomerProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartSubtotal, formatLkr, isLoaded: isCartLoaded } = useCart();
  useGuestCheckoutGuard(cart.length, isCartLoaded);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [contactComplete, setContactComplete] = useState(false);
  const [shippingComplete, setShippingComplete] = useState(false);

  // Pre-fill from cached auth data immediately, then refresh from the
  // customer record because OAuth login data does not always include a phone.
  useEffect(() => {
    setContactComplete(hasCompletedContact());
    setShippingComplete(hasCompletedShipping());
    if (sessionStorage.getItem("vergo_is_logged_in") !== "true") return;

    const storedUserStr = sessionStorage.getItem("vergo_user");
    if (storedUserStr) {
      try {
        const user = JSON.parse(storedUserStr);
        if (user.email) setEmail(user.email);
        if (user.phone) setPhone(user.phone);
        if (user.name) {
          const parts = user.name.trim().split(/\s+/);
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
        }
      } catch (e) {
        console.error("Error pre-filling cached user details:", e);
      }
    }

    void authenticatedFetch("/customers/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response?.ok) return null;
        return response.json() as Promise<CustomerProfile>;
      })
      .then((profile) => {
        if (!profile) return;
        setFirstName(profile.firstName || "");
        setLastName(profile.lastName || "");
        setEmail(profile.email || "");
        setPhone(profile.phone || "");
      })
      .catch(() => undefined);
  }, []);

  // Helper to parse LKR price string to number, e.g. "LKR 36,500.00" -> 36500
  const parseLkrPrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    const cleanStr = priceStr.replace(/LKR/g, "").replace(/,/g, "").trim();
    const value = parseFloat(cleanStr);
    return isNaN(value) ? 0 : value;
  };

  const itemsToDisplay = cart;
  const subtotalLkr = cartSubtotal;

  const validateContactField = (field: string, value: string) => {
    const trimmed = value.trim();
    if (field === "firstName") {
      if (!trimmed) return "First Name is required.";
      if (trimmed.length < 2) return "First Name must be at least 2 characters.";
      if (!/^[A-Za-z\s]+$/.test(trimmed)) return "First Name can only contain letters and spaces.";
    }
    if (field === "lastName") {
      if (!trimmed) return "Last Name is required.";
      if (!/^[A-Za-z\s]+$/.test(trimmed)) return "Last Name can only contain letters and spaces.";
    }
    if (field === "email") {
      if (!trimmed) return "Email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Invalid email address.";
    }
    if (field === "phone") {
      const cleanPhone = value.replace(/[\s-()]/g, "");
      if (!trimmed) return "Mobile number is required.";
      if (!/^(?:\+94|0)?7[0-9]{8}$/.test(cleanPhone)) {
        return "Invalid Sri Lankan mobile number (e.g. 0771234567).";
      }
    }
    return "";
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === "firstName") setFirstName(value);
    if (field === "lastName") setLastName(value);
    if (field === "email") setEmail(value);
    if (field === "phone") setPhone(value);

    setErrors((prev) => ({
      ...prev,
      [field]: value.trim().length > 1 ? validateContactField(field, value) : "",
    }));
  };

  const handleContinueAsGuest = () => {
    setShowPopup(false);
    sessionStorage.setItem("vergo_is_logged_in", "false");
    localStorage.setItem("vergo_checkout_as_guest", "true");
    proceedWithSubmission();
  };

  const proceedWithSubmission = () => {
    setIsSubmitting(true);
    const normalizedPhone = phone.replace(/[\s-()]/g, "");
    localStorage.setItem(
      "vergo_checkout_contact",
      JSON.stringify({ firstName, lastName, email, phone: normalizedPhone })
    );
    setContactComplete(true);

    if (sessionStorage.getItem("vergo_is_logged_in") !== "true") {
      sessionStorage.setItem("vergo_is_logged_in", "false");
    } else {
      localStorage.removeItem("vergo_checkout_as_guest");
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        router.push("/checkout/shipping");
      }, 1500);
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {
      firstName: validateContactField("firstName", firstName),
      lastName: validateContactField("lastName", lastName),
      email: validateContactField("email", email),
      phone: validateContactField("phone", phone),
    };

    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    // If the customer is already logged in, do not check email/phone existence or show popup.
    if (sessionStorage.getItem("vergo_is_logged_in") === "true") {
      proceedWithSubmission();
      return;
    }

    setIsSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/checkout/check-contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, phone: phone.replace(/[\s-()]/g, "") }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          const validation = (await response.json().catch(() => null)) as {
            message?: string | string[];
          } | null;
          const messages = Array.isArray(validation?.message)
            ? validation.message
            : validation?.message
              ? [validation.message]
              : [];
          const phoneMessage = messages.find((message) =>
            message.toLowerCase().includes("phone"),
          );
          setErrors((current) => ({
            ...current,
            phone:
              phoneMessage ||
              "Enter a valid 10-digit Sri Lankan mobile number (e.g. 0715423156).",
          }));
          setIsSubmitting(false);
          return;
        }
        throw new Error(`Contact check failed with status ${response.status}.`);
      }

      const { emailExists, phoneExists } = await response.json();
      setIsSubmitting(false);

      if (emailExists && phoneExists) {
        setShowPopup(true);
      } else if (emailExists) {
        setShowPopup(true);
      } else if (phoneExists) {
        setShowPopup(true);
      } else {
        proceedWithSubmission();
      }
    } catch (apiError) {
      console.error("Failed to check existing contact via backend API:", apiError);
      setIsSubmitting(false);
      setErrors({ email: "Unable to verify this contact with the database. Please try again." });
    }
  };

  return (
    <div className="checkout-wrapper">
      {/* Progress Steps */}
      <div className="checkout-progress">
        <button type="button" className="step-item active-green" onClick={() => router.push("/checkout")} aria-current="step">
          <span className="step-circle">1</span>
          <span className="step-label">Details</span>
        </button>
        <div className="progress-line"></div>
        <button type="button" className="step-item" disabled={!contactComplete} onClick={() => router.push("/checkout/shipping")}>
          <span className="step-circle">2</span>
          <span className="step-label">Shipping</span>
        </button>
        <div className="progress-line"></div>
        <button type="button" className="step-item" disabled={!contactComplete || !shippingComplete} onClick={() => router.push("/checkout/payment")}>
          <span className="step-circle">3</span>
          <span className="step-label">Payment</span>
        </button>
      </div>

      {/* Main Container */}
      <main className="checkout-container">
        {/* Left: Contact Info Form */}
        <section className="checkout-form-section">
          <h1 className="checkout-form-title">Contact Information</h1>
          <p className="form-subtitle">
            Please provide your details to ensure a smooth delivery of your order.
          </p>

          <form onSubmit={handleSubmit} className="checkout-form" noValidate>
            {/* Row: First Name & Last Name */}
            <div className="form-row-half">
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="e.g. Nimal"
                  className={`form-input ${errors.firstName ? "input-error" : ""}`}
                  aria-invalid={Boolean(errors.firstName)}
                  value={firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                />
                {errors.firstName && (
                  <span className="error-message">{errors.firstName}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="e.g. Perera"
                  className={`form-input ${errors.lastName ? "input-error" : ""}`}
                  aria-invalid={Boolean(errors.lastName)}
                  value={lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                />
                {errors.lastName && (
                  <span className="error-message">{errors.lastName}</span>
                )}
              </div>
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  placeholder="e.g. nimal.perera@gmail.com"
                  className={`form-input form-input-email ${errors.email ? "input-error" : ""}`}
                  aria-invalid={Boolean(errors.email)}
                  value={email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="input-icon-right"
                  width={18}
                  height={18}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="e.g. 0771234567"
                className={`form-input ${errors.phone ? "input-error" : ""}`}
                aria-invalid={Boolean(errors.phone)}
                value={phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            {/* Continue Button */}
            <div className="submit-btn-container checkout-actions">
              <button type="button" className="checkout-back-btn" onClick={() => router.push("/cart")}>
                <svg
                  className="checkout-back-icon"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M15.5 10H4.5M9 4.5 3.5 10 9 15.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Back to Cart</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="submit-btn"
              >
                {isSubmitting ? (
                  "Saving Details..."
                ) : (
                  <>
                    Continue to Shipping
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
              </button>
            </div>
          </form>
        </section>

        {/* Right: Order Summary */}
        <aside className="order-summary-card">
          <h2 className="summary-card-title">Order Summary</h2>

          {/* Items List */}
          <div className="summary-items-list">
            {itemsToDisplay.map((item, index) => {
              const itemLkrPrice = parseLkrPrice(item.product.lkrPrice);
              const totalItemLkrPrice = itemLkrPrice * item.quantity;

              return (
                <div key={`${item.product.id}-${index}`} className="summary-item">
                  <div className="summary-item-image-wrapper">
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      className="summary-item-image"
                      sizes="68px"
                    />
                  </div>
                  <div className="summary-item-details">
                    <h3 className="summary-item-name">{item.product.name}</h3>
                    <div className="summary-item-meta">
                      Size: {item.size} / Color: {item.color || item.product.colors?.[0] || "Default"}
                    </div>
                    <div className="summary-item-price">
                      {formatLkr(totalItemLkrPrice)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <hr className="summary-card-divider" />

          {/* Pricing Calculations */}
          <div className="summary-calc-row">
            <span className="summary-calc-label">Subtotal</span>
            <span className="summary-calc-value">{formatLkr(subtotalLkr)}</span>
          </div>

          <div className="summary-calc-row">
            <span className="summary-calc-label">Shipping</span>
            <span className="summary-calc-value italic-muted">Calculated next</span>
          </div>

          <div className="summary-calc-row">
            <span className="summary-calc-label">Taxes</span>
            <span className="summary-calc-value">LKR 0.00</span>
          </div>

          <hr className="summary-card-divider" />

          {/* Total */}
          <div className="summary-total-row">
            <span className="summary-total-label">Total</span>
            <span className="summary-total-value">{formatLkr(subtotalLkr)}</span>
          </div>

          {/* Payment Icons */}
          <div className="summary-payment-icons">
            {/* Credit Card */}
            <svg
              className="summary-payment-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              width={20}
              height={20}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
              />
            </svg>

            {/* Wallet / Chip */}
            <svg
              className="summary-payment-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              width={20}
              height={20}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
              />
            </svg>

            {/* Contactless */}
            <svg
              className="summary-payment-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              width={20}
              height={20}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
              />
            </svg>
          </div>
        </aside>
      </main>

      {/* Premium Toast for Success State */}
      {showSuccessToast && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
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
            Contact information successfully saved!
          </span>
        </div>
      )}

      {/* Existing Customer Popup Modal */}
      {showPopup && (
        <div className="modal-overlay exist-customer-overlay" onClick={() => setShowPopup(false)}>
          <div className="modal-box exist-customer-box" onClick={(e) => e.stopPropagation()}>
            <div className="exist-customer-icon-container">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width={26}
                height={26}
              >
                {/* User shape in soft yellow */}
                <path d="M15 21v-2a3 3 0 0 0-3-3H4a3 3 0 0 0-3 3v2" stroke="#fbbf24" />
                <circle cx="8" cy="7" r="3" stroke="#fbbf24" />
                {/* Lock shape in soft system green */}
                <rect x="15" y="11" width="7" height="9" rx="1.5" stroke="#00FF9D" />
                <path d="M17 11V9a1.5 1.5 0 0 1 3 0v2" stroke="#00FF9D" />
              </svg>
            </div>

            <h3 className="exist-customer-title">
              Account Already Exists
            </h3>

            <p className="exist-customer-message">
              An account with your email or phone number already exists in our system.
            </p>

            {/* Highlighted Payment Info Banner */}
            <div className="exist-customer-info-banner">
              <p className="exist-customer-info-text">
                Continuing as a guest restricts you to <strong>Cash on Delivery (COD) only</strong> and <strong className="highlight-orange">disables Direct Bank Transfer</strong>.
              </p>
            </div>

            <div className="modal-buttons-container" style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
              <button
                type="button"
                className="exist-customer-primary-btn"
                onClick={() => {
                  sessionStorage.setItem("vergo_login_prefill", email);
                  localStorage.removeItem("vergo_checkout_as_guest");
                  router.push("/auth/login");
                }}
              >
                Yes, log in
              </button>
              <button
                type="button"
                className="exist-customer-secondary-btn"
                onClick={handleContinueAsGuest}
              >
                No, continue as guest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
