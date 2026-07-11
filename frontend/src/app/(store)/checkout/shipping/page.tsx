"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
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

export default function ShippingPage() {
  const router = useRouter();
  const { cart, cartSubtotal, formatLkr } = useCart();

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

  // Logic flags
  const [usePrimary, setUsePrimary] = useState(false);
  const [setAsPrimary, setSetAsPrimary] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Delivery calculation state
  const [baseShipping, setBaseShipping] = useState<number | null>(null);
  const [regionalSurcharge, setRegionalSurcharge] = useState<number | null>(null);
  const [totalDeliveryFee, setTotalDeliveryFee] = useState<number | null>(null);

  // Load auth status and contact details from checkout step 1
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Direct access fallback: if there is no logged in status in local storage,
      // default it to "true" and mock a logged-in user so that the "Use Primary Address"
      // card and checkbox are visible for high fidelity display and interaction!
      if (localStorage.getItem("vergo_is_logged_in") === null) {
        localStorage.setItem("vergo_is_logged_in", "true");
        localStorage.setItem(
          "vergo_user",
          JSON.stringify({
            id: "d3b07384-d113-4c9f-b3a6-8e5cd8cc3bbd",
            name: "Julian Verso",
            email: "julian@verso.com",
            phone: "+1 (555) 000-0000",
            defaultShippingAddress: "124 Industrial Way, Tech District, SF"
          })
        );
      }

      const loggedIn = localStorage.getItem("vergo_is_logged_in") === "true";
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        const storedUser = localStorage.getItem("vergo_user");
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

  // Handle "Use Primary Address" Toggle Action
  const handlePrimaryAddressToggle = (checked: boolean) => {
    setUsePrimary(checked);
    if (checked) {
      // Pre-fill with the mock primary address as shown in Figma
      setReceiverName(userProfile?.name || "Julian Verso");
      setReceiverPhone(userProfile?.phone || "+1 (555) 000-0000");
      setAddressLine1("124 Industrial Way");
      setAddressLine2("Suite 100");
      setCity("SF");
      setDistrict("Tech District");
      setPostalCode("94107");
      setDeliveryNote("Leave at front desk");
      setSetAsPrimary(false); // No need to check "Set as primary" since we're using it
      
      // Clear errors
      setErrors({});
    } else {
      // Clear the address fields but retain name/phone
      setAddressLine1("");
      setAddressLine2("");
      setCity("");
      setDistrict("");
      setPostalCode("");
      setDeliveryNote("");
    }
  };

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

    const phoneRegex = /^\+?[0-9\s\-()]+$/;
    const cleanPhoneDigits = receiverPhone.replace(/\D/g, "");
    if (!receiverPhone.trim()) {
      newErrors.receiverPhone = "Phone number is required";
    } else if (!phoneRegex.test(receiverPhone.trim()) || cleanPhoneDigits.length < 9 || cleanPhoneDigits.length > 15) {
      newErrors.receiverPhone = "Please enter a valid phone number (9 to 15 digits)";
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
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    // Prepare data for order_shipping_details
    const shippingDetails = {
      receiverName,
      receiverPhone,
      addressLine1,
      addressLine2,
      city,
      district,
      postalCode: postalCode.trim() || undefined,
      deliveryNote: deliveryNote.trim() || undefined,
      deliveryFee: totalDeliveryFee || 0,
      baseShipping: baseShipping || 0,
      regionalSurcharge: regionalSurcharge || 0,
    };

    // Save details to localStorage
    localStorage.setItem("vergo_checkout_shipping", JSON.stringify(shippingDetails));

    // Overwrite logged-in customer's default address explicitly if checkbox is checked
    if (isLoggedIn && setAsPrimary && !usePrimary) {
      const storedUserStr = localStorage.getItem("vergo_user");
      if (storedUserStr) {
        try {
          const user = JSON.parse(storedUserStr);
          // Set primary address string representation
          user.defaultShippingAddress = `${addressLine1}${addressLine2 ? ", " + addressLine2 : ""}, ${city}, ${district}`;
          localStorage.setItem("vergo_user", JSON.stringify(user));
        } catch (err) {
          console.error("Failed to update primary address in local storage:", err);
        }
      }
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        router.push("/checkout/payment");
      }, 1500);
    }, 1000);
  };

  const hasItems = cart.length > 0;
  const defaultItems = [
    {
      product: {
        id: 999,
        name: "VERGO OBSIDIAN SHELL-P1",
        price: "$450.00",
        lkrPrice: "LKR 135,000.00",
        image: "/images/hoodie.png", // fallback placeholder
        colors: ["Noir"]
      },
      size: "XL",
      color: "Noir",
      quantity: 1
    }
  ];

  const itemsToDisplay = hasItems ? cart : defaultItems;
  const subtotalLkr = hasItems ? cartSubtotal : 135000;
  const displayTotalLkr = subtotalLkr + (totalDeliveryFee || 0);

  return (
    <div className="checkout-wrapper">
      {/* Progress Steps */}
      <div className="checkout-progress">
        <div className="step-item completed-step">
          <span className="step-circle">1</span>
          <span className="step-label">Details</span>
        </div>
        <div className="progress-line"></div>
        <div className="step-item active-green">
          <span className="step-circle">2</span>
          <span className="step-label">Shipping</span>
        </div>
        <div className="progress-line"></div>
        <div className="step-item">
          <span className="step-circle">3</span>
          <span className="step-label">Payment</span>
        </div>
      </div>

      {/* Main Container */}
      <main className="checkout-container">
        {/* Left Column: Shipping Form */}
        <section className="checkout-form-section">
          <h1 className="checkout-form-title">Shipping</h1>
          <p className="form-subtitle">
            Configure your delivery destination and optimization route parameters.
          </p>

          {/* Member Section: Use Primary Address Toggle */}
          {isLoggedIn && (
            <div className="address-toggle-card">
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
                  <span className="address-toggle-title">Use Primary Address</span>
                  <span className="address-toggle-subtitle">
                    124 Industrial Way, Tech District, SF
                  </span>
                </div>
              </div>
              <label className="switch-container">
                <input
                  type="checkbox"
                  className="switch-input"
                  checked={usePrimary}
                  onChange={(e) => handlePrimaryAddressToggle(e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
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
                  disabled={usePrimary}
                  className={`form-input ${errors.receiverName ? "input-error" : ""}`}
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
                  disabled={usePrimary}
                  className={`form-input ${errors.receiverPhone ? "input-error" : ""}`}
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
                disabled={usePrimary}
                className={`form-input ${errors.addressLine1 ? "input-error" : ""}`}
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
                disabled={usePrimary}
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
                  disabled={usePrimary}
                  className={`form-input ${errors.city ? "input-error" : ""}`}
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
                  disabled={usePrimary}
                  className={`form-select ${errors.district ? "input-error" : ""} ${!district ? "placeholder-color" : ""}`}
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
                  Postal Code (Optional)
                </label>
                <input
                  id="postalCode"
                  type="text"
                  placeholder="e.g. 10100"
                  disabled={usePrimary}
                  className="form-input"
                  value={postalCode}
                  onChange={(e) => handleInputChange("postalCode", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="deliveryNote">
                  Delivery Note (Optional)
                </label>
                <textarea
                  id="deliveryNote"
                  placeholder="Notes for courier (e.g. gate codes, directions)"
                  disabled={usePrimary}
                  className="form-textarea"
                  value={deliveryNote}
                  onChange={(e) => handleInputChange("deliveryNote", e.target.value)}
                />
              </div>
            </div>

            {/* Member Section: Save Address Option */}
            {isLoggedIn && !usePrimary && (
              <div style={{ marginTop: "8px" }}>
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={setAsPrimary}
                    onChange={(e) => setSetAsPrimary(e.target.checked)}
                  />
                  <span className="checkbox-custom"></span>
                  Set as primary address
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
            <div className="submit-btn-container" style={{ marginTop: "24px" }}>
              <button
                type="button"
                disabled={isSubmitting || !district}
                className="submit-btn"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handleSubmit}
              >
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
              </button>
            </div>

            {/* Payment Icons */}
            <div className="summary-payment-icons">
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
            Shipping details saved successfully!
          </span>
        </div>
      )}
    </div>
  );
}
