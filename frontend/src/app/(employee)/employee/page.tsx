"use client";

import React, { useState } from "react";

export default function EmployeePage() {
  const [tasks, setTasks] = useState([
    { id: "T1", title: "Verify stock transfer LA-01 -> NY-04", meta: "SKU: VRG-HD-BLK-M | Qty: 50", status: "pending" },
    { id: "T2", title: "Count inbound drop-01 inventory", meta: "Drop 01 hoodies & pants | Qty: 200", status: "pending" },
    { id: "T3", title: "Update node stock level NODE_LA_01", meta: "Regular weekly audit", status: "completed" },
  ]);

  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const handleSimulateScan = () => {
    setScanMessage("Scanning RFID tag...");
    setTimeout(() => {
      setScanMessage("Tag detected: VRG-HD-BLK-M (Heavyweight Hoodie Black M). Stock verified +1.");
      // Complete the inbound task as mockup
      setTasks(prev => prev.map(t => t.id === "T2" ? { ...t, status: "completed" } : t));
    }, 1500);
  };

  return (
    <div>
      <div className="employee-title-section">
        <div>
          <h1>Employee Control Center</h1>
          <p style={{ color: "#8e8e93", fontSize: "0.9rem", marginTop: "4px" }}>
            Real-time node operations & inventory scans.
          </p>
        </div>
      </div>

      <div className="employee-grid">
        {/* Left Column: Tasks */}
        <div className="employee-card">
          <div className="employee-card-title">
            <span>Pending Operations</span>
            <span style={{ fontSize: "0.75rem", color: "#8e8e93" }}>
              {tasks.filter(t => t.status === "pending").length} ACTIVE
            </span>
          </div>

          <div className="task-list">
            {tasks.map(task => (
              <div key={task.id} className="task-item">
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">{task.meta}</div>
                </div>
                <span className={`task-status-badge ${task.status}`}>
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Scan & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="employee-card">
            <div className="employee-card-title">
              <span>RFID Scanner Simulator</span>
            </div>

            <div className="scanner-panel" onClick={handleSimulateScan}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="scanner-icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 12v1.5m0 0v1.5m0-1.5h1.5m-1.5 0h-1.5M13.5 17.25h6m-6-1.5h6m-6-1.5h6"
                />
              </svg>
              <div className="scanner-text">Tap to Simulate Scan</div>
              <div className="scanner-subtext">Uses mock RFID integration</div>
            </div>

            {scanMessage && (
              <div
                style={{
                  marginTop: "16px",
                  fontSize: "0.8rem",
                  color: scanMessage.includes("Scanning") ? "#ffb300" : "#00FF9D",
                  padding: "10px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: "6px",
                  textAlign: "center",
                }}
              >
                {scanMessage}
              </div>
            )}
          </div>

          <div className="employee-card">
            <div className="employee-card-title">
              <span>Quick Stats</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#8e8e93" }}>Station Node:</span>
                <span style={{ fontWeight: 600 }}>STATION_A (LA)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#8e8e93" }}>Scans Today:</span>
                <span style={{ fontWeight: 600, color: "#00FF9D" }}>24 tags</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#8e8e93" }}>Active Shift:</span>
                <span style={{ fontWeight: 600 }}>Marcus V.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
