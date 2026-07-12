"use client";

import React, { useState } from "react";
import { useEmployee } from "../context/EmployeeContext";

export default function ReadyOrders() {
  const {
    readyPickups,
    finalizeDelivery,
    notifyCustomer,
    selectActiveDeliveryPrep,
    searchQuery,
    orders
  } = useEmployee();

  // Selected order details for popup modal (mobile compatibility view)
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState<any | null>(null);

  // Filter ready Pickups list dynamically based on global search query
  const filteredReadyPickups = readyPickups.filter(item => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = item.id.toLowerCase().includes(q);
      const matchCustomer = item.customerName.toLowerCase().includes(q);
      const matchBatch = item.batch.toLowerCase().includes(q);
      if (!matchId && !matchCustomer && !matchBatch) return false;
    }
    return true;
  });

  // Stats calculation
  const pendingPickupCount = filteredReadyPickups.length;
  const notificationRate = 98; // static mock percentage

  // Check if SW-9922 is still in failed state
  const order9922 = filteredReadyPickups.find(r => r.id === "SW-9922");
  const is9922Failed = order9922 ? order9922.notificationStatus === "FAILED" : false;

  return (
    <div>
      {/* Page Header */}
      <div className="emp-page-header">
        <div className="emp-page-title-group">
          <h1>Ready for Pickup</h1>
          <p>Monitor prepared orders and coordinate courier logistics.</p>
        </div>

        {/* Stats Summary Headers */}
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ textTransform: "uppercase", textAlign: "right" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", letterSpacing: "0.5px" }}>Pending Pickup</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
              {pendingPickupCount.toString().padStart(2, "0")}{" "}
              <span style={{ fontSize: "12px", color: "var(--emp-neon-green)", fontWeight: 700 }}>+3 today</span>
            </div>
          </div>
          <div style={{ width: "1px", backgroundColor: "var(--emp-border)" }}></div>
          <div style={{ textTransform: "uppercase", textAlign: "right" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", letterSpacing: "0.5px" }}>Notification Rate</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--emp-neon-green)", marginTop: "2px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
              <span>{notificationRate}%</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Table section */}
      <div className="emp-card">
        <div className="emp-card-header" style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h2 className="emp-card-title">Queue Management</h2>
            <span className="emp-badge gray">Express</span>
            <span className="emp-badge red" style={{ backgroundColor: "rgba(230, 57, 70, 0.1)", color: "#e63946", border: "1px solid rgba(230, 57, 70, 0.2)" }}>Citypak Active</span>
          </div>

          <div className="emp-card-header-actions">
            <button className="emp-filter-btn-advanced" style={{ marginRight: "12px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filter</span>
            </button>
            <button className="emp-filter-btn-advanced">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="emp-table-container">
          {filteredReadyPickups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--emp-text-muted)" }}>
              No orders ready for pickup. Queue is empty!
            </div>
          ) : (
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Ready Time</th>
                  <th>Notification Status</th>
                  <th>Delivery Prep</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReadyPickups.map((item) => {
                  const matchingOrder = orders.find(o => o.id === item.id) || {
                    id: item.id,
                    initials: item.initials,
                    customerName: item.customerName,
                    customerEmail: `${item.customerName.toLowerCase().replace(/\s+/g, ".")}@example.lk`,
                    customerPhone: "+94 77 123 4567",
                    customerAddress: "Colombo, Sri Lanka",
                    paymentMethod: "COD" as const,
                    valuation: 84500.00,
                    itemsList: [{ description: "V-1 Sentinel Tech Puffer / Onyx Black", qty: 1, unitPrice: 59500.00, sku: "ST-VG-99" }]
                  };

                  return (
                    <tr key={item.id}>
                      <td className="emp-order-id">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div
                            onClick={() => {
                              selectActiveDeliveryPrep(item.id);
                              window.location.href = "/employee/delivery-prep";
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <span className="emp-order-id" style={{ textDecoration: "underline" }}>#{item.id}</span>
                            <div className="emp-order-subtext">{item.batch}</div>
                          </div>
                          
                          <button
                            onClick={() => setSelectedDetailsOrder(matchingOrder)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--emp-neon-green)",
                              cursor: "pointer",
                              padding: "2px",
                            }}
                            title="View details popup"
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
                          <div className="emp-user-avatar-circle">
                            {item.initials}
                          </div>
                          <span style={{ fontWeight: 700 }}>{item.customerName}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.readyTime}</div>
                        <div className="emp-order-subtext">{item.relativeTime}</div>
                      </td>
                      <td>
                        <span
                          className={`emp-badge ${
                            item.notificationStatus === "SENT"
                              ? "green"
                              : item.notificationStatus === "FAILED"
                              ? "red"
                              : "gray"
                          }`}
                        >
                          {item.notificationStatus}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`emp-badge ${
                            item.deliveryPrep === "READY" ? "green" : "gray"
                          }`}
                        >
                          {item.deliveryPrep === "READY" ? "PREPARED" : "INCOMPLETE"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          {item.notificationStatus === "FAILED" && (
                            <button
                              className="emp-prep-btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "11px" }}
                              onClick={() => notifyCustomer(item.id)}
                            >
                              Retry SMS
                            </button>
                          )}
                          
                          <button
                            className="emp-btn-claim"
                            onClick={() => {
                              selectActiveDeliveryPrep(item.id);
                              window.location.href = "/employee/delivery-prep";
                            }}
                          >
                            Handoff
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

      {/* Details Popup Modal Dialog (mobile view compatibility) */}
      {selectedDetailsOrder && (
        <div className="emp-modal-overlay" style={{ zIndex: 400 }}>
          <div className="emp-modal" style={{ maxWidth: "420px", width: "90%" }}>
            <div className="emp-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>Order Details: #{selectedDetailsOrder.id}</h3>
              <button className="emp-modal-close" onClick={() => setSelectedDetailsOrder(null)}>&times;</button>
            </div>
            <div className="emp-modal-body" style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer Name</span>
                <div style={{ fontWeight: 800, fontSize: "15px", marginTop: "2px", color: "#ffffff" }}>{selectedDetailsOrder.customerName}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Phone</span>
                  <div style={{ fontWeight: 700, color: "var(--emp-neon-green)", marginTop: "2px" }}>{selectedDetailsOrder.customerPhone}</div>
                </div>
                <div>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Payment</span>
                  <div style={{ marginTop: "2px" }}>
                    <span className={`emp-badge ${selectedDetailsOrder.paymentMethod === "COD" ? "red" : "gray"}`}>
                      {selectedDetailsOrder.paymentMethod}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</span>
                <div style={{ wordBreak: "break-all", marginTop: "2px", color: "#ffffff" }}>{selectedDetailsOrder.customerEmail}</div>
              </div>
              <div>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Shipping Address</span>
                <div style={{ lineHeight: "1.4", marginTop: "2px", color: "#ffffff" }}>{selectedDetailsOrder.customerAddress}</div>
              </div>
              <div>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Products list</span>
                <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--emp-border)", borderRadius: "6px", padding: "8px 12px", marginTop: "4px", maxHeight: "110px", overflowY: "auto" }}>
                  {selectedDetailsOrder.itemsList && selectedDetailsOrder.itemsList.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: idx < selectedDetailsOrder.itemsList.length - 1 ? "1px solid var(--emp-border-light)" : "none", fontSize: "12px" }}>
                      <span style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#ffffff" }} title={item.description}>{item.description}</span>
                      <span style={{ fontWeight: 700, color: "var(--emp-neon-green)" }}>x{item.qty}</span>
                    </div>
                  ))}
                </div>
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
