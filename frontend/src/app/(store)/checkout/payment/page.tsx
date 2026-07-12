"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import "@/styles/checkout.css";

interface ContactInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface ShippingInfo {
  receiverName?: string;
  receiverPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  deliveryNote?: string;
  deliveryFee?: number;
}

interface UserProfile {
  customerId?: string;
  id?: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const { cart, cartSubtotal, clearCart, formatLkr } = useCart();

  // Local storage details
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Form state
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrderCompletedModal, setShowOrderCompletedModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const forcedGuest = localStorage.getItem("vergo_checkout_as_guest") === "true";
      const loggedIn = localStorage.getItem("vergo_is_logged_in") === "true" && !forcedGuest;
      setIsLoggedIn(loggedIn);
      setPaymentMethod(loggedIn ? "bank_transfer" : "cod");

      const storedContact = localStorage.getItem("vergo_checkout_contact");
      const storedShipping = localStorage.getItem("vergo_checkout_shipping");
      const storedUser = localStorage.getItem("vergo_user");

      if (storedUser) {
        try {
          setUserProfile(JSON.parse(storedUser));
        } catch (e) {
          console.error("Error reading user profile", e);
        }
      }

      if (storedContact) {
        try {
          setContactInfo(JSON.parse(storedContact));
        } catch (e) {
          console.error(e);
        }
      }
      if (storedShipping) {
        try {
          setShippingInfo(JSON.parse(storedShipping));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handlePlaceOrder = async () => {
    setSubmitError(null);

    if (!isLoggedIn && paymentMethod !== "cod") {
      setPaymentMethod("cod");
      setSubmitError("Guest checkout supports Cash on Delivery only. Log in to use Bank Transfer.");
      return;
    }

    setIsSubmitting(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const getMockVariantId = (id: number) =>
      "30a91f5a-3eb6-444a-a7ee-000000000" + String(id).padStart(3, "0");
    const payload = {
      // Deliberately null for guests, even when their contact matches an account.
      customerId: isLoggedIn ? (userProfile?.customerId || userProfile?.id || null) : null,
      paymentMethod: isLoggedIn && paymentMethod === "bank_transfer" ? "bank_transfer" : "cod",
      deliveryFee,
      contactDetails: {
        firstName: contactInfo?.firstName || "",
        lastName: contactInfo?.lastName || "",
        email: contactInfo?.email || "",
        phone: contactInfo?.phone || "",
      },
      shippingDetails: {
        receiverName: shippingInfo?.receiverName || "",
        phone: shippingInfo?.receiverPhone || "",
        addressLine1: shippingInfo?.addressLine1 || "",
        addressLine2: shippingInfo?.addressLine2 || "",
        city: shippingInfo?.city || "",
        district: shippingInfo?.district || "",
        postalCode: shippingInfo?.postalCode || "",
        deliveryNote: shippingInfo?.deliveryNote || "",
      },
      items: itemsToDisplay.map((item) => ({
        variantId: ("variantId" in item.product && item.product.variantId) || getMockVariantId(item.product.id),
        quantity: item.quantity || 1,
      })),
    };

    try {
      const response = await fetch(`${apiUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.message) ? data.message.join(" ") : data.message;
        setSubmitError(message || "Failed to place order.");
        return;
      }

      const newOrderId = data.order?.orderId || data.order?.id;
      setOrderId(newOrderId);
      const storedOrders = localStorage.getItem("vergo_customer_orders");
      const ordersList = storedOrders ? JSON.parse(storedOrders) : [];
      ordersList.unshift({
        id: newOrderId,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: "Processing",
        paymentMethod: payload.paymentMethod === "cod" ? "Cash on Delivery" : "Bank Transfer",
        paymentStatus: "Pending",
        total: grandTotalLkr,
        isGuest: !isLoggedIn,
        items: itemsToDisplay.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          image: item.product.image,
          size: item.size,
          color: item.color || item.product.colors?.[0] || "Default",
          qty: item.quantity,
          price: item.product.lkrPrice ? parseFloat(item.product.lkrPrice.replace(/LKR/g, "").replace(/,/g, "").trim()) : 0,
        })),
      });
      localStorage.setItem("vergo_customer_orders", JSON.stringify(ordersList));
      setShowOrderCompletedModal(true);
    } catch {
      setSubmitError("Network error: Could not reach the order creation service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishCheckout = () => {
    clearCart();
    // Clean up temporary checkout states
    localStorage.removeItem("vergo_checkout_contact");
    localStorage.removeItem("vergo_checkout_shipping");
    localStorage.removeItem("vergo_checkout_as_guest");
    setShowOrderCompletedModal(false);
    router.push("/");
  };

  const hasItems = cart.length > 0;
  const defaultItems = [
    {
      product: {
        id: 999,
        name: "VERGO OBSIDIAN SHELL-P1",
        price: "$450.00",
        lkrPrice: "LKR 135,000.00",
        image: "/images/hoodie.png",
        colors: ["Noir"]
      },
      size: "XL",
      color: "Noir",
      quantity: 1
    }
  ];

  const itemsToDisplay = hasItems ? cart : defaultItems;
  const subtotalLkr = hasItems ? cartSubtotal : 135000;
  const deliveryFee = shippingInfo?.deliveryFee || 0;
  const grandTotalLkr = subtotalLkr + deliveryFee;

  return (
    <div className="checkout-wrapper">
      {/* Progress Steps */}
      <div className="checkout-progress">
        <div className="step-item completed-step">
          <span className="step-circle">1</span>
          <span className="step-label">Details</span>
        </div>
        <div className="progress-line"></div>
        <div className="step-item completed-step">
          <span className="step-circle">2</span>
          <span className="step-label">Shipping</span>
        </div>
        <div className="progress-line"></div>
        <div className="step-item active-green">
          <span className="step-circle">3</span>
          <span className="step-label">Payment</span>
        </div>
      </div>

      {/* Main Container */}
      <main className="checkout-container">
        {/* Left Column: Payment options & Details confirmation */}
        <section className="checkout-form-section" style={{ gap: "28px" }}>
          <div>
            <h1 className="checkout-form-title">Payment</h1>
            <p className="form-subtitle">
              Verify your information and select your preferred payment option.
            </p>
          </div>

          {/* Details Summary Card */}
          <div
            style={{
              backgroundColor: "#0d0d0e",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255, 255, 255, 0.4)",
                  marginBottom: "8px",
                }}
              >
                Contact Details
              </h3>
              <p style={{ fontSize: "13px", color: "#ffffff", lineHeight: "1.5" }}>
                {contactInfo?.firstName} {contactInfo?.lastName}
                <br />
                {contactInfo?.email} | {contactInfo?.phone}
              </p>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }} />

            <div>
              <h3
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255, 255, 255, 0.4)",
                  marginBottom: "8px",
                }}
              >
                Shipping Details
              </h3>
              <p style={{ fontSize: "13px", color: "#ffffff", lineHeight: "1.5" }}>
                <strong>Receiver:</strong> {shippingInfo?.receiverName} ({shippingInfo?.receiverPhone})
                <br />
                <strong>Address:</strong> {shippingInfo?.addressLine1}
                {shippingInfo?.addressLine2 ? ", " + shippingInfo?.addressLine2 : ""}, {shippingInfo?.city}, {shippingInfo?.district}
                {shippingInfo?.postalCode ? ` (${shippingInfo?.postalCode})` : ""}
                {shippingInfo?.deliveryNote && (
                  <>
                    <br />
                    <strong>Note:</strong> {shippingInfo?.deliveryNote}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Payment Selection */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 className="form-label">Payment Method</h3>

            {/* Bank Transfer Option */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "20px 24px",
                border: paymentMethod === "bank_transfer" ? "1.5px solid #00FF9D" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                backgroundColor: "#0d0d0e",
                cursor: isLoggedIn ? "pointer" : "not-allowed",
                opacity: isLoggedIn ? 1 : 0.5,
                transition: "all 0.2s ease",
              }}
              onClick={() => {
                if (isLoggedIn) {
                  setPaymentMethod("bank_transfer");
                }
              }}
            >
              <input
                type="radio"
                name="payment_method"
                checked={paymentMethod === "bank_transfer"}
                disabled={!isLoggedIn}
                onChange={() => {}}
                style={{
                  accentColor: "#00FF9D",
                  width: "18px",
                  height: "18px",
                  cursor: isLoggedIn ? "pointer" : "not-allowed",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
                    Direct Bank Transfer
                  </span>
                </div>
                <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>
                  Transfer funds directly. Processing takes up to 24 hours.
                </span>
                {!isLoggedIn && (
                  <span style={{ fontSize: "11px", color: "#EA4335", fontWeight: "600", marginTop: "4px" }}>
                    🔒 Only available for logged-in customers.{" "}
                    <a
                      href="/auth/login"
                      onClick={(e) => {
                        e.stopPropagation(); // prevent clicking label
                        // Save login redirect prefill
                        localStorage.setItem("vergo_login_prefill", "checkout");
                      }}
                      style={{ color: "#00FF9D", textDecoration: "underline" }}
                    >
                      Log in here
                    </a>
                  </span>
                )}
              </div>
            </label>

            {/* COD Option */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "20px 24px",
                border: paymentMethod === "cod" ? "1.5px solid #00FF9D" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                backgroundColor: "#0d0d0e",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => setPaymentMethod("cod")}
            >
              <input
                type="radio"
                name="payment_method"
                checked={paymentMethod === "cod"}
                onChange={() => {}}
                style={{
                  accentColor: "#00FF9D",
                  width: "18px",
                  height: "18px",
                  cursor: "pointer",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
                  Cash on Delivery (COD)
                </span>
                <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>
                  Pay cash when package is delivered to your doorstep.
                </span>
              </div>
            </label>
          </div>
        </section>

        {/* Right Column: Order Summary Card */}
        <aside style={{ display: "flex", flexDirection: "column" }}>
          <div className="order-summary-card">
            <h2 className="summary-card-title">Order Summary</h2>

            {/* Items List */}
            <div className="summary-items-list">
              {itemsToDisplay.map((item, index) => {
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

            {/* Delivery */}
            <div className="summary-calc-row">
              <span className="summary-calc-label">Delivery</span>
              <span className="summary-calc-value">
                <span className="delivery-badge">CITYPAK</span>
                <span style={{ marginLeft: "8px" }}>{formatLkr(deliveryFee)}</span>
              </span>
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
              <span className="summary-total-value">{formatLkr(grandTotalLkr)}</span>
            </div>

            {submitError && (
              <div style={{ color: "#EA4335", backgroundColor: "rgba(234, 67, 53, 0.1)", border: "1px solid rgba(234, 67, 53, 0.2)", padding: "12px", borderRadius: "8px", fontSize: "12px", marginTop: "16px", lineHeight: "1.4" }}>
                <strong>Order Failed:</strong> {submitError}
              </div>
            )}

            {/* Place Order Button */}
            <div className="submit-btn-container" style={{ marginTop: "24px" }}>
              <button
                type="button"
                disabled={isSubmitting}
                className="submit-btn"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handlePlaceOrder}
              >
                {isSubmitting ? "Processing..." : "Place Order"}
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* Success Order Completed Modal */}
      {showOrderCompletedModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-icon-container" style={{ color: "#00FF9D" }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="modal-icon"
                width={24}
                height={24}
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className="modal-title">Order Placed Successfully</h3>
            <p className="modal-message">
              Thank you for shopping with VERGO! Your order has been placed successfully and will be processed immediately.
              {orderId && <><br /><span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", display: "block", marginTop: "8px" }}>Order Reference: <strong>#{orderId}</strong></span></>}
            </p>
            <div className="modal-buttons-container">
              <button
                type="button"
                className="modal-primary-btn"
                style={{ backgroundColor: "#00FF9D" }}
                onClick={handleFinishCheckout}
              >
                Back to Homepage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
