"use client";

import React, { useState } from "react";
import { useEmployee, StockItem } from "../context/EmployeeContext";

export default function StockManagement() {
  const { stockLevels, stockRequests, requestStockFromAdmin, searchQuery } = useEmployee();

  // Stock request modal inputs
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [requestQty, setRequestQty] = useState("20");

  const handleOpenRequest = (stock: StockItem) => {
    setSelectedStock(stock);
    setRequestQty("20"); // default replenishment qty
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;

    const qty = parseInt(requestQty) || 20;
    requestStockFromAdmin(selectedStock.sku, qty);
    setSelectedStock(null);
  };

  const filteredStockLevels = stockLevels.filter(stock => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = stock.name.toLowerCase().includes(q);
      const matchSku = stock.sku.toLowerCase().includes(q);
      const matchSize = stock.size.toLowerCase().includes(q);
      const matchColor = stock.color.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchSize && !matchColor) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="emp-page-header">
        <div className="emp-page-title-group">
          <h1>Stock Inventory</h1>
          <p>Real-time tracking of garment quantities in Warehouse Zone A-12.</p>
        </div>
      </div>

      <div className="emp-grid-2col">
        {/* Left Column: Stock Levels */}
        <div className="emp-card">
          <div className="emp-card-header">
            <h2 className="emp-card-title">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18, color: "var(--emp-neon-green)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Warehouse Stock Levels</span>
            </h2>
          </div>

          <div className="emp-table-container">
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStockLevels.map((stock) => {
                  const isOutOfStock = stock.qty === 0;
                  const isLowStock = stock.qty <= stock.lowStockLimit;
                  
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
          </div>
        </div>

        {/* Right Column: Replenishment Requests */}
        <div className="emp-card">
          <div className="emp-card-header">
            <h2 className="emp-card-title">Replenishment Requests</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {stockRequests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--emp-text-muted)", fontSize: "12.5px" }}>
                No active stock requests log.
              </div>
            ) : (
              stockRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255, 255, 255, 0.01)",
                    border: "1px solid var(--emp-border)",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
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
                        req.status === "APPROVED" ? "green" : "gray"
                      }`}
                      style={{
                        fontSize: "9px",
                        display: "inline-block",
                        boxShadow: req.status === "APPROVED" ? "0 0 6px var(--emp-neon-green-glow)" : "none"
                      }}
                    >
                      {req.status}
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

      {/* Stock request modal popup */}
      {selectedStock && (
        <div className="emp-modal-overlay">
          <div className="emp-modal">
            <div className="emp-modal-header">
              <h3 className="emp-modal-title">Request Stock: {selectedStock.name}</h3>
              <button className="emp-modal-close" onClick={() => setSelectedStock(null)}>&times;</button>
            </div>
            <form onSubmit={handleSubmitRequest}>
              <div className="emp-modal-body">
                <div style={{ fontSize: "13px", color: "var(--emp-text-muted)", marginBottom: "8px" }}>
                  SKU: <span style={{ color: "#ffffff", fontWeight: 600 }}>{selectedStock.sku}</span> | Current Stock: <span style={{ color: "var(--emp-neon-green)", fontWeight: 700 }}>{selectedStock.qty} units</span>
                </div>

                <div className="emp-form-control">
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
                
                <p style={{ fontSize: "11.5px", color: "var(--emp-text-muted)", lineHeight: "1.4", marginTop: "4px" }}>
                  This request requires the stock-request database workflow to be enabled.
                </p>
              </div>
              <div className="emp-modal-footer">
                <button type="button" className="emp-btn-cancel" onClick={() => setSelectedStock(null)}>Cancel</button>
                <button type="submit" className="emp-btn-submit">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
