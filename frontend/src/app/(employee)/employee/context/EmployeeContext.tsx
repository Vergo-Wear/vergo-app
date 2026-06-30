"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Types
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
  status: "Ready to Pick" | "Claimed" | "Preparing" | "Ready for Pickup" | "Sent";
  valuation: number;
  initials: string;
  claimedBy: string | null;
  itemsList: { description: string; qty: number; unitPrice: number; sku: string }[];
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

export interface StockRequest {
  id: string;
  productName: string;
  sku: string;
  qtyRequested: number;
  status: "PENDING" | "APPROVED";
  timestamp: string;
}

interface EmployeeContextType {
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Stats
  dailyTotal: number;
  currentStreak: number;
  efficiency: number;
  systemStatus: "Operational" | "Degraded" | "Outage";
  preparedCODTotal: number;
  preparedBankTotal: number;
  
  // Lists
  pickingQueue: PickingTask[];
  orders: OrderItem[];
  productPrepQueue: ProductPrepItem[];
  readyPickups: ReadyPickupItem[];
  notifications: NotificationItem[];
  stockLevels: StockItem[];
  stockRequests: StockRequest[];
  
  // Availability Status
  isEmployeeAvailable: boolean;
  availabilityStatus: "ACTIVE DUTY" | "ON BREAK";
  availabilityLastNotified: string | null;

  // Active delivery prep order
  activeDeliveryPrepId: string;
  waybillStatus: "idle" | "generating" | "generated";
  pickupStatus: "idle" | "requesting" | "requested";
  packageDimensions: { length: string; width: string; height: string };
  packageWeight: string;
  pickupSlot: string;

