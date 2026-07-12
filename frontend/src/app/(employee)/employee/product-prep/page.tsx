"use client";

import React, { useState } from "react";
import { useEmployee, ProductPrepItem } from "../context/EmployeeContext";

export default function ProductPrep() {
  const { productPrepQueue, startPrep, updatePrepStatus, searchQuery } = useEmployee();

  // Selected item log modal or visual feedback
  const [logItem, setLogItem] = useState<string | null>(null);

  // Status cycling for demo purposes
  const handleCycleStatus = (sku: string, currentStatus: ProductPrepItem["status"]) => {
    if (currentStatus === "PREPARING") {
      updatePrepStatus(sku, "READY");
      // Auto redirect to delivery prep page
      setTimeout(() => {
        window.location.href = "/employee/delivery-prep";
      }, 800);
    } else if (currentStatus === "READY") {
      updatePrepStatus(sku, "NOT STARTED");
    } else {
      updatePrepStatus(sku, "PREPARING");
    }
  };

  // Filter queue based on global search query
  const filteredQueue = productPrepQueue.filter(item => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchColor = item.color.toLowerCase().includes(q);
      const matchSize = item.size.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchColor && !matchSize) return false;
    }
    return true;
  });

  // Stats calculation
  const pendingCount = filteredQueue.filter(p => p.status === "NOT STARTED").length;
  const inProgressCount = filteredQueue.filter(p => p.status === "PREPARING").length;
  const readyTodayCount = filteredQueue.filter(p => p.status === "READY").length;

  return (
    <div>
      {/* Page Header */}
      <div className="emp-page-header">
        <div className="emp-page-title-group">
          <h1>Product Preparation</h1>
          <p>Manage daily picking and inventory staging.</p>
        </div>

        {/* Stats Summary Headers */}
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ textTransform: "uppercase", textAlign: "right" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", letterSpacing: "0.5px" }}>Pending Prep</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
              {pendingCount.toString().padStart(2, "0")}{" "}
              <span style={{ fontSize: "12px", color: "var(--emp-danger-red)", fontWeight: 700 }}>+2</span>
            </div>
          </div>
          <div style={{ width: "1px", backgroundColor: "var(--emp-border)" }}></div>
          <div style={{ textTransform: "uppercase", textAlign: "right" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", letterSpacing: "0.5px" }}>In Progress</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
              {inProgressCount.toString().padStart(2, "0")}
            </div>
          </div>
          <div style={{ width: "1px", backgroundColor: "var(--emp-border)" }}></div>
          <div style={{ textTransform: "uppercase", textAlign: "right" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", letterSpacing: "0.5px" }}>Ready Today</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--emp-neon-green)", marginTop: "2px" }}>
              {readyTodayCount.toString().padStart(2, "0")}{" "}
              <span style={{ fontSize: "12px", color: "var(--emp-neon-green)" }}>&uarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Section Subheading */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <h3 style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#ffffff" }}>
          Queue: Batch Alpha-4
        </h3>
        <div style={{ fontSize: "11px", color: "var(--emp-text-muted)" }}>
          Sort by: <span style={{ color: "var(--emp-neon-green)", cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>Priority</span>
        </div>
      </div>

      {/* Product Prep Queue List */}
      <div className="emp-prep-list">
        {filteredQueue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--emp-text-muted)" }}>
            No prep items match the search query.
          </div>
        ) : (
          filteredQueue.map((item) => (
            <div key={item.id} className="emp-prep-card">
              <div className="emp-prep-left">
                {/* Product Thumbnail Fallback */}
                <div className="emp-prep-image-fallback" style={{ backgroundColor: item.imageColor }}>
                  <svg className="emp-prep-image-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>

                {/* Product details */}
                <div className="emp-prep-details">
                  <span className="emp-prep-name">{item.name}</span>
                  <span className="emp-prep-sku">SKU: {item.sku}</span>
                  <div className="emp-prep-tags">
                    <span className="emp-prep-tag">SIZE {item.size}</span>
                    <span className="emp-prep-tag">{item.color.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Mid Column: Quantity & Orders */}
              <div className="emp-prep-mid">
                <div>
                  <div className="emp-prep-meta-lbl">Quantity & Orders</div>
                  <div className="emp-prep-meta-val">{item.quantity.toString().padStart(2, "0")} Units</div>
                  <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
                    {item.orders}
                  </div>
                </div>

                {/* Assigned User and Status */}
                <div>
                  <div className="emp-prep-meta-lbl">Assigned To</div>
                  <div className="emp-prep-user-badge">
                    <div className="emp-user-avatar-circle" style={{ width: "20px", height: "20px", fontSize: "8px" }}>
                      {item.assignedInitials}
                    </div>
                    <span style={{ fontSize: "12.5px", fontWeight: 600 }}>{item.assignedTo}</span>
                  </div>

                  <div className="emp-prep-status-indicator" style={{ marginTop: "6px" }}>
                    <span className={`emp-prep-status-dot ${item.status.toLowerCase().replace(" ", "")}`}></span>
                    <span
                      style={{
                        color:
                          item.status === "READY"
                            ? "var(--emp-neon-green)"
                            : item.status === "PREPARING"
                            ? "var(--emp-warning-yellow)"
                            : "var(--emp-text-muted)"
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="emp-prep-action">
                {item.status === "NOT STARTED" ? (
                  <button className="emp-prep-btn-start" onClick={() => startPrep(item.sku)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 14, height: 14 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    <span>Start Prep</span>
                  </button>
                ) : item.status === "PREPARING" ? (
                  <button className="emp-prep-btn-secondary" onClick={() => handleCycleStatus(item.sku, item.status)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Update Status</span>
                  </button>
                ) : (
                  <button className="emp-prep-btn-secondary" disabled style={{ opacity: 0.6, cursor: "not-allowed" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Completed</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
