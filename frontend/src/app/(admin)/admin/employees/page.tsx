"use client";

import React, { useState } from "react";
import { useAdmin } from "../AdminContext";

interface EmployeeLog {
  id: string;
  time: string;
  name: string;
  action: string;
  node: string;
}

export default function EmployeesPage() {
  const { employees, toggleEmployeeShift, addNotification } = useAdmin();
  const [logs, setLogs] = useState<EmployeeLog[]>([
    { id: "l1", time: "23:09:42", name: "Alex Rivera", action: "Assigned Waybill KB-90485923", node: "NODE_LA_01" },
    { id: "l2", time: "22:54:11", name: "Jordan Smith", action: "Verified Stock count (+50 SKU: VGO-PANT-O-M)", node: "NODE_NY_04" },
    { id: "l3", time: "22:15:02", name: "Marcus V.", action: "Authorized Stock Transfer (LA-01 -> NY-04)", node: "NODE_LA_01" },
    { id: "l4", time: "21:40:59", name: "Alex Rivera", action: "Dispatched 12 packages to Koombiyo", node: "NODE_LA_01" },
  ]);

  const [newLogAction, setNewLogAction] = useState("");
  const [selectedEmp, setSelectedEmp] = useState("Alex Rivera");
  const [selectedNode, setSelectedNode] = useState("NODE_LA_01");

  const activeShiftsCount = employees.filter((e) => e.status === "ON SHIFT").length;

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogAction) return;

    const now = new Date();
    const timeStr = `${String(now.getUTCHours()).padStart(2, "0")}:${String(
      now.getUTCMinutes()
    ).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}`;

    const newEntry: EmployeeLog = {
      id: Math.random().toString(),
      time: timeStr,
      name: selectedEmp,
      action: newLogAction,
      node: selectedNode,
    };

    setLogs((prev) => [newEntry, ...prev]);
    setNewLogAction("");
    addNotification(`Logged action for ${selectedEmp}.`, "success");
  };

  return (
    <div className="space-y-8 select-none text-xs">
      <div>
        <h2 className="text-sm font-bold tracking-widest text-white uppercase">EMPLOYEE MONITOR</h2>
        <p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">Monitor employee performance, toggle shifts, and audit live operations logs</p>
      </div>

      {/* Grid of workforce metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">ACTIVE DUTY FORCE</h4>
          <div className="text-2xl font-bold text-white mt-2 font-mono-meta">
            {activeShiftsCount} <span className="text-xs text-[#8e8e93] font-medium font-sans">on visible roster</span>
          </div>
        </div>
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">TOTAL ROSTER SIZE</h4>
          <div className="text-2xl font-bold text-white mt-2 font-mono-meta">82 Staff</div>
        </div>
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">PROCESSING EFFICIENCY</h4>
          <div className="text-2xl font-bold text-white mt-2 font-mono-meta">96.4%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee shifts list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="admin-card p-6">
            <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">STAFF STATUS ROSTER</h3>
            </div>

            <div className="space-y-4">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-4 bg-[#121212] border border-[rgba(255,255,255,0.03)] rounded hover:border-[rgba(255,255,255,0.08)] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-sm shadow-md">
                      {emp.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{emp.name}</h4>
                      <p className="text-[10px] text-[#8e8e93] font-bold tracking-wider mt-1 uppercase">ASSIGNED: NODE_LA_01</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[9px] text-[#8e8e93] font-bold tracking-wider uppercase mb-0.5">PARCELS DISPATCHED</div>
                      <div className="font-mono-meta font-bold text-white text-sm">{emp.parcels} units</div>
                    </div>

                    <button
                      onClick={() => toggleEmployeeShift(emp.id)}
                      className={`font-bold text-xs px-4 py-2 rounded transition-all cursor-pointer ${
                        emp.status === "ON SHIFT"
                          ? "bg-[#10b981] text-black hover:bg-[#059669]"
                          : "bg-white/5 text-[#8e8e93] hover:bg-white/10"
                      }`}
                    >
                      {emp.status === "ON SHIFT" ? "ON DUTY" : "OFF DUTY"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operational activity log */}
        <div className="lg:col-span-1 space-y-6">
          <div className="admin-card p-6">
            <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">OPERATIONS LOG AUDIT</h3>
            </div>

            {/* Quick entry logger */}
            <form onSubmit={handleAddLog} className="space-y-3 mb-6">
              <div>
                <select
                  value={selectedEmp}
                  onChange={(e) => setSelectedEmp(e.target.value)}
                  className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-1.5 text-white focus:outline-none cursor-pointer"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedNode}
                  onChange={(e) => setSelectedNode(e.target.value)}
                  className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-1.5 text-white focus:outline-none cursor-pointer font-mono-meta"
                >
                  <option value="NODE_LA_01">NODE_LA_01</option>
                  <option value="NODE_NY_04">NODE_NY_04</option>
                  <option value="NODE_TK_01">NODE_TK_01</option>
                  <option value="NODE_LDN_02">NODE_LDN_02</option>
                  <option value="NODE_PAR_01">NODE_PAR_01</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Action payload details..."
                  value={newLogAction}
                  onChange={(e) => setNewLogAction(e.target.value)}
                  className="flex-1 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-1.5 text-white placeholder-[#555] focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-white text-black hover:bg-[#eaeaea] font-bold px-3 py-1 rounded cursor-pointer"
                >
                  Log
                </button>
              </div>
            </form>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {logs.map((log) => (
                <div key={log.id} className="text-xs border-b border-[rgba(255,255,255,0.02)] pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white">{log.name}</span>
                    <span className="font-mono-meta text-[10px] text-[#8e8e93]">{log.time} UTC</span>
                  </div>
                  <p className="text-[#8e8e93] font-medium leading-relaxed">{log.action}</p>
                  <div className="text-[9px] font-mono-meta font-bold text-[#8e8e93] mt-1">NODE: {log.node}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
