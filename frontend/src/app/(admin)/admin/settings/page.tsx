"use client";

import React, { useState } from "react";
import { useAdmin } from "../AdminContext";

interface NodeRegistry {
  code: string;
  region: string;
  status: "Active" | "Maintenance" | "Offline";
}

export default function SettingsPage() {
  const { addNotification } = useAdmin();
  
  // Settings forms
  const [criticalThreshold, setCriticalThreshold] = useState(10);
  const [warningThreshold, setWarningThreshold] = useState(25);
  const [nodes, setNodes] = useState<NodeRegistry[]>([
    { code: "NODE_LA_01", region: "North America - Los Angeles", status: "Active" },
    { code: "NODE_NY_04", region: "North America - New York", status: "Active" },
    { code: "NODE_TK_01", region: "Asia - Tokyo", status: "Active" },
    { code: "NODE_LDN_02", region: "Europe - London", status: "Active" },
    { code: "NODE_PAR_01", region: "Europe - Paris", status: "Active" },
    { code: "NODE_NY_02", region: "North America - New Jersey", status: "Maintenance" },
  ]);

  const [username, setUsername] = useState("Marcus V.");
  const [role, setRole] = useState("Operations Lead");

  const saveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    addNotification(`System thresholds saved. Critical: <${criticalThreshold} units, Warning: <${warningThreshold} units.`, "success");
  };

  const toggleNodeStatus = (code: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.code === code) {
          const nextStatusMap: Record<NodeRegistry["status"], NodeRegistry["status"]> = {
            Active: "Maintenance",
            Maintenance: "Offline",
            Offline: "Active",
          };
          const nextStatus = nextStatusMap[n.status];
          addNotification(`${code} is now set to ${nextStatus.toLowerCase()}.`, nextStatus === "Active" ? "success" : "info");
          return { ...n, status: nextStatus };
        }
        return n;
      })
    );
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    addNotification("Operations profile updated successfully.", "success");
  };

  return (
    <div className="space-y-8 select-none text-xs">
      <div>
        <h2 className="text-sm font-bold tracking-widest text-white uppercase">SYSTEM SETTINGS</h2>
        <p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">Configure alert thresholds, toggle node availability, and edit admin metadata</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: System Parameters */}
        <div className="space-y-6">
          {/* Threshold config */}
          <div className="admin-card p-6">
            <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">THRESHOLD CONSTANTS</h3>
            </div>

            <form onSubmit={saveThresholds} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    CRITICAL stock LEVEL
                  </label>
                  <input
                    type="number"
                    value={criticalThreshold}
                    onChange={(e) => setCriticalThreshold(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white font-mono-meta"
                  />
                  <p className="text-[9px] text-[#555] mt-1">Triggers red flash alert on stock counts below this value.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    WARNING STOCK LEVEL
                  </label>
                  <input
                    type="number"
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white font-mono-meta"
                  />
                  <p className="text-[9px] text-[#555] mt-1">Triggers amber highlight on stock counts below this value.</p>
                </div>
              </div>

              <button
                type="submit"
                className="bg-white text-black hover:bg-[#eaeaea] font-bold tracking-widest px-4 py-2.5 rounded transition-all uppercase cursor-pointer"
              >
                SAVE PARAMETERS
              </button>
            </form>
          </div>

          {/* User profile details */}
          <div className="admin-card p-6">
            <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">ADMINISTRATOR METADATA</h3>
            </div>

            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    USER HANDLE
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    TITLE / ROLE
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-white text-black hover:bg-[#eaeaea] font-bold tracking-widest px-4 py-2.5 rounded transition-all uppercase cursor-pointer"
              >
                UPDATE PROFILE
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Node Registry */}
        <div className="space-y-6">
          <div className="admin-card p-6">
            <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">DECENTRALIZED NODE REGISTRY</h3>
            </div>

            <div className="space-y-4">
              {nodes.map((node) => (
                <div
                  key={node.code}
                  className="flex items-center justify-between p-3 bg-[#121212] border border-[rgba(255,255,255,0.03)] rounded hover:border-[rgba(255,255,255,0.08)] transition-all"
                >
                  <div>
                    <span className="font-bold text-white font-mono-meta text-xs">{node.code}</span>
                    <div className="text-[9px] text-[#8e8e93] font-medium uppercase mt-0.5">{node.region}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide border uppercase ${
                        node.status === "Active"
                          ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/20"
                          : node.status === "Maintenance"
                          ? "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/20"
                          : "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/20"
                      }`}
                    >
                      {node.status}
                    </span>

                    <button
                      onClick={() => toggleNodeStatus(node.code)}
                      className="bg-white/5 hover:bg-white/10 text-white font-bold px-2.5 py-1.5 rounded transition-all border border-white/5 cursor-pointer uppercase"
                    >
                      Toggle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
