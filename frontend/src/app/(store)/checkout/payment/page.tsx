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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const forcedGuest = localStorage.getItem("vergo_checkout_as_guest") === "true";
      const loggedIn = localStorage.getItem("vergo_is_logged_in") === "true" && !forcedGuest;
      setIsLoggedIn(loggedIn);
      setPaymentMethod(loggedIn ? "bank_transfer" : "cod");

      const storedContact = localStorage.getItem("vergo_checkout_contact");
      const storedShipping = localStorage.getItem("vergo_checkout_shipping");

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
    setIsSubmitting(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const payload = {
      paymentMethod: paymentMethod === "cod" ? "cod" : "bank_transfer",
      deliveryFee: deliveryFee,
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
        variantId: item.product.variants.find(
          (variant) =>
            variant.size === item.size &&
            (!item.color || variant.color === item.color),
        )?.variantId,
        quantity: item.quantity || 1,
      })),
    };

    try {
      if (payload.items.some((item) => !item.variantId)) {
        setIsSubmitting(false);
        setSubmitError("A selected product option is no longer available. Please update your cart.");
        return;
      }
      const token = isLoggedIn ? localStorage.getItem("vergo_access_token") : null;
      const response = await fetch(`${apiUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setIsSubmitting(false);

      if (!response.ok) {
        const errMsg = Array.isArray(data.message)
          ? data.message.join(" ")
          : (data.message || "Failed to place order.");
        setSubmitError(errMsg);
        return;
      }

      const newOrderId = data.order?.orderId || data.order?.id;
      setOrderId(newOrderId);

      setShowOrderCompletedModal(true);
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError("Network error: Could not reach the order creation service.");
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

  const itemsToDisplay = cart;
  const subtotalLkr = cartSubtotal;
  const deliveryFee = shippingInfo?.deliveryFee || 0;
  const grandTotalLkr = subtotalLkr + deliveryFee;

  return (
    <div className="checkout-wrapper">
      {/* Breadcrumbs */}
      <div style={{
        maxWidth: "1200px",
        width: "100%",
        margin: "48px auto 0 auto",
        padding: "0 64px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "10px",
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: "rgba(255, 255, 255, 0.4)"
      }}>
        <span style={{ cursor: "pointer" }} onClick={() => router.push("/")}>Home</span>
        <span style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.15)" }}>&gt;</span>
        <span style={{ cursor: "pointer" }} onClick={() => router.push("/cart")}>Your Cart</span>
        <span style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.15)" }}>&gt;</span>
        <span style={{ color: "#00FF9D" }}>Payment</span>
      </div>

      {/* Main Container */}
      <main className="checkout-container" style={{ marginTop: "24px" }}>
        {/* Left Column: Review Details & Payment Selection */}
        <section className="checkout-form-section" style={{ gap: "28px" }}>

          {/* Section: Review Details */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: "1.5px solid #00FF9D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00FF9D"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffffff", margin: 0 }}>Review Details</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Customer Info Card */}
              <div style={{
                backgroundColor: "#0d0d0e",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "12px",
                padding: "20px 24px",
                position: "relative"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "0.08em", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase" }}>Customer</span>
                  <button
                    type="button"
                    onClick={() => router.push("/checkout")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#00FF9D",
                      fontSize: "10px",
                      fontWeight: "800",
                      cursor: "pointer",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: 0
                    }}
                  >
                    Edit
                  </button>
                </div>
                <div style={{ fontSize: "13px", color: "#ffffff", lineHeight: "1.6" }}>
                  <div style={{ fontWeight: "700", marginBottom: "4px" }}>{contactInfo?.firstName} {contactInfo?.lastName}</div>
                  <div style={{ color: "rgba(255, 255, 255, 0.5)" }}>{contactInfo?.email}</div>
                  <div style={{ color: "rgba(255, 255, 255, 0.5)" }}>{contactInfo?.phone}</div>
                  <div style={{ marginTop: "8px" }}>
                    <span style={{
                      fontSize: "8.5px",
                      fontWeight: "800",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      backgroundColor: isLoggedIn ? "rgba(0, 255, 157, 0.08)" : "rgba(255, 255, 255, 0.05)",
                      border: isLoggedIn ? "1px solid rgba(0, 255, 157, 0.2)" : "1px solid rgba(255, 255, 255, 0.15)",
                      color: isLoggedIn ? "#00FF9D" : "rgba(255, 255, 255, 0.6)",
                      padding: "2px 6px",
                      borderRadius: "4px"
                    }}>
                      {isLoggedIn ? "Registered Member" : "Guest Customer"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shipping Address Card */}
              <div style={{
                backgroundColor: "#0d0d0e",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "12px",
                padding: "20px 24px",
                position: "relative"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "0.08em", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase" }}>Shipping Address</span>
                  <button
                    type="button"
                    onClick={() => router.push("/checkout/shipping")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#00FF9D",
                      fontSize: "10px",
                      fontWeight: "800",
                      cursor: "pointer",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: 0
                    }}
                  >
                    Edit
                  </button>
                </div>
                <div style={{ fontSize: "13px", color: "#ffffff", lineHeight: "1.6" }}>
                  <div style={{ fontWeight: "700", marginBottom: "4px" }}>{shippingInfo?.receiverName}</div>
                  <div style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                    {shippingInfo?.addressLine1}
                    {shippingInfo?.addressLine2 ? `, ${shippingInfo?.addressLine2}` : ""}
                  </div>
                  <div style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                    {shippingInfo?.city}, {shippingInfo?.district}
                    {shippingInfo?.postalCode ? ` (${shippingInfo?.postalCode})` : ""}
                  </div>
                  {shippingInfo?.deliveryNote && (
                    <div style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "11px", marginTop: "4px", fontStyle: "italic" }}>
                      Note: {shippingInfo?.deliveryNote}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Select Payment Method */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ color: "#00FF9D" }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
              </div>
              <h2 style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffffff", margin: 0 }}>Select Payment Method</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Cash on Delivery Option Card */}
              <div
                onClick={() => setPaymentMethod("cod")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 24px",
                  border: paymentMethod === "cod" ? "1.5px solid #00FF9D" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  backgroundColor: "#0d0d0e",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: paymentMethod === "cod" ? "0 0 15px rgba(0, 255, 157, 0.05)" : "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  {/* Left Square Icon Box */}
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "8px",
                    backgroundColor: "#18181a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255, 255, 255, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.05)"
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" width="22" height="22">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.75a1.125 1.125 0 0 1-1.125-1.125V15h1.5a1.5 1.5 0 0 0 1.5-1.5V6.75A2.25 2.25 0 0 1 7.875 4.5h8.25a2.25 2.25 0 0 1 2.25 2.25v7.125m-18 0v-1.5m18 1.5H20.25a1.125 1.125 0 0 0 1.125-1.125V11.25M18 10.5h3.75m-3.75 3h3.75" />
                    </svg>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>Cash on Delivery</span>
                    <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>Pay in full upon physical arrival of goods.</span>
                  </div>
                </div>
                {/* Radio Indicator */}
                <div style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: paymentMethod === "cod" ? "5px solid #00FF9D" : "1.5px solid rgba(255, 255, 255, 0.2)",
                  backgroundColor: paymentMethod === "cod" ? "#000000" : "transparent",
                  transition: "all 0.2s ease"
                }} />
              </div>

              {/* Bank Transfer Option Card */}
              <div
                onClick={() => {
                  if (isLoggedIn) {
                    setPaymentMethod("bank_transfer");
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 24px",
                  border: paymentMethod === "bank_transfer" ? "1.5px solid #00FF9D" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  backgroundColor: "#0d0d0e",
                  cursor: isLoggedIn ? "pointer" : "not-allowed",
                  opacity: isLoggedIn ? 1 : 0.45,
                  transition: "all 0.2s ease",
                  boxShadow: paymentMethod === "bank_transfer" ? "0 0 15px rgba(0, 255, 157, 0.05)" : "none",
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  {/* Left Square Icon Box */}
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "8px",
                    backgroundColor: "#18181a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255, 255, 255, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.05)"
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" width="22" height="22">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.339A1.19 1.19 0 0 0 19.5 9h-15a1.19 1.19 0 0 0-.072 1.339V21M3 21h18" />
                    </svg>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>Bank Transfer</span>
                      <span style={{
                        fontSize: "8.5px",
                        fontWeight: "900",
                        color: "#ff453a",
                        backgroundColor: "rgba(255, 69, 58, 0.08)",
                        border: "1px solid rgba(255, 69, 58, 0.2)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase"
                      }}>4-Hour Hold</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>Instant confirmation via mobile app.</span>
                  </div>
                </div>

                {/* Right Control: Radio Dot or Lock Icon */}
                {isLoggedIn ? (
                  <div style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: paymentMethod === "bank_transfer" ? "5px solid #00FF9D" : "1.5px solid rgba(255, 255, 255, 0.2)",
                    backgroundColor: paymentMethod === "bank_transfer" ? "#000000" : "transparent",
                    transition: "all 0.2s ease"
                  }} />
                ) : (
                  <div style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "1.5px solid rgba(255, 255, 255, 0.15)",
                    backgroundColor: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255, 255, 255, 0.3)"
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" width="10" height="10">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </div>
                )}
              </div>

              {!isLoggedIn && (
                <span style={{ fontSize: "13px", color: "#e39a08ff", fontWeight: "600", marginTop: "-4px", paddingLeft: "4px" }}>
                  Direct Bank Transfer is only available for registered members.{" "}
                  <a
                    href="/auth/login"
                    onClick={(e) => {
                      e.stopPropagation();
                      localStorage.setItem("vergo_login_prefill", contactInfo?.email || "");
                    }}
                    style={{ color: "#00FF9D", textDecoration: "underline" }}
                  >
                    Log in here
                  </a>
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Order Summary Card */}
        <aside style={{ display: "flex", flexDirection: "column" }}>
          <div className="order-summary-card">
            <h2 className="summary-card-title">Order Summary</h2>

            {/* Items List */}
            <div className="summary-items-list" style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "24px" }}>
              {itemsToDisplay.map((item, index) => {
                const cleanPrice = item.product.lkrPrice
                  ? parseFloat(item.product.lkrPrice.replace(/LKR/g, "").replace(/,/g, "").trim())
                  : 0;
                const totalItemPrice = cleanPrice * item.quantity;

                return (
                  <div key={`${item.product.id}-${index}`} className="summary-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div className="summary-item-image-wrapper" style={{ width: "56px", height: "56px", backgroundColor: "#18181a", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", position: "relative", overflow: "hidden" }}>
                        {item.product.image && (
                          <Image
                            src={item.product.image}
                            alt={item.product.name}
                            fill
                            className="summary-item-image"
                            sizes="56px"
                            style={{ objectFit: "cover" }}
                          />
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <h3 className="summary-item-name" style={{ fontSize: "11px", fontWeight: "800", color: "#ffffff", letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 2px 0" }}>{item.product.name}</h3>
                        <div className="summary-item-meta" style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {item.color || item.product.colors?.[0] || "Default"} / {item.size} · QTY: {item.quantity}
                        </div>
                      </div>
                    </div>
                    <div className="summary-item-price" style={{ fontSize: "12px", fontWeight: "700", color: "#ffffff" }}>
                      {formatLkr(totalItemPrice)}
                    </div>
                  </div>
                );
              })}
            </div>

            <hr className="summary-card-divider" style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.06)", margin: "20px 0" }} />

            {/* Calculations Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Subtotal */}
              <div className="summary-calc-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
                <span className="summary-calc-label" style={{ fontSize: "10px", fontWeight: "800", color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.08em" }}>Subtotal</span>
                <span className="summary-calc-value" style={{ fontSize: "12px", fontWeight: "700", color: "#ffffff" }}>{formatLkr(subtotalLkr)}</span>
              </div>

              {/* Delivery */}
              <div className="summary-calc-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="summary-calc-label" style={{ fontSize: "10px", fontWeight: "800", color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.08em" }}>Delivery</span>
                  <span style={{
                    fontSize: "8px",
                    fontWeight: "900",
                    color: "#ffffff",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase"
                  }}>Citypak</span>
                </div>
                <span className="summary-calc-value" style={{ fontSize: "12px", fontWeight: "700", color: "#ffffff" }}>{formatLkr(deliveryFee)}</span>
              </div>

              {/* Taxes */}
              <div className="summary-calc-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
                <span className="summary-calc-label" style={{ fontSize: "10px", fontWeight: "800", color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.08em" }}>Taxes</span>
                <span className="summary-calc-value" style={{ fontSize: "12px", fontWeight: "700", color: "#ffffff" }}>{formatLkr(0)}</span>
              </div>
            </div>

            <hr className="summary-card-divider" style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.06)", margin: "20px 0" }} />

            {/* Total */}
            <div className="summary-total-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 0 }}>
              <span className="summary-total-label" style={{ fontSize: "11px", fontWeight: "800", color: "#ffffff", letterSpacing: "0.08em" }}>Total</span>
              <span className="summary-total-value" style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.01em" }}>{formatLkr(grandTotalLkr)}</span>
            </div>

            {submitError && (
              <div
                style={{
                  color: "#EA4335",
                  backgroundColor: "rgba(234, 67, 53, 0.1)",
                  border: "1px solid rgba(234, 67, 53, 0.2)",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  marginTop: "16px",
                  lineHeight: "1.4"
                }}
              >
                <strong>Order Failed:</strong> {submitError}
              </div>
            )}

            {/* Place Order Button */}
            <div className="submit-btn-container" style={{ marginTop: "24px" }}>
              <button
                type="button"
                disabled={isSubmitting}
                className="submit-btn"
                style={{
                  width: "100%",
                  height: "52px",
                  backgroundColor: "#00FF9D",
                  color: "#000000",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "800",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 0 20px rgba(0, 255, 157, 0.25)",
                  transition: "all 0.2s ease"
                }}
                onClick={handlePlaceOrder}
              >
                {isSubmitting ? "Processing..." : "Place Order →"}
              </button>
            </div>

            {/* Payment Icons */}
            <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "24px", color: "rgba(255, 255, 255, 0.15)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12" />
              </svg>
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
              <br />
              <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", display: "block", marginTop: "8px" }}>
                Order Reference: <strong>#{orderId}</strong>
              </span>
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
