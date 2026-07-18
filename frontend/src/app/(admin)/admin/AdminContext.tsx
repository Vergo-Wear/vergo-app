"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface InventoryItem { inventoryId?: string; sku: string; name: string; location: string; inStock: number; status: "VERIFYING" | "PENDING" | "PROCESSING" | "SHIPPED"; reorderLevel?: number }
export interface StockAlert { id: string; sku: string; name: string; node: string; units: number; status: "critical" | "warning" }
export interface EmployeeRank { id: string; rank: number; name: string; avatar: string; status: "ON SHIFT" | "OFF SHIFT"; parcels: number }
export interface DashboardStats { completedUnits: number; activeNodes: number; activeStaff: number; pendingShipments: number }
export interface ToastNotification { id: string; message: string; type: "success" | "error" | "info" }

export interface AdminAlert {
  id: string;
  type: "payment_pending" | "payment_expired" | "cod_new" | "payment_rejected" | "low_stock";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  link: string;
}

interface AdminContextType {
  inventory: InventoryItem[]; alerts: StockAlert[]; employees: EmployeeRank[]; stats: DashboardStats; notifications: ToastNotification[];
  orders: any[]; adminAlerts: AdminAlert[];
  searchQuery: string; statusFilter: string; transferModalOpen: boolean;
  setSearchQuery: (query: string) => void; setStatusFilter: (filter: string) => void; setTransferModalOpen: (open: boolean) => void;
  addNotification: (message: string, type: "success" | "error" | "info") => void; removeNotification: (id: string) => void;
  transferStock: (sku: string, fromNode: string, toNode: string, amount: number) => boolean;
  toggleEmployeeShift: (id: string) => void; restockItem: (sku: string, location: string, amount: number) => void; shipPendingItem: (sku: string, location: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeRank[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ completedUnits: 0, activeNodes: 0, activeStaff: 0, pendingShipments: 0 });
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const addNotification = (message: string, type: ToastNotification["type"]) => {
    const id = crypto.randomUUID();
    setNotifications((current) => [...current, { id, message, type }]);
    window.setTimeout(() => setNotifications((current) => current.filter((item) => item.id !== id)), 4000);
  };
  const removeNotification = (id: string) => setNotifications((current) => current.filter((item) => item.id !== id));

