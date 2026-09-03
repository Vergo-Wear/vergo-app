"use client";

import React, { useState } from "react";
import { useEmployee } from "../context/EmployeeContext";

export default function ReadyOrders() {
  const {
    orders,
    requestCitypakPickup,
    refreshCitypakTracking,
    syncCitypakStatus,
    lastSyncTime,
    printCitypakWaybill,
    selectActiveDeliveryPrep,
    searchQuery,
  } = useEmployee();

  const [isSyncing, setIsSyncing] = useState(false);

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

  // Active tab filter
  const [activeTab, setActiveTab] = useState<"ready" | "sent" | "all">("ready");

  // Selected order details modal
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState<any | null>(null);

  // Live tracking timeline modal
  const [trackingModalOrder, setTrackingModalOrder] = useState<any | null>(null);
  const [trackingData, setTrackingData] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Pickup Request modal state
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [pickupAddressLine1, setPickupAddressLine1] = useState("No 45, Galle Road");
  const [pickupAddressLine2, setPickupAddressLine2] = useState("Sector A-12");
  const [pickupAddressLine3, setPickupAddressLine3] = useState("");
  const [pickupCity, setPickupCity] = useState("Colombo");
  const [pickupContactPerson, setPickupContactPerson] = useState("Vergo Logistics Manager");
  const [pickupContactPhone, setPickupContactPhone] = useState("0771234567");
  
  // Helper to format local datetime string YYYY-MM-DDTHH:mm for tomorrow
  const getTomorrowLocalISO = (hours: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hours, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hh}:${mm}`;
  };

  const [pickupFromStr, setPickupFromStr] = useState(getTomorrowLocalISO(9));
  const [pickupToStr, setPickupToStr] = useState(getTomorrowLocalISO(12));

  const [pickupSubmitting, setPickupSubmitting] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [pickupResult, setPickupResult] = useState<any | null>(null);

  // Filter orders based on active tab and search query
  const readyOrdersList = orders.filter((item) => {
    if (activeTab === "ready") {
      if (item.status !== "Ready for Pickup") return false;
    } else if (activeTab === "sent") {
      if (item.status !== "Sent") return false;
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

  const pendingPickupCount = orders.filter((o) => o.status === "Ready for Pickup").length;
  const inTransitCount = orders.filter((o) => o.status === "Sent").length;

  const handleOpenPickupModal = () => {
    const readyIds = readyOrdersList.map((o) => o.id);
    setSelectedOrderIds(readyIds);
    setPickupError(null);
    setPickupResult(null);
    setShowPickupModal(true);
  };

  const handleToggleSelectOrder = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter((oId) => oId !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const handleSubmitPickupRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderIds.length === 0) {
      setPickupError("Please select at least one order for courier pickup.");
      return;
    }

    setPickupSubmitting(true);
    setPickupError(null);

    try {
      const res = await requestCitypakPickup({
        orderIds: selectedOrderIds,
        pickupAddressLine1,
        pickupAddressLine2,
        pickupAddressLine3,
        pickupAddressLine4City: pickupCity,
        pickupContactPerson,
        pickupContactNumber1: pickupContactPhone,
        pickupFromDatetime: new Date(pickupFromStr).toISOString(),
        pickupToDatetime: new Date(pickupToStr).toISOString(),
      });

      setPickupResult(res);
    } catch (err: any) {
      setPickupError(err.message || "Failed to request Citypak pickup.");
    } finally {
      setPickupSubmitting(false);
    }
  };

  const handleTrackOrder = async (order: any) => {
    setTrackingModalOrder(order);
    setTrackingData(null);
    setTrackingLoading(true);

    try {
      // Refresh tracking from backend
      const res = await refreshCitypakTracking(order.id);
      setTrackingData(res);
    } catch (err: any) {
      // Error handles in notification
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
          <p>Coordinate Citypak pickup requests and monitor real-time tracking.</p>
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
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--emp-text-muted)", letterSpacing: "0.5px" }}>In Transit</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--emp-neon-green)", marginTop: "2px" }}>
              {inTransitCount.toString().padStart(2, "0")}
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
            Ready for Pickup ({pendingPickupCount})
          </button>
          <button
            className={`emp-tab-btn ${activeTab === "sent" ? "active" : ""}`}
            onClick={() => setActiveTab("sent")}
          >
            In Transit ({inTransitCount})
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

          <button
            className="emp-btn-claim"
            onClick={handleOpenPickupModal}
            disabled={pendingPickupCount === 0}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Request Citypak Pickup</span>
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
                  <th>Order Status</th>
                  <th>Fulfillment</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {readyOrdersList.map((item) => (
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
                          #{item.id}
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
                      <span className={`emp-badge ${item.status === "Sent" ? "green" : item.status === "Ready for Pickup" ? "gray" : "blue"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <span className="emp-badge green">Citypak Courier</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button
                          className="emp-prep-btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "11px" }}
                          onClick={() => printCitypakWaybill(item.id)}
                        >
                          Print Waybill
                        </button>

                        <button
                          className="emp-btn-claim"
                          style={{ padding: "6px 12px", fontSize: "11px" }}
                          onClick={() => handleTrackOrder(item)}
                        >
                          Live Track
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Citypak Pickup Request Modal */}
      {showPickupModal && (
        <div className="emp-modal-overlay" style={{ zIndex: 500 }}>
          <div className="emp-modal" style={{ maxWidth: "520px", width: "95%" }}>
            <div className="emp-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>Request Citypak Parcel Pickup</h3>
              <button className="emp-modal-close" onClick={() => setShowPickupModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleSubmitPickupRequest}>
              <div className="emp-modal-body" style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "70vh", overflowY: "auto" }}>
                {pickupError && (
                  <div style={{ backgroundColor: "rgba(230, 57, 70, 0.2)", border: "1px solid #e63946", color: "#ff8080", padding: "10px", borderRadius: "6px", fontSize: "12px" }}>
                    {pickupError}
                  </div>
                )}

                {pickupResult ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <svg className="emp-waybill-preview-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 48, height: 48, color: "var(--emp-neon-green)", margin: "0 auto 12px" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 style={{ fontSize: "16px", fontWeight: 800, color: "var(--emp-neon-green)" }}>Pickup Requested Successfully!</h4>
                    <p style={{ fontSize: "13px", color: "#ffffff", marginTop: "8px" }}>
                      Citypak Pickup ID: <strong>{pickupResult.externalPickupId}</strong>
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--emp-text-muted)", marginTop: "4px" }}>
                      Estimated Waybills: {pickupResult.estimatedWaybillCount} | Weight: {pickupResult.estimatedWeightGrams}g
                    </p>
                    <button type="button" className="emp-btn-claim" onClick={() => setShowPickupModal(false)} style={{ marginTop: "16px", width: "100%" }}>
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Select Orders for Collection ({selectedOrderIds.length} selected)</span>
                      <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--emp-border)", borderRadius: "6px", padding: "8px", marginTop: "6px", maxHeight: "120px", overflowY: "auto" }}>
                        {orders.filter(o => o.status === "Ready for Pickup").map((o) => (
                          <label key={o.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={selectedOrderIds.includes(o.id)}
                              onChange={() => handleToggleSelectOrder(o.id)}
                            />
                            <span>Order #{o.id} — {o.customerName} ({o.paymentMethod})</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Pickup Address Line 1</label>
                        <input
                          type="text"
                          className="emp-api-input"
                          value={pickupAddressLine1}
                          onChange={(e) => setPickupAddressLine1(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Pickup City</label>
                        <input
                          type="text"
                          className="emp-api-input"
                          value={pickupCity}
                          onChange={(e) => setPickupCity(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Contact Person</label>
                        <input
                          type="text"
                          className="emp-api-input"
                          value={pickupContactPerson}
                          onChange={(e) => setPickupContactPerson(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Contact Phone</label>
                        <input
                          type="text"
                          className="emp-api-input"
                          value={pickupContactPhone}
                          onChange={(e) => setPickupContactPhone(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Window From</label>
                        <input
                          type="datetime-local"
                          className="emp-api-input"
                          value={pickupFromStr}
                          onChange={(e) => setPickupFromStr(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--emp-text-muted)", textTransform: "uppercase" }}>Window To</label>
                        <input
                          type="datetime-local"
                          className="emp-api-input"
                          value={pickupToStr}
                          onChange={(e) => setPickupToStr(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="emp-btn-claim"
                      disabled={pickupSubmitting}
                      style={{ marginTop: "12px", width: "100%", padding: "12px" }}
                    >
                      {pickupSubmitting ? "Submitting Pickup Request..." : "Confirm & Send Pickup Request to Citypak"}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Tracking Modal */}
      {trackingModalOrder && (
        <div className="emp-modal-overlay" style={{ zIndex: 500 }}>
          <div className="emp-modal" style={{ maxWidth: "480px", width: "90%" }}>
            <div className="emp-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>Live Tracking: Order #{trackingModalOrder.id}</h3>
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
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>Order Details: #{selectedDetailsOrder.id}</h3>
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
