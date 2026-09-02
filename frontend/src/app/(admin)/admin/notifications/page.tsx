"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "../AdminContext";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

interface BackendNotification {
  notificationId: string;
  recipientProfileId?: string | null;
  orderId?: string | null;
  checkoutId?: string | null;
  channel: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface UnifiedNotification {
  id: string;
  type: string;
  category: "order" | "inventory" | "logistics" | "system";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link: string;
  rawNotificationId?: string;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { adminAlerts } = useAdmin();
  const [authorized, setAuthorized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("unread");
  const [backendNotifications, setBackendNotifications] = useState<BackendNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("vergo_admin_read_alerts");
      if (stored) {
        try {
          return new Set(JSON.parse(stored));
        } catch {}
      }
    }
    return new Set();
  });
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("vergo_admin_deleted_alerts");
      if (stored) {
        try {
          return new Set(JSON.parse(stored));
        } catch {}
      }
    }
    return new Set();
  });
  const [isLoading, setIsLoading] = useState(true);

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

  // Sync read state with localStorage and notify layout
  const updateReadState = (newSet: Set<string>) => {
    setReadIds(newSet);
    localStorage.setItem("vergo_admin_read_alerts", JSON.stringify(Array.from(newSet)));
    window.dispatchEvent(new Event("vergo_notifications_updated"));
  };

  // Sync deleted state with localStorage and notify layout
  const updateDeletedState = (newSet: Set<string>) => {
    setDeletedIds(newSet);
    localStorage.setItem("vergo_admin_deleted_alerts", JSON.stringify(Array.from(newSet)));
    window.dispatchEvent(new Event("vergo_notifications_updated"));
  };

  // Fetch backend notifications for Admin
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authenticatedFetch("/notifications", { cache: "no-store" });
      if (res?.ok) {
        const data: BackendNotification[] = await res.json();
        setBackendNotifications(data);
      }
    } catch (e) {
      console.error("Failed to fetch backend notifications:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized) {
      void fetchNotifications();
    }
  }, [authorized, fetchNotifications]);

  // Combine AdminContext alerts and Backend Notifications into a unified list
  const unifiedNotifications = useMemo<UnifiedNotification[]>(() => {
    const list: UnifiedNotification[] = [];
    const seenIds = new Set<string>();

    // 1. Process backend in-app notifications
    backendNotifications.forEach((n) => {
      if (deletedIds.has(n.notificationId)) return;
      seenIds.add(n.notificationId);

      const isOrderType =
        n.type.includes("ORDER") ||
        n.type.includes("COD") ||
        n.type.includes("PAYMENT") ||
        Boolean(n.orderId) ||
        Boolean(n.checkoutId);

      const isLogisticsType =
        n.type.includes("DISPATCHED") ||
        n.type.includes("DELIVERY") ||
        n.type.includes("DELIVERED") ||
        n.type.includes("RETURNED");

      const isStockType = n.type.includes("STOCK") || n.type.includes("INVENTORY");

      let category: UnifiedNotification["category"] = "system";
      let link = "/admin/orders";

      if (isStockType) {
        category = "inventory";
        link = "/admin/employees";
      } else if (isLogisticsType) {
        category = "logistics";
        link = "/admin/delivery";
      } else if (isOrderType) {
        category = "order";
        link = "/admin/orders";
      }

      let severity: UnifiedNotification["severity"] = "info";
      if (n.type.includes("EXPIRED") || n.type.includes("REJECTED") || n.type.includes("RETURNED")) {
        severity = "critical";
      } else if (n.type.includes("PENDING") || n.type.includes("READY")) {
        severity = "warning";
      }

      const isMarkedRead = n.isRead || readIds.has(n.notificationId);

      list.push({
        id: n.notificationId,
        rawNotificationId: n.notificationId,
        type: n.type,
        category,
        severity,
        title: n.title,
        message: n.message,
        timestamp: new Date(n.createdAt).toLocaleString(),
        isRead: isMarkedRead,
        link,
      });
    });

    // 2. Process AdminContext calculated alerts (e.g. low stock, COD pending)
    adminAlerts.forEach((alert) => {
      if (seenIds.has(alert.id) || deletedIds.has(alert.id)) return;

      const isOrderType =
        alert.type === "payment_pending" ||
        alert.type === "payment_expired" ||
        alert.type === "cod_new" ||
        alert.type === "payment_rejected";

      const category: UnifiedNotification["category"] = alert.type === "low_stock" ? "inventory" : isOrderType ? "order" : "system";
      const targetLink = alert.type === "low_stock" ? "/admin/employees" : alert.link;

      list.push({
        id: alert.id,
        type: alert.type,
        category,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp,
        isRead: readIds.has(alert.id),
        link: targetLink,
      });
    });

    // Sort unread first, then by timestamp
    return list.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return 0;
    });
  }, [backendNotifications, adminAlerts, readIds, deletedIds]);

  // Filter list based on searchQuery and activeFilter tab
  const filteredNotifications = useMemo(() => {
    return unifiedNotifications.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === "all") return true;
      if (activeFilter === "unread") return !item.isRead;
      if (activeFilter === "orders") return item.category === "order";
      if (activeFilter === "critical") return item.severity === "critical";
      if (activeFilter === "warning") return item.severity === "warning";
      if (activeFilter === "info") return item.severity === "info";

      return true;
    });
  }, [unifiedNotifications, searchQuery, activeFilter]);

  // Counts for tabs
  const orderCount = useMemo(() => unifiedNotifications.filter((n) => n.category === "order").length, [unifiedNotifications]);
  const unreadCount = useMemo(() => unifiedNotifications.filter((n) => !n.isRead).length, [unifiedNotifications]);

  // Toggle notification read/unread status
  const handleToggleReadStatus = async (item: UnifiedNotification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const newSet = new Set(readIds);
    const targetIsRead = !item.isRead;

    if (targetIsRead) {
      newSet.add(item.id);
    } else {
      newSet.delete(item.id);
    }
    updateReadState(newSet);

    if (item.rawNotificationId) {
      try {
        const endpoint = targetIsRead
          ? `/notifications/${item.rawNotificationId}/read`
          : `/notifications/${item.rawNotificationId}/unread`;
        await authenticatedFetch(endpoint, { method: "PATCH" });
      } catch (err) {
        console.error("Failed to toggle notification status on backend:", err);
      }
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (item: UnifiedNotification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const newSet = new Set(readIds);
    newSet.add(item.id);
    updateReadState(newSet);

    if (item.rawNotificationId) {
      try {
        await authenticatedFetch(`/notifications/${item.rawNotificationId}/read`, {
          method: "PATCH",
        });
      } catch (err) {
        console.error("Failed to mark notification read on backend:", err);
      }
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    const newReadSet = new Set(readIds);
    unifiedNotifications.forEach((n) => newReadSet.add(n.id));
    updateReadState(newReadSet);

    try {
      const unreadItems = backendNotifications.filter((n) => !n.isRead);
      await Promise.all(
        unreadItems.map((n) =>
          authenticatedFetch(`/notifications/${n.notificationId}/read`, { method: "PATCH" })
        )
      );
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  // Delete single notification
  const handleDeleteNotification = async (item: UnifiedNotification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // 1. Instantly update local state
    setBackendNotifications((prev) => prev.filter((n) => n.notificationId !== item.id && n.notificationId !== item.rawNotificationId));
    const newDeletedSet = new Set(deletedIds);
    newDeletedSet.add(item.id);
    updateDeletedState(newDeletedSet);

    // 2. Call backend DB delete API
    const targetId = item.rawNotificationId || item.id;
    if (targetId) {
      try {
        await authenticatedFetch(`/notifications/${targetId}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Failed to delete notification on backend:", err);
      }
    }
  };

  // Delete ALL notifications
  const handleDeleteAllNotifications = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications?")) return;

    // 1. Instantly clear local state
    setBackendNotifications([]);
    const newDeletedSet = new Set(deletedIds);
    unifiedNotifications.forEach((n) => newDeletedSet.add(n.id));
    updateDeletedState(newDeletedSet);

    // 2. Call backend DB delete all API
    try {
      await authenticatedFetch(`/notifications/all`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete all notifications on backend:", err);
    }
  };

  // Handle clicking on notification card: mark read and redirect
  const handleNotificationClick = async (item: UnifiedNotification) => {
    await handleMarkAsRead(item);
    router.push(item.link);
  };

  // Render icon based on alert type
  const renderAlertIcon = (type: string, category: string) => {
    if (category === "order" || type.includes("ORDER") || type.includes("COD") || type.includes("PAYMENT")) {
      return (
        <div className="p-2.5 rounded-lg bg-[#00FF9D]/10 border border-[#00FF9D]/30 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[#00FF9D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
      );
    }
    if (category === "logistics") {
      return (
        <div className="p-2.5 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }
    if (type === "low_stock" || category === "inventory") {
      return (
        <div className="p-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      );
    }
    return (
      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-[#8e8e93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
    );
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
            System health signals, customer order requests, and critical alerts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="bg-[#00FF9D]/10 hover:bg-[#00FF9D]/20 text-[#00FF9D] border border-[#00FF9D]/30 font-bold px-3 py-1.5 rounded transition-all uppercase cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Mark All Read
            </button>
          )}
          {unifiedNotifications.length > 0 && (
            <button
              onClick={handleDeleteAllNotifications}
              className="bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 font-bold px-3 py-1.5 rounded transition-all uppercase cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete All
            </button>
          )}
          <button
            onClick={() => {
              setSearchQuery("");
              setActiveFilter("unread");
            }}
            className="bg-[#121212] hover:bg-[#1a1a1a] text-white border border-[rgba(255,255,255,0.08)] font-bold px-3 py-1.5 rounded transition-all uppercase cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="admin-card p-5 bg-[#0a0a0a]/50 backdrop-blur-md border border-white/5 flex flex-col md:flex-row gap-5 items-center justify-between shadow-2xl">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-[#8e8e93]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search alerts by SKU, ID, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded pl-9 pr-4 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white/20 transition-all font-mono-meta"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {[
            { id: "unread", label: `UNREAD (${unreadCount})`, isHighlight: true },
            { id: "orders", label: `ORDERS (${orderCount})` },
            { id: "all", label: "ALL EVENTS" },
            { id: "critical", label: "CRITICAL" },
            { id: "warning", label: "WARNING" },
            { id: "info", label: "INFO" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-[9px] font-extrabold tracking-widest uppercase transition-all border cursor-pointer ${
                activeFilter === tab.id
                  ? tab.isHighlight
                    ? "bg-[#00FF9D] text-black border-[#00FF9D] shadow-lg shadow-[#00FF9D]/20 font-black"
                    : "bg-white text-black border-white shadow-lg"
                  : tab.isHighlight
                  ? "bg-[#00FF9D]/10 text-[#00FF9D] border-[#00FF9D]/30 hover:bg-[#00FF9D]/20"
                  : "bg-transparent text-[#8e8e93] border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="admin-card py-16 text-center text-[#8e8e93] bg-[#0a0a0a]/30 border border-white/5 rounded-lg animate-pulse">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
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
            <div className="text-white font-bold text-xs uppercase tracking-widest">No Notifications Found</div>
            <p className="text-[10px] text-[#555] uppercase mt-1">
              No matching alerts for the selected filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredNotifications.map((alert) => {
              let gradBg = "from-[#3b82f6]/5 to-transparent";
              let borderStyle = "border-[#3b82f6]/20 border-l-[#3b82f6]";
              let shadowStyle = "hover:shadow-[#3b82f6]/5";

              if (alert.category === "order") {
                gradBg = "from-[#00FF9D]/5 to-transparent";
                borderStyle = "border-[#00FF9D]/30 border-l-[#00FF9D]";
                shadowStyle = "hover:shadow-[#00FF9D]/10";
              } else if (alert.severity === "critical") {
                gradBg = "from-[#ef4444]/5 to-transparent";
                borderStyle = "border-[#ef4444]/20 border-l-[#ef4444]";
                shadowStyle = "hover:shadow-[#ef4444]/5";
              } else if (alert.severity === "warning") {
                gradBg = "from-[#f59e0b]/5 to-transparent";
                borderStyle = "border-[#f59e0b]/20 border-l-[#f59e0b]";
                shadowStyle = "hover:shadow-[#f59e0b]/5";
              }

              return (
                <div
                  key={alert.id}
                  onClick={() => handleNotificationClick(alert)}
                  className={`admin-card p-5 bg-gradient-to-r ${gradBg} border-l-4 ${borderStyle} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:border-white/30 hover:scale-[1.005] hover:shadow-xl ${shadowStyle} cursor-pointer ${
                    !alert.isRead ? "bg-white/[0.03]" : "opacity-80"
                  }`}
                >
                  <div className="flex gap-4 items-start max-w-[80%] md:max-w-[85%]">
                    {renderAlertIcon(alert.type, alert.category)}

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-white uppercase tracking-wider text-xs">
                          {alert.title}
                        </span>
                        {!alert.isRead && (
                          <span className="bg-[#00FF9D] text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                            NEW
                          </span>
                        )}
                        <span
                          className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                            alert.category === "order"
                              ? "bg-[#00FF9D]/15 text-[#00FF9D]"
                              : alert.severity === "critical"
                              ? "bg-[#ef4444]/15 text-[#ef4444]"
                              : alert.severity === "warning"
                              ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                              : "bg-[#3b82f6]/15 text-[#3b82f6]"
                          }`}
                        >
                          {alert.category.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[#cccccc] text-[11px] font-medium leading-relaxed">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-1.5 text-[8.5px] text-[#777] font-mono font-bold uppercase tracking-wider">
                        <svg className="w-3 h-3 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Generated: {alert.timestamp}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 md:mt-0 flex-shrink-0 w-full md:w-auto flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => handleToggleReadStatus(alert, e)}
                      className={`font-bold px-3 py-1.5 rounded transition-all uppercase tracking-wider text-[9px] cursor-pointer ${
                        alert.isRead
                          ? "bg-white/5 hover:bg-white/10 text-[#8e8e93] hover:text-white border border-white/10"
                          : "bg-[#00FF9D]/10 hover:bg-[#00FF9D]/20 text-[#00FF9D] border border-[#00FF9D]/30"
                      }`}
                    >
                      {alert.isRead ? "Mark Unread" : "Mark Read"}
                    </button>
                    <button
                      onClick={() => handleNotificationClick(alert)}
                      className="bg-white text-black hover:bg-[#eaeaea] active:bg-[#d9d9d9] font-extrabold px-4 py-1.5 rounded transition-all uppercase tracking-wider text-[9px] shadow-md hover:scale-[1.02] duration-200 cursor-pointer"
                    >
                      {alert.category === "order"
                        ? "View Order"
                        : alert.category === "inventory"
                        ? "Manage Staff"
                        : "Resolve Alert"}
                    </button>
                    <button
                      onClick={(e) => handleDeleteNotification(alert, e)}
                      title="Delete Notification"
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-1.5 rounded transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
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
