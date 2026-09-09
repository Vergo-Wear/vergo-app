"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface PickingTask {
  id: string;
  skus: number;
  timeRemaining: string;
  zone: string;
  status: "pending" | "claimed";
}
export interface OrderItem {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  timestamp: string;
  paymentMethod: "COD" | "BANK";
  status:
    | "Ready to Pick"
    | "Claimed"
    | "Preparing"
    | "Ready for Pickup"
    | "Ready for Courier Pickup"
    | "Handed to Citypak Courier"
    | "Finished"
    | "Sent"
    | string;
  dbStatus: string;
  valuation: number;
  deliveryFee: number;
  initials: string;
  claimedBy: string | null;
  employeeId?: string | null;
  stockAvailable: boolean;
  stockShortages: string[];
  itemsList: {
    description: string;
    size: string;
    color: string;
    qty: number;
    unitPrice: number;
    sku: string;
  }[];
}
export interface ProductPrepItem {
  id: string;
  name: string;
  sku: string;
  size: string;
  color: string;
  imageColor: string;
  quantity: number;
  orders: string;
  assignedTo: string;
  assignedInitials: string;
  status: "PREPARING" | "NOT STARTED" | "READY";
}
export interface ReadyPickupItem {
  id: string;
  batch: string;
  customerName: string;
  initials: string;
  readyTime: string;
  relativeTime: string;
  notificationStatus: "SENT" | "FAILED" | "QUEUED";
  deliveryPrep: "READY" | "INCOMPLETE";
}
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
}
export interface StockItem {
  id: string;
  name: string;
  sku: string;
  size: string;
  color: string;
  qty: number;
  lowStockLimit: number;
}
export interface EmployeeAllocatedStock {
  inventoryId: string;
  variantId: string;
  sku: string;
  productName: string;
  category: string;
  size: string;
  color: string;
  qty: number;
  reorderLevel: number;
  lastUpdated: string | null;
  branchName: string;
  imageUrl: string | null;
}
export interface StockRequest {
  id: string;
  productName: string;
  sku: string;
  qtyRequested: number;
  status: "PENDING" | "APPROVED";
  timestamp: string;
}

interface EmployeeContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dailyTotal: number;
  currentStreak: number;
  efficiency: number;
  systemStatus: "Operational" | "Degraded" | "Outage";
  preparedCODTotal: number;
  preparedBankTotal: number;
  pickingQueue: PickingTask[];
  orders: OrderItem[];
  productPrepQueue: ProductPrepItem[];
  readyPickups: ReadyPickupItem[];
  notifications: NotificationItem[];
  stockLevels: StockItem[];
  myStock: EmployeeAllocatedStock[];
  loadingMyStock: boolean;
  fetchMyStock: () => Promise<void>;
  stockRequests: StockRequest[];
  isEmployeeAvailable: boolean;
  availabilityStatus: "AVAILABLE" | "BUSY" | "OFF DUTY";
  availabilityLastNotified: string | null;
  activeDeliveryPrepId: string;
  waybillStatus: "idle" | "generating" | "generated";
  pickupStatus: "idle" | "requesting" | "requested";
  packageDimensions: { length: string; width: string; height: string };
  packageWeight: string;
  pickupSlot: string;
  claimTask: (id: string) => Promise<boolean>;
  claimOrder: (id: string) => Promise<boolean>;
  returnToOrdersQueue: (orderId: string) => Promise<boolean>;
  updateOrderStatus: (id: string, status: OrderItem["status"]) => Promise<boolean>;
  createCitypakOrder: (orderId: string) => Promise<any>;
  startPrep: (sku: string) => void;
  updatePrepStatus: (
    sku: string,
    status: "PREPARING" | "NOT STARTED" | "READY",
  ) => void;
  finalizeDelivery: (id: string) => void;
  notifyCustomer: (id: string) => void;
  toggleAvailability: () => void;
  notifyAvailabilityToAdmin: () => void;
  setDimensions: (dims: {
    length: string;
    width: string;
    height: string;
  }) => void;
  setWeight: (w: string) => void;
  setPickupSlot: (slot: string) => void;
  triggerWaybillGeneration: () => void;
  triggerPickupRequest: () => void;
  selectActiveDeliveryPrep: (id: string) => void;
  submitCitypakShipment: (
    orderId: string,
    data: {
      weightGrams: number;
      numberOfPieces: number;
      description?: string;
      lengthCm?: number;
      widthCm?: number;
      heightCm?: number;
    },
  ) => Promise<any>;
  printCitypakWaybill: (orderId: string) => Promise<void>;
  requestCitypakPickup: (pickupData: {
    orderIds: string[];
    pickupAddressLine1: string;
    pickupAddressLine2?: string;
    pickupAddressLine3?: string;
    pickupAddressLine4City: string;
    pickupContactPerson: string;
    pickupContactNumber1: string;
    pickupFromDatetime: string;
    pickupToDatetime: string;
  }) => Promise<any>;
  refreshCitypakTracking: (trackingNumber: string) => Promise<any>;
  syncCitypakStatus: () => Promise<any>;
  lastSyncTime: string | null;
  fetchOrders: () => Promise<void>;
  addNotification: (
    title: string,
    message: string,
    type: NotificationItem["type"],
  ) => void;
  clearNotifications: () => void;
  requestStockFromAdmin: (
    sku: string,
    quantity: number,
    details?: { productName?: string; size?: string; color?: string; notes?: string },
  ) => Promise<void>;
  logoutEmployee: () => void;
}

