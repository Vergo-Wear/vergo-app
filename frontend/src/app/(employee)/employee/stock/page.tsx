"use client";

import React, { useState } from "react";
import { useEmployee, StockItem, EmployeeAllocatedStock } from "../context/EmployeeContext";

export default function StockManagement() {
  const {
    stockLevels,
    myStock,
    loadingMyStock,
    fetchMyStock,
    stockRequests,
    requestStockFromAdmin,
    searchQuery,
    setSearchQuery,
  } = useEmployee();

  // Active view tab: 'my-stock' | 'warehouse'
  const [activeTab, setActiveTab] = useState<"my-stock" | "warehouse">("my-stock");
  const [localSearch, setLocalSearch] = useState("");

  // Stock request modal state
  const [selectedStock, setSelectedStock] = useState<{
    name: string;
    sku: string;
    size: string;
    color: string;
    qty: number;
  } | null>(null);
  const [requestQty, setRequestQty] = useState("20");
  const [requestNotes, setRequestNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [stockNote, setStockNote] = useState("");

  const handleOpenRequest = (stock: { name: string; sku: string; size: string; color: string; qty: number }) => {
    setSelectedStock(stock);
    setRequestQty("20");
    setRequestNotes("");
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;

    const qty = parseInt(requestQty) || 20;
    setIsSubmitting(true);
    try {
      await requestStockFromAdmin(selectedStock.sku, qty, {
        productName: selectedStock.name,
        size: selectedStock.size,
        color: selectedStock.color,
        notes: requestNotes.trim() || undefined,
      });
      setSelectedStock(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCustomRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockNote.trim()) return;

    const generatedSku = `REQ-${Date.now().toString().slice(-6)}`;
    const summaryName =
      stockNote.trim().length > 40
        ? stockNote.trim().substring(0, 40) + "..."
        : stockNote.trim();

    setIsSubmitting(true);
    try {
      await requestStockFromAdmin(generatedSku, 1, {
        productName: summaryName,
        notes: stockNote.trim(),
      });
      setIsCustomModalOpen(false);
      setStockNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combine context global search with local tab search
  const effectiveQuery = (localSearch || searchQuery).trim().toLowerCase();

  // Filter My Allocated Stock
  const filteredMyStock = (myStock || []).filter((item) => {
    if (!effectiveQuery) return true;
    const matchName = item.productName.toLowerCase().includes(effectiveQuery);
    const matchSku = item.sku.toLowerCase().includes(effectiveQuery);
    const matchSize = item.size.toLowerCase().includes(effectiveQuery);
    const matchColor = item.color.toLowerCase().includes(effectiveQuery);
    const matchCategory = item.category.toLowerCase().includes(effectiveQuery);
    return matchName || matchSku || matchSize || matchColor || matchCategory;
  });

  // Filter Warehouse Stock
  const filteredStockLevels = (stockLevels || []).filter((stock) => {
    if (!effectiveQuery) return true;
    const matchName = stock.name.toLowerCase().includes(effectiveQuery);
    const matchSku = stock.sku.toLowerCase().includes(effectiveQuery);
    const matchSize = stock.size.toLowerCase().includes(effectiveQuery);
    const matchColor = stock.color.toLowerCase().includes(effectiveQuery);
    return matchName || matchSku || matchSize || matchColor;
  });

  // Summary Metrics
  const totalMyAllocatedUnits = (myStock || []).reduce((sum, item) => sum + item.qty, 0);
  const totalWarehouseUnits = (stockLevels || []).reduce((sum, item) => sum + item.qty, 0);
  const pendingRequestsCount = (stockRequests || []).filter((r) => r.status === "PENDING").length;

  return (
    <div>
      {/* Page Header */}
      <div className="emp-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div className="emp-page-title-group">
          <h1>My Stock & Inventory</h1>
          <p>Real-time view of your assigned available stock & warehouse replenishment levels.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className="emp-prep-btn-secondary"
            style={{
              padding: "9px 14px",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
            onClick={() => fetchMyStock && fetchMyStock()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            className="emp-prep-btn-primary"
            style={{
              backgroundColor: "#00FF9D",
              color: "#121212",
              fontWeight: "800",
              padding: "10px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              boxShadow: "0 0 12px rgba(0, 255, 157, 0.25)",
            }}
            onClick={() => setIsCustomModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Request Restock from Admin
          </button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "rgba(0, 255, 157, 0.04)",
            border: "1px solid rgba(0, 255, 157, 0.2)",
            borderRadius: "10px",
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--emp-neon-green)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            My Available Units
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", marginTop: "4px" }}>
            {totalMyAllocatedUnits} <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--emp-text-muted)" }}>units</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
            Assigned to your fulfillment desk
          </div>
        </div>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--emp-border)",
            borderRadius: "10px",
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Assigned SKUs
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", marginTop: "4px" }}>
            {(myStock || []).length} <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--emp-text-muted)" }}>variants</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
            Distinct garment types in stock
          </div>
        </div>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--emp-border)",
            borderRadius: "10px",
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Warehouse Catalog Units
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", marginTop: "4px" }}>
            {totalWarehouseUnits} <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--emp-text-muted)" }}>units</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
            Total warehouse stock available
          </div>
        </div>

        <div
          style={{
            background: pendingRequestsCount > 0 ? "rgba(255, 120, 0, 0.05)" : "rgba(255, 255, 255, 0.02)",
            border: pendingRequestsCount > 0 ? "1px solid rgba(255, 120, 0, 0.25)" : "1px solid var(--emp-border)",
            borderRadius: "10px",
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: "11.5px", fontWeight: 700, color: pendingRequestsCount > 0 ? "#ff7800" : "var(--emp-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Pending Restock Requests
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", marginTop: "4px" }}>
            {pendingRequestsCount} <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--emp-text-muted)" }}>requests</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
            Awaiting Admin allocation
          </div>
        </div>
      </div>

      {/* Filter Bar & Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "8px", background: "rgba(255, 255, 255, 0.03)", padding: "4px", borderRadius: "8px", border: "1px solid var(--emp-border)" }}>
          <button
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "12.5px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: activeTab === "my-stock" ? "#00FF9D" : "transparent",
              color: activeTab === "my-stock" ? "#121212" : "var(--emp-text-muted)",
              transition: "all 0.2s ease",
            }}
            onClick={() => setActiveTab("my-stock")}
          >
            My Assigned Stock ({(myStock || []).length})
          </button>
          <button
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "12.5px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: activeTab === "warehouse" ? "#00FF9D" : "transparent",
              color: activeTab === "warehouse" ? "#121212" : "var(--emp-text-muted)",
              transition: "all 0.2s ease",
            }}
            onClick={() => setActiveTab("warehouse")}
          >
            Warehouse Catalog ({(stockLevels || []).length})
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <input
            type="text"
            placeholder="Filter by product, SKU, color..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--emp-border)",
              color: "#ffffff",
              fontSize: "12.5px",
              outline: "none",
            }}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--emp-text-muted)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      <div className="emp-grid-2col">
        {/* Left Main Column: Stock Table */}
        <div className="emp-card">
          <div className="emp-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="emp-card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18, color: "var(--emp-neon-green)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>{activeTab === "my-stock" ? "My Personal Stock Inventory" : "General Warehouse Stock Levels"}</span>
            </h2>
          </div>

          <div className="emp-table-container">
            {activeTab === "my-stock" ? (
              loadingMyStock ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--emp-text-muted)", fontSize: "13px" }}>
                  Loading your assigned stock inventory...
                </div>
              ) : filteredMyStock.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <p style={{ color: "var(--emp-text-muted)", fontSize: "13px", marginBottom: "16px" }}>
                    {(myStock || []).length === 0
                      ? "No stock items currently assigned specifically to your employee account. You can request stock distribution from Admin or view general warehouse catalog."
                      : "No stock items match your search filter."}
                  </p>
                  <button
                    className="emp-prep-btn-primary"
                    style={{
                      backgroundColor: "#00FF9D",
                      color: "#121212",
                      fontWeight: "800",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12.5px",
                    }}
                    onClick={() => setIsCustomModalOpen(true)}
                  >
                    + Request Stock from Admin
                  </button>
                </div>
              ) : (
                <table className="emp-table">
                  <thead>
                    <tr>
                      <th>Garment & Variant</th>
                      <th>SKU</th>
                      <th>Branch</th>
                      <th>My Quantity</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMyStock.map((item) => {
                      const isLow = item.qty <= item.reorderLevel;
                      const isOut = item.qty === 0;

                      return (
                        <tr key={item.inventoryId}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }}
                                />
                              ) : null}
                              <div>
                                <span style={{ fontWeight: 700 }}>{item.productName}</span>
                                <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
                                  Size: <strong style={{ color: "#fff" }}>{item.size}</strong> | Color: <strong style={{ color: "#fff" }}>{item.color}</strong>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--emp-text-muted)" }}>
                            {item.sku}
                          </td>
                          <td style={{ fontSize: "12px", color: "var(--emp-text-muted)" }}>
                            {item.branchName}
                          </td>
                          <td style={{ fontWeight: 800, fontSize: "15px" }}>
                            {item.qty} units
                          </td>
                          <td>
                            {isOut ? (
                              <span className="emp-badge red">Out of Stock</span>
                            ) : isLow ? (
                              <span className="emp-badge" style={{ backgroundColor: "rgba(255, 120, 0, 0.1)", color: "#ff7800", border: "1px solid rgba(255, 120, 0, 0.2)" }}>
                                Low Stock
                              </span>
                            ) : (
                              <span className="emp-badge green">Available</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="emp-prep-btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "11.5px", borderColor: isLow ? "#ff7800" : "var(--emp-border)" }}
                              onClick={() => handleOpenRequest({ name: item.productName, sku: item.sku, size: item.size, color: item.color, qty: item.qty })}
                            >
                              Request Restock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : filteredStockLevels.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ color: "var(--emp-text-muted)", fontSize: "13px", marginBottom: "16px" }}>
                  No warehouse stock items currently listed.
                </p>
                <button
                  className="emp-prep-btn-primary"
                  style={{
                    backgroundColor: "#00FF9D",
                    color: "#121212",
                    fontWeight: "800",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12.5px",
                  }}
                  onClick={() => setIsCustomModalOpen(true)}
                >
                  + Request Stock from Admin
                </button>
              </div>
            ) : (
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Product Details</th>
                    <th>SKU</th>
                    <th>Warehouse Stock</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockLevels.map((stock) => {
                    return (
                      <tr key={stock.id}>
                        <td>
                          <div>
                            <span style={{ fontWeight: 700 }}>{stock.name}</span>
                            <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
                              Size: {stock.size} | Color: {stock.color}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--emp-text-muted)" }}>
                          {stock.sku}
                        </td>
                        <td style={{ fontWeight: 800, fontSize: "15px" }}>
                          {stock.qty} units
                        </td>
                        <td>
                          {stock.qty < 5 ? (
                            <span className="emp-badge red">Low Stock</span>
                          ) : stock.qty < 10 ? (
                            <span className="emp-badge" style={{ backgroundColor: "rgba(255, 120, 0, 0.1)", color: "#ff7800", border: "1px solid rgba(255, 120, 0, 0.2)" }}>
                              Low Stock
                            </span>
                          ) : (
                            <span className="emp-badge green">In Stock</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="emp-prep-btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "11.5px", borderColor: stock.qty < 10 ? "#ff7800" : "var(--emp-border)" }}
                            onClick={() => handleOpenRequest(stock)}
                          >
                            Request Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Replenishment Requests */}
        <div className="emp-card">
          <div className="emp-card-header">
            <h2 className="emp-card-title">Replenishment Requests Log</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {(stockRequests || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--emp-text-muted)", fontSize: "12.5px" }}>
                No active stock requests log.
              </div>
            ) : (
              (stockRequests || []).map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255, 255, 255, 0.01)",
                    border: "1px solid var(--emp-border)",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 700 }}>{req.productName}</span>
                    <div style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
                      Qty: {req.qtyRequested} units | SKU: {req.sku}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      className={`emp-badge ${
                        req.status === "APPROVED" ? "green" : "orange"
                      }`}
                      style={{
                        fontSize: "9.5px",
                        fontWeight: "700",
                        display: "inline-block",
                        padding: "3px 8px",
                        boxShadow: req.status === "APPROVED" ? "0 0 6px var(--emp-neon-green-glow)" : "none",
                      }}
                    >
                      {req.status === "APPROVED" ? "Approved" : "Pending"}
                    </span>
                    <div style={{ fontSize: "10px", color: "var(--emp-text-muted)", marginTop: "4px" }}>
                      {req.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stock request modal popup (Row item) */}
      {selectedStock && (
        <div className="emp-modal-overlay">
          <div className="emp-modal">
            <div className="emp-modal-header">
              <h3 className="emp-modal-title">Request Stock: {selectedStock.name}</h3>
              <button className="emp-modal-close" onClick={() => setSelectedStock(null)}>&times;</button>
            </div>
            <form onSubmit={handleSubmitRequest}>
              <div className="emp-modal-body">
                <div style={{ fontSize: "13px", color: "var(--emp-text-muted)", marginBottom: "12px" }}>
                  SKU: <span style={{ color: "#ffffff", fontWeight: 600 }}>{selectedStock.sku}</span> | Size: <span style={{ color: "#ffffff" }}>{selectedStock.size}</span> | Current Stock: <span style={{ color: "var(--emp-neon-green)", fontWeight: 700 }}>{selectedStock.qty} units</span>
                </div>

                <div className="emp-form-control" style={{ marginBottom: "12px" }}>
                  <label htmlFor="reqqty">Quantity to Request</label>
                  <input
                    type="number"
                    id="reqqty"
                    className="emp-form-input"
                    value={requestQty}
                    onChange={(e) => setRequestQty(e.target.value)}
                    min="1"
                    required
                    autoFocus
                  />
                </div>

                <div className="emp-form-control" style={{ marginBottom: "12px" }}>
                  <label htmlFor="reqnotes">Reason / Notes for Admin (Optional)</label>
                  <input
                    type="text"
                    id="reqnotes"
                    className="emp-form-input"
                    placeholder="e.g. High order volume, urgent restock needed"
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                  />
                </div>

                <p style={{ fontSize: "11.5px", color: "var(--emp-text-muted)", lineHeight: "1.4", marginTop: "4px" }}>
                  * This request will trigger an official notification to the Admin Portal.
                </p>
              </div>
              <div className="emp-modal-footer">
                <button type="button" className="emp-btn-cancel" onClick={() => setSelectedStock(null)}>Cancel</button>
                <button type="submit" className="emp-btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Primary Custom Stock Request Modal */}
      {isCustomModalOpen && (
        <div className="emp-modal-overlay">
          <div className="emp-modal" style={{ maxWidth: "480px" }}>
            <div className="emp-modal-header">
              <h3 className="emp-modal-title">Request Stock from Admin</h3>
              <button className="emp-modal-close" onClick={() => setIsCustomModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmitCustomRequest}>
              <div className="emp-modal-body">
                <p style={{ fontSize: "12.5px", color: "var(--emp-text-muted)", marginBottom: "14px", lineHeight: "1.5" }}>
                  Enter your request note or stock details below. Admin will receive an instant notification to review and allocate stock.
                </p>

                <div className="emp-form-control" style={{ marginBottom: "12px" }}>
                  <label htmlFor="stockNote" style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Stock Request Note / Details *
                  </label>
                  <textarea
                    id="stockNote"
                    className="emp-form-input"
                    rows={4}
                    placeholder="e.g. Need additional stock for Heavy Oversized Black T-Shirts (Sizes M and L) for pending customer orders."
                    value={stockNote}
                    onChange={(e) => setStockNote(e.target.value)}
                    required
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--emp-border)",
                      color: "#ffffff",
                      fontSize: "13px",
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <p style={{ fontSize: "11.5px", color: "var(--emp-text-muted)", lineHeight: "1.4" }}>
                  * Submitting this request creates an instant notification in the Admin Portal for stock allocation.
                </p>
              </div>
              <div className="emp-modal-footer">
                <button type="button" className="emp-btn-cancel" onClick={() => setIsCustomModalOpen(false)}>Cancel</button>
                <button type="submit" className="emp-btn-submit" disabled={isSubmitting || !stockNote.trim()}>
                  {isSubmitting ? "Sending Request..." : "Send Request to Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
