"use client";

import React, { useState, useEffect } from "react";
import { useEmployee, OrderItem } from "../context/EmployeeContext";

export default function ProductPrep() {
  const {
    orders,
    startPrep,
    updateOrderStatus,
    returnToOrdersQueue,
    submitCitypakShipment,
    printCitypakWaybill,
    requestCitypakPickup,
    searchQuery,
  } = useEmployee();

  // Active order being prepared
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showReturnConfirmModal, setShowReturnConfirmModal] = useState(false);

  // Form State for Citypak Pickup Request
  const [pickupAddressLine1, setPickupAddressLine1] = useState("Vergo Central Warehouse, High Level Road");
  const [pickupAddressLine2, setPickupAddressLine2] = useState("Delkanda");
  const [pickupAddressLine3, setPickupAddressLine3] = useState("Nugegoda");
  const [pickupAddressLine4City, setPickupAddressLine4City] = useState("Colombo");

  const [pickupContactPerson, setPickupContactPerson] = useState("Fulfillment Manager");
  const [pickupContactNumber1, setPickupContactNumber1] = useState("+94771234567");

  // Format default datetime-local string (YYYY-MM-DDTHH:mm)
  const formatDatetimeInput = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const now = new Date();
  const defaultFrom = formatDatetimeInput(new Date(now.getTime() + 30 * 60 * 1000));
  const defaultTo = formatDatetimeInput(new Date(now.getTime() + 4 * 60 * 60 * 1000));

  const [pickupFromDatetime, setPickupFromDatetime] = useState(defaultFrom);
  const [pickupToDatetime, setPickupToDatetime] = useState(defaultTo);
  const [waybillCount, setWaybillCount] = useState("1");
  const [weightKg, setWeightKg] = useState("0.5");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [printedInvoice, setPrintedInvoice] = useState(false);
  const [printedWaybill, setPrintedWaybill] = useState(false);

  // Auto populate admin shipper return address profile
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = sessionStorage.getItem("vergo_access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    if (token) {
      fetch(`${apiUrl}/integrations/citypak/shipper-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((profile) => {
          if (profile) {
            if (profile.shipperName) setPickupContactPerson(profile.shipperName);
            if (profile.contactNumber1) setPickupContactNumber1(profile.contactNumber1);
            if (profile.addressLine1) setPickupAddressLine1(profile.addressLine1);
            if (profile.addressLine2 !== undefined) setPickupAddressLine2(profile.addressLine2 || "");
            if (profile.addressLine3 !== undefined) setPickupAddressLine3(profile.addressLine3 || "");
            if (profile.addressLine4City) setPickupAddressLine4City(profile.addressLine4City);
          }
        })
        .catch(() => {});
    }
  }, []);

  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawUser = sessionStorage.getItem("vergo_user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u.employeeId) setCurrentEmployeeId(u.employeeId);
        else if (u.profileId) setCurrentEmployeeId(u.profileId);
        else if (u.id) setCurrentEmployeeId(u.id);
      }
    } catch (e) {}
  }, []);

  // Filter orders in Claimed or Preparing state belonging to current employee
  const prepOrders = orders.filter((o) => {
    if (!["Claimed", "Preparing"].includes(o.status)) return false;
    if (currentEmployeeId && o.employeeId && o.employeeId !== currentEmployeeId) {
      return false;
    }
    return true;
  });

  // Apply search query
  const filteredOrders = prepOrders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchId = order.id.toLowerCase().includes(q);
    const matchCustomer = order.customerName.toLowerCase().includes(q);
    const matchItems = order.itemsList.some(
      (item) =>
        item.description.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.size.toLowerCase().includes(q) ||
        item.color.toLowerCase().includes(q)
    );
    return matchId || matchCustomer || matchItems;
  });

  const pendingCount = prepOrders.filter((o) => o.status === "Claimed").length;
  const preparingCount = prepOrders.filter((o) => o.status === "Preparing").length;

  const preparingOrder =
    prepOrders.find((o) => o.id === activeOrderId && o.status === "Preparing") ||
    prepOrders.find((o) => o.status === "Preparing");

  const handleStartPrep = async (orderId: string) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await startPrep(orderId);
      setActiveOrderId(orderId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start preparation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintInvoice = (order: OrderItem) => {
    setPrintedInvoice(true);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsSubtotal = order.itemsList.reduce(
      (sum, i) => sum + i.unitPrice * i.qty,
      0
    );
    const deliveryFee = order.deliveryFee || 350;
    const grandTotal = itemsSubtotal + deliveryFee;

    const itemsRows = order.itemsList
      .map(
        (item) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 10px;">
          <div style="font-weight: 700; color: #111827;">${item.description}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">SKU: <span style="font-family: monospace;">${item.sku}</span></div>
        </td>
        <td style="padding: 12px 10px; text-align: center; font-size: 12px; color: #374151;">${item.size} / ${item.color}</td>
        <td style="padding: 12px 10px; text-align: center; font-weight: 700; color: #111827;">${item.qty}</td>
        <td style="padding: 12px 10px; text-align: right; color: #374151;">Rs. ${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 800; color: #111827;">Rs. ${(
          item.unitPrice * item.qty
        ).toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - Order #${order.id.slice(0, 8).toUpperCase()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            * { box-sizing: border-box; }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 40px;
              color: #111827;
              max-width: 820px;
              margin: 0 auto;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
            }
            .invoice-card {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 32px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
            }
            .brand-bar {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #111827;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }
            .brand-title {
              font-size: 26px;
              font-weight: 900;
              letter-spacing: 1px;
              color: #111827;
            }
            .brand-contact {
              font-size: 12px;
              color: #4b5563;
              margin-top: 6px;
              line-height: 1.5;
            }
            .invoice-meta {
              text-align: right;
            }
            .invoice-num {
              font-size: 18px;
              font-weight: 900;
              font-family: monospace;
              color: #111827;
            }
            .invoice-date {
              font-size: 12px;
              color: #6b7280;
              margin-top: 4px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 24px;
            }
            .info-box {
              background: #f9fafb;
              border: 1px solid #f3f4f6;
              padding: 16px;
              border-radius: 8px;
            }
            .info-lbl {
              font-size: 10px;
              font-weight: 800;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
            }
            .info-name {
              font-size: 15px;
              font-weight: 800;
              color: #111827;
            }
            .info-text {
              font-size: 12.5px;
              color: #374151;
              margin-top: 2px;
              line-height: 1.4;
            }
            .badge {
              display: inline-block;
              padding: 3px 8px;
              font-size: 11px;
              font-weight: 800;
              border-radius: 4px;
              background: #111827;
              color: #ffffff;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background: #111827;
              color: #ffffff;
              text-align: left;
              padding: 10px 12px;
              font-weight: 700;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            th:first-child { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
            th:last-child { border-top-right-radius: 6px; border-bottom-right-radius: 6px; }
            td {
              padding: 12px 10px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 13px;
            }
            .totals-wrap {
              display: flex;
              justify-content: flex-end;
              margin-top: 24px;
            }
            .totals-box {
              width: 320px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 16px;
              background: #f9fafb;
            }
            .totals-line {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              font-size: 13px;
              color: #111827;
            }
            .delivery-line {
              font-weight: 400;
              color: #111827 !important;
              border-top: 1px dashed #e5e7eb;
              padding-top: 8px;
              margin-top: 4px;
            }
            .grand-line {
              font-size: 16px;
              font-weight: 900;
              color: #111827;
              border-top: 2px solid #111827;
              padding-top: 10px;
              margin-top: 8px;
            }
            .footer-note {
              margin-top: 28px;
              border-top: 1px solid #e5e7eb;
              padding-top: 14px;
              font-size: 11px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            <div class="brand-bar">
              <div>
                <div class="brand-title">VERGO WEAR</div>
                <div class="brand-contact">
                  Email: vergo.wearofficial@gmail.com &nbsp;|&nbsp; Contact: +94 11 234 5678 / +94 77 123 4567<br />
                  Web: www.vergowear.com &nbsp;|&nbsp; Vergo Central Fulfillment
                </div>
              </div>
              <div class="invoice-meta">
                <div class="invoice-num">INVOICE #${order.id.slice(0, 8).toUpperCase()}</div>
                <div class="invoice-date">Date: ${new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-box">
                <div class="info-lbl">Customer & Recipient</div>
                <div class="info-name">${order.customerName}</div>
                <div class="info-text">Phone: ${order.customerPhone}</div>
                <div class="info-text">Email: ${order.customerEmail}</div>
              </div>
              <div class="info-box">
                <div class="info-lbl">Shipping & Payment Snapshot</div>
                <div class="info-text" style="font-weight: 600;">${order.customerAddress}</div>
                <div style="margin-top: 8px;">
                  <span class="badge">Payment: ${order.paymentMethod}</span>
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th style="text-align: center;">Variant</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="totals-wrap">
              <div class="totals-box">
                <div class="totals-line">
                  <span>Items Subtotal:</span>
                  <span style="font-weight: 600;">Rs. ${itemsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="totals-line delivery-line">
                  <span>Delivery Fee Charges:</span>
                  <span style="font-weight: 400; color: #111827;">Rs. ${deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="totals-line grand-line">
                  <span>Grand Total Payable:</span>
                  <span>Rs. ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div class="footer-note">
              Thank you for shopping with Vergo Wear! For any inquiries, contact vergo.wearofficial@gmail.com or call +94 11 234 5678.
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintWaybill = async (orderId: string) => {
    setPrintedWaybill(true);
    try {
      await printCitypakWaybill(orderId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to stream Citypak waybill PDF.");
    }
  };

  const [dimLengthCm, setDimLengthCm] = useState("25");
  const [dimWidthCm, setDimWidthCm] = useState("20");
  const [dimHeightCm, setDimHeightCm] = useState("10");
  const [packageDesc, setPackageDesc] = useState("");
  const [hasPreallocatedTracking, setHasPreallocatedTracking] = useState<"No" | "Yes">("No");
  const [preallocatedTrackingNumber, setPreallocatedTrackingNumber] = useState("");
  const [paymentType, setPaymentType] = useState<"COD" | "Prepaid">("COD");
  const [codAmountInput, setCodAmountInput] = useState("0");

  useEffect(() => {
    if (preparingOrder) {
      const summary = preparingOrder.itemsList.map(i => `${i.description} ${i.size}`).join(", ");
      setPackageDesc(summary.length > 125 ? summary.slice(0, 122) + "..." : summary);

      const isCod = preparingOrder.paymentMethod === "COD";
      setPaymentType(isCod ? "COD" : "Prepaid");
      setCodAmountInput(isCod ? String(preparingOrder.valuation) : "0");
    }
  }, [preparingOrder?.id]);

  const handlePaymentTypeChange = (newType: "COD" | "Prepaid") => {
    setPaymentType(newType);
    if (newType === "Prepaid") {
      setCodAmountInput("0");
    } else if (preparingOrder) {
      setCodAmountInput(String(preparingOrder.valuation));
    }
  };

  const handleSubmitToCitypakAndPickup = async (order: OrderItem) => {
    if (!pickupAddressLine1.trim() || !pickupAddressLine4City.trim()) {
      setErrorMsg("Please fill in the required Pickup Address fields (Line 1 & City).");
      return;
    }
    if (!pickupContactPerson.trim() || !pickupContactNumber1.trim()) {
      setErrorMsg("Please fill in the required Contact Details (Name & Contact Number).");
      return;
    }
    if (hasPreallocatedTracking === "Yes" && !preallocatedTrackingNumber.trim()) {
      setErrorMsg("Pre-allocated tracking number is enabled. Please enter the Citypak Tracking Number.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const parsedWeightKg = parseFloat(weightKg) || 0.5;
      const weightGrams = Math.round(parsedWeightKg * 1000);
      const piecesCount = parseInt(waybillCount, 10) || 1;

      // Step 1: Submit Citypak shipment with package dimensions & description (creates order in https://staging-m.citypak.lk/orders)
      await submitCitypakShipment(order.id, {
        weightGrams,
        numberOfPieces: piecesCount,
        description: packageDesc.trim() || undefined,
        lengthCm: parseFloat(dimLengthCm) || undefined,
        widthCm: parseFloat(dimWidthCm) || undefined,
        heightCm: parseFloat(dimHeightCm) || undefined,
      });

      // Step 2: Submit Courier Pickup Request (creates pickup in https://staging-m.citypak.lk/pickup-request)
      const fromISO = new Date(pickupFromDatetime).toISOString();
      const toISO = new Date(pickupToDatetime).toISOString();

      await requestCitypakPickup({
        orderIds: [order.id],
        pickupAddressLine1: pickupAddressLine1.trim(),
        pickupAddressLine2: pickupAddressLine2.trim() || undefined,
        pickupAddressLine3: pickupAddressLine3.trim() || undefined,
        pickupAddressLine4City: pickupAddressLine4City.trim(),
        pickupContactPerson: pickupContactPerson.trim(),
        pickupContactNumber1: pickupContactNumber1.trim(),
        pickupFromDatetime: fromISO,
        pickupToDatetime: toISO,
      });

      // Step 3: Automatically update order status to "Ready for Pickup"
      await updateOrderStatus(order.id, "Ready for Pickup");

      // Step 4: Clear active preparation state on Product Prep page
      setActiveOrderId(null);
      setPrintedInvoice(false);
      setPrintedWaybill(false);

      // Redirect to Ready for Pickup orders page
      setTimeout(() => {
        window.location.href = "/employee/ready-orders";
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit Citypak order & pickup request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="emp-page-header">
        <div className="emp-page-title-group">
          <h1>Product Preparation</h1>
          <p>
            Stage items, verify pickup details, print invoices & waybills, and dispatch orders directly to{" "}
            <span className="text-[#00ff9d] font-bold">Citypak Courier</span>.
          </p>
        </div>

        {/* Stats Summary Headers */}
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ textTransform: "uppercase", textAlign: "right" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", letterSpacing: "0.5px" }}>
              Pending Claimed
            </span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
              {pendingCount.toString().padStart(2, "0")}
            </div>
          </div>
          <div style={{ width: "1px", backgroundColor: "var(--emp-border)" }}></div>
          <div style={{ textTransform: "uppercase", textAlign: "right" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", letterSpacing: "0.5px" }}>
              In Preparation
            </span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--emp-warning-yellow)", marginTop: "2px" }}>
              {preparingCount.toString().padStart(2, "0")}
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: "rgba(230, 57, 70, 0.2)", border: "1px solid #e63946", color: "#ff8080", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 700 }}>
          {errorMsg}
        </div>
      )}

      {/* Main Layout */}
      {filteredOrders.length === 0 ? (
        <div className="emp-card" style={{ textAlign: "center", padding: "60px 20px", color: "var(--emp-text-muted)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 42, height: 42, margin: "0 auto 12px", opacity: 0.4 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>No Active Orders in Preparation Queue</div>
          <p style={{ fontSize: "12px", marginTop: "4px" }}>Claim orders from the Orders page to begin preparation and Citypak dispatch.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px" }}>
          {/* Left Column: Prep Queue Selection */}
          <div className="space-y-4">
            <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#ffffff" }}>
              Queue ({filteredOrders.length} Orders)
            </div>

            {filteredOrders.map((order) => {
              const isSelected = preparingOrder?.id === order.id;
              const isPreparing = order.status === "Preparing";

              return (
                <div
                  key={order.id}
                  className="emp-card"
                  onClick={() => setActiveOrderId(order.id)}
                  style={{
                    cursor: "pointer",
                    borderLeft: isSelected
                      ? "4px solid var(--emp-neon-green)"
                      : isPreparing
                      ? "4px solid var(--emp-warning-yellow)"
                      : "4px solid var(--emp-border)",
                    backgroundColor: isSelected ? "rgba(0, 255, 157, 0.03)" : "rgba(255,255,255,0.01)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "14px", fontWeight: 900, fontFamily: "monospace", color: "#ffffff" }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px", color: "#ffffff" }}>
                        {order.customerName}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
                        {order.itemsList.length} Item(s) · Rs. {order.valuation.toLocaleString()}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className={`emp-badge ${order.paymentMethod === "COD" ? "red" : "gray"}`}>
                        {order.paymentMethod}
                      </span>
                      <div style={{ marginTop: "6px" }}>
                        {!isPreparing ? (
                          <button
                            className="emp-prep-btn-start"
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                            disabled={isSubmitting}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartPrep(order.id);
                            }}
                          >
                            <span>Start Prep</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--emp-warning-yellow)" }}>
                            ● IN PREP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Workstation & Citypak Pickup Form */}
          {preparingOrder ? (
            <div className="emp-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Header with Print Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--emp-border)", paddingBottom: "14px" }}>
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--emp-neon-green)", textTransform: "uppercase" }}>
                    Active Workstation
                  </span>
                  <h2 style={{ fontSize: "18px", fontWeight: 900, fontFamily: "monospace", margin: "2px 0 0", color: "#ffffff" }}>
                    #{preparingOrder.id.slice(0, 8).toUpperCase()}
                  </h2>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="emp-prep-btn-secondary"
                    onClick={() => handlePrintInvoice(preparingOrder)}
                    style={{
                      fontSize: "11px",
                      padding: "6px 12px",
                      borderColor: printedInvoice ? "var(--emp-neon-green)" : undefined,
                      color: printedInvoice ? "var(--emp-neon-green)" : undefined,
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>{printedInvoice ? "Invoice Printed ✓" : "Print Invoice"}</span>
                  </button>

                  <button
                    className="emp-btn-claim"
                    onClick={() => handlePrintWaybill(preparingOrder.id)}
                    style={{
                      fontSize: "11px",
                      padding: "6px 12px",
                      backgroundColor: printedWaybill ? "rgba(0, 255, 157, 0.15)" : undefined,
                      color: printedWaybill ? "var(--emp-neon-green)" : undefined,
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>{printedWaybill ? "Waybill Printed ✓" : "Print Citypak Waybill"}</span>
                  </button>
                </div>
              </div>

              {/* Consignee & Order Summary */}
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--emp-border)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Recipient / Delivery Address</span>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>{preparingOrder.customerName}</div>
                    <div style={{ fontSize: "11px", color: "var(--emp-neon-green)" }}>{preparingOrder.customerPhone}</div>
                    <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>{preparingOrder.customerAddress}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Order Financial Breakdown</span>
                    <div style={{ marginTop: "2px" }}>
                      <span className={`emp-badge ${preparingOrder.paymentMethod === "COD" ? "red" : "gray"}`}>
                        {preparingOrder.paymentMethod}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "4px" }}>
                      Items Total: Rs. {(preparingOrder.valuation - (preparingOrder.deliveryFee || 350)).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
                      Delivery Fee Charges: Rs. {(preparingOrder.deliveryFee || 350).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "12.5px", fontWeight: 900, color: "#ffffff", marginTop: "2px" }}>
                      Grand Total: Rs. {preparingOrder.valuation.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Citypak Pickup Request Form */}
              <div className="space-y-4" style={{ background: "rgba(0, 0, 0, 0.2)", padding: "16px", borderRadius: "8px", border: "1px solid var(--emp-border)" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--emp-neon-green)", margin: 0 }}>
                  Citypak Courier Pickup Request Form
                </h3>

                {/* Pickup Address Section */}
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>
                    Pickup Address
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "6px" }}>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Address Line 1 *</label>
                      <input
                        type="text"
                        className="emp-search-input"
                        style={{ width: "100%", marginTop: "2px" }}
                        value={pickupAddressLine1}
                        onChange={(e) => setPickupAddressLine1(e.target.value)}
                        placeholder="Warehouse address line 1"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Address Line 2</label>
                      <input
                        type="text"
                        className="emp-search-input"
                        style={{ width: "100%", marginTop: "2px" }}
                        value={pickupAddressLine2}
                        onChange={(e) => setPickupAddressLine2(e.target.value)}
                        placeholder="Street / Area"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Address Line 3</label>
                      <input
                        type="text"
                        className="emp-search-input"
                        style={{ width: "100%", marginTop: "2px" }}
                        value={pickupAddressLine3}
                        onChange={(e) => setPickupAddressLine3(e.target.value)}
                        placeholder="District / Zone"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Address City *</label>
                      <input
                        type="text"
                        className="emp-search-input"
                        style={{ width: "100%", marginTop: "2px" }}
                        value={pickupAddressLine4City}
                        onChange={(e) => setPickupAddressLine4City(e.target.value)}
                        placeholder="City"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Details Section */}
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>
                    Contact Details
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "6px" }}>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Name *</label>
                      <input
                        type="text"
                        className="emp-search-input"
                        style={{ width: "100%", marginTop: "2px" }}
                        value={pickupContactPerson}
                        onChange={(e) => setPickupContactPerson(e.target.value)}
                        placeholder="Fulfillment officer name"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Contact Number *</label>
                      <input
                        type="text"
                        className="emp-search-input"
                        style={{ width: "100%", marginTop: "2px" }}
                        value={pickupContactNumber1}
                        onChange={(e) => setPickupContactNumber1(e.target.value)}
                        placeholder="+94 77 XXXXXXX"
                      />
                    </div>
                  </div>
                </div>

                {/* Timing & Package Details Section */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>PickUpTime From *</label>
                    <input
                      type="datetime-local"
                      className="emp-search-input"
                      style={{ width: "100%", marginTop: "2px" }}
                      value={pickupFromDatetime}
                      onChange={(e) => setPickupFromDatetime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>PickUpTime To *</label>
                    <input
                      type="datetime-local"
                      className="emp-search-input"
                      style={{ width: "100%", marginTop: "2px" }}
                      value={pickupToDatetime}
                      onChange={(e) => setPickupToDatetime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Waybill Count *</label>
                    <input
                      type="number"
                      min="1"
                      className="emp-search-input"
                      style={{ width: "100%", marginTop: "2px" }}
                      value={waybillCount}
                      onChange={(e) => setWaybillCount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Estimated Weight (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      className="emp-search-input"
                      style={{ width: "100%", marginTop: "2px" }}
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                    />
                  </div>
                </div>

                {/* Package Dimensions & Specifications Section */}
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>
                    Package Dimensions & Description
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "6px" }}>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Length (L cm)</label>
                      <input
                        type="number"
                        className="emp-search-input"
                        style={{ width: "100%", marginTop: "2px" }}
                        value={dimLengthCm}
                        onChange={(e) => setDimLengthCm(e.target.value)}
                        placeholder="25"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Width (W cm)</label>
                      <input
                        type="number"
                        className="emp-search-input"
                        style={{ width: "100%", marginTop: "2px" }}
                        value={dimWidthCm}
                        onChange={(e) => setDimWidthCm(e.target.value)}
                        placeholder="20"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Height (H cm)</label>
                      <input
                        type="number"
                        className="emp-search-input"
                        style={{ width: "100%", marginTop: "2px" }}
                        value={dimHeightCm}
                        onChange={(e) => setDimHeightCm(e.target.value)}
                        placeholder="10"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Product Description (max 128 chars)</label>
                    <input
                      type="text"
                      className="emp-search-input"
                      style={{ width: "100%", marginTop: "2px" }}
                      value={packageDesc}
                      onChange={(e) => setPackageDesc(e.target.value.slice(0, 128))}
                      placeholder="e.g. Vergo Heavyweight T-Shirt"
                    />
                  </div>
                </div>

                {/* Payment Type & Pre-allocated Tracking Number Section */}
                <div style={{ marginTop: "12px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>
                    Payment & Tracking Configuration
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "6px" }}>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Payment Type *</label>
                      <select
                        className="emp-search-input"
                        style={{ width: "100%", marginTop: "2px", color: "#ffffff", background: "rgba(255,255,255,0.05)" }}
                        value={paymentType}
                        onChange={(e) => handlePaymentTypeChange(e.target.value as "COD" | "Prepaid")}
                      >
                        <option value="COD" style={{ background: "#1a1a1a", color: "#ffffff" }}>COD (Cash On Delivery)</option>
                        <option value="Prepaid" style={{ background: "#1a1a1a", color: "#ffffff" }}>Prepaid (Bank Transfer / Online)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Cash On Delivery Amount (Rs.) *</label>
                      <input
                        type="number"
                        className="emp-search-input"
                        style={{
                          width: "100%",
                          marginTop: "2px",
                          opacity: paymentType === "Prepaid" ? 0.5 : 1,
                        }}
                        value={paymentType === "Prepaid" ? "0" : codAmountInput}
                        onChange={(e) => setCodAmountInput(e.target.value)}
                        disabled={paymentType === "Prepaid"}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>Pre-allocated Tracking Number *</label>
                      <select
                        className="emp-search-input"
                        style={{ width: "100%", marginTop: "2px", color: "#ffffff", background: "rgba(255,255,255,0.05)" }}
                        value={hasPreallocatedTracking}
                        onChange={(e) => {
                          const val = e.target.value as "No" | "Yes";
                          setHasPreallocatedTracking(val);
                          if (val === "No") setPreallocatedTrackingNumber("");
                        }}
                      >
                        <option value="No" style={{ background: "#1a1a1a", color: "#ffffff" }}>No (No need to type tracking number)</option>
                        <option value="Yes" style={{ background: "#1a1a1a", color: "#ffffff" }}>Yes (Enter Citypak tracking number)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "var(--emp-text-muted)" }}>
                        Citypak Tracking Number {hasPreallocatedTracking === "Yes" ? "*" : ""}
                      </label>
                      <input
                        type="text"
                        className="emp-search-input"
                        style={{
                          width: "100%",
                          marginTop: "2px",
                          opacity: hasPreallocatedTracking === "No" ? 0.5 : 1,
                        }}
                        value={hasPreallocatedTracking === "No" ? "Auto-generated upon submission" : preallocatedTrackingNumber}
                        onChange={(e) => setPreallocatedTrackingNumber(e.target.value)}
                        disabled={hasPreallocatedTracking === "No"}
                        placeholder={hasPreallocatedTracking === "Yes" ? "e.g. D00332932" : "Auto-generated by Citypak"}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Return to Orders Table & Submit to Citypak */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "12px" }}>
                <button
                  className="emp-prep-btn-secondary"
                  style={{
                    justifyContent: "center",
                    padding: "12px",
                    fontSize: "12px",
                    fontWeight: 800,
                    backgroundColor: "rgba(255, 128, 128, 0.08)",
                    color: "#ff8080",
                    border: "1px solid rgba(255, 128, 128, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  disabled={isSubmitting}
                  onClick={() => setShowReturnConfirmModal(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 15, height: 15 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Return to Orders Table</span>
                </button>

                <button
                  className="emp-btn-claim"
                  style={{
                    justifyContent: "center",
                    padding: "12px",
                    fontSize: "12px",
                    fontWeight: 900,
                    backgroundColor: "var(--emp-neon-green)",
                    color: "#000000",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  disabled={isSubmitting}
                  onClick={() => handleSubmitToCitypakAndPickup(preparingOrder)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>
                    {isSubmitting
                      ? "Submitting Pickup Request to Citypak..."
                      : "Submit to Citypak & Request Courier Pickup"}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="emp-card" style={{ textAlign: "center", padding: "80px 20px", color: "var(--emp-text-muted)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.35, color: "var(--emp-warning-yellow)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#ffffff" }}>
                Product Preparation Not Started
              </div>
              <p style={{ fontSize: "12px", marginTop: "6px", maxWidth: "340px", lineHeight: "1.5" }}>
                Click <span style={{ color: "var(--emp-neon-green)", fontWeight: 700 }}>"Start Prep"</span> on an order in the queue to open the active workstation, print invoices & waybills, and fill the Citypak Courier Pickup Form.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Return to Orders Confirmation Modal */}
      {showReturnConfirmModal && preparingOrder && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#16181a",
              border: "1px solid var(--emp-border)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 128, 128, 0.15)",
                  border: "1px solid rgba(255, 128, 128, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ff8080",
                  flexShrink: 0,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", margin: 0 }}>
                  Confirm Move to Orders Table
                </h3>
                <p style={{ fontSize: "11px", color: "var(--emp-text-muted)", margin: "2px 0 0" }}>
                  Order #{preparingOrder.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "var(--emp-text-secondary)", margin: 0, lineHeight: "1.5" }}>
              Are you sure you want to return this order back to the main Orders table? The active preparation state will be cleared and the parcel will be made available for any employee to claim.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                className="emp-prep-btn-secondary"
                style={{ padding: "10px 18px", fontSize: "13px", fontWeight: 700 }}
                onClick={() => setShowReturnConfirmModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                className="emp-btn-claim"
                style={{
                  padding: "10px 22px",
                  fontSize: "13px",
                  fontWeight: 900,
                  backgroundColor: "#ff4d4d",
                  color: "#ffffff",
                }}
                disabled={isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    const ok = await returnToOrdersQueue(preparingOrder.id);
                    if (ok) {
                      setShowReturnConfirmModal(false);
                      setActiveOrderId(null);
                      window.location.href = "/employee/orders";
                    }
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
