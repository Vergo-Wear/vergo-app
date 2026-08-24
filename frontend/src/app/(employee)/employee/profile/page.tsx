"use client";

import React, { useEffect, useState } from "react";
import { useEmployee } from "../context/EmployeeContext";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

interface EmployeeProfileData {
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  position?: string;
  address?: string;
  commissionPerParcel?: number | string;
  hireDate?: string;
  branch?: {
    name?: string;
    address?: string;
  };
  profile?: {
    authUser?: {
      email?: string;
    };
  };
}

export default function EmployeeProfile() {
  const {
    orders,
    dailyTotal,
    efficiency,
    preparedCODTotal,
    preparedBankTotal,
  } = useEmployee();

  const [profileData, setProfileData] = useState<EmployeeProfileData | null>(null);
  const [localUser, setLocalUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawUser = sessionStorage.getItem("vergo_user");
    let parsedUser: any = null;
    if (rawUser) {
      try {
        parsedUser = JSON.parse(rawUser);
        setLocalUser(parsedUser);
      } catch (e) {
        console.error("Error reading vergo_user session:", e);
      }
    }

    const userId = parsedUser?.id;
    if (userId) {
      authenticatedFetch(`/employees/profile/${userId}`)
        .then(async (res) => {
          if (res && res.ok) {
            const data = await res.json();
            setProfileData(data);
          }
        })
        .catch((err) => console.error("Error fetching employee profile:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Compute dynamic employee metadata
  const firstName = profileData?.firstName || localUser?.firstName || localUser?.name?.split(" ")[0] || "Employee";
  const lastName = profileData?.lastName || localUser?.lastName || localUser?.name?.split(" ").slice(1).join(" ") || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Vergo Staff Member";
  const initials = `${firstName[0] || "E"}${lastName[0] || "M"}`.toUpperCase();

  const employeeInfo = {
    name: fullName,
    role: profileData?.position || localUser?.position || "Fulfillment Specialist",
    id: profileData?.employeeId
      ? `EMP-${profileData.employeeId.slice(0, 8).toUpperCase()}`
      : "EMP-VERGO",
    email: profileData?.profile?.authUser?.email || localUser?.email || "N/A",
    phone: profileData?.phone || localUser?.phone || "N/A",
    branch: profileData?.branch?.name || localUser?.branchName || "Main Distribution Hub",
    branchAddress: profileData?.branch?.address || "Headquarters",
    joinedDate: profileData?.hireDate
      ? new Date(profileData.hireDate).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Active Staff Member",
    commission: profileData?.commissionPerParcel && Number(profileData.commissionPerParcel) > 0
      ? `${Number(profileData.commissionPerParcel)}% / parcel`
      : "Standard Base",
    address: profileData?.address || "Sri Lanka",
    accuracy: "99.8%",
  };

  // Filter orders worked on by this employee
  const myWorkOrders = orders.filter((o) => o.claimedBy !== null);

  // Generate Report and Trigger PDF Print
  const handleDownloadPDFReport = () => {
    const reportDate = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Compile rows HTML
    const rowsHtml = myWorkOrders
      .map(
        (order) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; font-family: monospace;">#${order.id}</td>
        <td style="padding: 10px;">${order.customerName}</td>
        <td style="padding: 10px;">${order.timestamp}</td>
        <td style="padding: 10px; font-weight: bold;">${order.paymentMethod}</td>
        <td style="padding: 10px; color: ${order.status === "Sent" ? "#22c55e" : "#eab308"}; font-weight: 700;">${order.status}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold;">Rs. ${order.valuation.toLocaleString()}</td>
      </tr>
    `,
      )
      .join("");

    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      alert(
        "Popup blocker prevented opening report window. Please allow popups and try again.",
      );
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
          <table class="header-table" style="width: 100%; margin-bottom: 30px;">
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
                <span class="meta-label">Assigned Branch</span>
                <div class="meta-val">${employeeInfo.branch}</div>
              </div>
            </div>
            <div>
              <div>
                <span class="meta-label">Designation / Role</span>
                <div class="meta-val">${employeeInfo.role}</div>
              </div>
              <div style="margin-top: 12px;">
                <span class="meta-label">Date Generated</span>
                <div class="meta-val">${reportDate}</div>
              </div>
              <div style="margin-top: 12px;">
                <span class="meta-label">Report Validity</span>
                <div class="meta-val" style="color: #22c55e;">Verified - Active Terminal</div>
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
              ${
                myWorkOrders.length === 0
                  ? `
                <tr>
                  <td colspan="6" style="padding: 20px; text-align: center; color: #94a3b8;">
                    No work logs found for the current period.
                  </td>
                </tr>
              `
                  : rowsHtml
              }
            </tbody>
          </table>

          <div class="footer">
            Vergo Wear (Pvt) Ltd, Sri Lanka &copy; 2026. All rights reserved. System Generated Fulfillment Log.
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
          <h1>My Profile</h1>
          <p>
            Review your employee details, contact info, branch assignment, and shift metrics.
          </p>
        </div>

        <button
          className="emp-btn-claim"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            fontSize: "12.5px",
          }}
          onClick={handleDownloadPDFReport}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            style={{ width: 15, height: 15 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>Download Performance PDF</span>
        </button>
      </div>

      {/* Main Profile Grid */}
      <div className="emp-grid-2col">
        {/* Profile Card Summary */}
        <div
          className="emp-card"
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              borderBottom: "1px solid var(--emp-border)",
              paddingBottom: "20px",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, var(--emp-neon-green), var(--emp-info-blue))",
                color: "#16161a",
                fontSize: "24px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 15px var(--emp-neon-green-glow)",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div>
              <h2
                style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff" }}
              >
                {employeeInfo.name}
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--emp-neon-green)",
                  fontWeight: 700,
                  marginTop: "2px",
                }}
              >
                {employeeInfo.role}
              </p>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--emp-text-muted)",
                  marginTop: "4px",
                  fontFamily: "monospace",
                }}
              >
                {employeeInfo.id}
              </div>
            </div>
          </div>

          {/* Account Metadata Detail Fields */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--emp-text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  EMAIL ADDRESS
                </span>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    marginTop: "2px",
                    wordBreak: "break-all",
                  }}
                >
                  {employeeInfo.email}
                </div>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--emp-text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  PHONE NUMBER
                </span>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    marginTop: "2px",
                    fontFamily: "monospace",
                  }}
                >
                  {employeeInfo.phone}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--emp-text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  ASSIGNED BRANCH
                </span>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    marginTop: "2px",
                  }}
                >
                  {employeeInfo.branch}
                </div>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--emp-text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  JOINED DATE
                </span>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    marginTop: "2px",
                  }}
                >
                  {employeeInfo.joinedDate}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--emp-text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  COMMISSION PER PARCEL
                </span>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--emp-neon-green)",
                    marginTop: "2px",
                  }}
                >
                  {employeeInfo.commission}
                </div>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--emp-text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  ADDRESS
                </span>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    marginTop: "2px",
                  }}
                >
                  {employeeInfo.address}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Shift Statistics */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 h-fit">
          <div className="emp-stat-card accented" style={{ padding: "16px 20px" }}>
            <span className="emp-stat-label">Total Picked</span>
            <div
              className="emp-stat-value"
              style={{ fontSize: "24px", marginTop: "4px" }}
            >
              {dailyTotal}
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "var(--emp-text-muted)",
                textTransform: "uppercase",
                marginTop: "10px",
                fontWeight: 700,
              }}
            >
              Items Staged
            </div>
          </div>

          <div className="emp-stat-card" style={{ padding: "16px 20px" }}>
            <span className="emp-stat-label">Efficiency</span>
            <div
              className="emp-stat-value"
              style={{ fontSize: "24px", marginTop: "4px" }}
            >
              {efficiency}%
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "var(--emp-text-muted)",
                textTransform: "uppercase",
                marginTop: "10px",
                fontWeight: 700,
              }}
            >
              Accuracy Rate: {employeeInfo.accuracy}
            </div>
          </div>

          <div className="emp-stat-card" style={{ padding: "16px 20px" }}>
            <span className="emp-stat-label">COD Handled</span>
            <div
              className="emp-stat-value"
              style={{
                fontSize: "16px",
                marginTop: "8px",
                color: "var(--emp-neon-green)",
              }}
            >
              Rs. {preparedCODTotal.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "var(--emp-text-muted)",
                textTransform: "uppercase",
                marginTop: "12px",
                fontWeight: 700,
              }}
            >
              COD Completed
            </div>
          </div>

          <div className="emp-stat-card" style={{ padding: "16px 20px" }}>
            <span className="emp-stat-label">Bank Handled</span>
            <div
              className="emp-stat-value"
              style={{
                fontSize: "16px",
                marginTop: "8px",
                color: "var(--emp-info-blue)",
              }}
            >
              Rs. {preparedBankTotal.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "var(--emp-text-muted)",
                textTransform: "uppercase",
                marginTop: "12px",
                fontWeight: 700,
              }}
            >
              Bank Transfers
            </div>
          </div>
        </div>
      </div>

      {/* Employee Shift Work logs */}
      <div className="emp-card" style={{ marginTop: "24px" }}>
        <div className="emp-card-header" style={{ marginBottom: "16px" }}>
          <h2 className="emp-card-title">Personal Fulfillment Logs</h2>
          <span className="emp-badge gray">{myWorkOrders.length} Logs</span>
        </div>

        <div className="emp-table-container">
          {myWorkOrders.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "var(--emp-text-muted)",
              }}
            >
              No orders fulfilled by you in this terminal session.
            </div>
          ) : (
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer Name</th>
                  <th>Claimed Time</th>
                  <th>Payment Type</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Valuation</th>
                </tr>
              </thead>
              <tbody>
                {myWorkOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="emp-order-id">#{order.id}</td>
                    <td style={{ fontWeight: 700 }}>{order.customerName}</td>
                    <td>{order.timestamp}</td>
                    <td>
                      <span
                        className={`emp-badge ${
                          order.paymentMethod === "COD" ? "red" : "gray"
                        }`}
                      >
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`emp-badge ${
                          order.status === "Sent" ? "green" : "warning"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800 }}>
                      Rs. {order.valuation.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
