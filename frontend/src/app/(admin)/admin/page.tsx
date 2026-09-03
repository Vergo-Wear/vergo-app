"use client";

import React, { useState } from "react";
import { useAdmin, InventoryItem } from "./AdminContext";
import ParcelAnalyticsGraph from "./analytics/ParcelAnalyticsGraph";

export default function DashboardPage() {
  const {
    inventory,
    alerts,
    employees,
    stats,
    searchQuery,
    statusFilter,
    setStatusFilter,
    setTransferModalOpen,
    toggleEmployeeShift,
    restockItem,
    shipPendingItem,
    addNotification,
  } = useAdmin();

  // Local table state
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuSku, setActiveMenuSku] = useState<string | null>(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const itemsPerPage = 5;

  // Filter & Search logic
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Pagination calculation
  const totalItems = filteredInventory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination if search or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Export to CSV helper
  const handleExportCSV = () => {
    try {
      const headers = "SKU,Item Name,Node Location,In Stock,Status\n";
      const rows = inventory
        .map((item) => `"${item.sku}","${item.name}","${item.location}",${item.inStock},"${item.status}"`)
        .join("\n");
      const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `vergo_inventory_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addNotification("Successfully exported inventory dataset to CSV.", "success");
    } catch {
      addNotification("Failed to export inventory CSV file.", "error");
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* Citypak Falcon Parcel Monitoring & Analytics Graph */}
      <ParcelAnalyticsGraph />

      {/* 4 STATS CARDS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Completed Units */}
        <div className="admin-card p-6 flex flex-col justify-between min-h-36">
          <div>
            <h4 className="text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase">COMPLETED UNITS</h4>
            <div className="text-3xl font-bold mt-2 text-white font-mono-meta">
              {stats.completedUnits.toLocaleString()}
            </div>
          </div>
          <div className="text-xs font-bold text-[#10b981] flex items-center gap-1 mt-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>+12% vs LY</span>
          </div>
        </div>

        {/* Card 2: Active Nodes */}
        <div className="admin-card p-6 flex flex-col justify-between min-h-36">
          <div>
            <h4 className="text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase">ACTIVE NODES</h4>
            <div className="text-3xl font-bold mt-2 text-white font-mono-meta">
              {stats.activeNodes}
            </div>
          </div>
          <div className="text-xs text-[#8e8e93] mt-2 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            <span>Operational Status: Nominal</span>
          </div>
        </div>

        {/* Card 3: Active Staff */}
        <div className="admin-card p-6 flex flex-col justify-between min-h-36">
          <div>
            <h4 className="text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase">ACTIVE STAFF</h4>
            <div className="text-3xl font-bold mt-2 text-white font-mono-meta">
              {stats.activeStaff}
            </div>
          </div>
          <div className="text-xs font-bold text-[#10b981] mt-2 flex items-center gap-1">
            <span>96% On-Duty Efficiency</span>
          </div>
        </div>

        {/* Card 4: Pending Shipments */}
        <div className="admin-card p-6 flex flex-col justify-between min-h-36">
          <div>
            <h4 className="text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase">PENDING SHIPMENTS</h4>
            <div className="text-3xl font-bold mt-2 text-white font-mono-meta">
              {stats.pendingShipments}
            </div>
          </div>
          <div className="text-xs font-bold text-[#f59e0b] mt-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>High Load Warning</span>
          </div>
        </div>
      </section>

      {/* TWO-COLUMN CONTENT GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Alerts & Performance Rank */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card: Stock Alerts */}
          <div className="admin-card p-6">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">STOCK ALERTS</h3>
              <span className="bg-[#ef4444] text-black text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-alert-pulse">
                CRITICAL
              </span>
            </div>

            <div className="space-y-4">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="flex justify-between items-start text-xs border-b border-[rgba(255,255,255,0.02)] pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="font-bold text-white mb-0.5">{alert.name}</div>
                      <div className="text-[10px] text-[#8e8e93] font-mono-meta">LOCATION: {alert.node}</div>
                    </div>
                    <div className="text-[#ef4444] font-bold font-mono-meta text-right">
                      {alert.units} units
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#8e8e93] py-4 text-center">No critical stock warnings.</div>
              )}
            </div>
          </div>

          {/* Card: Performance Rank */}
          <div className="admin-card p-6">
            <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">PERFORMANCE RANK</h3>
            </div>

            <div className="space-y-3">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-all text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono-meta text-xs text-[#8e8e93] w-4">{String(emp.rank).padStart(2, "0")}</span>
                    <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-xs">
                      {emp.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-white">{emp.name}</div>
                      {/* Live Duty Availability Badge */}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 tracking-wider uppercase inline-flex items-center gap-1 border ${
                          emp.status === "ON DUTY"
                            ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30"
                            : "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            emp.status === "ON DUTY"
                              ? "bg-[#10b981] animate-pulse"
                              : "bg-[#f59e0b]"
                          }`}
                        ></span>
                        {emp.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white font-mono-meta">{emp.parcels}</span>
                    <span className="text-[10px] text-[#8e8e93] ml-1 font-medium">PARCELS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Decentralized Inventory Node */}
        <div className="lg:col-span-2">
          <div className="admin-card p-6 h-full flex flex-col justify-between">
            {/* Header controls */}
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)] relative">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">
                DECENTRALIZED INVENTORY NODE
              </h3>

              {/* Table Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Status Filter Icon Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                    className="p-1.5 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded hover:border-white/20 text-[#8e8e93] hover:text-white transition-all cursor-pointer"
                    title="Filter by status"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>

                  {/* Filter Dropdown menu */}
                  {filterDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setFilterDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-1 w-40 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded shadow-2xl z-20 p-1 text-xs">
                        {["ALL", "VERIFYING", "PENDING", "PROCESSING", "SHIPPED"].map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              setStatusFilter(st.toLowerCase());
                              setFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded hover:bg-white/5 font-semibold transition-all ${
                              statusFilter === st.toLowerCase() ? "text-white bg-white/5" : "text-[#8e8e93]"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* CSV Download Trigger */}
                <button
                  onClick={handleExportCSV}
                  className="p-1.5 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded hover:border-white/20 text-[#8e8e93] hover:text-white transition-all cursor-pointer"
                  title="Export to CSV"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.04)] text-[#8e8e93]">
                    <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">SKU / ITEM</th>
                    <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">NODE LOCATION</th>
                    <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">IN STOCK</th>
                    <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">STATUS</th>
                    <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                  {paginatedInventory.length > 0 ? (
                    paginatedInventory.map((item) => (
                      <tr key={`${item.sku}-${item.location}`} className="hover:bg-white/[0.01] transition-all">
                        <td className="py-4 pr-3">
                          <div className="font-bold text-white font-mono-meta">{item.sku}</div>
                          <div className="text-[10px] text-[#8e8e93] font-medium mt-0.5">{item.name}</div>
                        </td>
                        <td className="py-4 pr-3 font-mono-meta font-bold text-[#8e8e93] text-xs">
                          {item.location}
                        </td>
                        <td className="py-4 pr-3 font-mono-meta font-bold text-white text-xs">
                          {item.inStock}
                        </td>
                        <td className="py-4 pr-3">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide border uppercase ${
                              item.status === "VERIFYING"
                                ? "bg-white text-black border-white"
                                : item.status === "SHIPPED"
                                ? "bg-white text-black border-white"
                                : item.status === "PROCESSING"
                                ? "bg-[#252525] text-[#d1d1d6] border-[rgba(255,255,255,0.08)]"
                                : "bg-[#181818] text-[#8e8e93] border-white/5"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 text-right relative">
                          <button
                            onClick={() => setActiveMenuSku(activeMenuSku === `${item.sku}-${item.location}` ? null : `${item.sku}-${item.location}`)}
                            className="p-1 text-[#8e8e93] hover:text-white rounded hover:bg-white/5 transition-all cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>

                          {/* Row Action Dropdown Menu */}
                          {activeMenuSku === `${item.sku}-${item.location}` && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveMenuSku(null)}
                              />
                              <div className="absolute right-0 mt-1 w-44 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded shadow-2xl z-20 p-1 text-left">
                                <button
                                  onClick={() => {
                                    restockItem(item.sku, item.location, 50);
                                    setActiveMenuSku(null);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded hover:bg-white/5 text-[#8e8e93] hover:text-white font-medium transition-all"
                                >
                                  Quick Restock (+50)
                                </button>
                                {(item.status === "PENDING" || item.status === "PROCESSING") && (
                                  <button
                                    onClick={() => {
                                      shipPendingItem(item.sku, item.location);
                                      setActiveMenuSku(null);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded hover:bg-white/5 text-[#8e8e93] hover:text-white font-medium transition-all"
                                  >
                                    Mark as Shipped
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setTransferModalOpen(true);
                                    setActiveMenuSku(null);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded hover:bg-white/5 text-[#8e8e93] hover:text-white font-medium transition-all border-t border-[rgba(255,255,255,0.03)]"
                                >
                                  Initiate Transfer
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[#8e8e93]">
                        No matching nodes found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer / Pagination */}
            <div className="flex justify-between items-center pt-4 border-t border-[rgba(255,255,255,0.04)] mt-6 text-[#8e8e93] text-xs">
              <span className="font-semibold">
                Displaying {totalItems > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, totalItems)} of{" "}
                {totalItems} nodes
              </span>

              {/* Prev / Next buttons */}
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 bg-[#121212] border border-[rgba(255,255,255,0.08)] disabled:opacity-30 disabled:hover:border-[rgba(255,255,255,0.08)] disabled:hover:text-[#8e8e93] disabled:cursor-not-allowed rounded hover:border-white/20 text-[#8e8e93] hover:text-white transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 bg-[#121212] border border-[rgba(255,255,255,0.08)] disabled:opacity-30 disabled:hover:border-[rgba(255,255,255,0.08)] disabled:hover:text-[#8e8e93] disabled:cursor-not-allowed rounded hover:border-white/20 text-[#8e8e93] hover:text-white transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
