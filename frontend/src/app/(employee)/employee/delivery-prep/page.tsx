"use client";

import React, { useState } from "react";
import { useEmployee } from "../context/EmployeeContext";

export default function DeliveryPrep() {
  const {
    orders,
    activeDeliveryPrepId,
    submitCitypakShipment,
    printCitypakWaybill,
    packageDimensions,
    setDimensions,
  } = useEmployee();

  // Find the active order in context
  const activeOrder = orders.find(o => o.id === activeDeliveryPrepId) || orders[0];

  // Local state for shipment inputs
  const [weightKg, setWeightKg] = useState("0.5");
  const [pieces, setPieces] = useState("1");
  const [customDescription, setCustomDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shipmentResult, setShipmentResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle dimension inputs
  const handleDimChange = (key: "length" | "width" | "height", value: string) => {
    setDimensions({
      ...packageDimensions,
      [key]: value,
    });
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleSubmitToCitypak = async () => {
    if (!activeOrder) return;
    setErrorMsg(null);

    const parsedWeightKg = parseFloat(weightKg);
    if (isNaN(parsedWeightKg) || parsedWeightKg <= 0) {
      setErrorMsg("Please enter a valid package weight in kg (e.g., 0.5).");
      return;
    }

    const weightGrams = Math.round(parsedWeightKg * 1000);
    const numberOfPieces = parseInt(pieces, 10) || 1;

    setIsSubmitting(true);
    try {
      const res = await submitCitypakShipment(activeOrder.id, {
        weightGrams,
        numberOfPieces,
        description: customDescription.trim() || undefined,
        lengthCm: packageDimensions.length ? parseFloat(packageDimensions.length) : undefined,
        widthCm: packageDimensions.width ? parseFloat(packageDimensions.width) : undefined,
        heightCm: packageDimensions.height ? parseFloat(packageDimensions.height) : undefined,
      });

      setShipmentResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit Citypak shipment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenWaybill = async () => {
    if (!activeOrder) return;
    try {
      await printCitypakWaybill(activeOrder.id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to open waybill PDF.");
    }
  };

  if (!activeOrder) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--emp-text-muted)" }}>
        No orders ready for delivery prep. Complete items in Product Prep first!
      </div>
    );
  }

  const codAmount =
    activeOrder.paymentMethod === "COD" ? activeOrder.valuation : 0;

  return (
    <div>
      {/* Top Breadcrumb Header info */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#e63946", fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "8px" }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 12, height: 12 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h6m-6 0H6m13 0h3v-4a2 2 0 00-2-2h-4v6z" />
        </svg>
        <span>Citypak Courier Fulfillment</span>
      </div>

      {/* Page Title Header with Actions */}
      <div className="emp-page-header">
        <div className="emp-page-title-group">
          <h1>Order #{activeOrder.id}</h1>
        </div>

        <div className="flex flex-col xs:flex-row gap-2 xs:gap-3 w-full xs:w-auto">
          <button className="emp-prep-btn-secondary w-full xs:w-auto" onClick={handlePrintInvoice}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Invoice</span>
          </button>
          
          <button
            className="emp-btn-claim w-full xs:w-auto"
            onClick={handleOpenWaybill}
            disabled={!shipmentResult && activeOrder.status !== "Ready for Pickup"}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Print Citypak Waybill</span>
          </button>
        </div>
      </div>

      {/* Main Delivery Layout */}
      <div className="emp-delivery-layout">
        {/* Left Column details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Order Summary card */}
          <div className="emp-card">
            <div className="emp-delivery-summary-header">
              <div>
                <span className="emp-badge green" style={{ fontSize: "9px" }}>
                  {activeOrder.status}
                </span>
                <div style={{ marginTop: "10px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Consignee</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "4px" }}>{activeOrder.customerName}</div>
                  <div style={{ fontSize: "13px", color: "var(--emp-text-muted)", marginTop: "2px" }}>{activeOrder.customerEmail}</div>
                  <div style={{ fontSize: "13px", color: "var(--emp-text-muted)" }}>{activeOrder.customerPhone}</div>
                </div>
              </div>

              <div className="emp-delivery-address-container" style={{ maxWidth: "300px" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Immutable Order Shipping Snapshot</span>
                <p style={{ fontSize: "13px", color: "#ffffff", marginTop: "4px", lineHeight: "1.4" }}>
                  {activeOrder.customerAddress ? activeOrder.customerAddress.split(", ").map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      <br />
                    </React.Fragment>
                  )) : "No address specified"}
                </p>
              </div>
            </div>

            {/* Product thumbs & Order value */}
            <div className="flex flex-col xs:flex-row justify-between items-start xs:items-end gap-4 xs:gap-0 mt-4">
              <div className="emp-delivery-thumb-row" style={{ border: "none", paddingTop: 0, marginTop: 0 }}>
                {activeOrder.itemsList.map((item, i) => (
                  <div key={i} className="emp-delivery-thumb" style={{ backgroundColor: i % 2 === 0 ? "#1c2e28" : "#111111", fontSize: "9px", padding: "4px", textAlign: "center" }}>
                    {item.description.split(" / ")[0].split(" ")[0]}
                  </div>
                ))}
              </div>

              <div className="w-full xs:w-auto xs:text-right text-left">
                <span className="emp-delivery-value-lbl">Total Payable ({activeOrder.paymentMethod})</span>
                <div className="emp-delivery-value-val">
                  Rs. {activeOrder.valuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Details Box */}
          <div className="emp-cod-box">
            <div className="emp-cod-left">
              <span className="emp-cod-badge">
                {activeOrder.paymentMethod === "COD"
                  ? "Cash on Delivery — Citypak Collects Payable Amount"
                  : "Bank Transfer — Verified & Paid (Citypak Collection: Rs. 0.00)"}
              </span>
              <span className="emp-cod-amount">
                Citypak COD Amount: Rs. {codAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="emp-cod-details">
                {activeOrder.paymentMethod === "COD"
                  ? "Citypak will collect full total from customer."
                  : "Payment verified by Admin prior to fulfillment."}
              </span>
            </div>
          </div>

          {/* Verified Package Contents table */}
          <div className="emp-card">
            <div className="emp-card-header" style={{ marginBottom: "16px" }}>
              <h2 className="emp-card-title">Verified Package Contents</h2>
              <span style={{ fontSize: "12px", color: "var(--emp-text-muted)" }}>
                {activeOrder.itemsList.length} Items Total
              </span>
            </div>

            <div className="emp-table-container">
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th style={{ textAlign: "right" }}>Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrder.itemsList.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.description}</td>
                      <td>{item.qty}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        Rs. {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column Integration panel */}
        <div className="emp-card">
          <div className="emp-api-panel">
            <div className="emp-api-header-row">
              <div className="emp-api-logo-fallback" style={{ fontSize: "9px", backgroundColor: "#e63946", color: "#ffffff", padding: "6px", borderRadius: "4px", fontWeight: 900, textAlign: "center", lineHeight: "1.1" }}>CITYPAK<br />FALCON</div>
              <div>
                <h3 className="emp-api-title">Citypak Falcon API</h3>
                <span className="emp-api-subtitle">Server-side Authenticated</span>
              </div>
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: "rgba(230, 57, 70, 0.2)", border: "1px solid #e63946", color: "#ff8080", padding: "10px", borderRadius: "6px", fontSize: "12px", marginBottom: "12px" }}>
                {errorMsg}
              </div>
            )}

            {/* Weight Setting (kg) */}
            <div className="emp-api-form-row">
              <label htmlFor="pweight">Package Weight (KG)</label>
              <input
                type="text"
                id="pweight"
                className="emp-api-input"
                style={{ textAlign: "left" }}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="e.g. 0.5"
              />
            </div>

            {/* Number of Pieces */}
            <div className="emp-api-form-row">
              <label htmlFor="ppieces">Number of Pieces (Parcels)</label>
              <input
                type="number"
                id="ppieces"
                className="emp-api-input"
                style={{ textAlign: "left" }}
                value={pieces}
                onChange={(e) => setPieces(e.target.value)}
                min="1"
                max="20"
              />
            </div>

            {/* Package Description */}
            <div className="emp-api-form-row">
              <label htmlFor="pdesc">Courier Description (Max 128 chars)</label>
              <input
                type="text"
                id="pdesc"
                className="emp-api-input"
                style={{ textAlign: "left" }}
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Auto-generated if empty"
                maxLength={128}
              />
            </div>

            {/* Optional Dimensions */}
            <div className="emp-api-form-row">
              <label>Optional Dimensions (CM)</label>
              <div className="emp-api-dim-grid">
                <input
                  type="text"
                  className="emp-api-input"
                  placeholder="L"
                  value={packageDimensions.length}
                  onChange={(e) => handleDimChange("length", e.target.value)}
                />
                <input
                  type="text"
                  className="emp-api-input"
                  placeholder="W"
                  value={packageDimensions.width}
                  onChange={(e) => handleDimChange("width", e.target.value)}
                />
                <input
                  type="text"
                  className="emp-api-input"
                  placeholder="H"
                  value={packageDimensions.height}
                  onChange={(e) => handleDimChange("height", e.target.value)}
                />
              </div>
            </div>

            {/* Submit to Citypak button */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
              <button
                className="emp-api-btn-primary"
                onClick={handleSubmitToCitypak}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="emp-spinner"></div>
                    <span>Submitting to Citypak...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 15, height: 15 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Submit to Citypak</span>
                  </>
                )}
              </button>

              {shipmentResult && (
                <button
                  className="emp-api-btn-solid"
                  onClick={handleOpenWaybill}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 15, height: 15 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print Citypak Thermal Waybill</span>
                </button>
              )}
            </div>

            {/* Result Box */}
            <div className="emp-waybill-preview-box" style={{ marginTop: "16px" }}>
              {!shipmentResult ? (
                <>
                  <svg className="emp-waybill-preview-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="emp-waybill-preview-text">
                    Enter package weight & pieces above, then click "Submit to Citypak" to register the shipment and obtain a real tracking number.
                  </p>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
                  <svg className="emp-waybill-preview-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--emp-neon-green)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--emp-neon-green)" }}>
                    SHIPMENT REGISTERED WITH CITYPAK
                  </div>
                  <div style={{ fontSize: "12px", color: "#ffffff" }}>
                    Citypak Order ID: <strong style={{ color: "var(--emp-neon-green)" }}>{shipmentResult.citypakOrderId}</strong>
                  </div>
                  <div style={{ fontSize: "12px", color: "#ffffff" }}>
                    Primary Tracking #: <strong style={{ color: "var(--emp-neon-green)" }}>{shipmentResult.primaryTrackingNumber}</strong>
                  </div>
                  <button
                    onClick={handleOpenWaybill}
                    style={{ fontSize: "11px", color: "#ffffff", fontWeight: 700, textDecoration: "underline", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", marginTop: "4px" }}
                  >
                    Open PDF Thermal Waybill
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
