"use client";

import React from "react";
import { useEmployee } from "../context/EmployeeContext";

export default function NotificationsCenter() {
  const {
    notifications,
    clearNotifications,
    notifyCustomer,
    readyPickups,
    searchQuery,
  } = useEmployee();

  // Helper actions
  const handleResolve = (title: string) => {
    if (title.toLowerCase().includes("re-notification")) {
      notifyCustomer("SW-9922");
      alert("Customer re-notified via SMS!");
    } else {
      alert("Notification acknowledged.");
    }
  };

  const is9922Failed = readyPickups.some(r => r.id === "SW-9922" && r.notificationStatus === "FAILED");

  // Filter notifications list based on search query
  const filteredNotifications = notifications.filter(notif => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = notif.title.toLowerCase().includes(q);
      const matchMessage = notif.message.toLowerCase().includes(q);
      if (!matchTitle && !matchMessage) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="emp-page-header">
        <div className="emp-page-title-group">
          <h1>Notifications Center</h1>
          <p>Real-time updates regarding node tasks, logistics status, and stock alerts.</p>
        </div>

        {filteredNotifications.length > 0 && (
          <button className="emp-prep-btn-secondary" onClick={clearNotifications}>
            Clear All
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="emp-card">
        {filteredNotifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--emp-text-muted)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ width: 48, height: 48, color: "var(--emp-text-muted)", marginBottom: "16px" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>No active notifications</div>
            <p style={{ fontSize: "12px", color: "var(--emp-text-muted)", marginTop: "4px" }}>
              Your channel is clear. New events will appear here as they occur.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--emp-border)",
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", gap: "16px", flex: 1 }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor:
                        notif.type === "error"
                          ? "var(--emp-danger-red)"
                          : notif.type === "warning"
                          ? "#ff7800"
                          : notif.type === "success"
                          ? "var(--emp-neon-green)"
                          : "var(--emp-info-blue)",
                      marginTop: "6px"
                    }}
                  ></div>
                  
                  <div>
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff" }}>
                      {notif.title}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--emp-text-muted)", marginLeft: "12px" }}>
                      {notif.timestamp}
                    </span>
                    <p style={{ fontSize: "12.5px", color: "var(--emp-text-muted)", marginTop: "6px", lineHeight: "1.4", maxWidth: "80%" }}>
                      {notif.message}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  {notif.title.toLowerCase().includes("re-notification") && is9922Failed && (
                    <button
                      className="emp-btn-claim"
                      style={{ padding: "6px 12px", fontSize: "11px" }}
                      onClick={() => handleResolve(notif.title)}
                    >
                      Resend SMS
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