  // Actions
  claimTask: (id: string) => boolean;
  claimOrder: (id: string) => boolean;
  startPrep: (sku: string) => void;
  updatePrepStatus: (sku: string, status: "PREPARING" | "NOT STARTED" | "READY") => void;
  finalizeDelivery: (id: string) => void;
  notifyCustomer: (id: string) => void;
  toggleAvailability: () => void;
  notifyAvailabilityToAdmin: () => void;
  setDimensions: (dims: { length: string; width: string; height: string }) => void;
  setWeight: (w: string) => void;
  setPickupSlot: (slot: string) => void;
  triggerWaybillGeneration: () => void;
  triggerPickupRequest: () => void;
  selectActiveDeliveryPrep: (id: string) => void;
  addNotification: (title: string, message: string, type: NotificationItem["type"]) => void;
  clearNotifications: () => void;
  addNewOrder: (order: Partial<OrderItem>) => void;
  requestStockFromAdmin: (sku: string, quantity: number) => void;
  logoutEmployee: () => void;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const useEmployee = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error("useEmployee must be used within an EmployeeProvider");
  }
  return context;
};

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global search state
  const [searchQuery, setSearchQuery] = useState("");

  // Stats state
  const [dailyTotal, setDailyTotal] = useState(1284);
  const [currentStreak] = useState(42);
  const [systemStatus] = useState<"Operational" | "Degraded" | "Outage">("Operational");

  // Prepared totals state
  const [preparedCODTotal, setPreparedCODTotal] = useState(84500.00); 
  const [preparedBankTotal, setPreparedBankTotal] = useState(125000.00); 

  // Employee availability status
  const [isEmployeeAvailable, setIsEmployeeAvailable] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState<"ACTIVE DUTY" | "ON BREAK">("ACTIVE DUTY");
  const [availabilityLastNotified, setAvailabilityLastNotified] = useState<string | null>(null);

  // Active delivery prep details
  const [activeDeliveryPrepId, setActiveDeliveryPrepId] = useState("VRG-90210");
  const [waybillStatus, setWaybillStatus] = useState<"idle" | "generating" | "generated">("idle");
  const [pickupStatus, setPickupStatus] = useState<"idle" | "requesting" | "requested">("idle");
  const [packageDimensions, setPackageDimensions] = useState({ length: "45", width: "30", height: "15" });
  const [packageWeight, setPackageWeight] = useState("1.85");
  const [pickupSlot, setPickupSlot] = useState("Today, 14:00 - 16:00 (Standard)");

  // Stock inventory levels
  const [stockLevels, setStockLevels] = useState<StockItem[]>([
    { id: "S1", name: "V-1 Sentinel Tech Puffer", sku: "ST-VG-99", size: "M", color: "Onyx Black", qty: 2, lowStockLimit: 5 }, 
    { id: "S2", name: "Stealth Cargo Trousers", sku: "ST-AC-02", size: "L", color: "Charcoal", qty: 15, lowStockLimit: 5 },
    { id: "S3", name: "Ghost-01 Tech Hoodie", sku: "ST-GH-404-CH", size: "XL", color: "Charcoal", qty: 8, lowStockLimit: 4 },
    { id: "S4", name: "Signal Utility Vest", sku: "ST-UT-102-NG", size: "M", color: "Neon Green", qty: 20, lowStockLimit: 5 },
    { id: "S5", name: "Industrial Cobra Belt", sku: "ST-AC-05-BK", size: "ONE SIZE", color: "Black", qty: 12, lowStockLimit: 3 },
  ]);

  const [stockRequests, setStockRequests] = useState<StockRequest[]>([
    { id: "R1", productName: "V-1 Sentinel Tech Puffer", sku: "ST-VG-99", qtyRequested: 20, status: "APPROVED", timestamp: "Yesterday, 10:30" }
  ]);

  // Lists state
  const [pickingQueue, setPickingQueue] = useState<PickingTask[]>([
    { id: "VRG-8821", skus: 12, timeRemaining: "04:12", zone: "Sector B-2", status: "pending" },
    { id: "VRG-8825", skus: 4, timeRemaining: "08:45", zone: "Sector A-4", status: "pending" },
    { id: "VRG-8829", skus: 32, timeRemaining: "15:20", zone: "Sector C-1", status: "pending" },
    { id: "VRG-8832", skus: 7, timeRemaining: "18:05", zone: "Sector B-1", status: "pending" },
  ]);

  const [orders, setOrders] = useState<OrderItem[]>([
    {
      id: "VRG-90210",
      customerName: "Roshan Perera",
      customerEmail: "roshan.perera@vortex.lk",
      customerPhone: "+94 77 123 4567",
      customerAddress: "Apartment 4B, Lotus Towers, 12 Havelock Road, Colombo 05, Sri Lanka",
      timestamp: "Today, 14:22",
      paymentMethod: "COD",
      status: "Ready to Pick",
      valuation: 84500.00,
      initials: "RP",
      claimedBy: null,
      itemsList: [
        { description: "V-1 Sentinel Tech Puffer / Onyx Black", qty: 1, unitPrice: 59500.00, sku: "ST-VG-99" },
        { description: "Stealth Cargo Trousers / Charcoal", qty: 1, unitPrice: 25000.00, sku: "ST-AC-02" }
      ]
    },
    {
      id: "VRG-88124",
      customerName: "Dinuka Jayasekara",
      customerEmail: "dinuka.j@cybermail.lk",
      customerPhone: "+94 71 987 6543",
      customerAddress: "No. 45, Kandy Road, Kurunegala, Sri Lanka",
      timestamp: "Today, 12:45",
      paymentMethod: "BANK",
      status: "Ready to Pick",
      valuation: 125000.00,
      initials: "DJ",
      claimedBy: null,
      itemsList: [
        { description: "Ghost-01 Tech Hoodie / Charcoal XL", qty: 2, unitPrice: 62500.00, sku: "ST-GH-404-CH" }
      ]
    },
    {
      id: "VRG-90333",
      customerName: "Kavinda Silva",
      customerEmail: "kavinda.silva@domain.lk",
      customerPhone: "+94 75 444 8888",
      customerAddress: "No. 128/1, Galle Road, Dehiwala, Sri Lanka",
      timestamp: "Yesterday, 18:10",
      paymentMethod: "COD",
      status: "Claimed",
      valuation: 32000.00,
      initials: "KS",
      claimedBy: "Mark V.",
      itemsList: [
        { description: "Signal Utility Vest / Neon Green M", qty: 1, unitPrice: 32000.00, sku: "ST-UT-102-NG" }
      ]
    },
    {
      id: "VRG-91102",
      customerName: "Nilakshi Fernando",
      customerEmail: "nilakshi.f@fashion.lk",
      customerPhone: "+94 72 333 9999",
      customerAddress: "No. 72, Negombo Road, Negombo, Sri Lanka",
      timestamp: "Oct 24, 09:15",
      paymentMethod: "BANK",
      status: "Ready to Pick",
      valuation: 249000.00,
      initials: "NF",
      claimedBy: null,
      itemsList: [
        { description: "V-1 Sentinel Tech Puffer / Onyx Black", qty: 3, unitPrice: 59500.00, sku: "ST-VG-99" }, 
        { description: "Stealth Cargo Trousers / Charcoal", qty: 2, unitPrice: 25000.00, sku: "ST-AC-02" },
        { description: "Industrial Cobra Belt / Black", qty: 2, unitPrice: 10000.00, sku: "ST-AC-05-BK" }
      ]
    },
  ]);

  const [productPrepQueue, setProductPrepQueue] = useState<ProductPrepItem[]>([
    { id: "P1", name: "Ghost-01 Tech Hoodie", sku: "ST-GH-404-CH", size: "XL", color: "Charcoal", imageColor: "#1d2e28", quantity: 14, orders: "ORDR-9921, ORDR-8834, +4", assignedTo: "M. Kowalski", assignedInitials: "MK", status: "PREPARING" },
    { id: "P2", name: "Signal Utility Vest", sku: "ST-UT-102-NG", size: "M", color: "Neon Green", imageColor: "#39ff14", quantity: 3, orders: "ORDR-10452, ORDR-10488", assignedTo: "Unassigned", assignedInitials: "--", status: "NOT STARTED" },
    { id: "P3", name: "Industrial Cobra Belt", sku: "ST-AC-05-BK", size: "ONE SIZE", color: "Black", imageColor: "#111111", quantity: 22, orders: "Batch Staged @ Station B4", assignedTo: "J. Anderson", assignedInitials: "JA", status: "READY" },
  ]);

  const [readyPickups, setReadyPickups] = useState<ReadyPickupItem[]>([
    { id: "SW-9921", batch: "Batch: Urban-X", customerName: "Jordan Dixon", initials: "JD", readyTime: "14:20 PM", relativeTime: "25m ago", notificationStatus: "SENT", deliveryPrep: "READY" },
    { id: "SW-9922", batch: "Batch: Tech-Core", customerName: "Mikael K.", initials: "MK", readyTime: "14:38 PM", relativeTime: "7m ago", notificationStatus: "FAILED", deliveryPrep: "INCOMPLETE" },
    { id: "SW-9923", batch: "Batch: Urban-X", customerName: "Lana Sterling", initials: "LS", readyTime: "14:45 PM", relativeTime: "Just now", notificationStatus: "QUEUED", deliveryPrep: "READY" },
  ]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: "N2", title: "Urgent Re-Notification Needed", message: "SMS failed to deliver for order #SW-9922. Tap retry to resend.", timestamp: "7m ago", type: "error", read: false },
    { id: "N3", title: "Citypak Courier In Route", message: "Courier van WP LH-8824 is scheduled to arrive in 14 minutes.", timestamp: "Just now", type: "info", read: false },
  ]);

  // Calculate efficiency dynamically: (Prepared orders / Total orders) * 100
  const preparedCount = orders.filter(o => o.status === "Ready for Pickup" || o.status === "Sent").length;
  const totalCustomerRequests = orders.length;
  const efficiency = totalCustomerRequests > 0 
    ? parseFloat(((preparedCount / totalCustomerRequests) * 100).toFixed(1)) 
    : 0;

  // Load from localStorage on mount
  useEffect(() => {
    const savedDailyTotal = localStorage.getItem("vergo_dailyTotal");
    const savedPickingQueue = localStorage.getItem("vergo_pickingQueue");
    const savedOrders = localStorage.getItem("vergo_orders");
    const savedPrepQueue = localStorage.getItem("vergo_prepQueue");
    const savedReadyPickups = localStorage.getItem("vergo_readyPickups");
    const savedNotifications = localStorage.getItem("vergo_notifications");
    const savedStockLevels = localStorage.getItem("vergo_stockLevels");
    const savedStockRequests = localStorage.getItem("vergo_stockRequests");
    const savedCODTotal = localStorage.getItem("vergo_preparedCODTotal");
    const savedBankTotal = localStorage.getItem("vergo_preparedBankTotal");

    const savedAvailable = localStorage.getItem("vergo_isEmployeeAvailable");
    const savedStatus = localStorage.getItem("vergo_availabilityStatus");
    const savedLastNotified = localStorage.getItem("vergo_availabilityLastNotified");

    if (savedDailyTotal) setDailyTotal(Number(savedDailyTotal));
    if (savedCODTotal) setPreparedCODTotal(Number(savedCODTotal));
    if (savedBankTotal) setPreparedBankTotal(Number(savedBankTotal));
    
    if (savedPickingQueue) setPickingQueue(JSON.parse(savedPickingQueue));
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedPrepQueue) setProductPrepQueue(JSON.parse(savedPrepQueue));
    if (savedReadyPickups) setReadyPickups(JSON.parse(savedReadyPickups));
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
    if (savedStockLevels) setStockLevels(JSON.parse(savedStockLevels));
    if (savedStockRequests) setStockRequests(JSON.parse(savedStockRequests));

    if (savedAvailable !== null) setIsEmployeeAvailable(savedAvailable === "true");
    if (savedStatus) setAvailabilityStatus(savedStatus as any);
    if (savedLastNotified) setAvailabilityLastNotified(savedLastNotified);
  }, []);

  // Window closure event listener: sets status to ON BREAK
  useEffect(() => {
    const handleUnload = () => {
      // Set status to ON BREAK in localStorage
      localStorage.setItem("vergo_isEmployeeAvailable", "false");
      localStorage.setItem("vergo_availabilityStatus", "ON BREAK");

      // Log notification of auto-break on closure
      const savedNotifs = localStorage.getItem("vergo_notifications");
      const list = savedNotifs ? JSON.parse(savedNotifs) : [];
      const time = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      const newNotif = {
        id: `N_${Date.now()}_off`,
        title: "Auto-Break on Disconnect",
        message: `Employee went ON BREAK due to terminal tab closure (notified at ${time}).`,
        timestamp: "Just now",
        type: "warning",
        read: false
      };
      localStorage.setItem("vergo_notifications", JSON.stringify([newNotif, ...list]));
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  // Save utility helper
  const persist = (key: string, value: any) => {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  };

  // Actions implementation
  const addNotification = (title: string, message: string, type: NotificationItem["type"]) => {
    const newNotif: NotificationItem = {
      id: `N_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      message,
      timestamp: "Just now",
      type,
      read: false,
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      persist("vergo_notifications", updated);
      return updated;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    persist("vergo_notifications", []);
  };

  // Check if employee has an active claimed order that is NOT yet Ready for Pickup or Sent
  const hasActiveOrderInProgress = (): boolean => {
    return orders.some(o => 
      o.claimedBy !== null && 
      (o.claimedBy.includes("Mark V.") || o.claimedBy.includes("You")) && 
      (o.status === "Claimed" || o.status === "Preparing")
    );
  };

  const getActiveOrderInProgressId = (): string => {
    const act = orders.find(o => 
      o.claimedBy !== null && 
      (o.claimedBy.includes("Mark V.") || o.claimedBy.includes("You")) && 
      (o.status === "Claimed" || o.status === "Preparing")
    );
    return act ? act.id : "";
  };

  // Verify stock sufficiency before claiming
  const verifyStockForOrder = (orderId: string): { sufficient: boolean; insufficientItem: string | null } => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return { sufficient: true, insufficientItem: null };

    for (const item of order.itemsList) {
      // Find matching stock item
      const stock = stockLevels.find(s => s.sku === item.sku);
      if (!stock || stock.qty < item.qty) {
        return {
          sufficient: false,
          insufficientItem: `${item.description.split(" / ")[0]} (Requires: ${item.qty}, In Stock: ${stock ? stock.qty : 0})`
        };
      }
    }
    return { sufficient: true, insufficientItem: null };
  };

  // FLOW STEP 1: Claim order or picking task
  const claimTask = (id: string): boolean => {
    // Claim check: block if employee already has active claimed orders
    if (hasActiveOrderInProgress()) {
      addNotification(
        "Claim Locked",
        `Cannot claim new task. Please complete active Order #${getActiveOrderInProgressId()} before claiming a new one.`,
        "error"
      );
      return false;
    }

    // Stock Check
    const { sufficient, insufficientItem } = verifyStockForOrder(id);
    if (!sufficient) {
      addNotification(
        "Insufficient Stock",
        `Cannot claim task #${id} due to low stock on: ${insufficientItem}`,
        "error"
      );
      return false;
    }

    // Mark as claimed in Picking Queue
    setPickingQueue(prev => {
      const updated = prev.map(task => task.id === id ? { ...task, status: "claimed" as const } : task);
      persist("vergo_pickingQueue", updated);
      return updated;
    });

    const matchingOrder = orders.find(o => o.id === id);
    if (matchingOrder) {
      claimOrder(id);
    } else {
      const pickedTask = pickingQueue.find(t => t.id === id);
      const addedSkus = pickedTask ? pickedTask.skus : 5;
      
      setProductPrepQueue(prev => {
        const updated = [
          {
            id: `P_${id}`,
            name: `Garment Batch ${id}`,
            sku: `ST-AC-${id}`,
            size: "L",
            color: "Charcoal",
            imageColor: "#1d2e28",
            quantity: addedSkus,
            orders: `Order #${id}`,
            assignedTo: "Mark V. (You)", // auto assign since we claim
            assignedInitials: "MV",
            status: "NOT STARTED" as const
          },
          ...prev
        ];
        persist("vergo_prepQueue", updated);
        return updated;
      });

      addNotification("Task Claimed", `Claimed task #${id} (${addedSkus} items). Proceed to Product Prep.`, "success");
    }
    return true;
  };

  const claimOrder = (id: string): boolean => {
    // Claim check: block if employee already has active claimed orders
    if (hasActiveOrderInProgress()) {
      addNotification(
        "Claim Locked",
        `Cannot claim new order. Please complete active Order #${getActiveOrderInProgressId()} before claiming a new one.`,
        "error"
      );
      return false;
    }

    // Stock Check
    const { sufficient, insufficientItem } = verifyStockForOrder(id);
    if (!sufficient) {
      addNotification(
        "Insufficient Stock",
        `Cannot claim order #${id} due to low stock on: ${insufficientItem}`,
        "error"
      );
      return false;
    }

    setOrders(prev => {
      const updated = prev.map(order => order.id === id ? { ...order, status: "Claimed" as const, claimedBy: "Mark V. (You)" } : order);
      persist("vergo_orders", updated);
      return updated;
    });

    const claimedOrder = orders.find(o => o.id === id);
    if (claimedOrder) {
      setProductPrepQueue(prev => {
        const newPrepItems = claimedOrder.itemsList.map((item, idx) => ({
          id: `P_${claimedOrder.id}_${idx}`,
          name: item.description.split(" / ")[0],
          sku: item.sku,
          size: item.description.includes("XL") ? "XL" : item.description.includes("ONE SIZE") ? "ONE SIZE" : "M",
          color: item.description.includes("Charcoal") ? "Charcoal" : item.description.includes("Black") ? "Black" : "Neon Green",
          imageColor: "#1a1a24",
          quantity: item.qty,
          orders: `Order #${claimedOrder.id}`,
          assignedTo: "Mark V. (You)",
          assignedInitials: "MV",
          status: "NOT STARTED" as const
        }));
        
        const updated = [...newPrepItems, ...prev];
        persist("vergo_prepQueue", updated);
        return updated;
      });
      
      setPickingQueue(prev => {
        const updated = prev.map(task => task.id === id ? { ...task, status: "claimed" as const } : task);
        persist("vergo_pickingQueue", updated);
        return updated;
      });

      addNotification("Order Claimed", `Order #${id} claimed. Staging batch created in Product Prep.`, "success");
    }
    return true;
  };

  // FLOW STEP 2: Product Prep
  const startPrep = (sku: string) => {
    // Update prep status
    setProductPrepQueue(prev => {
      const updated = prev.map(item => item.sku === sku ? { ...item, status: "PREPARING" as const, assignedTo: "Mark V. (You)", assignedInitials: "MV" } : item);
      persist("vergo_prepQueue", updated);
      return updated;
    });

    const prepItem = productPrepQueue.find(p => p.sku === sku);
    if (prepItem) {
      const orderId = prepItem.orders.replace("Order #", "");
      
      // Update order status to Preparing
      setOrders(prev => {
        const updated = prev.map(order => order.id === orderId ? { ...order, status: "Preparing" as const } : order);
        persist("vergo_orders", updated);
        return updated;
      });

      // REDUCE PRODUCT STOCK ONCE PREPARATION STARTS
      setStockLevels(prev => {
        const updated = prev.map(stock => {
          if (stock.sku === sku) {
            const newQty = Math.max(0, stock.qty - prepItem.quantity);
            if (newQty <= stock.lowStockLimit) {
              setTimeout(() => {
                addNotification(
                  "Low Stock Alert",
                  `Stock level for ${stock.name} (${stock.sku}) has dropped to ${newQty} units. Please request stock.`,
                  "warning"
                );
              }, 500);
            }
            return { ...stock, qty: newQty };
          }
          return stock;
        });
        persist("vergo_stockLevels", updated);
        return updated;
      });
    }

    addNotification("Prep Started & Stock Deducted", `Staging active for SKU ${sku}. Stock count updated.`, "success");
  };

  const updatePrepStatus = (sku: string, status: "PREPARING" | "NOT STARTED" | "READY") => {
    setProductPrepQueue(prev => {
      const updated = prev.map(item => item.sku === sku ? { ...item, status, assignedTo: status === "NOT STARTED" ? "Unassigned" : "Mark V. (You)", assignedInitials: status === "NOT STARTED" ? "--" : "MV" } : item);
      persist("vergo_prepQueue", updated);
      return updated;
    });
    
    // FLOW STEP 3: If prep status is marked READY, make it available for Delivery Prep
    if (status === "READY") {
      const prepItem = productPrepQueue.find(p => p.sku === sku);
      if (prepItem) {
        const orderId = prepItem.orders.replace("Order #", "");
        
        setOrders(prev => {
          const updated = prev.map(order => order.id === orderId ? { ...order, status: "Ready for Pickup" as const } : order);
          persist("vergo_orders", updated);
          return updated;
        });

        // INCREMENT COD OR BANK PREPARED VALUATION VALUE
        const orderDetails = orders.find(o => o.id === orderId);
        if (orderDetails) {
          if (orderDetails.paymentMethod === "COD") {
            setPreparedCODTotal(prev => {
              const updated = prev + orderDetails.valuation;
              persist("vergo_preparedCODTotal", updated);
              return updated;
            });
            addNotification("COD Valuation Updated", `Added Rs. ${orderDetails.valuation.toLocaleString()} to COD Prepared Value.`, "success");
          } else {
            setPreparedBankTotal(prev => {
              const updated = prev + orderDetails.valuation;
              persist("vergo_preparedBankTotal", updated);
              return updated;
            });
            addNotification("Bank Valuation Updated", `Added Rs. ${orderDetails.valuation.toLocaleString()} to Bank Prepared Value.`, "success");
          }
        }

        // Set this order as active in Delivery Prep
        setActiveDeliveryPrepId(orderId);

        // Add to readyPickups as INCOMPLETE delivery prep
        if (orderDetails && !readyPickups.some(r => r.id === orderId)) {
          setReadyPickups(prev => {
            const updated = [
              {
                id: orderId,
                batch: "Batch: Staged",
                customerName: orderDetails.customerName,
                initials: orderDetails.initials,
                readyTime: "Just now",
                relativeTime: "Ready to Pack",
                notificationStatus: "QUEUED" as const,
                deliveryPrep: "INCOMPLETE" as const
              },
              ...prev
            ];
            persist("vergo_readyPickups", updated);
            return updated;
          });
        }

        addNotification("Staging Complete", `Garment prep complete. Order #${orderId} moved to Delivery Prep.`, "success");
      }
    }
  };

  // FLOW STEP 4: Generate Waybill & Request pickup in Delivery Prep updates readyPickups list state
  const triggerWaybillGeneration = () => {
    setWaybillStatus("generating");
    addNotification("Generating Waybill", "Connecting to Citypak Sri Lanka Express API...", "info");
    
    setTimeout(() => {
      setWaybillStatus("generated");
      addNotification("Waybill PDF Generated", "Thermal waybill labels ready for print.", "success");
      checkAndCompleteDeliveryPrep(activeDeliveryPrepId, "generated", pickupStatus);
    }, 1500);
  };

  const triggerPickupRequest = () => {
    setPickupStatus("requesting");
    addNotification("Booking Citypak Pickup", "Transmitting shipment details...", "info");
    
    setTimeout(() => {
      setPickupStatus("requested");
      addNotification("Courier Booked", "Citypak courier van dispatched. Driver Sahan. ETA 15 mins.", "success");
      checkAndCompleteDeliveryPrep(activeDeliveryPrepId, waybillStatus, "requested");
    }, 1800);
  };

  const checkAndCompleteDeliveryPrep = (orderId: string, waybill: string, pickup: string) => {
    if (waybill === "generated" && pickup === "requested") {
      setReadyPickups(prev => {
        const updated = prev.map(item =>
          item.id === orderId
            ? { ...item, deliveryPrep: "READY" as const, relativeTime: "Ready to Dispatch" }
            : item
        );
        persist("vergo_readyPickups", updated);
        return updated;
      });
      addNotification("Delivery Prep Ready", `Order #${orderId} waybill printed and courier scheduled. Handoff ready.`, "success");
    }
  };

  // FLOW STEP 5: Courier Handoff / Finalize shipment in Ready Orders list
  const finalizeDelivery = (id: string) => {
    setReadyPickups(prev => {
      const updated = prev.filter(item => item.id !== id);
      persist("vergo_readyPickups", updated);
      return updated;
    });

    setOrders(prev => {
      const updated = prev.map(order => order.id === id ? { ...order, status: "Sent" as const } : order);
      persist("vergo_orders", updated);
      return updated;
    });
    
    const completedOrder = orders.find(o => o.id === id);
    const addedSkus = completedOrder ? completedOrder.itemsList.reduce((sum, i) => sum + i.qty, 0) : 5;
    
    setDailyTotal(prev => {
      const updated = prev + addedSkus;
      persist("vergo_dailyTotal", updated);
      return updated;
    });

    addNotification("Shipment Dispatched", `Order #${id} handed over to Citypak Express courier driver.`, "success");
  };

  const notifyCustomer = (id: string) => {
    setReadyPickups(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, notificationStatus: "SENT" as const } : item);
      persist("vergo_readyPickups", updated);
      return updated;
    });

    setNotifications(prev => prev.filter(n => !n.message.includes(id)));
    addNotification("SMS Notification Sent", `Customer for order #${id} has been notified via Dialog SMS Gateway.`, "success");
  };

  // Availability statuses
  const toggleAvailability = () => {
    setIsEmployeeAvailable(prev => {
      const updated = !prev;
      const newStatus = updated ? "ACTIVE DUTY" : "ON BREAK";
      setAvailabilityStatus(newStatus);
      persist("vergo_isEmployeeAvailable", String(updated));
      persist("vergo_availabilityStatus", newStatus);

      // Auto-notify admin
      const time = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      setAvailabilityLastNotified(time);
      persist("vergo_availabilityLastNotified", time);
      addNotification(
        "Availability Status Updated",
        `Admin notified: Staff member is now ${newStatus} (notified at ${time}).`,
        updated ? "success" : "warning"
      );

      return updated;
    });
  };

  const notifyAvailabilityToAdmin = () => {
    // Left as legacy helper to satisfy interface signature
  };

  const setDimensions = (dims: { length: string; width: string; height: string }) => {
    setPackageDimensions(dims);
  };

  const setWeight = (w: string) => {
    setPackageWeight(w);
  };

  const setPickupSlotState = (slot: string) => {
    setPickupSlot(slot);
  };

  const selectActiveDeliveryPrep = (id: string) => {
    setActiveDeliveryPrepId(id);
    setWaybillStatus("idle");
    setPickupStatus("idle");
  };

  // Stock requesting option from admin
  const requestStockFromAdmin = (sku: string, quantity: number) => {
    const stockItem = stockLevels.find(s => s.sku === sku);
    if (!stockItem) return;

    const newRequest: StockRequest = {
      id: "R_" + Date.now(),
      productName: stockItem.name,
      sku: sku,
      qtyRequested: quantity,
      status: "PENDING",
      timestamp: "Just now"
    };

    setStockRequests(prev => {
      const updated = [newRequest, ...prev];
      persist("vergo_stockRequests", updated);
      return updated;
    });

    addNotification("Stock Requested", `Requested ${quantity} units of ${stockItem.name}. Waiting admin approval...`, "info");

    // Mock admin approval after 3 seconds
    setTimeout(() => {
      setStockRequests(prev => {
        const updated = prev.map(req => req.id === newRequest.id ? { ...req, status: "APPROVED" as const, timestamp: "Approved just now" } : req);
        persist("vergo_stockRequests", updated);
        return updated;
      });

      setStockLevels(prev => {
        const updated = prev.map(stock => stock.sku === sku ? { ...stock, qty: stock.qty + quantity } : stock);
        persist("vergo_stockLevels", updated);
        return updated;
      });

      addNotification("Stock Replenished", `${quantity} units of ${stockItem.name} have been approved and added to inventory.`, "success");
    }, 4000);
  };

  // Logout mockup
  const logoutEmployee = () => {
    addNotification("Logging Out", "Signing out of your active terminal session...", "info");
    setTimeout(() => {
      window.location.href = "/auth/login";
    }, 1000);
  };

  // Simulate order inbound from customer side (simulation helper)
  const addNewOrder = (newOrder: Partial<OrderItem>) => {
    const orderId = `VRG-${Math.floor(10000 + Math.random() * 90000)}`;
    const fullOrder: OrderItem = {
      id: orderId,
      customerName: newOrder.customerName || "Roshan Perera",
      customerEmail: newOrder.customerEmail || "roshan.perera@vortex.lk",
      customerPhone: newOrder.customerPhone || "+94 77 123 4567",
      customerAddress: newOrder.customerAddress || "Apartment 4B, Lotus Towers, 12 Havelock Road, Colombo 05, Sri Lanka",
      timestamp: "Just now",
      paymentMethod: newOrder.paymentMethod || "COD",
      status: "Ready to Pick",
      valuation: newOrder.valuation || 84500.00,
      initials: (newOrder.customerName || "RP").split(" ").map(n => n[0]).join("").toUpperCase(),
      claimedBy: null,
      itemsList: newOrder.itemsList || [
        { description: "V-1 Sentinel Tech Puffer / Onyx Black", qty: 1, unitPrice: 59500.00, sku: "ST-VG-99" }
      ]
    };

    setOrders(prev => {
      const updated = [fullOrder, ...prev];
      persist("vergo_orders", updated);
      return updated;
    });

    setPickingQueue(prev => {
      const skusCount = fullOrder.itemsList.reduce((sum, i) => sum + i.qty, 0);
      const updated = [
        { id: orderId, skus: skusCount, timeRemaining: "15:00", zone: `Sector ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}-${Math.floor(1 + Math.random() * 4)}`, status: "pending" as const },
        ...prev
      ];
      persist("vergo_pickingQueue", updated);
      return updated;
    });

    addNotification("Simulation: Inbound Customer Order", `Order #${orderId} received from customer portal.`, "info");
  };

  return (
    <EmployeeContext.Provider value={{
      searchQuery,
      setSearchQuery,
      dailyTotal,
      currentStreak: 0, 
      efficiency,
      systemStatus,
      pickingQueue,
      orders,
      productPrepQueue,
      readyPickups,
      notifications,
      stockLevels,
      stockRequests,
      isEmployeeAvailable,
      availabilityStatus,
      availabilityLastNotified,
      activeDeliveryPrepId,
      waybillStatus,
      pickupStatus,
      packageDimensions,
      packageWeight,
      pickupSlot,
      claimTask,
      claimOrder,
      startPrep,
      updatePrepStatus,
      finalizeDelivery,
      notifyCustomer,
      toggleAvailability,
      notifyAvailabilityToAdmin,
      setDimensions,
      setWeight,
      setPickupSlot: setPickupSlotState,
      triggerWaybillGeneration,
      triggerPickupRequest,
      selectActiveDeliveryPrep,
      addNotification,
      clearNotifications,
      addNewOrder,
      requestStockFromAdmin,
      logoutEmployee,
      preparedCODTotal,
      preparedBankTotal
    }}>
      {children}
    </EmployeeContext.Provider>
  );
};
