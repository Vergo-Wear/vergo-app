"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "../AdminContext";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

// --- TYPES ---
interface OrderCustomerDetails {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface OrderShippingDetails {
  receiver_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  district: string;
  postal_code: string;
}

interface PaymentProof {
  status: string;
  receipt_url?: string;
  uploaded_at?: string;
  expires_at?: string;
  rejected_reason?: string;
  acted_by?: string;
  acted_at?: string;
}

interface Order {
  order_id: string;
  payment_method: "Cash On Delivery" | "Bank Transfer";
  order_status: string;
  total_amount: number;
  confirmation_status: "Pending" | "Confirmed" | "Rejected";
  order_date: string;
  payment_proofs?: PaymentProof;
  order_customer_details: OrderCustomerDetails;
  order_shipping_details: OrderShippingDetails;
  items: { name: string; quantity: number; price: number }[];
  delivery_fee: number;
  pending_checkout: boolean;
  registered_customer: boolean;
}

interface ApiRecord {
  orderId?: string;
  checkoutId?: string;
  customerId?: string | null;
  paymentMethod: string;
  orderStatus?: string;
  status?: string;
  totalAmount: string | number;
  deliveryFee: string | number;
  orderDate?: string;
  createdAt?: string;
  expiresAt?: string | null;
  reviewedAt?: string | null;
  reviewedByProfileId?: string | null;
  adminNotes?: string | null;
  customerDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
  shippingDetails?: {
    receiverName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string | null;
    city?: string;
    district?: string;
    postalCode?: string | null;
  } | null;
  paymentProof?: ApiProof | null;
  paymentProofs?: ApiProof[];
  items?: ApiItem[];
  orderItems?: ApiItem[];
}

interface ApiProof {
  receiptUrl?: string | null;
  uploadedAt?: string | null;
  expiresAt?: string | null;
  status?: string;
  adminNotes?: string | null;
}

interface ApiItem {
  quantity: number;
  unitPrice: string | number;
  variant?: {
    sku?: string | null;
    product?: { name?: string } | null;
  } | null;
}

const MANAGED_ORDER_STATUSES = [
  "Ready to Process",
  "Claimed",
  "Preparing",
  "Ready for Pickup",
  "Sent",
  "Delivered",
  "Cancelled",
  "Completed",
];

const paymentMethodLabel = (method: string): Order["payment_method"] =>
  method.toLowerCase().includes("bank") ? "Bank Transfer" : "Cash On Delivery";

const mapApiRecord = (record: ApiRecord, pendingCheckout: boolean): Order => {
  const customer = record.customerDetails;
  const shipping = record.shippingDetails;
  const proof = pendingCheckout
    ? record.paymentProof
    : record.paymentProofs?.[0];
  const method = paymentMethodLabel(record.paymentMethod);
  const reviewStatus = pendingCheckout
    ? record.status || "Pending"
    : "Approved";
  const paymentStatus =
    reviewStatus === "Awaiting Payment" ? "Pending Upload" : reviewStatus;
  const items = pendingCheckout ? record.items || [] : record.orderItems || [];

  return {
    order_id: (pendingCheckout ? record.checkoutId : record.orderId) || "",
    payment_method: method,
    order_status: pendingCheckout
      ? reviewStatus === "Rejected"
        ? "Rejected"
        : ["Cancelled", "Expired"].includes(reviewStatus)
          ? "Cancelled"
          : "Pending"
      : record.orderStatus || "Ready to Process",
    total_amount: Number(record.totalAmount),
    confirmation_status: pendingCheckout
      ? reviewStatus === "Rejected"
        ? "Rejected"
        : "Pending"
      : "Confirmed",
    order_date:
      record.orderDate || record.createdAt || new Date(0).toISOString(),
    payment_proofs:
      method === "Bank Transfer"
        ? {
            status: pendingCheckout
              ? paymentStatus
              : proof?.status || "Approved",
            receipt_url: proof?.receiptUrl || undefined,
            uploaded_at: proof?.uploadedAt || undefined,
            expires_at:
              (pendingCheckout ? record.expiresAt : proof?.expiresAt) ||
              undefined,
            rejected_reason:
              reviewStatus === "Rejected"
                ? record.adminNotes || undefined
                : proof?.adminNotes || undefined,
            acted_by: record.reviewedByProfileId ? "Admin" : undefined,
            acted_at: record.reviewedAt || undefined,
          }
        : undefined,
    order_customer_details: {
      first_name: customer?.firstName || "Guest",
      last_name: customer?.lastName || "Customer",
      email: customer?.email || "Not provided",
      phone: customer?.phone || "Not provided",
    },
    order_shipping_details: {
      receiver_name: shipping?.receiverName || "Not provided",
      phone: shipping?.phone || "Not provided",
      address_line_1: shipping?.addressLine1 || "Not provided",
      address_line_2: shipping?.addressLine2 || "",
      city: shipping?.city || "Not provided",
      district: shipping?.district || "Not provided",
      postal_code: shipping?.postalCode || "",
    },
    items: items.map((item) => ({
      name: item.variant?.product?.name || item.variant?.sku || "Product",
      quantity: item.quantity,
      price: Number(item.unitPrice),
    })),
    delivery_fee: Number(record.deliveryFee),
    pending_checkout: pendingCheckout,
    registered_customer: Boolean(record.customerId),
  };
};

// --- ICONS ---
const Icons = {
  BadgeInfo: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  XCircle: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Ban: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  Receipt: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Check: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Cross: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

export default function OrdersDashboard() {
  const { searchQuery, addNotification } = useAdmin();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
  const [dateRangeFilter, setDateRangeFilter] = useState("All");
  const [sortOption, setSortOption] = useState("Newest First");

  // Modals & Drawers State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [customerDrawerOrder, setCustomerDrawerOrder] = useState<Order | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    action: "confirmCOD" | "rejectCOD" | "approvePayment" | "rejectPayment";
    orderId: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordersResponse, checkoutsResponse] = await Promise.all([
        authenticatedFetch("/orders/manage"),
        authenticatedFetch("/orders/manage/pending-checkouts"),
      ]);

      if (!ordersResponse || !checkoutsResponse) {
        addNotification("Session expired or connection failed loading orders.", "error");
        setIsLoading(false);
        return;
      }

      const ordersBody = await ordersResponse.json().catch(() => ({}));
      const checkoutsBody = await checkoutsResponse.json().catch(() => ({}));

      if (!ordersResponse.ok || !checkoutsResponse.ok) {
        const body = !ordersResponse.ok ? ordersBody : checkoutsBody;
        const message = Array.isArray(body.message)
          ? body.message.join(" ")
          : body.message;
        throw new Error(message || "Unable to load orders from the database.");
      }

      const nextOrders = [
        ...(Array.isArray(checkoutsBody) ? checkoutsBody : []).map((record: ApiRecord) =>
          mapApiRecord(record, true)
        ),
        ...(Array.isArray(ordersBody) ? ordersBody : []).map((record: ApiRecord) =>
          mapApiRecord(record, false)
        ),
      ];

      setOrders(nextOrders);
      setSelectedOrder((current) =>
        current
          ? nextOrders.find((order) => order.order_id === current.order_id) || null
          : null
      );
    } catch (error) {
      addNotification(
        error instanceof Error
          ? error.message
          : "Unable to load orders from the database.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // --- ACTIONS ---
  const confirmActionProcessor = async () => {
    if (!confirmAction) return;
    const order = orders.find((item) => item.order_id === confirmAction.orderId);
    if (!order?.pending_checkout) {
      addNotification("This checkout can no longer be reviewed. Refresh and try again.", "error");
      return;
    }

    const rejected = confirmAction.action === "rejectCOD" || confirmAction.action === "rejectPayment";
    setIsProcessing(true);

    try {
      const response = await authenticatedFetch(
        `/orders/manage/pending-checkouts/${order.order_id}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: rejected ? "Rejected" : "Approved",
            ...(rejected ? { adminNotes: rejectReason.trim() } : {}),
          }),
        }
      );

      if (!response) {
        addNotification("Connection failed reviewing checkout.", "error");
        return;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(body.message)
          ? body.message.join(" ")
          : body.message;
        throw new Error(message || "Unable to review this checkout.");
      }

      addNotification(
        `${order.payment_method} ${rejected ? "rejected" : "approved"}.${
          order.registered_customer
            ? " Customer notification sent."
            : " Guest checkout; no customer notification sent."
        }`,
        "success"
      );

      setConfirmAction(null);
      setRejectReason("");
      await loadOrders();
    } catch (error) {
      addNotification(
        error instanceof Error ? error.message : "Unable to review this checkout.",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setIsProcessing(true);
    try {
      const res = await authenticatedFetch(`/orders/manage/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res && res.ok) {
        addNotification(`Order status updated to ${newStatus}`, "success");
        await loadOrders();
      } else {
        const body = res ? await res.json().catch(() => null) : null;
        const msg = body?.message || "Failed to update order status";
        addNotification(Array.isArray(msg) ? msg.join(" ") : msg, "error");
      }
    } catch (err: any) {
      addNotification(err.message || "Failed to update order status", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- DERIVATIONS ---
  const getDerivedStatus = (order: Order) => {
    if (
      order.payment_method === "Bank Transfer" &&
      order.payment_proofs?.status === "Expired"
    )
      return "Expired";
    if (order.order_status === "Cancelled") return "Cancelled";
    if (
      order.order_status === "Rejected" ||
      order.confirmation_status === "Rejected"
    )
      return "Rejected";
    if (order.payment_method === "Cash On Delivery") {
      return order.confirmation_status === "Pending"
        ? "Waiting COD"
        : "Approved";
    }
    if (order.payment_method === "Bank Transfer") {
      if (order.payment_proofs?.status) return order.payment_proofs.status;
      return "Pending Upload";
    }
    return "Approved";
  };

  const statusConfig: Record<
    string,
    { color: string; bg: string; border: string; icon: any }
  > = {
    "Waiting COD": {
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      icon: Icons.Clock,
    },
    "Pending Upload": {
      color: "text-zinc-400",
      bg: "bg-zinc-800/50",
      border: "border-zinc-700/50",
      icon: Icons.AlertTriangle,
    },
    "Pending Verification": {
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      icon: Icons.BadgeInfo,
    },
    Approved: {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      icon: Icons.CheckCircle,
    },
    Rejected: {
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      icon: Icons.XCircle,
    },
    Expired: {
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      icon: Icons.Clock,
    },
    Cancelled: {
      color: "text-zinc-400",
      bg: "bg-zinc-900/60",
      border: "border-zinc-800",
      icon: Icons.Ban,
    },
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    if (statusFilter !== "All")
      result = result.filter((o) => getDerivedStatus(o) === statusFilter);
    if (paymentMethodFilter !== "All")
      result = result.filter((o) => o.payment_method === paymentMethodFilter);
    if (dateRangeFilter !== "All") {
      const now = new Date();
      const start = new Date(now);
      if (dateRangeFilter === "Today") start.setHours(0, 0, 0, 0);
      if (dateRangeFilter === "Last 7 Days") start.setDate(now.getDate() - 7);
      if (dateRangeFilter === "Last 30 Days") start.setDate(now.getDate() - 30);
      if (dateRangeFilter !== "Custom") {
        result = result.filter((order) => new Date(order.order_date) >= start);
      }
    }
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_id.toLowerCase().includes(sq) ||
          o.order_customer_details.first_name.toLowerCase().includes(sq) ||
          o.order_customer_details.last_name.toLowerCase().includes(sq) ||
          o.order_customer_details.phone.includes(sq)
      );
    }
    result.sort((a, b) => {
      if (sortOption === "Newest First")
        return (
          new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
        );
      if (sortOption === "Oldest First")
        return (
          new Date(a.order_date).getTime() - new Date(b.order_date).getTime()
        );
      if (sortOption === "Highest Amount")
        return b.total_amount - a.total_amount;
      if (sortOption === "Lowest Amount")
        return a.total_amount - b.total_amount;
      return 0;
    });
    return result;
  }, [
    orders,
    statusFilter,
    paymentMethodFilter,
    dateRangeFilter,
    sortOption,
    searchQuery,
  ]);

  const statCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "Waiting COD": 0,
      "Pending Upload": 0,
      "Pending Verification": 0,
      Approved: 0,
      Rejected: 0,
      Expired: 0,
      Cancelled: 0,
    };
    orders.forEach((o) => {
      const s = getDerivedStatus(o);
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [orders]);

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {/* PAGE TITLE */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold tracking-[0.2em] text-white uppercase mb-1 sm:mb-2">
          Order & Payment Management
        </h2>
        <p className="text-xs text-[#8e8e93] font-medium tracking-wide">
          Manage customer orders, verify bank transfer payments, approve Cash on
          Delivery orders, and monitor the complete order workflow.
        </p>
      </div>

      {/* CONFIRM ACTION POPUP */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#09090b] border border-[#27272a] shadow-2xl rounded-xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#18181b]">
              <h2 className="text-white font-bold tracking-widest uppercase text-xs">
                {confirmAction.action === "approvePayment" && "Approve Payment?"}
                {confirmAction.action === "rejectPayment" && "Reject Payment?"}
                {confirmAction.action === "confirmCOD" && "Confirm COD?"}
                {confirmAction.action === "rejectCOD" && "Reject COD?"}
              </h2>
            </div>
            <div className="p-6">
              {confirmAction.action === "approvePayment" ||
              confirmAction.action === "confirmCOD" ? (
                <p className="text-[#8e8e93] text-xs mb-4">
                  {confirmAction.action === "approvePayment"
                    ? "This payment receipt has been verified. The order will become Ready to Process and will be available for employee processing."
                    : "This will mark the Cash on Delivery request as confirmed. The order will become Ready to Process."}
                </p>
              ) : (
                <p className="text-red-400 text-xs mb-4 font-bold border border-red-500/20 bg-red-500/10 p-3 rounded-lg">
                  Reserved stock will be released automatically.
                </p>
              )}

              {(confirmAction.action === "rejectPayment" ||
                confirmAction.action === "rejectCOD") && (
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">
                      Reject Reason <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Required for rejection..."
                      className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setConfirmAction(null)}
                  className="disabled:opacity-50 flex-1 bg-[#18181b] hover:bg-white/5 border border-[#27272a] text-white font-bold px-4 py-2.5 rounded-lg transition-colors uppercase text-[10px] tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    isProcessing ||
                    ((confirmAction.action === "rejectPayment" ||
                      confirmAction.action === "rejectCOD") &&
                      !rejectReason.trim())
                  }
                  onClick={confirmActionProcessor}
                  className={`flex-1 font-bold px-4 py-2.5 rounded-lg transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    confirmAction.action === "rejectPayment" ||
                    confirmAction.action === "rejectCOD"
                      ? "bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                  }`}
                >
                  {isProcessing
                    ? "Processing..."
                    : confirmAction.action === "rejectPayment" ||
                        confirmAction.action === "rejectCOD"
                      ? "Reject"
                      : "Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {Object.keys(statCounts).map((status) => {
          const config = statusConfig[status];
          const isActive = statusFilter === status;
          const Icon = config.icon;
          return (
            <div
              key={status}
              onClick={() => setStatusFilter(isActive ? "All" : status)}
              className={`p-3.5 sm:p-4 rounded-xl border shadow-sm cursor-pointer transition-all ${
                isActive
                  ? "bg-[#18181b] border-emerald-500/50 ring-1 ring-emerald-500/30"
                  : "bg-[#09090b] border-[#27272a] hover:border-emerald-500/30 hover:bg-[#121215]"
              }`}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className={`p-2 rounded-lg ${config.bg} ${config.color} border ${config.border}`}>
                  <Icon />
                </div>
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-1 truncate">
                  {status}
                </p>
                <h3 className={`text-xl sm:text-2xl font-bold font-mono ${config.color}`}>
                  {statCounts[status]}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* FILTER BAR */}
      <div className="bg-[#09090b] p-4 sm:p-5 rounded-xl border border-[#27272a] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">
            Status Filter
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-3.5 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
          >
            <option value="All">All Statuses</option>
            {Object.keys(statCounts).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">
            Payment Method
          </label>
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-3.5 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
          >
            <option value="All">All Methods</option>
            <option value="Cash On Delivery">Cash On Delivery</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">
            Date Range
          </label>
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-3.5 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">
            Sort By
          </label>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-3.5 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
          >
            <option value="Newest First">Newest First</option>
            <option value="Oldest First">Oldest First</option>
            <option value="Highest Amount">Highest Amount</option>
            <option value="Lowest Amount">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="bg-[#09090b] rounded-xl border border-[#27272a] overflow-hidden shadow-lg">
        <div className="overflow-x-auto custom-scrollbar">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <p className="text-xs text-emerald-400 uppercase tracking-widest font-mono">
                Syncing database orders...
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-[#8e8e93]">
                <Icons.AlertTriangle />
              </div>
              <h3 className="text-white font-bold tracking-widest uppercase text-sm mb-2">
                No orders found
              </h3>
              <p className="text-xs text-[#8e8e93]">
                Try adjusting your filters or search query.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-[#050505] border-b border-[#27272a] text-[#8e8e93]">
                  <th className="px-4 py-3.5 font-bold tracking-widest text-[9px] uppercase">
                    Order ID / Date
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-widest text-[9px] uppercase">
                    Customer
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-widest text-[9px] uppercase">
                    Payment
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-widest text-[9px] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-widest text-[9px] uppercase">
                    Receipt
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-widest text-[9px] uppercase text-right">
                    Amount
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-widest text-[9px] uppercase text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181b] bg-[#0d0d0d]">
                {filteredOrders.map((order) => {
                  const status = getDerivedStatus(order);
                  const config = statusConfig[status];

                  return (
                    <tr
                      key={order.order_id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Order ID & Date */}
                      <td className="px-4 py-3.5">
                        <div className="text-white font-bold font-mono">
                          {order.order_id}
                        </div>
                        <div className="text-[#8e8e93] text-[10px] mt-1 font-mono">
                          {new Date(order.order_date).toLocaleString()}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div
                          className="font-bold text-white hover:text-emerald-400 cursor-pointer transition-colors"
                          onClick={() => setCustomerDrawerOrder(order)}
                        >
                          {order.order_customer_details.first_name}{" "}
                          {order.order_customer_details.last_name}
                        </div>
                        <div className="text-[#8e8e93] text-[10px] mt-1 font-mono">
                          {order.order_customer_details.phone}
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3.5">
                        <div className="text-[#8e8e93] font-bold uppercase text-[10px] tracking-wider bg-[#18181b] border border-[#27272a] inline-block px-2.5 py-1 rounded-md">
                          {order.payment_method}
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span
                            className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full tracking-wider border uppercase ${config.bg} ${config.color} ${config.border}`}
                          >
                            {status}
                          </span>
                          {!order.pending_checkout && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider border uppercase bg-[#18181b] text-emerald-400 border-emerald-500/20">
                              Order: {order.order_status}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Receipt */}
                      <td className="px-4 py-3.5">
                        {order.payment_proofs?.receipt_url ? (
                          <button
                            type="button"
                            onClick={() => setReceiptModalOrder(order)}
                            className="inline-flex items-center gap-1.5 bg-[#18181b] hover:bg-emerald-950/60 text-white hover:text-emerald-400 border border-[#27272a] hover:border-emerald-500/40 px-3 py-1.5 rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest cursor-pointer"
                          >
                            <Icons.Receipt /> View Receipt
                          </button>
                        ) : (
                          <span className="text-[#555] text-[10px] uppercase tracking-wider font-semibold">
                            No Receipt
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="text-white font-bold font-mono">
                          {order.total_amount.toLocaleString()} LKR
                        </div>
                        {order.delivery_fee > 0 && (
                          <div className="text-[#8e8e93] text-[9px] mt-1 font-mono">
                            +{order.delivery_fee.toLocaleString()} LKR Shipping
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            title="View Details"
                            className="flex items-center justify-center w-8 h-8 bg-[#18181b] hover:bg-emerald-950/60 text-[#a1a1aa] hover:text-emerald-400 border border-[#27272a] hover:border-emerald-500/40 rounded-lg cursor-pointer transition-all"
                          >
                            <Icons.Eye />
                          </button>

                          {status === "Waiting COD" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmAction({
                                    action: "confirmCOD",
                                    orderId: order.order_id,
                                  })
                                }
                                title="Confirm COD"
                                className="flex items-center justify-center w-8 h-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-all border border-emerald-500/30 cursor-pointer active:scale-95"
                              >
                                <Icons.CheckCircle />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectReason("");
                                  setConfirmAction({
                                    action: "rejectCOD",
                                    orderId: order.order_id,
                                  });
                                }}
                                title="Reject COD"
                                className="flex items-center justify-center w-8 h-8 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/30 cursor-pointer active:scale-95"
                              >
                                <Icons.Cross />
                              </button>
                            </>
                          )}

                          {status === "Pending Verification" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmAction({
                                    action: "approvePayment",
                                    orderId: order.order_id,
                                  })
                                }
                                title="Approve Payment"
                                className="flex items-center justify-center w-8 h-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-950/40 active:scale-95"
                              >
                                <Icons.Check />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectReason("");
                                  setConfirmAction({
                                    action: "rejectPayment",
                                    orderId: order.order_id,
                                  });
                                }}
                                title="Reject Payment"
                                className="flex items-center justify-center w-8 h-8 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all cursor-pointer shadow-md shadow-red-950/40 active:scale-95"
                              >
                                <Icons.Cross />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* DETAILS RIGHT DRAWER */}
      {selectedOrder && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#09090b] border-l border-[#27272a] shadow-2xl z-[110] flex flex-col animate-fade-in select-text">
            <div className="px-6 py-4 border-b border-[#18181b] flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-white font-bold tracking-widest uppercase text-xs">
                  Order Details
                </h2>
                <p className="text-[#8e8e93] text-[10px] font-mono mt-1">
                  {selectedOrder.order_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-[#8e8e93] hover:text-white transition-colors p-1 cursor-pointer"
              >
                <Icons.Close />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Order Information */}
              <section>
                <h3 className="text-xs font-bold text-[#8e8e93] tracking-widest uppercase mb-4 border-b border-[#18181b] pb-2">
                  Order Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                      Date
                    </p>
                    <p className="text-white">
                      {new Date(selectedOrder.order_date).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                      Order Status
                    </p>
                    <p className="text-emerald-400 font-bold uppercase">
                      {selectedOrder.order_status}
                    </p>
                  </div>
                </div>

                {!selectedOrder.pending_checkout && (
                  <div className="mt-4 bg-[#141416] p-3.5 rounded-lg border border-[#27272a]">
                    <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">
                      Update Order Status (Database Sync)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedOrder.order_status}
                        onChange={(e) => updateOrderStatus(selectedOrder.order_id, e.target.value)}
                        disabled={isProcessing}
                        className="flex-1 bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-bold text-white cursor-pointer focus:outline-none transition-all"
                      >
                        {MANAGED_ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                    Ordered Items
                  </p>
                  {selectedOrder.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-[#141416] p-3 rounded-lg border border-[#27272a]"
                    >
                      <div>
                        <p className="text-white font-bold text-xs uppercase tracking-wide">
                          {item.name}
                        </p>
                        <p className="text-[#8e8e93] text-[10px] mt-1 font-mono">
                          Qty: {item.quantity} × {item.price.toLocaleString()} LKR
                        </p>
                      </div>
                      <p className="text-white font-bold font-mono">
                        {(item.quantity * item.price).toLocaleString()} LKR
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2 border-t border-[#18181b] pt-4">
                  <div className="flex justify-between text-xs text-[#8e8e93] font-mono">
                    <span>Subtotal</span>
                    <span>
                      {(
                        selectedOrder.total_amount - selectedOrder.delivery_fee
                      ).toLocaleString()}{" "}
                      LKR
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-[#8e8e93] font-mono">
                    <span>Delivery Fee</span>
                    <span>
                      {selectedOrder.delivery_fee.toLocaleString()} LKR
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-white font-bold font-mono pt-2">
                    <span>Total</span>
                    <span className="text-emerald-400">
                      {selectedOrder.total_amount.toLocaleString()} LKR
                    </span>
                  </div>
                </div>
              </section>

              {/* Customer Details */}
              <section>
                <h3 className="text-xs font-bold text-[#8e8e93] tracking-widest uppercase mb-4 border-b border-[#18181b] pb-2">
                  Customer Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                      Full Name
                    </p>
                    <p className="text-white font-bold">
                      {selectedOrder.order_customer_details.first_name}{" "}
                      {selectedOrder.order_customer_details.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                      Contact
                    </p>
                    <p className="text-white font-mono">
                      {selectedOrder.order_customer_details.phone}
                    </p>
                    <p className="text-[#8e8e93] mt-0.5 truncate">
                      {selectedOrder.order_customer_details.email}
                    </p>
                  </div>
                </div>
              </section>

              {/* Shipping Details */}
              <section>
                <h3 className="text-xs font-bold text-[#8e8e93] tracking-widest uppercase mb-4 border-b border-[#18181b] pb-2">
                  Shipping Details
                </h3>
                <div className="bg-[#141416] p-4 rounded-lg border border-[#27272a] text-xs space-y-1">
                  <p className="text-white font-bold mb-2">
                    {selectedOrder.order_shipping_details.receiver_name}{" "}
                    <span className="text-[#8e8e93] ml-2 font-normal font-mono">
                      {selectedOrder.order_shipping_details.phone}
                    </span>
                  </p>
                  <p className="text-[#8e8e93]">
                    {selectedOrder.order_shipping_details.address_line_1}
                  </p>
                  {selectedOrder.order_shipping_details.address_line_2 && (
                    <p className="text-[#8e8e93]">
                      {selectedOrder.order_shipping_details.address_line_2}
                    </p>
                  )}
                  <p className="text-[#8e8e93]">
                    {selectedOrder.order_shipping_details.city},{" "}
                    {selectedOrder.order_shipping_details.district}{" "}
                    {selectedOrder.order_shipping_details.postal_code}
                  </p>
                </div>
              </section>

              {/* Payment Details */}
              <section>
                <h3 className="text-xs font-bold text-[#8e8e93] tracking-widest uppercase mb-4 border-b border-[#18181b] pb-2">
                  Payment Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                      Method
                    </p>
                    <p className="text-white uppercase font-bold">
                      {selectedOrder.payment_method}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                      Status
                    </p>
                    <p className={`font-bold uppercase ${statusConfig[getDerivedStatus(selectedOrder)].color}`}>
                      {getDerivedStatus(selectedOrder)}
                    </p>
                  </div>
                </div>

                {selectedOrder.payment_proofs && (
                  <div className="mt-4 bg-[#141416] p-4 rounded-lg border border-[#27272a]">
                    <p className="text-[#555] uppercase tracking-wider text-[9px] mb-2">
                      Receipt Preview
                    </p>
                    {selectedOrder.payment_proofs.uploaded_at && (
                      <p className="text-xs text-[#8e8e93] font-mono mb-1">
                        Uploaded:{" "}
                        {new Date(
                          selectedOrder.payment_proofs.uploaded_at
                        ).toLocaleString()}
                      </p>
                    )}
                    {selectedOrder.payment_proofs.expires_at && (
                      <p className="text-xs text-[#8e8e93] font-mono mb-3">
                        Expires:{" "}
                        {new Date(
                          selectedOrder.payment_proofs.expires_at
                        ).toLocaleString()}
                      </p>
                    )}
                    {selectedOrder.payment_proofs.receipt_url && (
                      <button
                        type="button"
                        onClick={() => setReceiptModalOrder(selectedOrder)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-lg transition-all w-full flex justify-center items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/40"
                      >
                        <Icons.Eye /> Preview Receipt
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Verification Log */}
              {((selectedOrder.payment_method === "Bank Transfer" &&
                (getDerivedStatus(selectedOrder) === "Approved" ||
                  getDerivedStatus(selectedOrder) === "Rejected")) ||
                (selectedOrder.payment_method === "Cash On Delivery" &&
                  selectedOrder.confirmation_status !== "Pending")) && (
                <section
                  className={`border p-5 rounded-xl mt-6 relative overflow-hidden ${
                    getDerivedStatus(selectedOrder) === "Approved" ||
                    selectedOrder.confirmation_status === "Confirmed"
                      ? "bg-[#141416] border-emerald-500/20"
                      : "bg-[#141416] border-red-500/20"
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 w-1.5 h-full ${
                      getDerivedStatus(selectedOrder) === "Approved" ||
                      selectedOrder.confirmation_status === "Confirmed"
                        ? "bg-emerald-500"
                        : "bg-red-500"
                    }`}
                  />

                  <h3 className="text-xs font-bold text-white tracking-widest uppercase mb-4 flex items-center gap-2">
                    {getDerivedStatus(selectedOrder) === "Approved" ||
                    selectedOrder.confirmation_status === "Confirmed" ? (
                      <Icons.CheckCircle />
                    ) : (
                      <Icons.XCircle />
                    )}
                    {getDerivedStatus(selectedOrder) === "Approved" ||
                    selectedOrder.confirmation_status === "Confirmed"
                      ? "Approval Verification Log"
                      : "Rejection Verification Log"}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-3 bg-[#18181b] p-3 rounded-lg border border-[#27272a]">
                    <div>
                      <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                        Final Status
                      </p>
                      <div className="inline-block mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide border uppercase ${
                            getDerivedStatus(selectedOrder) === "Approved" ||
                            selectedOrder.confirmation_status === "Confirmed"
                              ? statusConfig["Approved"].bg +
                                " " +
                                statusConfig["Approved"].color +
                                " " +
                                statusConfig["Approved"].border
                              : statusConfig["Rejected"].bg +
                                " " +
                                statusConfig["Rejected"].color +
                                " " +
                                statusConfig["Rejected"].border
                          }`}
                        >
                          {getDerivedStatus(selectedOrder) === "Approved" ||
                          selectedOrder.confirmation_status === "Confirmed"
                            ? "Approved"
                            : "Rejected"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                        Reviewed By
                      </p>
                      <p className="text-white font-bold">Admin</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                        Review Timestamp
                      </p>
                      <p className="text-white font-mono">
                        {selectedOrder.payment_proofs?.acted_at
                          ? new Date(
                              selectedOrder.payment_proofs.acted_at
                            ).toLocaleString()
                          : new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {selectedOrder.payment_proofs?.rejected_reason && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg mt-3">
                      <p className="text-red-400 uppercase tracking-wider text-[9px] mb-1 font-bold">
                        Reject Reason
                      </p>
                      <p className="text-red-300 text-xs font-medium">
                        {selectedOrder.payment_proofs.rejected_reason}
                      </p>
                    </div>
                  )}
                </section>
              )}

              <div className="bg-[#141416] p-4 rounded-lg text-center text-[10px] text-[#555] uppercase tracking-widest mt-8 font-bold">
                End of Order Record
              </div>
            </div>
          </div>
        </>
      )}

      {/* RECEIPT IMAGE MODAL */}
      {receiptModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="absolute top-6 right-6 z-10">
            <button
              type="button"
              onClick={() => setReceiptModalOrder(null)}
              className="text-white/70 hover:text-white transition-colors bg-white/10 p-2 rounded-full cursor-pointer"
            >
              <Icons.Close />
            </button>
          </div>
          <div className="bg-[#09090b] p-2 rounded-xl border border-[#27272a] flex flex-col items-center shadow-2xl max-w-full">
            <div className="w-[90vw] max-w-[450px] bg-[#141416] rounded-t-lg pt-4 px-6 border-b border-[#27272a] text-center">
              <h3 className="text-white font-bold tracking-widest uppercase text-xs">
                Receipt Preview
              </h3>
              <div className="text-[10px] text-[#8e8e93] font-mono mt-2 mb-4 grid grid-cols-2 gap-2 text-left">
                <div>
                  <span className="text-[#555] uppercase tracking-wider">
                    Method:
                  </span>
                  <p className="text-white mt-0.5">
                    {receiptModalOrder.payment_method}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[#555] uppercase tracking-wider">
                    Status:
                  </span>
                  <p className="text-white mt-0.5">
                    {getDerivedStatus(receiptModalOrder)}
                  </p>
                </div>
                <div className="col-span-2 border-t border-[#27272a] pt-2 mt-1">
                  <span className="text-[#555] uppercase tracking-wider">
                    Uploaded:
                  </span>
                  <p className="text-white mt-0.5 font-mono">
                    {receiptModalOrder.payment_proofs?.uploaded_at
                      ? new Date(
                          receiptModalOrder.payment_proofs.uploaded_at
                        ).toLocaleString()
                      : new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="w-[90vw] max-w-[450px] h-[60vh] max-h-[500px] rounded-b-lg bg-[#141416] flex items-center justify-center relative overflow-hidden p-2">
              <object
                data={receiptModalOrder.payment_proofs?.receipt_url}
                type="image/*"
                aria-label={`Payment receipt for ${receiptModalOrder.order_id}`}
                className="relative z-10 w-full h-full object-contain rounded-lg"
              >
                <a
                  href={receiptModalOrder.payment_proofs?.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative z-10 text-xs text-emerald-400 underline font-bold"
                >
                  Open receipt in a new tab
                </a>
              </object>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER INFO DRAWER */}
      {customerDrawerOrder && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={() => setCustomerDrawerOrder(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-[#09090b] border-l border-[#27272a] shadow-2xl z-[110] flex flex-col animate-fade-in select-text">
            <div className="px-6 py-4 border-b border-[#18181b] flex items-center justify-between shrink-0">
              <h2 className="text-white font-bold tracking-widest uppercase text-xs">
                Customer Info
              </h2>
              <button
                type="button"
                onClick={() => setCustomerDrawerOrder(null)}
                className="text-[#8e8e93] hover:text-white transition-colors cursor-pointer p-1"
              >
                <Icons.Close />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xl uppercase border border-emerald-500/30 flex justify-center items-center">
                  {customerDrawerOrder.order_customer_details.first_name[0]}
                  {customerDrawerOrder.order_customer_details.last_name[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wide">
                    {customerDrawerOrder.order_customer_details.first_name}{" "}
                    {customerDrawerOrder.order_customer_details.last_name}
                  </h3>
                  <p
                    className={`text-[10px] font-mono uppercase mt-1 ${
                      customerDrawerOrder.registered_customer
                        ? "text-emerald-400 font-bold"
                        : "text-[#8e8e93]"
                    }`}
                  >
                    {customerDrawerOrder.registered_customer
                      ? "Registered Customer"
                      : "Guest Checkout"}
                  </p>
                </div>
              </div>

              <div className="space-y-4 bg-[#141416] p-4 rounded-xl border border-[#27272a]">
                <div>
                  <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                    Email Address
                  </p>
                  <p className="text-white text-xs font-mono">
                    {customerDrawerOrder.order_customer_details.email}
                  </p>
                </div>
                <div>
                  <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                    Phone Number
                  </p>
                  <p className="text-white text-xs font-mono">
                    {customerDrawerOrder.order_customer_details.phone}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