interface RawOrder {
  orderId: string;
  employeeId: string | null;
  orderDate: string | null;
  orderStatus: string | null;
  confirmationStatus: string;
  totalAmount: string | number;
  deliveryFee?: string | number;
  paymentMethod: string;
  shippingAddress: string;
  stockAvailable?: boolean;
  stockShortages?: string[];
  customerDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null;
  orderItems: Array<{
    quantity: number;
    unitPrice: string | number;
    variant: {
      sku: string;
      size: string;
      color: string;
      product: { name: string } | null;
    } | null;
  }>;
}
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const EmployeeContext = createContext<EmployeeContextType | undefined>(
  undefined,
);
export const useEmployee = () => {
  const value = useContext(EmployeeContext);
  if (!value)
    throw new Error("useEmployee must be used within an EmployeeProvider");
  return value;
};

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stockLevels, setStockLevels] = useState<StockItem[]>([]);
  const [myStock, setMyStock] = useState<EmployeeAllocatedStock[]>([]);
  const [loadingMyStock, setLoadingMyStock] = useState(false);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<
    "AVAILABLE" | "BUSY" | "OFF DUTY"
  >("OFF DUTY");
  const [activeDeliveryPrepId, setActiveDeliveryPrepId] = useState("");
  const [waybillStatus, setWaybillStatus] = useState<
    "idle" | "generating" | "generated"
  >("idle");
  const [pickupStatus, setPickupStatus] = useState<
    "idle" | "requesting" | "requested"
  >("idle");
  const [packageDimensions, setDimensions] = useState({
    length: "",
    width: "",
    height: "",
  });
  const [packageWeight, setWeight] = useState("");
  const [pickupSlot, setPickupSlot] = useState("");

  const token = () => sessionStorage.getItem("vergo_access_token");
  const addNotification = (
    title: string,
    message: string,
    type: NotificationItem["type"],
  ) =>
    setNotifications((current) => [
      {
        id: crypto.randomUUID(),
        title,
        message,
        timestamp: new Date().toLocaleTimeString(),
        type,
        read: false,
      },
      ...current,
    ]);
  const mapOrder = (order: RawOrder): OrderItem | null => {
    if (!order || !order.orderId) return null;
    const name = order.customerDetails
      ? `${order.customerDetails.firstName} ${order.customerDetails.lastName}`
      : "Customer";

    let status: OrderItem["status"] = "Ready to Pick";
    const dbSt = (order.orderStatus || "").toLowerCase();

    if (dbSt === "claimed" || dbSt === "claimed by employee") {
      status = "Claimed";
    } else if (dbSt === "preparing" || dbSt === "package prepared") {
      status = "Preparing";
    } else if (dbSt === "ready for pickup" || dbSt === "ready" || dbSt === "ready for courier pickup") {
      status = "Ready for Pickup";
    } else if (dbSt === "sent" || dbSt === "sent for delivery" || dbSt === "handed to citypak courier" || dbSt === "delivered" || dbSt === "completed" || dbSt === "finished") {
      status = "Sent";
    } else {
      status = "Ready to Pick";
    }

    return {
      id: order.orderId,
      customerName: name,
      customerEmail: order.customerDetails?.email || "",
      customerPhone: order.customerDetails?.phone || "",
      customerAddress: order.shippingAddress || "Local Store Pickup",
      timestamp: order.orderDate
        ? new Date(order.orderDate).toLocaleString()
        : new Date().toLocaleString(),
      paymentMethod: (order.paymentMethod || "").toLowerCase().includes("bank")
        ? "BANK"
        : "COD",
      status,
      dbStatus: order.orderStatus || "Ready to Process",
      valuation: Number(order.totalAmount || 0),
      deliveryFee: Number(order.deliveryFee ?? 350),
      initials:
        name
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "CU",
      claimedBy: order.employeeId ? "Employee" : null,
      employeeId: order.employeeId || null,
      stockAvailable: order.stockAvailable ?? true,
      stockShortages: order.stockShortages ?? [],
      itemsList: (order.orderItems || []).map((item) => {
        const variant = item.variant as any;
        const sizeVal =
          typeof variant?.size === "object" && variant?.size !== null
            ? variant.size.name
            : typeof variant?.size === "string"
              ? variant.size
              : "Standard";

        const colorVal =
          typeof variant?.color === "object" && variant?.color !== null
            ? variant.color.name
            : typeof variant?.color === "string"
              ? variant.color
              : "Standard";

        return {
          description: variant?.product?.name || "Product Item",
          size: sizeVal || "Standard",
          color: colorVal || "Standard",
          qty: item.quantity || 1,
          unitPrice: Number(item.unitPrice || 0),
          sku: variant?.sku || "",
        };
      }),
    };
  };

  useEffect(() => {
    const auth = token();
    if (!auth) return;

    fetch(`${API_URL}/orders/manage`, {
      headers: { Authorization: `Bearer ${auth}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rawOrders) => {
        if (Array.isArray(rawOrders)) {
          setOrders(
            rawOrders
              .map(mapOrder)
              .filter((order): order is OrderItem => order !== null),
          );
        }
      })
      .catch((err) => console.error("Error fetching orders:", err));

    fetch(`${API_URL}/product-catalogue`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((products) => {
        if (Array.isArray(products)) {
          const items: StockItem[] = [];
          products.forEach((p: any) => {
            if (p.variants && p.variants.length > 0) {
              p.variants.forEach((v: any) => {
                const sizeName = typeof v.size === "object" ? v.size?.name : v.size || "M";
                const colorName = typeof v.color === "object" ? v.color?.name : v.color || "Black";
                items.push({
                  id: v.sku || v.variantId || `${p.productId}-${sizeName}-${colorName}`,
                  name: p.name,
                  sku: v.sku || (v.variantId ? String(v.variantId).substring(0, 8).toUpperCase() : `${p.name.substring(0, 3).toUpperCase()}-${sizeName}`),
                  size: sizeName,
                  color: colorName,
                  qty: Number(v.stockQuantity ?? v.availableStock ?? 12),
                  lowStockLimit: 10,
                });
              });
            }
          });
          if (items.length > 0) setStockLevels(items);
        }
      })
      .catch((err) => console.error("Error fetching catalogue:", err));

    fetch(`${API_URL}/employees/me`, {
      headers: { Authorization: `Bearer ${auth}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((employee) => {
        if (employee) {
          setAvailabilityStatus(
            employee.availabilityStatus === "AVAILABLE"
              ? "AVAILABLE"
              : employee.availabilityStatus === "BUSY"
                ? "BUSY"
                : "OFF DUTY",
          );
        }
      })
      .catch((err) => console.error("Error fetching employee profile:", err));

    fetchMyStock();
  }, []);

  const fetchMyStock = async () => {
    const auth = token();
    if (!auth) return;
    setLoadingMyStock(true);
    try {
      const res = await fetch(`${API_URL}/employees/me/stock`, {
        headers: { Authorization: `Bearer ${auth}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.allocatedStock)) {
          setMyStock(data.allocatedStock);
        }
      }
    } catch (err) {
      console.error("Error fetching employee stock:", err);
    } finally {
      setLoadingMyStock(false);
    }
  };

  const updateOrderStatus = async (id: string, status: OrderItem["status"]) => {
    const auth = token();
    if (!auth) {
      addNotification(
        "Login required",
        "Your employee session has expired. Please sign in again before claiming an order.",
        "error",
      );
      return false;
    }
    try {
      const endpoint =
        status === "Claimed"
          ? `${API_URL}/orders/manage/${id}/claim`
          : `${API_URL}/orders/manage/${id}/status`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth}`,
        },
        ...(status === "Claimed" ? {} : { body: JSON.stringify({ status }) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.message || "Unable to update order.");
      const persistedStatus =
        body.orderStatus === "Ready to Process"
          ? "Ready to Pick"
          : body.orderStatus || status;
      setOrders((current) =>
        current.map((order) =>
          order.id === id
            ? {
                ...order,
                status: persistedStatus as OrderItem["status"],
                dbStatus: body.orderStatus || status,
                claimedBy:
                  persistedStatus === "Claimed"
                    ? "Current employee"
                    : order.claimedBy,
              }
            : order,
        ),
      );
      return true;
    } catch (error) {
      addNotification(
        "Order update failed",
        error instanceof Error ? error.message : "Unable to update order.",
        "error",
      );
      return false;
    }
  };
  const claimOrder = async (id: string) => {
    const claimed = await updateOrderStatus(id, "Claimed");
    if (claimed)
      addNotification(
        "Order claimed",
        "The parcel is now available in Product Prep.",
        "success",
      );
    return claimed;
  };
  const returnToOrdersQueue = async (orderId: string) => {
    const ok = await updateOrderStatus(orderId, "Admin Approved");
    if (ok) {
      addNotification(
        "Order Returned to Queue",
        `Order #${orderId.slice(0, 8)} moved back to Orders table.`,
        "success",
      );
      await fetchOrders();
    }
    return ok;
  };
  const claimTask = claimOrder;
  const createCitypakOrder = async (orderId: string) => {
    const auth = token();
    if (!auth) return null;
    try {
      const response = await fetch(`${API_URL}/integrations/citypak/shipments/${orderId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth}`,
        },
        body: JSON.stringify({
          weightGrams: 500,
          numberOfPieces: 1,
          packageType: "PARCEL",
        }),
      });
      const data = await response.json();
      if (response.ok) {
        addNotification(
          "Citypak Order Created",
          `Citypak tracking order #${data.waybillNumber || data.citypakOrderId || orderId.slice(0, 8)} created in https://staging-m.citypak.lk/orders`,
          "success",
        );
        return data;
      } else {
        console.warn("Citypak order creation notice:", data.message);
        return null;
      }
    } catch (err: any) {
      console.warn("Citypak API connection error:", err);
      return null;
    }
  };

  const startPrep = async (sku: string) => {
    const order = orders.find(
      (item) => item.id === sku || item.itemsList.some((product) => product.sku === sku),
    );
    if (order) {
      const ok = await updateOrderStatus(order.id, "Preparing");
      if (ok) {
        await createCitypakOrder(order.id);
      }
    }
  };
  const updatePrepStatus = (sku: string, status: ProductPrepItem["status"]) => {
    const order = orders.find(
      (item) => item.id === sku || item.itemsList.some((product) => product.sku === sku),
    );
    if (order)
      updateOrderStatus(
        order.id,
        status === "READY"
          ? "Ready for Pickup"
          : status === "PREPARING"
            ? "Preparing"
            : "Claimed",
      );
  };
  const finalizeDelivery = (id: string) => updateOrderStatus(id, "Sent");
  const toggleAvailability = () => {
    const next = availabilityStatus === "AVAILABLE" ? "BUSY" : "AVAILABLE";
    const auth = token();
    if (!auth) return;
    fetch(`${API_URL}/employees/me/availability`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth}`,
      },
      body: JSON.stringify({ status: next }),
    }).then((response) => {
      if (response.ok) setAvailabilityStatus(next);
    });
  };
  const productPrepQueue: ProductPrepItem[] = orders
    .filter((order) => ["Claimed", "Preparing"].includes(order.status))
    .flatMap((order) =>
      order.itemsList.map((item) => ({
        id: `${order.id}-${item.sku}`,
        name: item.description,
        sku: item.sku,
        size: item.size,
        color: item.color,
        imageColor: "#111111",
        quantity: item.qty,
        orders: `Order #${order.id}`,
        assignedTo: order.claimedBy || "Current employee",
        assignedInitials: "",
        status: order.status === "Preparing" ? "PREPARING" : "NOT STARTED",
      })),
    ) as ProductPrepItem[];
  const readyPickups: ReadyPickupItem[] = orders
    .filter((order) => order.status === "Ready for Pickup")
    .map((order) => ({
      id: order.id,
      batch: `Order #${order.id}`,
      customerName: order.customerName,
      initials: order.initials,
      readyTime: order.timestamp,
      relativeTime: "",
      notificationStatus: "QUEUED",
      deliveryPrep: "READY",
    }));
  const pickingQueue = orders
    .filter((order) => order.status === "Ready to Pick")
    .map((order) => ({
      id: order.id,
      skus: order.itemsList.length,
      timeRemaining: "",
      zone: "",
      status: "pending" as const,
    }));
  const prepared = orders.filter((order) =>
    ["Ready for Pickup", "Sent"].includes(order.status),
  );
  const logoutEmployee = () => {
    sessionStorage.clear();
    window.dispatchEvent(new Event("vergo-auth-change"));
    window.location.href = "/auth/login";
  };

  const fetchOrders = async () => {
    const auth = token();
    if (!auth) return;
    try {
      const res = await fetch(`${API_URL}/orders/manage`, {
        headers: { Authorization: `Bearer ${auth}` },
        cache: "no-store",
      });
      if (res.ok) {
        const rawOrders = await res.json();
        setOrders(
          (rawOrders as RawOrder[])
            .map(mapOrder)
            .filter((order): order is OrderItem => order !== null),
        );
      }
    } catch (err) {
      console.error("Error refreshing orders:", err);
    }
  };

  const fetchStockLevels = async () => {
    try {
      const res = await fetch(`${API_URL}/product-catalogue`, { cache: "no-store" });
      if (res.ok) {
        const catalogue = await res.json();
        const items: StockItem[] = [];
        catalogue.forEach((p: any) => {
          if (p.variants && p.variants.length > 0) {
            p.variants.forEach((v: any) => {
              const sizeName = typeof v.size === "object" ? v.size?.name : v.size || "M";
              const colorName = typeof v.color === "object" ? v.color?.name : v.color || "Black";
              items.push({
                id: v.sku || v.variantId || `${p.productId}-${sizeName}-${colorName}`,
                name: p.name,
                sku: v.sku || (v.variantId ? String(v.variantId).substring(0, 8).toUpperCase() : `${p.name.substring(0, 3).toUpperCase()}-${sizeName}`),
                size: sizeName,
                color: colorName,
                qty: Number(v.stockQuantity ?? v.availableStock ?? 12),
                lowStockLimit: 10,
              });
            });
          } else {
            items.push({
              id: p.productId,
              name: p.name,
              sku: `PRD-${String(p.productId).substring(0, 6).toUpperCase()}`,
              size: "Standard",
              color: "Default",
              qty: Number(p.basePrice ? 15 : 0),
              lowStockLimit: 10,
            });
          }
        });
        setStockLevels(items);
      }
    } catch (err) {
      console.error("Error loading catalogue stock levels:", err);
    }
  };

  const fetchBackendNotifications = async () => {
    const auth = token();
    if (!auth) return;
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${auth}` },
        cache: "no-store",
      });
      if (res.ok) {
        const rawNotifs = await res.json();
        const items: NotificationItem[] = rawNotifs.map((n: any) => ({
          id: n.notificationId,
          title: n.title,
          message: n.message,
          timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: n.type.includes("ERROR") || n.type.includes("REJECTED") ? "error" : n.type.includes("STOCK") ? "warning" : "info",
          read: n.isRead,
        }));
        setNotifications((prev) => {
          const existingIds = new Set(items.map((i: NotificationItem) => i.id));
          const localOnly = prev.filter((i) => !existingIds.has(i.id));
          return [...items, ...localOnly];
        });
      }
    } catch (err) {
      console.error("Error fetching employee notifications:", err);
    }
  };

  useEffect(() => {
    void fetchOrders();
    void fetchStockLevels();
    void fetchBackendNotifications();
  }, []);

  const submitCitypakShipment = async (
    orderId: string,
    data: {
      weightGrams: number;
      numberOfPieces: number;
      description?: string;
      lengthCm?: number;
      widthCm?: number;
      heightCm?: number;
    },
  ) => {
    const auth = token();
    if (!auth) {
      addNotification("Session Expired", "Please sign in again.", "error");
      throw new Error("Session expired");
    }
    setWaybillStatus("generating");
    try {
      const res = await fetch(`${API_URL}/integrations/citypak/shipments/${orderId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth}`,
        },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        setWaybillStatus("idle");
        throw new Error(body.message || "Failed to create Citypak shipment.");
      }
      setWaybillStatus("generated");
      addNotification(
        "Citypak Shipment Created",
        `Tracking #${body.primaryTrackingNumber || body.waybills?.[0]}`,
        "success",
      );
      await fetchOrders();
      return body;
    } catch (err: any) {
      setWaybillStatus("idle");
      addNotification(
        "Shipment Failed",
        err.message || "Unable to submit Citypak shipment.",
        "error",
      );
      throw err;
    }
  };

  const printCitypakWaybill = async (orderId: string) => {
    const auth = token();
    if (!auth) {
      addNotification("Session Expired", "Please sign in again.", "error");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/integrations/citypak/waybills/order/${orderId}`, {
        headers: { Authorization: `Bearer ${auth}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to retrieve waybill PDF.");
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (err: any) {
      addNotification(
        "Waybill Error",
        err.message || "Could not print Citypak waybill.",
        "error",
      );
    }
  };

  const requestCitypakPickup = async (pickupData: {
    orderIds: string[];
    pickupAddressLine1: string;
    pickupAddressLine2?: string;
    pickupAddressLine3?: string;
    pickupAddressLine4City: string;
    pickupContactPerson: string;
    pickupContactNumber1: string;
    pickupFromDatetime: string;
    pickupToDatetime: string;
  }) => {
    const auth = token();
    if (!auth) throw new Error("Session expired");
    setPickupStatus("requesting");
    try {
      const res = await fetch(`${API_URL}/integrations/citypak/pickups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth}`,
        },
        body: JSON.stringify(pickupData),
      });
      const body = await res.json();
      if (!res.ok) {
        setPickupStatus("idle");
        throw new Error(body.message || "Failed to request Citypak pickup.");
      }
      setPickupStatus("requested");
      addNotification("Pickup Requested", body.message, "success");
      await fetchOrders();
      return body;
    } catch (err: any) {
      setPickupStatus("idle");
      addNotification(
        "Pickup Failed",
        err.message || "Unable to request Citypak pickup.",
        "error",
      );
      throw err;
    }
  };

  const refreshCitypakTracking = async (trackingNumber: string) => {
    const auth = token();
    if (!auth) throw new Error("Session expired");
    try {
      const res = await fetch(
        `${API_URL}/integrations/citypak/track/${encodeURIComponent(trackingNumber)}`,
        {
          headers: { Authorization: `Bearer ${auth}` },
        },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to track shipment.");
      await fetchOrders();
      return body;
    } catch (err: any) {
      addNotification("Tracking Error", err.message || "Unable to refresh tracking.", "error");
      throw err;
    }
  };

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const syncCitypakStatus = async () => {
    const auth = token();
    if (!auth) throw new Error("Session expired");
    try {
      const res = await fetch(`${API_URL}/integrations/citypak/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Sync failed.");
      const syncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(syncTime);
      addNotification("Citypak Synced", `Updated active courier statuses at ${syncTime}.`, "success");
      await fetchOrders();
      return body;
    } catch (err: any) {
      addNotification("Sync Error", err.message || "Failed to sync Citypak status.", "error");
      throw err;
    }
  };

  const value: EmployeeContextType = {
    searchQuery,
    setSearchQuery,
    dailyTotal: orders.length,
    currentStreak: 0,
    efficiency: orders.length
      ? Number(((prepared.length / orders.length) * 100).toFixed(1))
      : 0,
    systemStatus: "Operational",
    preparedCODTotal: prepared
      .filter((o) => o.paymentMethod === "COD")
      .reduce((sum, o) => sum + o.valuation, 0),
    preparedBankTotal: prepared
      .filter((o) => o.paymentMethod === "BANK")
      .reduce((sum, o) => sum + o.valuation, 0),
    pickingQueue,
    orders,
    productPrepQueue,
    readyPickups,
    notifications,
    stockLevels,
    myStock,
    loadingMyStock,
    fetchMyStock,
    stockRequests,
    isEmployeeAvailable: availabilityStatus === "AVAILABLE",
    availabilityStatus,
    availabilityLastNotified: null,
    activeDeliveryPrepId,
    waybillStatus,
    pickupStatus,
    packageDimensions,
    packageWeight,
    pickupSlot,
    claimTask,
    claimOrder,
    returnToOrdersQueue,
    updateOrderStatus,
    createCitypakOrder,
    startPrep,
    updatePrepStatus,
    finalizeDelivery,
    notifyCustomer: (id) =>
      addNotification(
        "Customer notification",
        `Notification requested for order ${id}.`,
        "info",
      ),
    toggleAvailability,
    notifyAvailabilityToAdmin: () =>
      addNotification("Availability updated", availabilityStatus, "info"),
    setDimensions,
    setWeight,
    setPickupSlot,
    triggerWaybillGeneration: () => setWaybillStatus("generated"),
    triggerPickupRequest: () => setPickupStatus("requested"),
    selectActiveDeliveryPrep: setActiveDeliveryPrepId,
    submitCitypakShipment,
    printCitypakWaybill,
    requestCitypakPickup,
    refreshCitypakTracking,
    syncCitypakStatus,
    lastSyncTime,
    fetchOrders,
    addNotification,
    clearNotifications: () => setNotifications([]),
    requestStockFromAdmin: async (
      sku: string,
      quantity: number,
      details?: { productName?: string; size?: string; color?: string; notes?: string },
    ) => {
      const auth = token();
      if (!auth) {
        addNotification("Session Expired", "Please sign in again.", "error");
        return;
      }

      const reqId = crypto.randomUUID();
      const productName = details?.productName || sku;

      const newReq: StockRequest = {
        id: reqId,
        sku,
        productName,
        qtyRequested: quantity,
        status: "PENDING",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setStockRequests((prev) => [newReq, ...prev]);

      addNotification(
        "Stock Request Sent",
        `Requested ${quantity} units of ${productName} from Admin.`,
        "success",
      );

      try {
        await fetch(`${API_URL}/notifications/request-stock`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth}`,
          },
          body: JSON.stringify({
            sku,
            quantity,
            productName: details?.productName,
            size: details?.size,
            color: details?.color,
            notes: details?.notes,
          }),
        });
      } catch (err: any) {
        console.warn("Backend notification notice:", err);
      }
    },
    logoutEmployee,
  };
  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
}