  useEffect(() => {
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) return;
    
    Promise.all([
      fetch(`${API_URL}/admin/overview`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Unable to retrieve admin overview data.");
          return response.json();
        }),
      fetch(`${API_URL}/orders/manage`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Unable to retrieve managed orders.");
          return response.json();
        })
    ])
    .then(([overviewData, ordersData]) => {
      setInventory(overviewData.inventory.map((item: InventoryItem) => ({ ...item, status: item.inStock <= (item.reorderLevel || 0) ? "PENDING" : "PROCESSING" })));
      setEmployees(overviewData.employees.map((employee: { id: string; name: string; status: string }, index: number) => ({ id: employee.id, rank: index + 1, name: employee.name, avatar: employee.name.split(" ").map((part) => part[0]).join("").slice(0, 2), status: employee.status === "active" ? "ON SHIFT" : "OFF SHIFT", parcels: 0 })));
      setStats(overviewData.stats);
      setOrders(ordersData);
    })
    .catch((error: Error) => addNotification(error.message, "error"));
  }, []);

  const persistQuantity = (item: InventoryItem, quantity: number) => {
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token || !item.inventoryId) return;
    fetch(`${API_URL}/admin/inventory/${item.inventoryId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ quantity }) })
      .catch(() => addNotification("Unable to update inventory.", "error"));
  };

  const transferStock = (sku: string, fromNode: string, toNode: string, amount: number) => {
    const source = inventory.find((item) => item.sku === sku && item.location === fromNode);
    const destination = inventory.find((item) => item.sku === sku && item.location === toNode);
    if (!source || !destination || amount <= 0 || source.inStock < amount) return false;
    setInventory((current) => current.map((item) => item === source ? { ...item, inStock: item.inStock - amount } : item === destination ? { ...item, inStock: item.inStock + amount } : item));
    persistQuantity(source, source.inStock - amount); persistQuantity(destination, destination.inStock + amount);
    return true;
  };
  const restockItem = (sku: string, location: string, amount: number) => {
    const item = inventory.find((entry) => entry.sku === sku && entry.location === location);
    if (!item || amount <= 0) return;
    setInventory((current) => current.map((entry) => entry === item ? { ...entry, inStock: entry.inStock + amount } : entry));
    persistQuantity(item, item.inStock + amount);
  };
  const toggleEmployeeShift = () => addNotification("Shift tracking is not configured in the database.", "error");
  const shipPendingItem = () => addNotification("Shipment status belongs to an order, not inventory.", "error");
  const alerts: StockAlert[] = inventory.filter((item) => item.inStock <= (item.reorderLevel || 0)).map((item) => ({ id: item.inventoryId || item.sku, sku: item.sku, name: item.name, node: item.location, units: item.inStock, status: "critical" }));

  const adminAlerts = React.useMemo(() => {
    const list: AdminAlert[] = [];

    orders.forEach((order: any) => {
      const method = order.paymentMethod?.toLowerCase() || "";
      const status = order.orderStatus;
      const customerName = order.customerDetails
        ? `${order.customerDetails.firstName} ${order.customerDetails.lastName}`
        : "Guest";

      if (method.includes("bank") && status === "Pending Verification") {
        list.push({
          id: `pending-verify-${order.orderId}`,
          type: "payment_pending",
          severity: "warning",
          title: "Pending Payment Verification",
          message: `Order #${order.orderId.slice(0, 8).toUpperCase()} by ${customerName} is awaiting payment verification.`,
          timestamp: order.orderDate ? new Date(order.orderDate).toLocaleString() : new Date().toLocaleString(),
          link: "/admin/orders",
        });
      }

      if (method.includes("bank") && status === "Expired") {
        list.push({
          id: `expired-bank-${order.orderId}`,
          type: "payment_expired",
          severity: "critical",
          title: "Bank Transfer Expired",
          message: `Order #${order.orderId.slice(0, 8).toUpperCase()} hold expired (no payment receipt uploaded).`,
          timestamp: order.orderDate ? new Date(order.orderDate).toLocaleString() : new Date().toLocaleString(),
          link: "/admin/orders",
        });
      }

      if ((method.includes("cash") || method.includes("cod")) && status === "Pending" && order.confirmationStatus === "Pending") {
        list.push({
          id: `new-cod-${order.orderId}`,
          type: "cod_new",
          severity: "info",
          title: "New COD Order Pending",
          message: `Order #${order.orderId.slice(0, 8).toUpperCase()} by ${customerName} is pending confirmation.`,
          timestamp: order.orderDate ? new Date(order.orderDate).toLocaleString() : new Date().toLocaleString(),
          link: "/admin/orders",
        });
      }

      if (method.includes("bank") && status === "Rejected") {
        list.push({
          id: `rejected-payment-${order.orderId}`,
          type: "payment_rejected",
          severity: "critical",
          title: "Payment Proof Rejected",
          message: `Order #${order.orderId.slice(0, 8).toUpperCase()} payment proof was rejected.`,
          timestamp: order.orderDate ? new Date(order.orderDate).toLocaleString() : new Date().toLocaleString(),
          link: "/admin/orders",
        });
      }
    });

    inventory.forEach((item: InventoryItem) => {
      const limit = item.reorderLevel !== undefined ? item.reorderLevel : 10;
      if (item.inStock <= limit) {
        list.push({
          id: `low-stock-${item.inventoryId || item.sku}`,
          type: "low_stock",
          severity: "critical",
          title: "Low Stock Alert",
          message: `${item.name} (${item.sku}) is running low at ${item.location}. Current quantity: ${item.inStock}.`,
          timestamp: "Live",
          link: "/admin/inventory",
        });
      }
    });

    return list.sort((a, b) => {
      if (a.timestamp === "Live" && b.timestamp !== "Live") return -1;
      if (b.timestamp === "Live" && a.timestamp !== "Live") return 1;
      if (a.timestamp === "Live" && b.timestamp === "Live") return 0;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [orders, inventory]);

  return <AdminContext.Provider value={{ inventory, alerts, employees, stats, notifications, orders, adminAlerts, searchQuery, statusFilter, transferModalOpen, setSearchQuery, setStatusFilter, setTransferModalOpen, addNotification, removeNotification, transferStock, toggleEmployeeShift, restockItem, shipPendingItem }}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within an AdminProvider");
  return context;
}
