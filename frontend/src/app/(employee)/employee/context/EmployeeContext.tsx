"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface PickingTask { id: string; skus: number; timeRemaining: string; zone: string; status: "pending" | "claimed" }
export interface OrderItem { id: string; customerName: string; customerEmail: string; customerPhone: string; customerAddress: string; timestamp: string; paymentMethod: "COD" | "BANK"; status: "Ready to Pick" | "Claimed" | "Preparing" | "Ready for Pickup" | "Sent"; valuation: number; initials: string; claimedBy: string | null; itemsList: { description: string; qty: number; unitPrice: number; sku: string }[] }
export interface ProductPrepItem { id: string; name: string; sku: string; size: string; color: string; imageColor: string; quantity: number; orders: string; assignedTo: string; assignedInitials: string; status: "PREPARING" | "NOT STARTED" | "READY" }
export interface ReadyPickupItem { id: string; batch: string; customerName: string; initials: string; readyTime: string; relativeTime: string; notificationStatus: "SENT" | "FAILED" | "QUEUED"; deliveryPrep: "READY" | "INCOMPLETE" }
export interface NotificationItem { id: string; title: string; message: string; timestamp: string; type: "info" | "warning" | "success" | "error"; read: boolean }
export interface StockItem { id: string; name: string; sku: string; size: string; color: string; qty: number; lowStockLimit: number }
export interface StockRequest { id: string; productName: string; sku: string; qtyRequested: number; status: "PENDING" | "APPROVED"; timestamp: string }

interface EmployeeContextType {
  searchQuery: string; setSearchQuery: (query: string) => void; dailyTotal: number; currentStreak: number; efficiency: number; systemStatus: "Operational" | "Degraded" | "Outage"; preparedCODTotal: number; preparedBankTotal: number;
  pickingQueue: PickingTask[]; orders: OrderItem[]; productPrepQueue: ProductPrepItem[]; readyPickups: ReadyPickupItem[]; notifications: NotificationItem[]; stockLevels: StockItem[]; stockRequests: StockRequest[];
  isEmployeeAvailable: boolean; availabilityStatus: "ACTIVE DUTY" | "ON BREAK"; availabilityLastNotified: string | null; activeDeliveryPrepId: string; waybillStatus: "idle" | "generating" | "generated"; pickupStatus: "idle" | "requesting" | "requested"; packageDimensions: { length: string; width: string; height: string }; packageWeight: string; pickupSlot: string;
  claimTask: (id: string) => boolean; claimOrder: (id: string) => boolean; startPrep: (sku: string) => void; updatePrepStatus: (sku: string, status: "PREPARING" | "NOT STARTED" | "READY") => void; finalizeDelivery: (id: string) => void; notifyCustomer: (id: string) => void; toggleAvailability: () => void; notifyAvailabilityToAdmin: () => void; setDimensions: (dims: { length: string; width: string; height: string }) => void; setWeight: (w: string) => void; setPickupSlot: (slot: string) => void; triggerWaybillGeneration: () => void; triggerPickupRequest: () => void; selectActiveDeliveryPrep: (id: string) => void; addNotification: (title: string, message: string, type: NotificationItem["type"]) => void; clearNotifications: () => void; addNewOrder: (order: Partial<OrderItem>) => void; requestStockFromAdmin: (sku: string, quantity: number) => void; logoutEmployee: () => void;
}

