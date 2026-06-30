"use client";

import React, { useState } from "react";
import { useEmployee } from "../context/EmployeeContext";

export default function DeliveryPrep() {
  const {
    orders,
    activeDeliveryPrepId,
    waybillStatus,
    pickupStatus,
    packageDimensions,
    packageWeight,
    pickupSlot,
    setDimensions,
    setWeight,
    setPickupSlot,
    triggerWaybillGeneration,
    triggerPickupRequest,
    finalizeDelivery,
  } = useEmployee();

  // Find the active order in context
  const activeOrder = orders.find(o => o.id === activeDeliveryPrepId) || orders[0];

  // Handle inputs
  const handleDimChange = (key: "length" | "width" | "height", value: string) => {
    setDimensions({
      ...packageDimensions,
      [key]: value,
    });
  };

  // Mock Invoice print alert
  const handlePrintInvoice = () => {
    alert("Sending PDF Invoice to Zebra Thermal Printer... [OK]");
  };

  const handleMarkAsSent = () => {
    if (activeOrder) {
      finalizeDelivery(activeOrder.id);
      alert(`Order #${activeOrder.id} marked as SENT. Couriers notified.`);
      window.location.href = "/employee/ready-orders";
    }
  };

  if (!activeOrder) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--emp-text-muted)" }}>
        No orders ready for delivery prep. Complete items in Product Prep first!
      </div>
    );
  }

  return (
    <div>
      {/* Top Breadcrumb Header info */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#e63946", fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "8px" }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 12, height: 12 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h6m-6 0H6m13 0h3v-4a2 2 0 00-2-2h-4v6z" />
        </svg>
        <span>Citypak Delivery Prep</span>
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
          <button className="emp-btn-claim w-full xs:w-auto" onClick={handleMarkAsSent} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} style={{ width: 14, height: 14 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Mark as Sent</span>
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
                  {activeOrder.status === "Ready for Pickup" ? "Packed & Ready" : activeOrder.status}
                </span>
                <div style={{ marginTop: "10px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Customer</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "4px" }}>{activeOrder.customerName}</div>
                  <div style={{ fontSize: "13px", color: "var(--emp-text-muted)", marginTop: "2px" }}>{activeOrder.customerEmail}</div>
                  <div style={{ fontSize: "13px", color: "var(--emp-text-muted)" }}>{activeOrder.customerPhone}</div>
                </div>
              </div>

              <div className="emp-delivery-address-container" style={{ maxWidth: "300px" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Shipping Address</span>
                <p style={{ fontSize: "13px", color: "#ffffff", marginTop: "4px", lineHeight: "1.4" }}>
                  {activeOrder.customerAddress.split(", ").map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
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
                <span className="emp-delivery-value-lbl">Order Value</span>
                <div className="emp-delivery-value-val">
                  Rs. {activeOrder.valuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Cash on Delivery bordered box */}
          {activeOrder.paymentMethod === "COD" && (
            <div className="emp-cod-box">
              <div className="emp-cod-left">
                <span className="emp-cod-badge">Cash on Delivery (COD) Action Required</span>
                <span className="emp-cod-amount">
                  Rs. {activeOrder.valuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="emp-cod-details">Inclusive of Shipping & Fees</span>

                <div className="emp-cod-info-line">
                  <svg className="emp-cod-info-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Ensure the Citypak Waybill clearly denotes "COD Collection Only" before sealing the parcel.</span>
                </div>
              </div>

              {/* Cash Icon Vector Fallback */}
              <svg className="emp-cod-right-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "rgba(0, 255, 157, 0.15)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          )}

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
              <div className="emp-api-logo-fallback" style={{ fontSize: "9px", backgroundColor: "#e63946", color: "#ffffff", padding: "6px", borderRadius: "4px", fontWeight: 900, textAlign: "center", lineHeight: "1.1" }}>CITYPAK<br />EXPRESS</div>
              <div>
                <h3 className="emp-api-title">Citypak Integration</h3>
                <span className="emp-api-subtitle">Direct API Connected</span>
              </div>
            </div>

            {/* Dimension settings */}
            <div className="emp-api-form-row">
              <label>Package Dimensions (CM)</label>
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

            {/* Weight Setting */}
            <div className="emp-api-form-row">
              <label htmlFor="pweight">Weight (KG)</label>
              <input
                type="text"
                id="pweight"
                className="emp-api-input"
                style={{ textAlign: "left" }}
                value={packageWeight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            {/* Pickup slot drop selection */}
            <div className="emp-api-form-row">
              <label htmlFor="pslot">Pickup Slot</label>
              <select
                id="pslot"
                className="emp-api-select"
                value={pickupSlot}
                onChange={(e) => setPickupSlot(e.target.value)}
              >
                <option value="Today, 14:00 - 16:00 (Standard)">Today, 14:00 - 16:00 (Standard)</option>
                <option value="Tomorrow, 09:00 - 12:00 (Morning)">Tomorrow, 09:00 - 12:00 (Morning)</option>
                <option value="Tomorrow, 14:00 - 17:00 (Standard)">Tomorrow, 14:00 - 17:00 (Standard)</option>
              </select>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
              <button className="emp-api-btn-primary" onClick={triggerWaybillGeneration} disabled={waybillStatus === "generating"}>
                {waybillStatus === "generating" ? (
                  <>
                    <div className="emp-spinner"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 15, height: 15 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Generate Waybill</span>
                  </>
                )}
              </button>

              <button className="emp-api-btn-solid" onClick={triggerPickupRequest} disabled={pickupStatus === "requesting"}>
                {pickupStatus === "requesting" ? (
                  <>
                    <div className="emp-spinner"></div>
                    <span>Requesting...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 15, height: 15 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Request Pickup</span>
                  </>
                )}
              </button>
            </div>

            {/* Waybill PDF result preview panel */}
            <div className="emp-waybill-preview-box">
              {waybillStatus === "idle" && (
                <>
                  <svg className="emp-waybill-preview-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="emp-waybill-preview-text">
                    Waybill will be generated as a high-fidelity PDF. Ready for thermal printing.
                  </p>
                </>
              )}

              {waybillStatus === "generating" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                  <div className="emp-spinner" style={{ width: 28, height: 28 }}></div>
                  <span style={{ fontSize: "12px", color: "var(--emp-text-muted)" }}>Contacting Citypak Courier Server...</span>
                </div>
              )}

              {waybillStatus === "generated" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                  <svg className="emp-waybill-preview-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--emp-neon-green)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--emp-neon-green)" }}>WAYBILL GENERATED SUCCESSFULLY</div>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert("Opening waybill thermal print preview window..."); }}
                    style={{ fontSize: "11px", color: "#ffffff", fontWeight: 700, textDecoration: "underline", textTransform: "uppercase" }}
                  >
                    Open Waybill PDF (Zebra Print Layout)
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
