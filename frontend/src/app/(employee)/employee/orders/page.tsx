"use client";

import React, { useState } from "react";
import { useEmployee, OrderItem } from "../context/EmployeeContext";

export default function OrdersManagement() {
  const { orders, claimOrder, searchQuery } = useEmployee();

  // Tab state: "active" | "archive"
  const [activeTab, setActiveTab] = useState<"active" | "archive">("active");

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Selected order details for popup modal (mobile compatibility view)
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState<OrderItem | null>(null);

  const handleClaimOrder = async (orderId: string) => {
    const claimed = await claimOrder(orderId);
    if (claimed) window.location.href = "/employee/product-prep";
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // If archive tab is selected, show completed/sent/returned orders. If active tab, show active orders
    if (activeTab === "active") {
      if (["Completed", "Finished", "Returned"].includes(order.status)) return false;
    } else {
      // Archive contains completed, finished, returned orders
      if (!["Completed", "Finished", "Returned", "Sent", "Handed to Courier", "Handed to Citypak Courier"].includes(order.status)) return false;
    }

    if (statusFilter !== "all") {
      const sf = statusFilter.toLowerCase();
      const st = (order.status || "").toLowerCase();
      const dbSt = (order.dbStatus || "").toLowerCase();

      if (sf.includes("ready to pick")) {
        if (!st.includes("ready to pick") && !st.includes("process") && !dbSt.includes("process")) return false;
      } else if (sf.includes("approved")) {
        if (!st.includes("approved") && !dbSt.includes("approved")) return false;
      } else if (sf.includes("claimed")) {
        if (!st.includes("claimed") && !dbSt.includes("claimed")) return false;
      } else if (sf.includes("preparing")) {
        if (!st.includes("preparing") && !dbSt.includes("preparing")) return false;
      } else if (sf.includes("ready for") || sf.includes("pickup")) {
        if (!st.includes("pickup") && !st.includes("ready") && !dbSt.includes("pickup")) return false;
      } else if (sf.includes("handed") || sf.includes("courier")) {
        if (!st.includes("handed") && !st.includes("sent") && !dbSt.includes("handed")) return false;
      } else if (sf.includes("returned")) {
        if (!st.includes("returned") && !dbSt.includes("returned")) return false;
      } else if (sf.includes("completed") || sf.includes("finished")) {
        if (!st.includes("completed") && !st.includes("finished") && !dbSt.includes("completed")) return false;
      } else {
        if (order.status !== statusFilter && order.dbStatus !== statusFilter) return false;
      }
    }

    if (paymentFilter !== "all" && order.paymentMethod !== paymentFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchName = order.customerName.toLowerCase().includes(q);
      const matchEmail = order.customerEmail.toLowerCase().includes(q);
      const matchPhone = order.customerPhone.toLowerCase().includes(q);
      const matchAddress = order.customerAddress.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchEmail && !matchPhone && matchAddress === false) return false;
    }

    return true;
  });

  const hasActivePrepOrder = orders.some((o) =>
    ["Claimed", "Preparing"].includes(o.status)
  );

  return (
    <div>
      {/* Page Header */}
      <div className="emp-page-header">
        <div className="emp-page-title-group">
          <h1>Orders Management</h1>
          <p>Review and claim orders pending fulfillment or pick-up.</p>
        </div>
        
        <div className="emp-tab-container">
          <button
            className={`emp-tab-btn ${activeTab === "active" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("active");
              setCurrentPage(1);
            }}
          >
            Active
          </button>
          <button
            className={`emp-tab-btn ${activeTab === "archive" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("archive");
              setCurrentPage(1);
            }}
          >
            Archive
          </button>
        </div>
      </div>

      {hasActivePrepOrder && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 120, 0, 0.3)",
            background: "rgba(255, 120, 0, 0.08)",
            color: "#ff7800",
            fontSize: "12px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ width: 18, height: 18, flexShrink: 0 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            Notice: You have an active order in Product Preparation. Complete and move your current order to Delivery Prep before claiming a new order.
          </span>
        </div>
      )}

      {/* Table Section */}
      <div className="emp-card">
        {/* Table Filters header */}
        <div className="emp-filters-row">
          <div className="emp-filters-left">
            <div className="emp-filter-group">
              <span>Status:</span>
              <select
                className="emp-filter-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="Ready to Pick">Ready to Pick</option>
                <option value="Admin Approved">Admin Approved</option>
                <option value="Claimed">Claimed</option>
                <option value="Package Preparing">Package Preparing</option>
                <option value="Ready for Courier Pickup">Ready for Courier Pickup</option>
                <option value="Handed to Courier">Handed to Courier</option>
                <option value="Returned">Returned</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="emp-filter-group">
              <span>Payment:</span>
              <select
                className="emp-filter-select"
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Methods</option>
                <option value="COD">COD (Cash on Delivery)</option>
                <option value="BANK">Bank Transfer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="emp-table-container">
          {filteredOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--emp-text-muted)" }}>
              No orders found matching the filter criteria.
            </div>
          ) : (
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Details</th>
                  <th>Customer Entity</th>
                  <th>Timestamp</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Valuation</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="emp-order-id">
                      <button
                        onClick={() => setSelectedDetailsOrder(order)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--emp-neon-green)",
                          cursor: "pointer",
                          padding: "2px",
                          verticalAlign: "middle"
                        }}
                        title="View details popup"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 13, height: 13 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <div style={{ fontSize: "10px", color: "var(--emp-text-muted)", marginTop: "4px" }}>
                        1 parcel · {order.itemsList.reduce((sum, item) => sum + item.qty, 0)} item(s)
                      </div>
                    </td>
                    <td>
                      <div className="emp-user-cell" style={{ padding: "4px 0" }}>
                        <div className="emp-user-avatar-circle">
                          {order.initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{order.customerName}</div>
                          <div style={{ fontSize: "11.5px", color: "var(--emp-text-muted)" }}>{order.customerEmail}</div>
                          <div style={{ fontSize: "11.5px", color: "var(--emp-neon-green)", fontWeight: 600, marginTop: "2px" }}>{order.customerPhone}</div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--emp-text-muted)",
                              marginTop: "2px",
                              maxWidth: "240px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                            title={order.customerAddress}
                          >
                            {order.customerAddress}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{order.timestamp}</td>
                    <td>
                      <span className={`emp-badge ${order.paymentMethod === "COD" ? "red" : "gray"}`}>
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          className="emp-prep-status-dot"
                          style={{
                            backgroundColor:
                              order.status === "Ready to Pick"
                                ? "var(--emp-neon-green)"
                                : order.status === "Claimed"
                                ? "var(--emp-text-muted)"
                                : order.status === "Preparing"
                                ? "var(--emp-warning-yellow)"
                                : "var(--emp-info-blue)",
                            boxShadow:
                              order.status === "Ready to Pick"
                                ? "0 0 6px var(--emp-neon-green)"
                                : order.status === "Preparing"
                                ? "0 0 6px var(--emp-warning-yellow)"
                                : "none"
                          }}
                        ></span>
                        <span style={{ fontSize: "13px" }}>{order.dbStatus}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Rs. {order.valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: "right" }}>
                      {order.status === "Ready to Pick" && order.stockAvailable && !hasActivePrepOrder ? (
                        <button
                          className="emp-btn-claim"
                          onClick={() => void handleClaimOrder(order.id)}
                        >
                          Claim Order
                        </button>
                      ) : order.status === "Ready to Pick" && hasActivePrepOrder ? (
                        <button
                          className="emp-btn-claim disabled"
                          disabled
                          title="Finish current Product Preparation order first"
                          style={{ backgroundColor: "rgba(255, 120, 0, 0.15)", color: "#ff7800", borderColor: "rgba(255, 120, 0, 0.3)" }}
                        >
                          Finish Active Prep First
                        </button>
                      ) : order.status === "Ready to Pick" ? (
                        <button className="emp-btn-claim disabled" disabled title={order.stockShortages.join("\n")}>
                          Insufficient Stock
                        </button>
                      ) : (
                        <button className="emp-btn-claim disabled" disabled>
                          {order.status === "Claimed" ? "Claimed" : "Locked"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="emp-pagination">
          <span>Showing 1-{Math.min(10, filteredOrders.length)} of {filteredOrders.length} results</span>
          <div className="emp-pagination-controls">
            <button className="emp-page-btn" disabled>&lt;</button>
            <button className="emp-page-btn active">1</button>
            <button className="emp-page-btn">2</button>
          </div>
        </div>
      </div>

      {/* Details Popup Modal Dialog (mobile view compatibility) */}
      {selectedDetailsOrder && (
        <div className="emp-modal-overlay" style={{ zIndex: 400 }}>
          <div className="emp-modal" style={{ maxWidth: "420px", width: "90%" }}>
            <div className="emp-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>Parcel Details</h3>
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
                <div style={{ fontSize: "11px", color: "var(--emp-neon-green)", marginTop: "3px" }}>All items below belong to one parcel.</div>
                <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--emp-border)", borderRadius: "6px", padding: "8px 12px", marginTop: "4px", maxHeight: "110px", overflowY: "auto" }}>
                  {selectedDetailsOrder.itemsList && selectedDetailsOrder.itemsList.map((item, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "12px", padding: "8px 0", borderBottom: idx < selectedDetailsOrder.itemsList.length - 1 ? "1px solid var(--emp-border-light)" : "none", fontSize: "12px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#ffffff", fontWeight: 700 }} title={item.description}>{item.description}</div>
                        <div style={{ color: "var(--emp-text-muted)", marginTop: "3px" }}>Size: <strong style={{ color: "#ffffff" }}>{item.size}</strong> · Color: <strong style={{ color: "#ffffff" }}>{item.color}</strong></div>
                      </div>
                      <span style={{ fontWeight: 800, color: "var(--emp-neon-green)", alignSelf: "center" }}>x{item.qty}</span>
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
