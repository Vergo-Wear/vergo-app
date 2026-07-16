"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { hasCompletedContact, hasCompletedShipping } from "@/lib/checkout-progress";
import { useGuestCheckoutGuard } from "@/hooks/useGuestCheckoutGuard";
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
  savedAddressId?: string;
  saveAddress?: boolean;
  setAsPrimary?: boolean;
}

interface UserProfile {
  customerId?: string;
  id?: string;
}

export default function PaymentPage() {
  const router = useRouter();

  useEffect(() => {
    if (!hasCompletedContact()) {
      router.replace("/checkout");
    } else if (!hasCompletedShipping()) {
      router.replace("/checkout/shipping");
    }
  }, [router]);
  const { cart, cartSubtotal, clearCart, formatLkr, isLoaded: isCartLoaded } = useCart();
  useGuestCheckoutGuard(cart.length, isCartLoaded);

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
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const forcedGuest = localStorage.getItem("vergo_checkout_as_guest") === "true";
      const loggedIn = sessionStorage.getItem("vergo_is_logged_in") === "true" && !forcedGuest;
      setIsLoggedIn(loggedIn);
      setPaymentMethod(loggedIn ? "bank_transfer" : "cod");

      const storedContact = localStorage.getItem("vergo_checkout_contact");
      const storedShipping = localStorage.getItem("vergo_checkout_shipping");
      const storedUser = sessionStorage.getItem("vergo_user");

      if (storedUser) {
        try {
          setUserProfile(JSON.parse(storedUser));
        } catch (e) {}
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
      // Saved-address handling (registered customers only; guests never
      // send these, so guest addresses are never persisted)
      ...(isLoggedIn && shippingInfo?.savedAddressId
        ? { savedAddressId: shippingInfo.savedAddressId }
        : {}),
      ...(isLoggedIn && !shippingInfo?.savedAddressId
        ? {
            saveAddress: shippingInfo?.saveAddress ?? false,
            setAsPrimary: shippingInfo?.setAsPrimary ?? false,
          }
        : {}),
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
      const token = isLoggedIn ? sessionStorage.getItem("vergo_access_token") : null;
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

  if (orderId && paymentMethod === "bank_transfer" && isLoggedIn) {
    return (
      <BankTransferFlow
        orderId={orderId}
        grandTotalLkr={grandTotalLkr}
        formatLkr={formatLkr}
        onClose={handleFinishCheckout}
        onBackToPaymentSelection={() => {
          setOrderId(null);
          setShowOrderCompletedModal(false);
        }}
      />
    );
  }

  return (
    <div className="checkout-wrapper">
      {/* Progress Steps */}
      <div className="checkout-progress">
        <button type="button" className="step-item completed-step" onClick={() => router.push("/checkout")}>
          <span className="step-circle">1</span>
          <span className="step-label">Details</span>
        </button>
        <div className="progress-line"></div>
        <button type="button" className="step-item completed-step" onClick={() => router.push("/checkout/shipping")}>
          <span className="step-circle">2</span>
          <span className="step-label">Shipping</span>
        </button>
        <div className="progress-line"></div>
        <button type="button" className="step-item active-green" onClick={() => router.push("/checkout/payment")} aria-current="step">
          <span className="step-circle">3</span>
          <span className="step-label">Payment</span>
        </button>
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
            <div className="submit-btn-container checkout-actions" style={{ marginTop: "24px" }}>
              <button type="button" className="checkout-back-btn" onClick={() => router.push("/checkout/shipping")}>
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="submit-btn"
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

interface BankTransferFlowProps {
  orderId: string;
  grandTotalLkr: number;
  formatLkr: (val: number) => string;
  onClose: () => void;
  onBackToPaymentSelection?: () => void;
}

function BankTransferFlow({
  orderId,
  grandTotalLkr,
  formatLkr,
  onClose,
  onBackToPaymentSelection,
}: BankTransferFlowProps) {
  const [step, setStep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(14400); // 4 hours in seconds
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Cancellation states
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(
      fieldName === "acc" 
        ? "Account number copied to clipboard!" 
        : fieldName === "ref" 
        ? "Payment reference copied to clipboard!" 
        : "Account details copied to clipboard!", 
      "success"
    );
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError(null);
    setUploadSuccess(null);

    if (e.dataTransfer.files) {
      if (e.dataTransfer.files.length > 1) {
        setUploadError("Only one receipt file can be uploaded.");
        setSelectedFile(null);
        return;
      }
      if (e.dataTransfer.files[0]) {
        validateAndSetFile(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    if (e.target.files) {
      if (e.target.files.length > 1) {
        setUploadError("Only one receipt file can be uploaded.");
        setSelectedFile(null);
        return;
      }
      if (e.target.files[0]) {
        validateAndSetFile(e.target.files[0]);
      }
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit.");
      setSelectedFile(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = ["jpg", "jpeg", "png", "pdf"].includes(fileExtension || "");
    
    if (!allowedTypes.includes(file.type) && !isAllowedExt) {
      setUploadError("Format rejected. Please choose a JPG, PNG, or PDF.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const token = sessionStorage.getItem("vergo_access_token");

    try {
      const res = await fetch(`${apiUrl}/orders/${orderId}/payment-proof`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Proof receipt upload failed.");
      }

      setUploadSuccess("Bank transfer receipt submitted successfully. Awaiting verification.");
      setSelectedFile(null);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    setCancelError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const token = sessionStorage.getItem("vergo_access_token");

    try {
      const res = await fetch(`${apiUrl}/orders/mine/${orderId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Cancellation failed.");
      }

      setCancelSuccess(true);
    } catch (err: any) {
      setCancelError(err.message || "Cancellation failed. Please contact support.");
    } finally {
      setIsCancelling(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const renderCountdownBanner = () => {
    return (
      <div 
        className="bt-card bt-countdown-banner"
      >
        <div>
          <div style={{ fontSize: "12px", fontWeight: "800", color: "#00FF9D", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>
            Time remaining to upload proof
          </div>
          <div style={{ fontSize: "36px", fontWeight: "700", color: "#ffffff", fontFamily: "monospace" }}>
            {formatTime(timeLeft)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="36" height="36">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>
    );
  };

  if (cancelSuccess) {
    return (
      <div 
        className="bank-transfer-container" 
        style={{
          maxWidth: "600px",
          margin: "80px auto",
          backgroundColor: "#0d0d0e",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.05)",
          padding: "40px",
          textAlign: "center"
        }}
      >
        <div style={{ color: "#EA4335", marginBottom: "24px", display: "flex", justifyContent: "center" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "16px", letterSpacing: "0.02em" }}>Order Cancelled</h2>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginBottom: "32px", lineHeight: "1.6" }}>
          Your order has been successfully cancelled and the reserved stock has been released.
        </p>
        <button onClick={onClose} className="bt-btn-primary" style={{ maxWidth: "240px", margin: "0 auto" }}>
          Return to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="bank-transfer-container" style={{ maxWidth: "680px", width: "100%", margin: "64px auto", padding: "0 24px" }}>
      <style>{`
        .bt-card {
          background-color: #0d0d0e;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 24px;
        }
        .bt-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .bt-detail-row:last-child {
          border-bottom: none;
        }
        .bt-detail-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 500;
        }
        .bt-detail-value {
          font-size: 14px;
          color: #ffffff;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bt-copy-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.3);
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        .bt-copy-btn:hover {
          color: #00FF9D;
          background-color: rgba(0, 255, 157, 0.05);
        }
        .bt-btn-primary {
          width: 100%;
          background-color: #00FF9D;
          color: #000000;
          border: none;
          border-radius: 8px;
          padding: 16px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 20px rgba(0, 255, 157, 0.15);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bt-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(0, 255, 157, 0.25);
          background-color: #00e58c;
        }
        .bt-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        .bt-btn-secondary {
          width: 100%;
          background-color: transparent;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .bt-btn-secondary:hover:not(:disabled) {
          border-color: #ffffff;
          background-color: rgba(255, 255, 255, 0.02);
        }
        .bt-btn-cancel {
          flex: 1;
          background-color: transparent;
          color: #EA4335;
          border: 1px solid rgba(234, 67, 53, 0.4);
          border-radius: 8px;
          padding: 18px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .bt-btn-cancel:hover:not(:disabled) {
          border-color: #EA4335;
          background-color: rgba(234, 67, 53, 0.08);
          color: #ff5c4d;
        }
        .bt-btn-cancel:active:not(:disabled) {
          background-color: #EA4335;
          border-color: #EA4335;
          color: #ffffff;
        }
        .bt-dropzone {
          border: 1.5px dashed rgba(255, 255, 255, 0.15);
          background-color: #050506;
          border-radius: 12px;
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 8px;
        }
        .bt-dropzone:hover {
          border-color: #00FF9D;
          background-color: rgba(0, 255, 157, 0.01);
        }
        .bt-dropzone.active {
          border-color: #00FF9D;
          background-color: rgba(0, 255, 157, 0.03);
        }
        .bt-warning-banner {
          background-color: #F1C40F;
          border: 1.5px solid #F1C40F;
          border-radius: 10px;
          padding: 18px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 32px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(241, 196, 15, 0.15);
          cursor: default;
        }
        .bt-warning-banner:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(241, 196, 15, 0.35);
          background-color: #F39C12;
          border-color: #F39C12;
        }
        .bt-warning-text {
          font-size: 14px;
          color: #050506 !important;
          margin: 0;
          line-height: 1.5;
          font-weight: 700;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          transition: color 0.3s ease;
        }
        .bt-warning-icon {
          color: #050506 !important;
          margin-top: 2px;
          display: flex;
          align-items: center;
          transition: transform 0.3s ease;
        }
        .bt-warning-banner:hover .bt-warning-icon {
          transform: scale(1.1);
        }
      `}</style>

      {step === 1 ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Hourglass Icon */}
          <div 
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              border: "1.5px solid #00FF9D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px auto",
              color: "#00FF9D",
              boxShadow: "0 0 20px rgba(0, 255, 157, 0.1)"
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
              <path d="M5 2h14" />
              <path d="M5 22h14" />
              <path d="M19 2v4c0 4-4 6-4 6s4 2 4 6v4" />
              <path d="M5 2v4c0 4 4 6 4 6s-4 2-4 6v4" />
            </svg>
          </div>

          {/* Title and description */}
          <h1 style={{ fontSize: "32px", fontWeight: "800", textTransform: "uppercase", textAlign: "center", letterSpacing: "0.05em", marginBottom: "8px", fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
            Order Placed
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", textAlign: "center", marginBottom: "32px", lineHeight: "1.5" }}>
            Your order <strong>#{orderId}</strong> is currently pending bank transfer verification.
          </p>

          {/* Time remaining countdown banner */}
          {renderCountdownBanner()}

          {/* Details split columns */}
          <div className="bt-split-grid">
            <div className="bt-card">
              <div style={{ fontSize: "13px", fontWeight: "800", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF9D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
                Bank Details
              </div>
              
              <div className="bt-detail-row">
                <span className="bt-detail-label">Bank Name</span>
                <span className="bt-detail-value">VERGO SL - CENTRAL BANK</span>
              </div>
              <div className="bt-detail-row">
                <span className="bt-detail-label">Account No.</span>
                <span className="bt-detail-value">
                  1234 - 5678 - 9012
                  <button className="bt-copy-btn" onClick={() => copyToClipboard("1234-5678-9012", "acc")}>
                    {copiedField === "acc" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00FF9D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </span>
              </div>
              {/* Enhanced Single-Line Monospace Reference Panel */}
              <div style={{ 
                marginTop: "16px", 
                padding: "12px 16px", 
                backgroundColor: "rgba(255, 255, 255, 0.02)", 
                borderRadius: "8px", 
                border: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "6px"
              }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Payment Reference
                </span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "13.5px", color: "#00FF9D", fontWeight: "700", letterSpacing: "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {orderId}
                  </span>
                  <button className="bt-copy-btn" onClick={() => copyToClipboard(orderId, "ref")} style={{ flexShrink: 0, marginLeft: "12px" }} title="Copy Reference">
                    {copiedField === "ref" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF9D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button 
                type="button" 
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  color: "#00FF9D", 
                  fontSize: "13px", 
                  fontWeight: "700", 
                  textTransform: "uppercase", 
                  letterSpacing: "0.05em", 
                  cursor: "pointer", 
                  padding: "0", 
                  marginTop: "16px" 
                }}
                onClick={() => {
                  copyToClipboard("Bank: VERGO SL - CENTRAL BANK\nAccount: 1234-5678-9012\nReference: " + orderId, "all");
                }}
              >
                Copy Account Details
              </button>
            </div>            <div className="bt-card" style={{ 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "center",
              border: "1px solid rgba(0, 255, 157, 0.15)",
              background: "linear-gradient(135deg, rgba(0, 255, 157, 0.02) 0%, rgba(13, 13, 14, 1) 100%)",
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Subtle top indicator */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", backgroundColor: "#00FF9D" }}></div>
              
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#00FF9D", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="12" y1="10" x2="12" y2="14" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Transfer Amount
              </div>
              <div style={{ fontSize: "36px", fontWeight: "800", color: "#ffffff", marginBottom: "6px", fontFamily: "'Oswald', sans-serif" }}>
                {formatLkr(grandTotalLkr)}
              </div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: "1.4" }}>
                Total amount includes standard delivery fee and tax.
              </div>
            </div>
          </div>

          {cancelError && (
            <div style={{ color: "#EA4335", backgroundColor: "rgba(234, 67, 53, 0.08)", border: "1px solid rgba(234, 67, 53, 0.2)", padding: "12px", borderRadius: "8px", fontSize: "12px", marginBottom: "20px", textAlign: "center" }}>
              ⚠️ {cancelError}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button 
              type="button" 
              className="bt-btn-primary" 
              onClick={() => setStep(2)}
              style={{ padding: "18px" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Payment Proof
            </button>
            <div style={{ display: "flex", gap: "12px", width: "100%" }}>
              <button 
                type="button" 
                className="bt-btn-secondary" 
                onClick={() => onBackToPaymentSelection?.()}
                style={{ flex: 1, padding: "18px" }}
              >
                Back
              </button>
              <button 
                type="button" 
                className="bt-btn-cancel" 
                disabled={isCancelling}
                onClick={handleCancelOrder}
              >
                {isCancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "32px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
            Having trouble? <a href="/about" style={{ color: "#00FF9D", textDecoration: "underline" }}>Contact Support</a>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Hourglass Icon */}
          <div 
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              border: "1.5px solid #00FF9D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px auto",
              color: "#00FF9D",
              boxShadow: "0 0 20px rgba(0, 255, 157, 0.1)"
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
              <path d="M5 2h14" />
              <path d="M5 22h14" />
              <path d="M19 2v4c0 4-4 6-4 6s4 2 4 6v4" />
              <path d="M5 2v4c0 4 4 6 4 6s-4 2-4 6v4" />
            </svg>
          </div>

          <h1 style={{ fontSize: "32px", fontWeight: "800", textTransform: "uppercase", textAlign: "center", letterSpacing: "0.05em", marginBottom: "8px", fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
            Pending Bank Transfer
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", textAlign: "center", marginBottom: "32px", lineHeight: "1.5" }}>
            Your order <strong>#{orderId}</strong> is on hold. Please complete the bank transfer within 4 hours to secure your items.
          </p>

          {/* Time remaining countdown banner */}
          {renderCountdownBanner()}

          {/* Time Window Notice */}
          <div className="bt-warning-banner">
            <div className="bt-warning-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <p className="bt-warning-text">
              Stock is only held for a limited 4-hour window. Orders without proof of payment after this period will be automatically cancelled.
            </p>
          </div>

          {/* Next Steps card */}
          <div className="bt-card" style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px", marginBottom: "16px" }}>
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#00FF9D", letterSpacing: "0.1em" }}>NEXT STEPS</span>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: "700" }}>Step 1 of 2</span>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: "0 0 20px 0", lineHeight: "1.6" }}>
              Please transfer the total amount to the following bank account and upload a clear screenshot of the transaction receipt.
            </p>

            <div style={{ backgroundColor: "#050506", padding: "8px 16px", borderRadius: "8px" }}>
              <div className="bt-detail-row">
                <span className="bt-detail-label">Bank Name</span>
                <span className="bt-detail-value">VERGO SL - CENTRAL BANK</span>
              </div>
              <div className="bt-detail-row">
                <span className="bt-detail-label">Account No.</span>
                <span className="bt-detail-value">
                  1234 - 5678 - 9012
                  <button className="bt-copy-btn" onClick={() => copyToClipboard("1234-5678-9012", "acc")}>
                    {copiedField === "acc" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00FF9D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </span>
              </div>
              {/* Enhanced Single-Line Monospace Reference Panel */}
              <div style={{ 
                marginTop: "12px", 
                marginBottom: "12px",
                padding: "10px 14px", 
                backgroundColor: "rgba(255, 255, 255, 0.02)", 
                borderRadius: "8px", 
                border: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Payment Reference
                </span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "13.5px", color: "#00FF9D", fontWeight: "700", letterSpacing: "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {orderId}
                  </span>
                  <button className="bt-copy-btn" onClick={() => copyToClipboard(orderId, "ref")} style={{ flexShrink: 0, marginLeft: "12px" }} title="Copy Reference">
                    {copiedField === "ref" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF9D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="bt-detail-row">
                <span className="bt-detail-label">Total Amount</span>
                <span className="bt-detail-value" style={{ color: "#00FF9D", fontSize: "15px" }}>{formatLkr(grandTotalLkr)}</span>
              </div>
            </div>
          </div>

          {/* Upload Receipt Area */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            <span style={{ fontSize: "12px", fontWeight: "800", color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Upload Receipt
            </span>
            <input 
              type="file" 
              accept="image/jpeg,image/png,application/pdf"
              id="bt-file-picker"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <div 
              className={`bt-dropzone ${dragActive ? "active" : ""}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("bt-file-picker")?.click()}
            >
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>
                Drag & drop receipt here
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>
                PNG, JPG or PDF up to 5MB
              </div>
              <button 
                type="button"
                className="bt-copy-btn"
                style={{ 
                  backgroundColor: "#121214", 
                  color: "#ffffff", 
                  border: "1px solid rgba(255, 255, 255, 0.08)", 
                  borderRadius: "6px", 
                  padding: "8px 16px", 
                  fontSize: "13px", 
                  fontWeight: "700",
                  marginTop: "8px"
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById("bt-file-picker")?.click();
                }}
              >
                Browse Files
              </button>
            </div>

            {selectedFile && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.02)", padding: "12px 16px", borderRadius: "8px", marginTop: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF9D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <div>
                    <div style={{ fontSize: "13px", color: "#ffffff", fontWeight: "600", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button 
                  type="button" 
                  style={{ background: "transparent", border: "none", color: "#EA4335", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
                  onClick={() => setSelectedFile(null)}
                >
                  Remove
                </button>
              </div>
            )}

            {uploadError && (
              <div style={{ color: "#EA4335", fontSize: "12px", fontWeight: "600", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div style={{ color: "#00FF9D", fontSize: "13px", fontWeight: "600", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {uploadSuccess}
              </div>
            )}
          </div>

          {/* Submit buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button 
              type="button" 
              className="bt-btn-primary" 
              disabled={!selectedFile || isUploading || !!uploadSuccess}
              onClick={handleUploadSubmit}
              style={{ padding: "18px" }}
            >
              {isUploading ? "Uploading receipt..." : "Submit Payment Proof"}
            </button>
            <button 
              type="button" 
              className="bt-btn-secondary" 
              disabled={isUploading}
              onClick={uploadSuccess ? onClose : () => setStep(1)}
              style={{ padding: "18px" }}
            >
              {uploadSuccess ? "Back to Homepage" : "Back"}
            </button>
          </div>
        </div>
      )}



      {/* Custom Toast Notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <div className="toast-content">
            {toast.type === "success" && (
              <svg className="toast-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {toast.type === "error" && (
              <svg className="toast-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            {toast.type === "info" && (
              <svg className="toast-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
