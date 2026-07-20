"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AdminProvider, useAdmin } from "./AdminContext";
import "@/styles/admin.css";

// Separate the layout contents to use the AdminContext hooks safely
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    inventory,
    notifications,
    removeNotification,
    searchQuery,
    setSearchQuery,
    transferModalOpen,
    setTransferModalOpen,
    transferStock,
    adminAlerts,
  } = useAdmin();

  // Sri Lanka Local Clock State
  const [localTime, setLocalTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const formatted = now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Colombo",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        setLocalTime(formatted);
      } catch (err) {
        // Fallback to local machine time if timezone formatting fails
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        setLocalTime(`${hours}:${minutes}:${seconds}`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Modal form states
  const [selectedSku, setSelectedSku] = useState("");
  const [sourceNode, setSourceNode] = useState("");
  const [destNode, setDestNode] = useState("");
  const [transferAmount, setTransferAmount] = useState(1);

  // Profile logout toggle state & dynamic user details state
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [adminUser, setAdminUser] = useState<{ name: string; role: string } | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);

  // Route protection: only authenticated Admin users may view the dashboard
  useEffect(() => {
    const token = sessionStorage.getItem("vergo_access_token");
    const stored = sessionStorage.getItem("vergo_user");
    let role: string | null = null;
    try {
      role = stored ? (JSON.parse(stored).role as string) : null;
    } catch {
      role = null;
    }
    if (!token || role !== "Admin") {
      window.location.replace("/auth/login");
      return;
    }
    setAccessChecked(true);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("vergo_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAdminUser({
          name: parsed.name || "Marcus V.",
          role: parsed.role || "Operations Lead",
        });
      } catch (err) {
        // Fallback
      }
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("vergo_access_token");
    sessionStorage.removeItem("vergo_user");
    sessionStorage.removeItem("vergo_refresh_token");
    window.location.href = "/auth/login";
  };

  const displayName = adminUser?.name || "Marcus V.";
  const displayRole = adminUser?.role || "Operations Lead";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Get unique SKUs and nodes for dropdowns
  const uniqueSkus = Array.from(new Set(inventory.map((item) => item.sku)));
  const allNodes = ["NODE_LA_01", "NODE_NY_04", "NODE_TK_01", "NODE_LDN_02", "NODE_PAR_01", "NODE_NY_02"];

  // Set defaults when modal opens
  useEffect(() => {
    if (transferModalOpen) {
      if (uniqueSkus.length > 0) {
        setSelectedSku(uniqueSkus[0]);
      }
      setSourceNode("NODE_LA_01");
      setDestNode("NODE_NY_04");
      setTransferAmount(1);
    }
  }, [transferModalOpen]);

  // Adjust source/dest selection if they match
  useEffect(() => {
    if (sourceNode === destNode) {
      const other = allNodes.find((n) => n !== sourceNode) || "";
      setDestNode(other);
    }
  }, [sourceNode]);

  // Handle transfer submit
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = transferStock(selectedSku, sourceNode, destNode, transferAmount);
    if (success) {
      setTransferModalOpen(false);
    }
  };

  // Check current stock of selected SKU at source node
  const currentStockAtSource =
    inventory.find((item) => item.sku === selectedSku && item.location === sourceNode)?.inStock || 0;

  // Nav items list
  const navItems = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    },
  ];

  const subNavItems = [
    {
      name: "Orders",
      path: "/admin/orders",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      name: "Analytics",
      path: "/admin/analytics",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16l4-5 4 3 5-7" />
        </svg>
      ),
    },
    {
      name: "Employees",
      path: "/admin/employees",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: "Web Modify",
      path: "/admin/customization",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      name: "Notifications",
      path: "/admin/notifications",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      badgeCount: adminAlerts.length,
    },
  ];

  // Render nothing until the Admin access check has passed
  if (!accessChecked) {
    return <div className="flex h-screen w-screen bg-[#050505]" />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] text-[#f5f5f7] antialiased">
      {/* SIDEBAR (Left) - Absolute Black Background */}
      <aside className="flex flex-col w-64 bg-[#000000] border-r border-[rgba(255,255,255,0.06)] h-full select-none">
        {/* Brand Area */}
        <div className="flex flex-col gap-2 p-6 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <Image
              src="/images/wlogo.png"
              alt="Vergo Logo"
              width={110}
              height={32}
              priority
              style={{ objectFit: "contain", width: "auto", height: "auto" }}
            />
          </div>
          <div className="text-[9px] font-bold tracking-[0.25em] text-[#8e8e93] uppercase ml-1">
            ADMIN V1.0
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${isActive
                  ? "bg-[rgba(255,255,255,0.08)] text-white"
                  : "text-[#8e8e93] hover:bg-[rgba(255,255,255,0.03)] hover:text-white"
                  }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-4 border-t border-[rgba(255,255,255,0.05)] mx-2" />

          {/* Second section */}
          {subNavItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium transition-all ${isActive
                  ? "bg-[rgba(255,255,255,0.08)] text-white"
                  : "text-[#8e8e93] hover:bg-[rgba(255,255,255,0.03)] hover:text-white"
                  }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.name}</span>
                </div>
                {"badgeCount" in item && item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className="bg-[#ef4444] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[16px] text-center animate-pulse">
                    {item.badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile at the bottom */}
        <div className="relative p-4 border-t border-[rgba(255,255,255,0.06)]">
          {showLogoutMenu && (
            <div className="absolute bottom-[calc(100%-8px)] left-4 right-4 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded shadow-2xl p-1 mb-2 z-50 animate-slide-in">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-left rounded text-red-400 hover:text-white hover:bg-red-950/20 transition-all font-bold uppercase text-[9px] tracking-wider cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>LOG OUT</span>
              </button>
            </div>
          )}

          <div
            onClick={() => setShowLogoutMenu(!showLogoutMenu)}
            className="flex items-center justify-between p-1.5 rounded-md hover:bg-white/5 cursor-pointer transition-all select-none gap-2"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-[#f3d9c9] text-black font-extrabold flex items-center justify-center text-xs shadow-md flex-shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">{displayName}</div>
                <div className="text-[9px] text-[#8e8e93] tracking-wide truncate uppercase font-semibold">{displayRole}</div>
              </div>
            </div>
            <div className="text-[#8e8e93] flex-shrink-0">
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showLogoutMenu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0d0d]">
        {/* HEADER (Top Bar) - Charcoal border-bottom */}
        <header className="h-16 border-b border-[rgba(255,255,255,0.06)] bg-[#050505] flex items-center justify-between px-8 select-none">
          {/* Dashboard Section Title */}
          <h1 className="text-sm font-bold tracking-[0.2em] text-white uppercase">COMMAND CENTER</h1>

          {/* Search bar inside header */}
          <div className="relative w-80">
            <span className="absolute inset-y-0 left-3 flex items-center text-[#8e8e93]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder={pathname === "/admin/orders" ? "Search Orders (ID, Name, Phone)..." : "Search SKU or Node..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded-md pl-9 pr-4 py-1.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white/20 transition-all font-mono-meta"
            />
          </div>

          {/* Right Header Area */}
          <div className="flex items-center gap-6">
            {/* Live Sri Lanka Local Clock */}
            <div className="text-right">
              <div className="text-[9px] font-bold text-[#8e8e93] tracking-[0.15em] uppercase">LOCAL TIME</div>
              <div className="text-xs font-mono-meta font-bold text-white tracking-[0.1em]">
                {localTime || "00:00:00"} <span className="text-[#8e8e93]">SLST</span>
              </div>
            </div>

            {/* Header Action Button (Contextual) */}
            {pathname === "/admin/orders" ? (
              <button
                onClick={() => window.location.reload()}
                className="bg-white text-black hover:bg-[#eaeaea] active:bg-[#d9d9d9] font-bold text-xs tracking-[0.15em] px-4 py-2 rounded-md transition-all shadow-md shadow-white/5 uppercase flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>REFRESH DATA</span>
              </button>
            ) : (
              <button
                onClick={() => setTransferModalOpen(true)}
                className="bg-white text-black hover:bg-[#eaeaea] active:bg-[#d9d9d9] font-bold text-xs tracking-[0.15em] px-4 py-2 rounded-md transition-all shadow-md shadow-white/5 uppercase flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>TRANSFER STOCK</span>
              </button>
            )}
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#050505] custom-scrollbar">
          {children}
        </main>
      </div>

      {/* FLOAT TOAST NOTIFICATIONS */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full select-none">
        {notifications.map((notif) => {
          let bg = "bg-[#161616] border-l-4 border-white text-white";
          let icon = null;

          if (notif.type === "success") {
            bg = "bg-[#0d1f14] border-l-4 border-[#10b981] text-[#a7f3d0] border border-[rgba(16,185,129,0.1)]";
            icon = (
              <svg className="w-4 h-4 text-[#10b981] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            );
          } else if (notif.type === "error") {
            bg = "bg-[#271010] border-l-4 border-[#ef4444] text-[#fca5a5] border border-[rgba(239,68,68,0.1)]";
            icon = (
              <svg className="w-4 h-4 text-[#ef4444] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            );
          } else {
            bg = "bg-[#0c1a24] border-l-4 border-[#3b82f6] text-[#bfdbfe] border border-[rgba(59,130,246,0.1)]";
            icon = (
              <svg className="w-4 h-4 text-[#3b82f6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            );
          }

          return (
            <div
              key={notif.id}
              className={`flex items-start justify-between p-4 rounded shadow-lg animate-slide-in text-xs ${bg}`}
            >
              <div className="flex gap-2 items-center">
                {icon}
                <span className="font-semibold">{notif.message}</span>
              </div>
              <button
                onClick={() => removeNotification(notif.id)}
                className="text-[#8e8e93] hover:text-white ml-3 focus:outline-none cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* STOCK TRANSFER DIALOG MODAL */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none">
          <div
            className="w-full max-w-md bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-md shadow-2xl overflow-hidden p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-sm font-bold tracking-widest uppercase text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                TRANSFER STOCK
              </h3>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-[#8e8e93] hover:text-white cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              {/* Select SKU */}
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  SELECT SKU / ITEM
                </label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white font-mono-meta focus:outline-none focus:border-white/20 cursor-pointer"
                >
                  {uniqueSkus.map((sku) => {
                    const itemName = inventory.find((it) => it.sku === sku)?.name || "";
                    return (
                      <option key={sku} value={sku} className="bg-[#121212] py-2">
                        {sku} ({itemName})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Grid: From Node & To Node */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    SOURCE NODE
                  </label>
                  <select
                    value={sourceNode}
                    onChange={(e) => setSourceNode(e.target.value)}
                    className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white font-mono-meta focus:outline-none focus:border-white/20 cursor-pointer"
                  >
                    {allNodes.map((node) => {
                      const itemStock = inventory.find((it) => it.sku === selectedSku && it.location === node)?.inStock || 0;
                      return (
                        <option key={node} value={node} className="bg-[#121212] py-2">
                          {node} ({itemStock} units)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    TARGET NODE
                  </label>
                  <select
                    value={destNode}
                    onChange={(e) => setDestNode(e.target.value)}
                    className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white font-mono-meta focus:outline-none focus:border-white/20 cursor-pointer"
                  >
                    {allNodes
                      .filter((node) => node !== sourceNode)
                      .map((node) => (
                        <option key={node} value={node} className="bg-[#121212] py-2">
                          {node}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Current Source Node Stock Indicator */}
              <div className="p-3 bg-[#111] border border-[rgba(255,255,255,0.03)] rounded flex justify-between items-center">
                <span className="text-[#8e8e93]">Available at Source Node:</span>
                <span className="font-bold font-mono-meta text-white bg-white/5 px-2 py-0.5 rounded">
                  {currentStockAtSource} units
                </span>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  TRANSFER QUANTITY
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={currentStockAtSource}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white focus:outline-none focus:border-white/20 font-mono-meta no-spin"
                  />
                  <div className="absolute right-2.5 inset-y-0 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTransferAmount((prev) => Math.max(1, prev - 1))}
                      className="w-5 h-5 bg-white/5 hover:bg-white/10 rounded flex items-center justify-center border border-white/5 select-none cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      disabled={transferAmount >= currentStockAtSource}
                      onClick={() => setTransferAmount((prev) => Math.min(currentStockAtSource, prev + 1))}
                      className="w-5 h-5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded flex items-center justify-center border border-white/5 select-none cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="flex-1 bg-transparent hover:bg-white/5 border border-[rgba(255,255,255,0.1)] hover:border-white/20 text-[#8e8e93] hover:text-white font-bold tracking-widest px-4 py-2.5 rounded-md transition-all uppercase cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={currentStockAtSource === 0 || transferAmount > currentStockAtSource}
                  className="flex-1 bg-white text-black hover:bg-[#eaeaea] disabled:bg-white/20 disabled:text-[#8e8e93] disabled:cursor-not-allowed font-bold tracking-widest px-4 py-2.5 rounded-md transition-all uppercase cursor-pointer"
                >
                  EXECUTE TRANSFER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  );
}
