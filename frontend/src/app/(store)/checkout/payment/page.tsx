"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import "@/styles/checkout.css";

export default function PaymentPage() {
  const router = useRouter();
  const { cart, cartSubtotal, clearCart, formatLkr } = useCart();

  // Local storage details
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [shippingInfo, setShippingInfo] = useState<any>(null);

  // Form state
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrderCompletedModal, setShowOrderCompletedModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
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

  const handlePlaceOrder = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowOrderCompletedModal(true);
    }, 1500);
  };

  const handleFinishCheckout = () => {
    clearCart();
    // Clean up temporary checkout states
    localStorage.removeItem("vergo_checkout_contact");
    localStorage.removeItem("vergo_checkout_shipping");
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
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => setPaymentMethod("bank_transfer")}
            >
              <input
                type="radio"
                name="payment_method"
                checked={paymentMethod === "bank_transfer"}
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
                  Direct Bank Transfer
                </span>
                <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>
                  Transfer funds directly. Processing takes up to 24 hours.
                </span>
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
