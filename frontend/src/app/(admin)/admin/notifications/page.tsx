"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAdmin } from "../AdminContext";

export default function AdminNotificationsPage() {
  const { adminAlerts } = useAdmin();
  const [authorized, setAuthorized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  // Protect page for Admin only
  useEffect(() => {
    const stored = sessionStorage.getItem("vergo_user");
    const token = sessionStorage.getItem("vergo_access_token");

    if (!stored || !token) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (parsed.role !== "Admin") {
        window.location.href = "/auth/login";
        return;
      }
      setAuthorized(true);
    } catch (e) {
      window.location.href = "/auth/login";
    }
  }, []);

  // Filter alerts based on search query and severity
  const filteredAlerts = useMemo(() => {
    return adminAlerts.filter((alert) => {
      const matchesSearch =
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity =
        severityFilter === "all" || alert.severity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [adminAlerts, searchQuery, severityFilter]);

  // Render icon based on alert type
  const renderAlertIcon = (type: string) => {
    switch (type) {
      case "payment_pending":
        return (
          <div className="p-2.5 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case "payment_expired":
        return (
          <div className="p-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "cod_new":
        return (
          <div className="p-2.5 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case "payment_rejected":
        return (
          <div className="p-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "low_stock":
        return (
          <div className="p-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#8e8e93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  if (!authorized) {
    return (
      <div className="flex h-64 items-center justify-center text-xs font-mono uppercase tracking-widest text-[#8e8e93] animate-pulse">
        Checking Credentials...
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none text-xs">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-sm font-bold tracking-widest text-white uppercase">
            NOTIFICATIONS CENTER
          </h1>
          <p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">
            System health signals, critical inventory warnings, and order verification requests.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setSearchQuery("");
              setSeverityFilter("all");
            }}
            className="bg-[#121212] hover:bg-[#1a1a1a] text-white border border-[rgba(255,255,255,0.08)] font-bold px-3 py-1.5 rounded transition-all uppercase cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Filters Card - Premium Glassmorphism */}
      <div className="admin-card p-5 bg-[#0a0a0a]/50 backdrop-blur-md border border-white/5 flex flex-col md:flex-row gap-5 items-center justify-between shadow-2xl">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-[#8e8e93]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search alerts by SKU, ID, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded pl-9 pr-4 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white/20 transition-all font-mono-meta"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {[
            { id: "all", label: "ALL EVENTS" },
            { id: "critical", label: "CRITICAL" },
            { id: "warning", label: "WARNING" },
            { id: "info", label: "INFO" },
          ].map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => setSeverityFilter(lvl.id)}
              className={`px-3 py-1.5 rounded text-[9px] font-extrabold tracking-widest uppercase transition-all border cursor-pointer ${
                severityFilter === lvl.id
                  ? "bg-white text-black border-white shadow-lg"
                  : "bg-transparent text-[#8e8e93] border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Grid List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="admin-card py-20 text-center text-[#8e8e93] bg-[#0a0a0a]/30 border border-white/5 rounded-lg flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-[#444]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <div className="text-white font-bold text-xs uppercase tracking-widest">No Alerts Detected</div>
            <p className="text-[10px] text-[#555] uppercase mt-1">
              All systems nominal. No pending tasks or warnings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAlerts.map((alert) => {
              let gradBg = "from-[#3b82f6]/5 to-transparent"; // Info
              let borderStyle = "border-[#3b82f6]/20 border-l-[#3b82f6]";
              let shadowStyle = "hover:shadow-[#3b82f6]/5";

              if (alert.severity === "critical") {
                gradBg = "from-[#ef4444]/5 to-transparent"; // Critical
                borderStyle = "border-[#ef4444]/20 border-l-[#ef4444]";
                shadowStyle = "hover:shadow-[#ef4444]/5";
              } else if (alert.severity === "warning") {
                gradBg = "from-[#f59e0b]/5 to-transparent"; // Warning
                borderStyle = "border-[#f59e0b]/20 border-l-[#f59e0b]";
                shadowStyle = "hover:shadow-[#f59e0b]/5";
              }

              return (
                <div
                  key={alert.id}
                  className={`admin-card p-5 bg-gradient-to-r ${gradBg} border-l-4 ${borderStyle} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:border-white/20 hover:scale-[1.005] hover:shadow-xl ${shadowStyle}`}
                >
                  <div className="flex gap-4 items-start max-w-[85%]">
                    {renderAlertIcon(alert.type)}

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-white uppercase tracking-wider text-xs">
                          {alert.title}
                        </span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                          alert.severity === "critical"
                            ? "bg-[#ef4444]/15 text-[#ef4444]"
                            : alert.severity === "warning"
                            ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                            : "bg-[#3b82f6]/15 text-[#3b82f6]"
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-[#8e8e93] text-[11px] font-medium leading-relaxed">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-1.5 text-[8.5px] text-[#555] font-mono font-bold uppercase tracking-wider">
                        <svg className="w-3 h-3 text-[#444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Generated: {alert.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 md:mt-0 flex-shrink-0 w-full md:w-auto flex justify-end">
                    <Link
                      href={alert.link}
                      className="bg-white text-black hover:bg-[#eaeaea] active:bg-[#d9d9d9] font-extrabold px-4 py-2 rounded transition-all uppercase tracking-wider text-[9px] shadow-md hover:scale-[1.02] duration-200"
                    >
                      Resolve Alert
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
