"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useEmployee, OrderItem } from "./context/EmployeeContext";

export default function EmployeeDashboard() {
  const {
    dailyTotal,
    efficiency,
    systemStatus,
    pickingQueue,
    claimTask,
    preparedCODTotal,
    preparedBankTotal,
    stockLevels,
    orders
  } = useEmployee();

  // Selected order details for popup modal
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState<OrderItem | null>(null);

  // Dynamic Logged-in Employee Profile State
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const localUserRaw = typeof window !== "undefined" ? sessionStorage.getItem("vergo_user") : null;
    const localUser = localUserRaw ? JSON.parse(localUserRaw) : null;
    const userId = localUser?.id || localUser?.profileId;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    if (userId) {
      fetch(`${apiUrl}/employees/profile/${userId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setProfileData(data);
        })
        .catch((err) => console.warn("Failed to fetch employee profile:", err))
        .finally(() => setLoadingProfile(false));
    } else {
      setLoadingProfile(false);
    }
  }, []);

  const localUserRaw = typeof window !== "undefined" ? sessionStorage.getItem("vergo_user") : null;
  const localUser = localUserRaw ? JSON.parse(localUserRaw) : null;

  const employeeName = profileData?.firstName && profileData?.lastName
    ? `${profileData.firstName} ${profileData.lastName}`
    : localUser?.name || "Employee";

  const employeeRole = profileData?.position || localUser?.position || "Fulfillment Specialist";

  const employeeId = profileData?.employeeId
    ? `EMP-${profileData.employeeId.slice(0, 8).toUpperCase()}`
    : "EMP-VERGO";

  const branchName = profileData?.branch?.name || localUser?.branchName || "Main Distribution Hub";

  const joinedDate = profileData?.hireDate
    ? new Date(profileData.hireDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Active Staff Member";

  const commissionText = profileData?.commissionPerParcel && Number(profileData.commissionPerParcel) > 0
    ? `${Number(profileData.commissionPerParcel)}% / parcel`
    : "Standard Base";

  const phone = profileData?.phone || localUser?.phone || "N/A";
  const email = profileData?.profile?.authUser?.email || localUser?.email || "N/A";

  // Filter tasks that are pending
  const pendingTasks = pickingQueue.filter(t => t.status === "pending").slice(0, 5);

  // Dynamic Leaderboard data
  const userInitials = employeeName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const leaderboard = [
    { rank: 1, name: "Elena S.", role: "Night Shift Lead", items: 1492, isMe: false, initials: "ES" },
    { rank: 2, name: `${employeeName} (You)`, role: employeeRole, items: dailyTotal, isMe: true, initials: userInitials },
    { rank: 3, name: "James K.", role: "Warehouse Assoc.", items: 1156, isMe: false, initials: "JK" },
  ].sort((a, b) => b.items - a.items);

  // Assign ranks dynamically based on sorted items
  leaderboard.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Employee Metadata for PDF Report
  const employeeInfo = {
    name: employeeName,
    role: employeeRole,
    id: employeeId,
    zone: `${branchName} / Sector A-12`,
    joinedDate: joinedDate,
    shift: "Active Shift",
    accuracy: "99.8%"
  };

  // Filter orders worked on by this employee
  const myWorkOrders = orders.filter(o => 
    o.claimedBy !== null && 
    (o.claimedBy.includes("Mark V.") || o.claimedBy.includes("You"))
  );

  // Generate Report and Trigger PDF Print
  const handleDownloadPDFReport = () => {
    const reportDate = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const rowsHtml = myWorkOrders.map(order => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; font-family: monospace;">#${order.id}</td>
        <td style="padding: 10px;">${order.customerName}</td>
        <td style="padding: 10px;">${order.timestamp}</td>
        <td style="padding: 10px; font-weight: bold;">${order.paymentMethod}</td>
        <td style="padding: 10px; color: ${order.status === "Sent" ? "#22c55e" : "#eab308"}; font-weight: 700;">${order.status}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold;">Rs. ${order.valuation.toLocaleString()}</td>
      </tr>
    `).join("");

    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      alert("Popup blocker prevented opening report window. Please allow popups and try again.");
      return;
    }

    reportWindow.document.write(`
      <html>
        <head>
          <title>Fulfillment_Report_${employeeInfo.id}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #000; }
            .report-title { text-align: right; font-size: 18px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .meta-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
            .meta-val { font-size: 15px; font-weight: bold; margin-top: 2px; }
            .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 40px; }
            .stat-box { background: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; text-align: center; }
            .stat-num { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
            .stat-lbl { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .work-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .work-table th { background: #0f172a; color: #ffffff; padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
            .footer { margin-top: 60px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <table className="header-table" style="width: 100%; margin-bottom: 30px;">
            <tr>
              <td class="logo">VERGO WEAR <span style="font-weight: 300;">FULFILLMENT</span></td>
              <td class="report-title">Employee Performance Report</td>
            </tr>
          </table>

          <div class="meta-grid">
            <div>
              <div>
                <span class="meta-label">Specialist Name</span>
                <div class="meta-val">${employeeInfo.name}</div>
              </div>
              <div style="margin-top: 12px;">
                <span class="meta-label">Employee ID</span>
                <div class="meta-val">${employeeInfo.id}</div>
              </div>
              <div style="margin-top: 12px;">
                <span class="meta-label">Primary Zone</span>
                <div class="meta-val">${employeeInfo.zone}</div>
              </div>
            </div>
            <div>
              <div>
                <span class="meta-label">Fulfillment Shift</span>
                <div class="meta-val">${employeeInfo.shift}</div>
              </div>
              <div style="margin-top: 12px;">
                <span class="meta-label">Date Generated</span>
                <div class="meta-val">${reportDate}</div>
              </div>
              <div style="margin-top: 12px;">
                <span class="meta-label">Report Validity</span>
                <div class="meta-val" style="color: #22c55e;">Verified - Active Terminals</div>
              </div>
            </div>
          </div>

          <h3 style="font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
            Shift Performance Statistics
          </h3>
          <div class="stats-row">
            <div class="stat-box">
              <div class="stat-num">${dailyTotal}</div>
              <div class="stat-lbl">Total Items Picked</div>
            </div>
            <div class="stat-box">
              <div class="stat-num">${efficiency}%</div>
              <div class="stat-lbl">Fulfillment Efficiency</div>
            </div>
            <div class="stat-box">
              <div class="stat-num" style="color: #22c55e;">Rs. ${preparedCODTotal.toLocaleString()}</div>
              <div class="stat-lbl">COD Value Processed</div>
            </div>
            <div class="stat-box">
              <div class="stat-num" style="color: #3b82f6;">Rs. ${preparedBankTotal.toLocaleString()}</div>
              <div class="stat-lbl">Bank Value Processed</div>
            </div>
          </div>

          <h3 style="font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 10px; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
            Fulfillment Activity Log
          </h3>
          <table class="work-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Claim Date/Time</th>
                <th>Payment Type</th>
                <th>Order Status</th>
                <th style="text-align: right;">Valuation</th>
              </tr>
            </thead>
            <tbody>
              ${myWorkOrders.length === 0 ? `
                <tr>
                  <td colspan="6" style="padding: 20px; text-align: center; color: #94a3b8;">
                    No work logs found for the current period.
                  </td>
                </tr>
              ` : rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Vortex Wear (Pvt) Ltd, Sri Lanka &copy; 2026. All rights reserved. System Generated Fulfillment Log.
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    reportWindow.document.close();
  };

  return (
    <div>
      {/* Page Header */}
      <div className="emp-page-header">
        <div className="emp-page-title-group">
          <h1>Employee Dashboard</h1>
          <p>{branchName} | Active Shift</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="emp-prep-btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              fontSize: "12px",
            }}
            onClick={handleDownloadPDFReport}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              style={{ width: 14, height: 14 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Download Report</span>
          </button>

          <div className="emp-system-status">
            <span>SYSTEM STATUS</span>
            <span
              className={`emp-status-dot ${systemStatus !== "Operational" ? "degraded" : ""}`}
            ></span>
            <span style={{ color: "#ffffff", fontWeight: 700 }}>
              {systemStatus}
            </span>
          </div>
        </div>
      </div>



      {/* Stats Cards - Four Column Grid */}
      <div className="emp-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {/* Stat 1: Total */}
        <div className="emp-stat-card accented">
          <div className="emp-stat-card-header">
            <span className="emp-stat-label">Total</span>
            <div className="emp-stat-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <div className="emp-stat-value">{dailyTotal.toLocaleString()}</div>
          <div style={{ fontSize: "9px", color: "var(--emp-text-muted)", textTransform: "uppercase", marginTop: "8px", fontWeight: 700 }}>
            Total Items Picked
          </div>
          <div className="emp-stat-footer" style={{ marginTop: "6px" }}>
            <span className="emp-stat-badge-green">&uarr; 12%</span>
            <span>vs yesterday</span>
          </div>
        </div>

        {/* Stat 2: Efficiency */}
        <div className="emp-stat-card">
          <div className="emp-stat-card-header">
            <span className="emp-stat-label">Efficiency</span>
            <div className="emp-stat-icon-wrapper" style={{ color: "var(--emp-info-blue)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="emp-stat-value">{efficiency}%</div>
          <div className="emp-progress-container">
            <div className="emp-progress-bar" style={{ width: `${efficiency}%` }}></div>
          </div>
          <div className="emp-stat-footer" style={{ marginTop: "10px" }}>
            <span>Prepared vs Request Ratio</span>
          </div>
        </div>

        {/* Stat 3: COD Prepared Valuation */}
        <div className="emp-stat-card">
          <div className="emp-stat-card-header">
            <span className="emp-stat-label">COD Prepared Value</span>
            <div className="emp-stat-icon-wrapper" style={{ color: "var(--emp-neon-green)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="emp-stat-value" style={{ fontSize: "20px", marginTop: "4px" }}>
            Rs. {preparedCODTotal.toLocaleString()}
          </div>
          <div style={{ fontSize: "9px", color: "var(--emp-text-muted)", textTransform: "uppercase", marginTop: "16px", fontWeight: 700 }}>
            COD Prepared Parcels
          </div>
          <div className="emp-stat-footer" style={{ marginTop: "6px" }}>
            <span>Active completed preps</span>
          </div>
        </div>

        {/* Stat 4: Bank Prepared Valuation */}
        <div className="emp-stat-card">
          <div className="emp-stat-card-header">
            <span className="emp-stat-label">Bank Prepared Value</span>
            <div className="emp-stat-icon-wrapper" style={{ color: "var(--emp-info-blue)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <div className="emp-stat-value" style={{ fontSize: "20px", marginTop: "4px" }}>
            Rs. {preparedBankTotal.toLocaleString()}
          </div>
          <div style={{ fontSize: "9px", color: "var(--emp-text-muted)", textTransform: "uppercase", marginTop: "16px", fontWeight: 700 }}>
            Card/Bank Prep Parcels
          </div>
          <div className="emp-stat-footer" style={{ marginTop: "6px" }}>
            <span>Completed bank transfer preps</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="emp-grid-2col">
        {/* Compact version of the approved orders claim queue */}
        <div className="emp-card">
          <div className="emp-card-header">
            <h2 className="emp-card-title">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18, color: "var(--emp-neon-green)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <span>Available Orders</span>
            </h2>
            {pendingTasks.length > 0 && (
              <span className="emp-badge red">{pendingTasks.length} Available</span>
            )}
          </div>

          <div className="emp-table-container">
            {pendingTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--emp-text-muted)" }}>
                No approved parcels are currently available to claim.
              </div>
            ) : (
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Details</th>
                    <th>Customer details</th>
                    <th>Parcel</th>
                    <th>Payment</th>
                    <th>Valuation</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTasks.map((task) => {
                    // Look up matching order from orders list
                    const matchingOrder = orders.find(o => o.id === task.id);
                    if (!matchingOrder) return null;

                    return (
                      <tr key={task.id}>
                        <td className="emp-order-id">
                          {/* Info Eye Icon for Mobile view list details popup */}
                          <button
                            onClick={() => setSelectedDetailsOrder(matchingOrder)}
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
                        </td>
                        <td>
                          <div className="emp-user-cell" style={{ padding: "4px 0" }}>
                            <div className="emp-user-avatar-circle">
                              {matchingOrder.initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{matchingOrder.customerName}</div>
                              <div style={{ fontSize: "11px", color: "var(--emp-text-muted)" }}>{matchingOrder.customerEmail}</div>
                              <div style={{ fontSize: "11px", color: "var(--emp-neon-green)", fontWeight: 600 }}>{matchingOrder.customerPhone}</div>
                              <div style={{ fontSize: "10px", color: "var(--emp-text-muted)", maxWidth: "180px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={matchingOrder.customerAddress}>
                                {matchingOrder.customerAddress}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>1 parcel</div>
                          <div style={{ fontSize: "10.5px", color: "var(--emp-text-muted)", marginTop: "2px" }}>
                            {matchingOrder.itemsList.reduce((sum, item) => sum + item.qty, 0)} item(s) · {matchingOrder.itemsList.length} variant(s)
                          </div>
                        </td>
                        <td>
                          <span className={`emp-badge ${matchingOrder.paymentMethod === "COD" ? "red" : "gray"}`}>
                            {matchingOrder.paymentMethod}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          Rs. {matchingOrder.valuation.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {matchingOrder.stockAvailable ? (
                            <button className="emp-btn-claim" onClick={() => claimTask(task.id)}>
                              Claim Order
                            </button>
                          ) : (
                            <button className="emp-btn-claim disabled" disabled title={matchingOrder.stockShortages.join("\n")}>
                              Insufficient Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ marginTop: "16px", textAlign: "right" }}>
            <Link href="/employee/orders" style={{ color: "var(--emp-neon-green)", fontSize: "12px", fontWeight: 700, textDecoration: "underline" }}>
              View All Orders &rarr;
            </Link>
          </div>
        </div>

        {/* Column 2: Leaderboard & Stock Alerts Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Leaderboard */}
          <div className="emp-card">
            <div className="emp-card-header">
              <h2 className="emp-card-title">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18, color: "var(--emp-neon-green)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>Volume Leaderboard</span>
              </h2>
            </div>

            <div className="emp-leaderboard-list">
              {leaderboard.map((user) => (
                <div key={user.name} className={`emp-leaderboard-item ${user.isMe ? "me" : ""}`}>
                  <div className="emp-leaderboard-left">
                    <div className={`emp-user-avatar-circle ${user.rank === 1 ? "rank-1" : ""}`}>
                      {user.rank}
                    </div>
                    <div>
                      <div className="emp-leaderboard-name">{user.name}</div>
                      <div className="emp-leaderboard-role">{user.role}</div>
                    </div>
                  </div>
                  <div className="emp-leaderboard-val">
                    <div className={`emp-leaderboard-count ${user.rank === 1 ? "top" : ""}`}>
                      {user.items.toLocaleString()}
                    </div>
                    <div className="emp-leaderboard-lbl">Items</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alerts Summary Card */}
          <div className="emp-card">
            <div className="emp-card-header">
              <h2 className="emp-card-title">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18, color: "var(--emp-danger-red)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Stock Alerts Summary</span>
              </h2>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
              {stockLevels.filter(s => s.qty < 10).length === 0 ? (
                <div style={{ color: "var(--emp-neon-green)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", padding: "10px 0" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>All stock levels are optimal.</span>
                </div>
              ) : (
                stockLevels.filter(s => s.qty < 10).map(stock => (
                  <div
                    key={stock.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "rgba(255,255,255,0.01)",
                      border: "1px solid var(--emp-border)",
                      borderRadius: "6px"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700 }}>{stock.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--emp-text-muted)" }}>SKU: {stock.sku}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 800 }}>{stock.qty} units</span>
                      {stock.qty < 5 ? (
                        <span className="emp-badge red" style={{ fontSize: "8.5px", padding: "1px 5px" }}>Low Stock</span>
                      ) : (
                        <span className="emp-badge" style={{ fontSize: "8.5px", padding: "1px 5px", backgroundColor: "rgba(255, 120, 0, 0.1)", color: "#ff7800", border: "1px solid rgba(255, 120, 0, 0.2)" }}>Low Stock</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div style={{ marginTop: "16px", textAlign: "right" }}>
              <Link href="/employee/stock" style={{ color: "var(--emp-neon-green)", fontSize: "11.5px", fontWeight: 700, textDecoration: "underline" }}>
                Manage Inventory &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Order Details Modal Dialog Popup (especially for PWA mobile view) */}
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
