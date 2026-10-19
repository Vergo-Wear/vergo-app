"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAdmin, InventoryItem } from "./AdminContext";
import ParcelAnalyticsGraph from "./analytics/ParcelAnalyticsGraph";

export default function DashboardPage() {
  const {
    inventory,
    alerts,
    employees,
    stats,
    orders,
    searchQuery,
    statusFilter,
    setStatusFilter,
    setTransferModalOpen,
    restockItem,
    shipPendingItem,
    addNotification,
  } = useAdmin();

  // Local table state
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuSku, setActiveMenuSku] = useState<string | null>(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const itemsPerPage = 5;

  // Filter & Search logic for inventory
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Filter orders awaiting admin approval
  const pendingApprovalOrders = orders.filter((o: any) => {
    const status = (o.status || o.orderStatus || "").toLowerCase();
    const confStatus = (o.confirmationStatus || "").toLowerCase();
    return (
      status.includes("pending") ||
      status.includes("verifying") ||
      confStatus.includes("pending")
    );
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
            <div style={{ fontSize: "22px", fontWeight: "900", color: "#ffffff", marginBottom: "20px", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}>
        DASHBOARD
      </div>
      {/* 3 STATS CARDS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Completed Parcelts */}
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

        {/* Card 2: Active Products */}
        <div className="admin-card p-6 flex flex-col justify-between min-h-36">
          <div>
            <h4 className="text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase">ACTIVE PRODUCTS</h4>
            <div className="text-3xl font-bold mt-2 text-white font-mono-meta">
              {inventory.length > 0 ? inventory.length : stats.activeNodes}
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
      </section>

      {/* 2ND SECTION: Citypak Falcon Parcel Monitoring & Metrics */}
      <ParcelAnalyticsGraph showMetrics={true} showCharts={false} />

      {/* ORDERS AWAITING ADMIN APPROVAL WIDGET (Hidden if 0 pending orders) */}
      {pendingApprovalOrders.length > 0 && (
        <section className="admin-card p-6 border-l-4 border-l-[#f59e0b]">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold tracking-widest uppercase text-white">ORDERS AWAITING APPROVAL</h3>
              <span className="bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {pendingApprovalOrders.length} PENDING REVIEW
              </span>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-[#00FF9D] hover:underline flex items-center gap-1"
            >
              <span>View All Orders</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.04)] text-[#8e8e93]">
                  <th className="pb-2 pt-1 font-bold tracking-wider text-[9px] uppercase">ORDER ID & CUSTOMER</th>
                  <th className="pb-2 pt-1 font-bold tracking-wider text-[9px] uppercase">PAYMENT METHOD</th>
                  <th className="pb-2 pt-1 font-bold tracking-wider text-[9px] uppercase">AMOUNT</th>
                  <th className="pb-2 pt-1 font-bold tracking-wider text-[9px] uppercase">SUBMITTED AT</th>
                  <th className="pb-2 pt-1 font-bold tracking-wider text-[9px] uppercase text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                {pendingApprovalOrders.map((ord: any) => {
                  const id = ord.checkoutId || ord.orderId || "";
                  const name = ord.customerDetails
                    ? `${ord.customerDetails.firstName} ${ord.customerDetails.lastName}`
                    : "Guest Customer";
                  const method = (ord.paymentMethod || "").toLowerCase().includes("bank") ? "Bank Transfer" : "Cash On Delivery";
                  const amount = Number(ord.totalAmount || 0);
                  const dateStr = ord.createdAt || ord.orderDate ? new Date(ord.createdAt || ord.orderDate).toLocaleString() : "Recent";

                  return (
                    <tr key={id} className="hover:bg-white/[0.01] transition-all">
                      <td className="py-3 pr-3">
                        <div className="font-bold text-white font-mono-meta">#{id.slice(0, 8).toUpperCase()}</div>
                        <div className="text-[10px] text-[#8e8e93] font-medium">{name}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide border uppercase ${
                          method === "Bank Transfer"
                            ? "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30"
                            : "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30"
                        }`}>
                          {method}
                        </span>
                      </td>
                      <td className="py-3 pr-3 font-mono-meta font-bold text-[#00FF9D]">
                        Rs. {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-3 text-[#8e8e93] font-mono-meta text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href="/admin/orders"
                          className="bg-[#00FF9D]/10 hover:bg-[#00FF9D]/20 text-[#00FF9D] border border-[#00FF9D]/30 font-bold px-3 py-1 rounded text-[10px] uppercase tracking-wider transition-all inline-block"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TWO-COLUMN CONTENT GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Performance Rank */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card: Performance Rank */}
          <div className="admin-card p-6 h-full">
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
                    <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-xs relative">
                      {emp.avatar}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#121212] ${
                          emp.status === "ON DUTY"
                            ? "bg-[#10b981] animate-pulse"
                            : "bg-[#f59e0b]"
                        }`}
                        title={emp.status}
                      />
                    </div>
                    <div>
                      <div className="font-bold text-white">{emp.name}</div>
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

        {/* RIGHT COLUMN: STOCK SUMMARY (Contains Stock Alerts + Decentralized Stock) */}
        <div className="lg:col-span-2">
          <div className="admin-card p-6 h-full flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">
                  STOCK SUMMARY
                </h3>

                <div className="flex items-center gap-3">
                  {/* Status Filter */}
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

                  {/* CSV Export */}
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

              {/* Sub-Section 1: STOCK ALERTS (Critical Low Stock Warnings) */}
              <div className="mb-6 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#ef4444] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                    STOCK ALERTS ({alerts.length})
                  </span>
                  <Link
                    href="/admin/employees"
                    className="text-[10px] font-bold text-[#8e8e93] hover:text-white uppercase tracking-wider"
                  >
                    Manage Stock &rarr;
                  </Link>
                </div>

                <div className="space-y-2.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex justify-between items-center text-xs bg-black/30 p-2.5 rounded border border-white/5"
                      >
                        <div>
                          <div className="font-bold text-white text-xs">{alert.name}</div>
                          <div className="text-[9.5px] text-[#8e8e93] font-mono-meta mt-0.5">
                            SKU: {alert.sku} · NODE: {alert.node}
                          </div>
                        </div>
                        <div className="text-[#ef4444] font-extrabold font-mono-meta text-xs">
                          {alert.units} units remaining
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-[#8e8e93] py-2 text-center">
                      No critical stock warnings.
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-Section 2: DECENTRALIZED STOCK TABLE */}
              <div>
                <div className="mb-3 text-[10px] font-extrabold tracking-wider uppercase text-white">
                  DECENTRALIZED STOCK
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse min-w-[480px]">
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
                        paginatedInventory.map((item, idx) => (
                          <tr key={`${item.sku}-${item.location}-${idx}`} className="hover:bg-white/[0.01] transition-all">
                            <td className="py-3 pr-3">
                              <div className="font-bold text-white font-mono-meta">{item.sku}</div>
                              <div className="text-[10px] text-[#8e8e93] font-medium mt-0.5">{item.name}</div>
                            </td>
                            <td className="py-3 pr-3 font-mono-meta font-bold text-[#8e8e93] text-xs">
                              {item.location}
                            </td>
                            <td className="py-3 pr-3 font-mono-meta font-bold text-white text-xs">
                              {item.inStock}
                            </td>
                            <td className="py-3 pr-3">
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
                            <td className="py-3 text-right relative">
                              <button
                                onClick={() => setActiveMenuSku(activeMenuSku === `${item.sku}-${item.location}` ? null : `${item.sku}-${item.location}`)}
                                className="p-1 text-[#8e8e93] hover:text-white rounded hover:bg-white/5 transition-all cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>

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
              </div>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center pt-4 border-t border-[rgba(255,255,255,0.04)] mt-6 text-[#8e8e93] text-xs">
              <span className="font-semibold">
                Displaying {totalItems > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, totalItems)} of{" "}
                {totalItems} nodes
              </span>

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
