"use client";

import React, { useState } from "react";
import { useEmployee, OrderItem } from "../context/EmployeeContext";

export default function ReadyOrders() {
  const {
    orders,
    updateOrderStatus,
    refreshCitypakTracking,
    syncCitypakStatus,
    lastSyncTime,
    printCitypakWaybill,
    selectActiveDeliveryPrep,
    searchQuery,
  } = useEmployee();

  const [isSyncing, setIsSyncing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleSyncCitypak = async () => {
    setIsSyncing(true);
    try {
      await syncCitypakStatus();
    } catch (err) {
      // Handled in context notification
    } finally {
      setIsSyncing(false);
    }
  };

  // Active tab filter: "ready" | "in_transit" | "finished" | "all"
  const [activeTab, setActiveTab] = useState<"ready" | "in_transit" | "finished" | "all">("ready");

  // Selected order details modal
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState<any | null>(null);

  // Live tracking timeline modal
  const [trackingModalOrder, setTrackingModalOrder] = useState<any | null>(null);
  const [trackingData, setTrackingData] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Action 1: Mark as Picked up by Citypak Courier
  const handleMarkPickedUpCitypak = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, "Handed to Courier");
    } catch (err) {
      console.error("Error setting Handed to Courier status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Action 2: Mark as Complete / Finished
  const handleMarkComplete = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, "Completed");
    } catch (err) {
      console.error("Error setting Completed status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Action 3: Mark as Returned
  const handleMarkReturned = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, "Returned");
    } catch (err) {
      console.error("Error setting Returned status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Print Invoice for a parcel
  const handlePrintInvoice = (order: OrderItem) => {
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

  // Filter orders based on active tab and search query
  const readyOrdersList = orders.filter((item) => {
    const isReady = ["Ready for Courier Pickup", "Ready for Pickup", "Ready"].includes(item.status);
    const isInTransit = ["Handed to Courier", "Handed to Citypak Courier", "Sent"].includes(item.status);
    const isFinished = ["Finished", "Delivered", "Completed"].includes(item.status);
    const isReturned = item.status === "Returned";

    if (activeTab === "ready") {
      if (!isReady && !isInTransit && !isFinished && !isReturned) return false;
    } else if (activeTab === "in_transit") {
      if (!isInTransit) return false;
    } else if (activeTab === "finished") {
      if (!isFinished && !isReturned) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = item.id.toLowerCase().includes(q);
      const matchCustomer = item.customerName.toLowerCase().includes(q);
      const matchPhone = item.customerPhone.toLowerCase().includes(q);
      if (!matchId && !matchCustomer && !matchPhone) return false;
    }
    return true;
  });

  const pendingPickupCount = orders.filter((o) =>
    ["Ready for Courier Pickup", "Ready for Pickup", "Ready"].includes(o.status)
  ).length;
  const inTransitCount = orders.filter((o) =>
    ["Handed to Citypak Courier", "Sent"].includes(o.status)
  ).length;
  const finishedCount = orders.filter((o) =>
    ["Finished", "Delivered", "Completed"].includes(o.status)
  ).length;

  const handleTrackOrder = async (order: any) => {
    setTrackingModalOrder(order);
    setTrackingData(null);
    setTrackingLoading(true);

    try {
      const res = await refreshCitypakTracking(order.id);
      setTrackingData(res);
    } catch (err: any) {
      // Error handled in context notification
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="emp-page-header">
        <div className="emp-page-title-group">
          <h1>Ready Orders & Courier Logistics</h1>
          <p>Monitor Citypak waybill dispatches, print invoices, and update live parcel delivery progress.</p>
        </div>

        {/* Stats Summary Headers */}
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ textTransform: "uppercase", textAlign: "right" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", letterSpacing: "0.5px" }}>Awaiting Pickup</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
              {pendingPickupCount.toString().padStart(2, "0")}
            </div>
          </div>
          <div style={{ width: "1px", backgroundColor: "var(--emp-border)" }}></div>
          <div style={{ textTransform: "uppercase", textAlign: "right" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", letterSpacing: "0.5px" }}>Handed to Courier</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--emp-neon-green)", marginTop: "2px" }}>
              {inTransitCount.toString().padStart(2, "0")}
            </div>
          </div>
          <div style={{ width: "1px", backgroundColor: "var(--emp-border)" }}></div>
          <div style={{ textTransform: "uppercase", textAlign: "right" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", letterSpacing: "0.5px" }}>Finished</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#0077ff", marginTop: "2px" }}>
              {finishedCount.toString().padStart(2, "0")}
            </div>
          </div>
        </div>
      </div>

      {/* Action bar and Tab Filter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div className="emp-tab-container">
          <button
            className={`emp-tab-btn ${activeTab === "ready" ? "active" : ""}`}
            onClick={() => setActiveTab("ready")}
          >
            Ready for Courier Pickup ({pendingPickupCount})
          </button>
          <button
            className={`emp-tab-btn ${activeTab === "in_transit" ? "active" : ""}`}
            onClick={() => setActiveTab("in_transit")}
          >
            Handed to Courier ({inTransitCount})
          </button>
          <button
            className={`emp-tab-btn ${activeTab === "finished" ? "active" : ""}`}
            onClick={() => setActiveTab("finished")}
          >
            Finished ({finishedCount})
          </button>
          <button
            className={`emp-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Orders ({orders.length})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {lastSyncTime && (
            <span style={{ fontSize: "11px", color: "var(--emp-text-muted)", background: "rgba(255,255,255,0.05)", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--emp-border)" }}>
              Last sync: <strong style={{ color: "var(--emp-neon-green)" }}>{lastSyncTime}</strong>
            </span>
          )}

          <button
            className="emp-prep-btn-secondary"
            onClick={handleSyncCitypak}
            disabled={isSyncing}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ width: 15, height: 15, animation: isSyncing ? "spin 1s linear infinite" : "none" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isSyncing ? "Syncing Citypak..." : "Sync Citypak Status"}</span>
          </button>
        </div>
      </div>

      {/* Table section */}
      <div className="emp-card">
        <div className="emp-table-container">
          {readyOrdersList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--emp-text-muted)" }}>
              No orders found for the selected view.
            </div>
          ) : (
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Order Ref</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Parcel Tracking Stage</th>
                  <th>Logistics Courier</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {readyOrdersList.map((item) => {
                  const isReadyForPickup = ["Ready for Courier Pickup", "Ready for Pickup", "Ready"].includes(item.status);
                  const isHandedToCourier = ["Handed to Courier", "Handed to Citypak Courier", "Sent"].includes(item.status);
                  const isFinished = ["Finished", "Delivered", "Completed"].includes(item.status);
                  const isReturned = item.status === "Returned";
                  const isPickedUp = isHandedToCourier || isFinished || isReturned;

                  return (
                    <tr key={item.id}>
                      <td className="emp-order-id">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            className="emp-order-id"
                            style={{ cursor: "pointer", textDecoration: "underline" }}
                            onClick={() => {
                              selectActiveDeliveryPrep(item.id);
                              window.location.href = "/employee/delivery-prep";
                            }}
                          >
                            #{item.id.slice(0, 8).toUpperCase()}
                          </span>

                          <button
                            onClick={() => setSelectedDetailsOrder(item)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--emp-neon-green)",
                              cursor: "pointer",
                              padding: "2px",
                            }}
                            title="View order details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 13, height: 13 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="emp-user-cell">
                          <div className="emp-user-avatar-circle">{item.initials}</div>
                          <div>
                            <span style={{ fontWeight: 700 }}>{item.customerName}</span>
                            <div style={{ fontSize: "11px", color: "var(--emp-text-muted)" }}>{item.customerPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`emp-badge ${item.paymentMethod === "COD" ? "red" : "gray"}`}>
                          {item.paymentMethod === "COD" ? `COD (Rs. ${item.valuation.toLocaleString()})` : "Bank Transfer"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`emp-badge ${
                            isFinished ? "blue" : isHandedToCourier ? "green" : "gray"
                          }`}
                        >
                          {item.dbStatus || item.status}
                        </span>
                      </td>
                      <td>
                        <span className="emp-badge green">Citypak Courier</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {/* Print Invoice Button */}
                          <button
                            className="emp-prep-btn-secondary"
                            style={{ padding: "5px 10px", fontSize: "11px" }}
                            onClick={() => handlePrintInvoice(item)}
                          >
                            Print Invoice
                          </button>

                          {/* Print Waybill Button */}
                          <button
                            className="emp-prep-btn-secondary"
                            style={{ padding: "5px 10px", fontSize: "11px" }}
                            onClick={() => printCitypakWaybill(item.id)}
                          >
                            Print Waybill
                          </button>

                          {/* Live Track Button */}
                          <button
                            className="emp-prep-btn-secondary"
                            style={{ padding: "5px 10px", fontSize: "11px" }}
                            onClick={() => handleTrackOrder(item)}
                          >
                            Live Track
                          </button>

                          {/* 3 Testing Action Buttons: Pickedup Citypak -> Return / Returned -> Complete / Completed */}
                          <button
                            className="emp-btn-claim"
                            style={{
                              padding: "5px 10px",
                              fontSize: "11px",
                              backgroundColor: "#00FF9D",
                              borderColor: "#00FF9D",
                              color: "#121212",
                              fontWeight: "800",
                              opacity: updatingId === item.id ? 0.7 : 1,
                            }}
                            disabled={updatingId === item.id}
                            onClick={() => handleMarkPickedUpCitypak(item.id)}
                            title="Mark parcel status as Handed to Courier"
                          >
                            {updatingId === item.id ? "Updating..." : "Pickedup Citypak"}
                          </button>

                          <button
                            className="emp-btn-claim"
                            style={{
                              padding: "5px 10px",
                              fontSize: "11px",
                              backgroundColor: (isPickedUp || isReturned) ? "#EF4444" : "rgba(255,255,255,0.1)",
                              borderColor: (isPickedUp || isReturned) ? "#EF4444" : "rgba(255,255,255,0.2)",
                              color: (isPickedUp || isReturned) ? "#ffffff" : "rgba(255,255,255,0.4)",
                              fontWeight: "800",
                              cursor: (isPickedUp && !isReturned && !isFinished) ? "pointer" : "not-allowed",
                              opacity: (isReturned || isFinished || !isPickedUp) ? 0.7 : 1,
                            }}
                            disabled={updatingId === item.id || !isPickedUp || isReturned || isFinished}
                            onClick={() => handleMarkReturned(item.id)}
                            title={isReturned ? "Parcel marked as returned" : isFinished ? "Parcel is already completed" : !isPickedUp ? "Click 'Pickedup Citypak' first to enable Return button" : "Mark parcel status as Returned"}
                          >
                            {updatingId === item.id ? "Updating..." : (isReturned ? "Returned" : "Return")}
                          </button>

                          <button
                            className="emp-btn-claim"
                            style={{
                              padding: "5px 10px",
                              fontSize: "11px",
                              backgroundColor: (isHandedToCourier || isFinished) && !isReturned ? "#00FF9D" : "rgba(255,255,255,0.1)",
                              borderColor: (isHandedToCourier || isFinished) && !isReturned ? "#00FF9D" : "rgba(255,255,255,0.2)",
                              color: (isHandedToCourier || isFinished) && !isReturned ? "#121212" : "rgba(255,255,255,0.4)",
                              fontWeight: "800",
                              cursor: isFinished ? "not-allowed" : ((isHandedToCourier && !isReturned) ? "pointer" : "not-allowed"),
                              opacity: isFinished ? 0.7 : 1,
                            }}
                            disabled={updatingId === item.id || (!isHandedToCourier && !isFinished) || isReturned || isFinished}
                            onClick={() => handleMarkComplete(item.id)}
                            title={isFinished ? "Parcel completed" : isReturned ? "Cannot complete a returned parcel" : !isHandedToCourier ? "Click 'Pickedup Citypak' first to enable Complete button" : "Mark parcel status as Completed"}
                          >
                            {updatingId === item.id ? "Updating..." : (isFinished ? "Completed" : "Complete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Live Tracking Modal */}
      {trackingModalOrder && (
        <div className="emp-modal-overlay" style={{ zIndex: 500 }}>
          <div className="emp-modal" style={{ maxWidth: "480px", width: "90%" }}>
            <div className="emp-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>Live Tracking: Order #{trackingModalOrder.id.slice(0, 8).toUpperCase()}</h3>
              <button className="emp-modal-close" onClick={() => setTrackingModalOrder(null)}>&times;</button>
            </div>
            <div className="emp-modal-body" style={{ fontSize: "13px" }}>
              {trackingLoading ? (
                <div style={{ textAlign: "center", padding: "30px 0" }}>
                  <div className="emp-spinner" style={{ width: 28, height: 28, margin: "0 auto 10px" }}></div>
                  <span>Fetching tracking timeline from Citypak...</span>
                </div>
              ) : trackingData ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--emp-border)" }}>
                    <div>
                      <span style={{ fontSize: "10px", color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Status</span>
                      <div style={{ fontWeight: 800, color: "var(--emp-neon-green)", fontSize: "14px" }}>{trackingData.courierStatus || "In Transit"}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Delivered</span>
                      <div style={{ fontWeight: 800, color: trackingData.isDelivered ? "var(--emp-neon-green)" : "#ffffff" }}>
                        {trackingData.isDelivered ? "YES" : "NO"}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Tracking Scan Timeline</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px", maxHeight: "200px", overflowY: "auto" }}>
                    {trackingData.history && trackingData.history.length > 0 ? (
                      trackingData.history.map((ev: any, idx: number) => (
                        <div key={idx} style={{ background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "var(--emp-neon-green)" }}>
                            <span>{ev.status}</span>
                            <span>{ev.location || "Branch"}</span>
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
                            {new Date(ev.eventAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: "12px", color: "var(--emp-text-muted)", textAlign: "center", padding: "10px 0" }}>
                        No scan events recorded yet by courier.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--emp-text-muted)" }}>
                  Unable to load tracking details.
                </div>
              )}
            </div>
            <div className="emp-modal-footer" style={{ marginTop: "16px" }}>
              <button className="emp-btn-cancel" onClick={() => setTrackingModalOrder(null)} style={{ width: "100%", padding: "10px" }}>
                Close Tracking Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Popup Modal */}
      {selectedDetailsOrder && (
        <div className="emp-modal-overlay" style={{ zIndex: 400 }}>
          <div className="emp-modal" style={{ maxWidth: "420px", width: "90%" }}>
            <div className="emp-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>Order Details: #{selectedDetailsOrder.id.slice(0, 8).toUpperCase()}</h3>
              <button className="emp-modal-close" onClick={() => setSelectedDetailsOrder(null)}>&times;</button>
            </div>
            <div className="emp-modal-body" style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Customer Name</span>
                <div style={{ fontWeight: 800, fontSize: "15px", marginTop: "2px", color: "#ffffff" }}>{selectedDetailsOrder.customerName}</div>
              </div>
              <div>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Phone</span>
                <div style={{ fontWeight: 700, color: "var(--emp-neon-green)", marginTop: "2px" }}>{selectedDetailsOrder.customerPhone}</div>
              </div>
              <div>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Shipping Address</span>
                <div style={{ lineHeight: "1.4", marginTop: "2px", color: "#ffffff" }}>{selectedDetailsOrder.customerAddress}</div>
              </div>
              <div style={{ borderTop: "1px solid var(--emp-border-light)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "#ffffff" }}>Order Valuation:</span>
                <span style={{ fontWeight: 800, color: "var(--emp-neon-green)", fontSize: "16px" }}>Rs. {selectedDetailsOrder.valuation.toLocaleString()}</span>
              </div>
            </div>
            <div className="emp-modal-footer" style={{ marginTop: "16px" }}>
              <button className="emp-btn-cancel" onClick={() => setSelectedDetailsOrder(null)} style={{ width: "100%", padding: "10px" }}>Close Details</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
