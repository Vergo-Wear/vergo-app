"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface InventoryItem { inventoryId?: string; sku: string; name: string; location: string; inStock: number; status: "VERIFYING" | "PENDING" | "PROCESSING" | "SHIPPED"; reorderLevel?: number }
export interface StockAlert { id: string; sku: string; name: string; node: string; units: number; status: "critical" | "warning" }
export interface EmployeeRank { id: string; rank: number; name: string; avatar: string; status: "ON SHIFT" | "OFF SHIFT"; parcels: number }
export interface DashboardStats { completedUnits: number; activeNodes: number; activeStaff: number; pendingShipments: number }
export interface ToastNotification { id: string; message: string; type: "success" | "error" | "info" }

interface AdminContextType {
  inventory: InventoryItem[]; alerts: StockAlert[]; employees: EmployeeRank[]; stats: DashboardStats; notifications: ToastNotification[];
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
    const token = localStorage.getItem("vergo_access_token");
    if (!token) return;
    fetch(`${API_URL}/admin/overview`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to retrieve admin data.");
        return response.json();
      })
      .then((data) => {
        setInventory(data.inventory.map((item: InventoryItem) => ({ ...item, status: item.inStock <= (item.reorderLevel || 0) ? "PENDING" : "PROCESSING" })));
        setEmployees(data.employees.map((employee: { id: string; name: string; status: string }, index: number) => ({ id: employee.id, rank: index + 1, name: employee.name, avatar: employee.name.split(" ").map((part) => part[0]).join("").slice(0, 2), status: employee.status === "active" ? "ON SHIFT" : "OFF SHIFT", parcels: 0 })));
        setStats(data.stats);
      })
      .catch((error: Error) => addNotification(error.message, "error"));
  }, []);

  const persistQuantity = (item: InventoryItem, quantity: number) => {
    const token = localStorage.getItem("vergo_access_token");
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

  return <AdminContext.Provider value={{ inventory, alerts, employees, stats, notifications, searchQuery, statusFilter, transferModalOpen, setSearchQuery, setStatusFilter, setTransferModalOpen, addNotification, removeNotification, transferStock, toggleEmployeeShift, restockItem, shipPendingItem }}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within an AdminProvider");
  return context;
}