interface RawOrder { orderId: string; orderDate: string | null; orderStatus: string | null; totalAmount: string | number; paymentMethod: string; shippingAddress: string; customerDetails: { firstName: string; lastName: string; email: string; phone: string } | null; orderItems: Array<{ quantity: number; unitPrice: string | number; variant: { sku: string; size: string; color: string; product: { name: string } | null } | null }> }
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);
export const useEmployee = () => { const value = useContext(EmployeeContext); if (!value) throw new Error("useEmployee must be used within an EmployeeProvider"); return value; };

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stockLevels, setStockLevels] = useState<StockItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<"ACTIVE DUTY" | "ON BREAK">("ON BREAK");
  const [activeDeliveryPrepId, setActiveDeliveryPrepId] = useState("");
  const [waybillStatus, setWaybillStatus] = useState<"idle" | "generating" | "generated">("idle");
  const [pickupStatus, setPickupStatus] = useState<"idle" | "requesting" | "requested">("idle");
  const [packageDimensions, setDimensions] = useState({ length: "", width: "", height: "" });
  const [packageWeight, setWeight] = useState("");
  const [pickupSlot, setPickupSlot] = useState("");

  const token = () => localStorage.getItem("vergo_access_token");
  const addNotification = (title: string, message: string, type: NotificationItem["type"]) => setNotifications((current) => [{ id: crypto.randomUUID(), title, message, timestamp: new Date().toLocaleTimeString(), type, read: false }, ...current]);
  const mapOrder = (order: RawOrder): OrderItem => {
    const name = order.customerDetails ? `${order.customerDetails.firstName} ${order.customerDetails.lastName}` : "Guest";
    const supported = ["Ready to Pick", "Claimed", "Preparing", "Ready for Pickup", "Sent"];
    return { id: order.orderId, customerName: name, customerEmail: order.customerDetails?.email || "", customerPhone: order.customerDetails?.phone || "", customerAddress: order.shippingAddress, timestamp: order.orderDate ? new Date(order.orderDate).toLocaleString() : "", paymentMethod: order.paymentMethod.toLowerCase().includes("bank") ? "BANK" : "COD", status: (supported.includes(order.orderStatus || "") ? order.orderStatus : "Ready to Pick") as OrderItem["status"], valuation: Number(order.totalAmount), initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2), claimedBy: null, itemsList: order.orderItems.map((item) => ({ description: `${item.variant?.product?.name || "Product"} / ${item.variant?.color || ""}`, qty: item.quantity, unitPrice: Number(item.unitPrice), sku: item.variant?.sku || "" })) };
  };

  useEffect(() => {
    const auth = token(); if (!auth) return;
    Promise.all([
      fetch(`${API_URL}/orders/manage`, { headers: { Authorization: `Bearer ${auth}` }, cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject(new Error("Unable to load orders."))),
      fetch(`${API_URL}/product-catalogue`, { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject(new Error("Unable to load stock."))),
      fetch(`${API_URL}/employees/me`, { headers: { Authorization: `Bearer ${auth}` }, cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject(new Error("Unable to load employee profile."))),
    ]).then(([rawOrders, products, employee]) => {
      setOrders((rawOrders as RawOrder[]).map(mapOrder));
      setStockLevels(products.flatMap((product: any) => product.variants.map((variant: any) => ({ id: variant.variant_id, name: product.name, sku: variant.sku, size: variant.size, color: variant.colour, qty: Math.max(0, variant.inventory.quantity - variant.inventory.reserved_quantity), lowStockLimit: 10 }))));
      setAvailabilityStatus(employee.availabilityStatus === "ACTIVE_DUTY" ? "ACTIVE DUTY" : "ON BREAK");
    }).catch((error: Error) => addNotification("Database error", error.message, "error"));
  }, []);

  const updateOrderStatus = (id: string, status: OrderItem["status"]) => {
    const auth = token(); if (!auth) return;
    fetch(`${API_URL}/orders/manage/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` }, body: JSON.stringify({ status }) })
      .then((response) => { if (!response.ok) throw new Error("Unable to update order."); setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order)); })
      .catch((error: Error) => addNotification("Order update failed", error.message, "error"));
  };
  const claimOrder = (id: string) => { updateOrderStatus(id, "Claimed"); return true; };
  const claimTask = claimOrder;
  const startPrep = (sku: string) => { const order = orders.find((item) => item.itemsList.some((product) => product.sku === sku)); if (order) updateOrderStatus(order.id, "Preparing"); };
  const updatePrepStatus = (sku: string, status: ProductPrepItem["status"]) => { const order = orders.find((item) => item.itemsList.some((product) => product.sku === sku)); if (order) updateOrderStatus(order.id, status === "READY" ? "Ready for Pickup" : status === "PREPARING" ? "Preparing" : "Claimed"); };
  const finalizeDelivery = (id: string) => updateOrderStatus(id, "Sent");
  const toggleAvailability = () => { const next = availabilityStatus === "ACTIVE DUTY" ? "ON BREAK" : "ACTIVE DUTY"; const auth = token(); if (!auth) return; fetch(`${API_URL}/employees/me/availability`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` }, body: JSON.stringify({ status: next === "ACTIVE DUTY" ? "ACTIVE_DUTY" : "ON_BREAK" }) }).then((response) => { if (response.ok) setAvailabilityStatus(next); }); };
  const productPrepQueue: ProductPrepItem[] = orders.filter((order) => ["Claimed", "Preparing"].includes(order.status)).flatMap((order) => order.itemsList.map((item) => ({ id: `${order.id}-${item.sku}`, name: item.description, sku: item.sku, size: "", color: "", imageColor: "#111111", quantity: item.qty, orders: `Order #${order.id}`, assignedTo: order.claimedBy || "Current employee", assignedInitials: "", status: order.status === "Preparing" ? "PREPARING" : "NOT STARTED" }))) as ProductPrepItem[];
  const readyPickups: ReadyPickupItem[] = orders.filter((order) => order.status === "Ready for Pickup").map((order) => ({ id: order.id, batch: `Order #${order.id}`, customerName: order.customerName, initials: order.initials, readyTime: order.timestamp, relativeTime: "", notificationStatus: "QUEUED", deliveryPrep: "READY" }));
  const pickingQueue = orders.filter((order) => order.status === "Ready to Pick").map((order) => ({ id: order.id, skus: order.itemsList.length, timeRemaining: "", zone: "", status: "pending" as const }));
  const prepared = orders.filter((order) => ["Ready for Pickup", "Sent"].includes(order.status));
  const logoutEmployee = () => { ["vergo_user", "vergo_is_logged_in", "vergo_access_token", "vergo_refresh_token"].forEach((key) => localStorage.removeItem(key)); window.dispatchEvent(new Event("vergo-auth-change")); window.location.href = "/auth/login"; };

  const value: EmployeeContextType = { searchQuery, setSearchQuery, dailyTotal: orders.length, currentStreak: 0, efficiency: orders.length ? Number(((prepared.length / orders.length) * 100).toFixed(1)) : 0, systemStatus: "Operational", preparedCODTotal: prepared.filter((o) => o.paymentMethod === "COD").reduce((sum, o) => sum + o.valuation, 0), preparedBankTotal: prepared.filter((o) => o.paymentMethod === "BANK").reduce((sum, o) => sum + o.valuation, 0), pickingQueue, orders, productPrepQueue, readyPickups, notifications, stockLevels, stockRequests: [], isEmployeeAvailable: availabilityStatus === "ACTIVE DUTY", availabilityStatus, availabilityLastNotified: null, activeDeliveryPrepId, waybillStatus, pickupStatus, packageDimensions, packageWeight, pickupSlot, claimTask, claimOrder, startPrep, updatePrepStatus, finalizeDelivery, notifyCustomer: (id) => addNotification("Customer notification", `Notification requested for order ${id}.`, "info"), toggleAvailability, notifyAvailabilityToAdmin: () => addNotification("Availability updated", availabilityStatus, "info"), setDimensions, setWeight, setPickupSlot, triggerWaybillGeneration: () => setWaybillStatus("generated"), triggerPickupRequest: () => setPickupStatus("requested"), selectActiveDeliveryPrep: setActiveDeliveryPrepId, addNotification, clearNotifications: () => setNotifications([]), addNewOrder: () => addNotification("Unsupported action", "Orders must be created through checkout.", "warning"), requestStockFromAdmin: () => addNotification("Unavailable", "Stock requests require a database table before they can be submitted.", "warning"), logoutEmployee };
  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}
