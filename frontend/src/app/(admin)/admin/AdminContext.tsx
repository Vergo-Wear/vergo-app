"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Types
export interface InventoryItem {
  sku: string;
  name: string;
  location: string;
  inStock: number;
  status: "VERIFYING" | "PENDING" | "PROCESSING" | "SHIPPED";
}

export interface StockAlert {
  id: string;
  sku: string;
  name: string;
  node: string;
  units: number;
  status: "critical" | "warning";
}

export interface EmployeeRank {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  status: "ON SHIFT" | "OFF SHIFT";
  parcels: number;
}

export interface DashboardStats {
  completedUnits: number;
  activeNodes: number;
  activeStaff: number;
  pendingShipments: number;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface AdminContextType {
  inventory: InventoryItem[];
  alerts: StockAlert[];
  employees: EmployeeRank[];
  stats: DashboardStats;
  notifications: ToastNotification[];
  searchQuery: string;
  statusFilter: string;
  transferModalOpen: boolean;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: string) => void;
  setTransferModalOpen: (open: boolean) => void;
  addNotification: (message: string, type: "success" | "error" | "info") => void;
  removeNotification: (id: string) => void;
  transferStock: (sku: string, fromNode: string, toNode: string, amount: number) => boolean;
  toggleEmployeeShift: (id: string) => void;
  restockItem: (sku: string, location: string, amount: number) => void;
  shipPendingItem: (sku: string, location: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  // Initial inventory items matching the Figma screenshot + expansion items for pagination
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { sku: "VGO-HOOD-B-L", name: "Heavy Cotton Hoodie", location: "NODE_LA_01", inStock: 150, status: "VERIFYING" },
    { sku: "VGO-PANT-O-M", name: "Tactical Cargo Pant", location: "NODE_NY_04", inStock: 42, status: "PENDING" },
    { sku: "VGO-ACC-B-OS", name: "Vergo Logo Beanie", location: "NODE_TK_01", inStock: 520, status: "PROCESSING" },
    { sku: "VGO-TEE-W-XL", name: "Distressed Boxy Tee", location: "NODE_LDN_02", inStock: 9, status: "SHIPPED" },
    { sku: "VGO-JKT-B-S", name: "Technical Shell Jacket", location: "NODE_PAR_01", inStock: 31, status: "VERIFYING" },
    { sku: "VGO-TEE-B-L", name: "Heavyweight Blank Tee", location: "NODE_LA_01", inStock: 220, status: "SHIPPED" },
    { sku: "VGO-SOCKS-W-O", name: "Crew Socks 3-Pack", location: "NODE_NY_02", inStock: 14, status: "PENDING" },
    { sku: "VGO-BEAN-O-OS", name: "Ribbed Orange Beanie", location: "NODE_TK_04", inStock: 60, status: "PROCESSING" },
    { sku: "VGO-CARGO-G-S", name: "Ripstop Cargo Pant", location: "NODE_PAR_01", inStock: 8, status: "VERIFYING" },
    { sku: "VGO-HOOD-G-M", name: "Vintage Green Hoodie", location: "NODE_LDN_02", inStock: 112, status: "SHIPPED" },
    { sku: "VGO-BELT-B-OS", name: "Tactical Web Belt", location: "NODE_TK_01", inStock: 45, status: "PROCESSING" },
    { sku: "VGO-CAP-B-OS", name: "Embroidered Panel Cap", location: "NODE_LA_01", inStock: 89, status: "SHIPPED" },
  ]);

  // Initial critical stock alerts
  const [alerts, setAlerts] = useState<StockAlert[]>([
    { id: "1", sku: "VGO-HOOD-B-L", name: "Oversized Hoodie / BLK", node: "NODE_LA_01", units: 4, status: "critical" },
    { id: "2", sku: "VGO-PANT-O-M", name: "Gorpcore Pant / OLV", node: "NODE_TK_04", units: 2, status: "critical" },
    { id: "3", sku: "VGO-TEE-W-XL", name: "Distressed Tee / WHT", node: "NODE_NY_02", units: 9, status: "critical" },
  ]);

  // Initial employees list matching Figma
  const [employees, setEmployees] = useState<EmployeeRank[]>([
    { id: "e1", rank: 1, name: "Alex Rivera", avatar: "AR", status: "ON SHIFT", parcels: 142 },
    { id: "e2", rank: 2, name: "Jordan Smith", avatar: "JS", status: "ON SHIFT", parcels: 128 },
    { id: "e3", rank: 3, name: "Sam Chen", avatar: "SC", status: "OFF SHIFT", parcels: 115 },
  ]);

  // Global Dashboard Stats
  const [stats, setStats] = useState<DashboardStats>({
    completedUnits: 14204,
    activeNodes: 24,
    activeStaff: 82,
    pendingShipments: 312,
  });

  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Dynamic active staff count based on employee shift status
  useEffect(() => {
    const onShiftCount = employees.filter((e) => e.status === "ON SHIFT").length;
    // Base of 80 off-screen staff + visible on-screen staff
    setStats((prev) => ({
      ...prev,
      activeStaff: 80 + onShiftCount,
    }));
  }, [employees]);

  // Add a toast notification helper
  const addNotification = (message: string, type: "success" | "error" | "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 4000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Stock transfer action logic
  const transferStock = (sku: string, fromNode: string, toNode: string, amount: number): boolean => {
    if (amount <= 0) {
      addNotification("Transfer quantity must be greater than zero.", "error");
      return false;
    }

    if (fromNode === toNode) {
      addNotification("Source and destination nodes cannot be the same.", "error");
      return false;
    }

    // Find the item at the source node
    const sourceIndex = inventory.findIndex((item) => item.sku === sku && item.location === fromNode);
    if (sourceIndex === -1) {
      addNotification(`Item ${sku} not found at node ${fromNode}.`, "error");
      return false;
    }

    const sourceItem = inventory[sourceIndex];
    if (sourceItem.inStock < amount) {
      addNotification(
        `Insufficient stock! ${sku} at ${fromNode} only has ${sourceItem.inStock} units (requested ${amount}).`,
        "error"
      );
      return false;
    }

    // Process the stock transfer
    const updatedInventory = [...inventory];
    
    // Deduct stock from source
    updatedInventory[sourceIndex] = {
      ...sourceItem,
      inStock: sourceItem.inStock - amount,
    };

    // Add or increment stock at destination
    const destIndex = updatedInventory.findIndex((item) => item.sku === sku && item.location === toNode);
    if (destIndex !== -1) {
      updatedInventory[destIndex] = {
        ...updatedInventory[destIndex],
        inStock: updatedInventory[destIndex].inStock + amount,
      };
    } else {
      // Find item details from inventory to replicate name
      const itemTemplate = inventory.find((item) => item.sku === sku);
      updatedInventory.push({
        sku,
        name: itemTemplate ? itemTemplate.name : "Stock Item",
        location: toNode,
        inStock: amount,
        status: "PROCESSING",
      });
    }

    setInventory(updatedInventory);

    // If transfer resolves a stock alert at the destination node
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) => {
        if (alert.sku === sku && alert.node === toNode) {
          const newUnits = alert.units + amount;
          return { ...alert, units: newUnits };
        }
        if (alert.sku === sku && alert.node === fromNode) {
          const newUnits = Math.max(0, alert.units - amount);
          return { ...alert, units: newUnits };
        }
        return alert;
      })
    );

    // Log success
    addNotification(`Successfully transferred ${amount} units of ${sku} from ${fromNode} to ${toNode}.`, "success");
    
    // Update dashboard completed units count
    setStats((prev) => ({
      ...prev,
      completedUnits: prev.completedUnits + amount,
    }));

    return true;
  };

  // Toggle shift state for an employee
  const toggleEmployeeShift = (id: string) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          const newStatus = emp.status === "ON SHIFT" ? "OFF SHIFT" : "ON SHIFT";
          addNotification(
            `${emp.name} is now ${newStatus.toLowerCase()}.`,
            newStatus === "ON SHIFT" ? "success" : "info"
          );
          return { ...emp, status: newStatus };
        }
        return emp;
      })
    );
  };

  // Restock items (for sub-page inventory actions)
  const restockItem = (sku: string, location: string, amount: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.sku === sku && item.location === location) {
          return { ...item, inStock: item.inStock + amount };
        }
        return item;
      })
    );

    // Update alert count if applicable
    setAlerts((prev) =>
      prev.map((alert) => {
        if (alert.sku === sku && alert.node === location) {
          return { ...alert, units: alert.units + amount };
        }
        return alert;
      })
    );

    addNotification(`Restocked +${amount} units of ${sku} at ${location}.`, "success");
  };

  // Ship pending items
  const shipPendingItem = (sku: string, location: string) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.sku === sku && item.location === location) {
          return { ...item, status: "SHIPPED" };
        }
        return item;
      })
    );

    setStats((prev) => ({
      ...prev,
      pendingShipments: Math.max(0, prev.pendingShipments - 1),
    }));

    addNotification(`Order containing ${sku} at ${location} has been marked as shipped.`, "success");
  };

  return (
    <AdminContext.Provider
      value={{
        inventory,
        alerts,
        employees,
        stats,
        notifications,
        searchQuery,
        statusFilter,
        transferModalOpen,
        setSearchQuery,
        setStatusFilter,
        setTransferModalOpen,
        addNotification,
        removeNotification,
        transferStock,
        toggleEmployeeShift,
        restockItem,
        shipPendingItem,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
