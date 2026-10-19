"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/orders.css";

interface OrderDetails {
  orderId: string;
  pendingCheckout?: boolean;
  customerId: string | null;
  employeeId: string | null;
  branchId: string | null;
  orderDate: string | null;
  totalAmount: string | number;
  productTotal: string | number;
  deliveryFee: string | number;
  shippingAddress: string;
  orderStatus: string | null;
  confirmationStatus?: "Pending" | "Approved" | "Rejected";
  confirmedAt?: string | null;
  preparingAt?: string | null;
  parcelReadyAt?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  updatedAt?: string | null;
  paymentMethod: string;
  paymentProofs?: Array<{
    status: string;
    uploadedAt: string | null;
  }>;
  customerDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null;
  shippingDetails: {
    receiverName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    district: string;
    postalCode: string | null;
    deliveryNote: string | null;
  } | null;
  assignedEmployee?: {
    employeeId: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  orderItems: Array<{
    orderItemId: string;
    quantity: number;
    unitPrice: string | number;
    subtotal: string | number;
    variant: {
      size: string;
      color: string;
      product: { name: string; basePrice: string | number } | null;
      images: Array<{ imageUrl: string }>;
    } | null;
  }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function PackageTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(null);

  // Fetch tracking data
  const loadOrderData = async () => {
    setError(null);
    setAccessDenied(false);
    const token = sessionStorage.getItem("vergo_access_token");
    const storedUser = sessionStorage.getItem("vergo_user");
    const loggedIn = sessionStorage.getItem("vergo_is_logged_in") === "true";
    const user = storedUser ? JSON.parse(storedUser) : null;

    // Check local storage for guest orders list
    const storedOrders = localStorage.getItem("vergo_customer_orders");
    const guestOrdersList = storedOrders ? JSON.parse(storedOrders) : [];
    const isSavedInLocal = guestOrdersList.some((o: any) => o.id === orderId);

    if (!loggedIn && !isSavedInLocal) {
      setAccessDenied(true);
      setIsLoading(false);
      return;
    }
    if (loggedIn && !token) {
      setError("Your login session has expired. Please sign in again.");
      setIsLoading(false);
      return;
    }

    try {
      if (token) {
        const response = await fetch(`${API_URL}/orders/mine/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();

          // Verify customer ownership if order has customerId
          if (
            data.customerId &&
            user &&
            user.customerId &&
            user.customerId !== data.customerId
          ) {
            setAccessDenied(true);
            return;
          }

          setOrder(data as OrderDetails);
          return;
        }

        const body = await response.json().catch(() => ({}));
        if (
          response.status === 401 ||
          response.status === 403 ||
          response.status === 404
        ) {
          setAccessDenied(true);
          return;
        }
        throw new Error(
          body.message || "Unable to retrieve tracking data from the database.",
        );
      }

      // Only genuine guest checkout records use local storage. Authenticated
      // customer tracking always comes from the database endpoint above.
      if (isSavedInLocal) {
        const localOrderDetails = guestOrdersList.find(
          (o: any) => o.id === orderId,
        );
        if (localOrderDetails) {
          const mockDetails: OrderDetails = {
            orderId: localOrderDetails.id,
            customerId: null,
            employeeId: null,
            branchId: null,
            orderDate: localOrderDetails.date || new Date().toISOString(),
            totalAmount: localOrderDetails.total,
            productTotal: Number(localOrderDetails.total) - 100,
            deliveryFee: 100,
            shippingAddress:
              "Alexander Mercer, 42 Technical District, Innovation Way, Colombo, Sri Lanka",
            orderStatus: localOrderDetails.status,
            paymentMethod:
              localOrderDetails.paymentMethod === "Bank Transfer"
                ? "bank_transfer"
                : "cod",
            customerDetails: {
              firstName: "Alexander",
              lastName: "Mercer",
              email: "alexander@example.com",
              phone: "0771234567",
            },
            shippingDetails: {
              receiverName: "Alexander Mercer",
              phone: "0771234567",
              addressLine1: "42 Technical District",
              addressLine2: "Innovation Way, Suite 101",
              city: "Colombo",
              district: "Colombo",
              postalCode: "00200",
              deliveryNote: "Leave at security desk",
            },
            orderItems: (localOrderDetails.items || []).map(
              (item: any, idx: number) => ({
                orderItemId: `mock-item-${idx}`,
                quantity: item.qty,
                unitPrice: item.price,
                subtotal: item.qty * item.price,
                variant: {
                  size: item.size || "M",
                  color: item.color || "Black",
                  product: { name: item.name, basePrice: item.price },
                  images: [{ imageUrl: item.image || "/logo.png" }],
                },
              }),
            ),
          };
          setOrder(mockDetails);
          return;
        }
      }

      throw new Error("Unable to retrieve order tracking record.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrderData();
  }, [orderId]);

  // Order cancellation handler
  const handleCancelOrder = async () => {
    if (!order) return;
    setIsCancelling(true);
    setError(null);
    const token = sessionStorage.getItem("vergo_access_token");

    try {
      if (token) {
        const cancelUrl = order.pendingCheckout
          ? `${API_URL}/orders/pending-checkouts/${orderId}/cancel`
          : `${API_URL}/orders/mine/${orderId}/cancel`;
        const response = await fetch(cancelUrl, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          setCancelSuccess(true);
          await loadOrderData();
          setIsCancelling(false);
          return;
        } else {
          const data = await response.json();
          throw new Error(data.message || "Failed to cancel order.");
        }
      }

      // Guest / Offline fallback cancellation
      const storedOrders = localStorage.getItem("vergo_customer_orders");
      if (storedOrders) {
        const list = JSON.parse(storedOrders);
        const updated = list.map((o: any) => {
          if (o.id === orderId) {
            return { ...o, status: "Cancelled" };
          }
          return o;
        });
        localStorage.setItem("vergo_customer_orders", JSON.stringify(updated));
        setCancelSuccess(true);
        setIsCancelling(false);
        await loadOrderData();
        return;
      }

      throw new Error("Unable to perform offline cancellation.");
    } catch (e: any) {
      setError(e.message);
      setIsCancelling(false);
    }
  };

  // Helper date conversions
  const getFormattedDate = (dateStr: string | null) => {
    if (!dateStr) return "Pending";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFormattedTime = (dateStr: string | null) => {
    if (!dateStr) return "Pending";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEstimatedDelivery = (dateStr: string | null) => {
    if (!dateStr) return "Pending";
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 4); // Estimated 4 days
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Render Access Denied
  if (accessDenied) {
    return (
      <div className="orders-page-wrapper">
        <div className="orders-container">
          <div className="empty-orders-container">
            <h2 className="empty-orders-title">Access Denied</h2>
            <p className="empty-orders-desc">
              You are not authorized to track this order record. Please verify
              your login credentials.
            </p>
            <Link href="/profile/orders" className="shop-now-btn">
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Loading
  if (isLoading) {
    return (
      <div className="orders-page-wrapper">
        <div
          className="orders-container"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontWeight: "600",
              fontSize: "14px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Loading tracking details...
          </p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="orders-page-wrapper">
        <div className="orders-container">
          <div className="empty-orders-container">
            <h2 className="empty-orders-title">Tracking Unavailable</h2>
            <p className="empty-orders-desc">{error}</p>
            <Link href="/profile/orders" className="shop-now-btn">
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  // Track status codes
  const statusStr = (order.orderStatus || "").toLowerCase();
  const isBankTransfer = order.paymentMethod.toLowerCase().includes("bank");
  const isCashOnDelivery =
    order.paymentMethod.toLowerCase().includes("cash") ||
    order.paymentMethod.toLowerCase() === "cod";
  const canCancel =
    Boolean(order.pendingCheckout) &&
    isCashOnDelivery &&
    ["pending", "pending confirmation"].includes(statusStr);

  // Estimated delivery box header text color / banner pill
  let statusBannerClass = "delivered";
  let statusBannerText = "Delivered";

  if (statusStr.includes("pending") || statusStr === "draft") {
    statusBannerClass = "pending";
    statusBannerText = "Preparing Shipment";
  } else if (statusStr === "cancelled") {
    statusBannerClass = "cancelled";
    statusBannerText = "Cancelled";
  } else if (statusStr === "completed" || statusStr === "delivered") {
    statusBannerClass = "delivered";
    statusBannerText = "Delivered";
  } else if (statusStr.includes("out for delivery")) {
    statusBannerClass = "in-transit";
    statusBannerText = "Out for Delivery";
  } else if (statusStr.includes("sent") || statusStr.includes("dispatched")) {
    statusBannerClass = "in-transit";
    statusBannerText = "In Transit";
  } else if (statusStr.includes("ready")) {
    statusBannerClass = "in-transit";
    statusBannerText = "Ready for Pickup";
  } else {
    // preparing, claimed by employee, ready to process
    statusBannerClass = "in-transit";
    statusBannerText = "Preparing Package";
  }

  // Vertical timeline state check functions
  const orderPlacedDate = order.orderDate;
  const orderPlacedFormatted = `${getFormattedDate(orderPlacedDate)} · ${getFormattedTime(orderPlacedDate)}`;

  // Payment is approved if payment status isn't pending payment (e.g. is verified/on-progress)
  const isPaymentApproved =
    isBankTransfer &&
    ![
      "draft",
      "pending payment",
      "pending verification",
      "rejected",
      "expired",
    ].includes(statusStr);
  const paymentApprovedAt =
    order.confirmedAt || order.paymentProofs?.at(-1)?.uploadedAt || null;
  const isAdminApproved = order.confirmationStatus
    ? order.confirmationStatus === "Approved"
    : [
        "ready to process",
        "claimed",
        "claimed by employee",
        "preparing",
        "package prepared",
        "ready",
        "ready for pickup",
        "ready for courier pickup",
        "sent",
        "sent for delivery",
        "dispatched",
        "in transit",
        "out for delivery",
        "delivered",
        "completed",
        "finished",
      ].some((st) => statusStr.includes(st));

  // Package Prepared stage
  const isPackagePrepared = [
    "claimed",
    "claimed by employee",
    "preparing",
    "package prepared",
    "ready",
    "ready for pickup",
    "ready for courier pickup",
    "sent",
    "sent for delivery",
    "dispatched",
    "in transit",
    "out for delivery",
    "delivered",
    "completed",
    "finished",
  ].some((st) => statusStr.includes(st));

  // Ready for Courier Pickup stage
  const isReadyForCourierPickup = [
    "ready",
    "ready for pickup",
    "ready for courier pickup",
    "sent",
    "sent for delivery",
    "dispatched",
    "in transit",
    "out for delivery",
    "delivered",
    "completed",
    "finished",
  ].some((st) => statusStr.includes(st));

  // Handed to Citypak Courier stage
  const isHandedToCourier = [
    "sent",
    "sent for delivery",
    "dispatched",
    "in transit",
    "out for delivery",
    "delivered",
    "completed",
    "finished",
  ].some((st) => statusStr.includes(st));

  // Finished stage
  const isFinished = [
    "delivered",
    "completed",
    "finished",
  ].some((st) => statusStr.includes(st));

  const handleSyncCitypak = async () => {
    setIsSyncing(true);
    const token = sessionStorage.getItem("vergo_access_token");
    try {
      if (token) {
        await fetch(`${API_URL}/integrations/citypak/sync`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await loadOrderData();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncLabel(timeStr);
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="orders-page-wrapper">
      <div className="orders-container wide">
        {/* Breadcrumb path */}
        <div className="orders-breadcrumbs">
          <Link href="/">HOME</Link> ›{" "}
          <Link href="/profile/orders">PROFILE</Link> ›{" "}
          <Link href="/profile/orders">MY ORDERS</Link> ›{" "}
          <span className="active">
            TRACK #{order.orderId.substring(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <div style={{ marginBottom: "30px" }}>
          <h1
            className="orders-title"
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: "36px",
              fontWeight: "900",
              letterSpacing: "0.05em",
            }}
          >
            TRACK PACKAGE
          </h1>
          <p className="orders-subtitle" style={{ marginTop: "4px" }}>
            Real-time status updates for your delivery.
          </p>
        </div>

        {/* Layout Grid */}
        <div className="order-detail-grid">
          {/* Left Column (Tracking Status Timeline & Actions) */}
          <div className="order-main-content">
            {/* ETA Box Card */}
            <div
              style={{
                backgroundColor: "#111112",
                border: "1px solid rgba(255, 255, 255, 0.04)",
                borderRadius: "16px",
                padding: "24px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#00FF9D",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.4)",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Estimated Delivery
                  </div>
                  <h2
                    style={{
                      fontSize: "24px",
                      fontWeight: "900",
                      color: "#ffffff",
                      fontFamily: "'Oswald', sans-serif",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {statusStr === "cancelled"
                      ? "Cancelled"
                      : getEstimatedDelivery(order.orderDate)}
                  </h2>
                </div>
              </div>

              {/* Status Pill Badge */}
              <span className={`order-status-badge ${statusBannerClass}`}>
                {statusBannerText}
              </span>
            </div>

            {/* Tracking History Card */}
            <div
              className="order-detail-card"
              style={{ padding: "30px", marginBottom: "24px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
                <h2
                  className="card-title"
                  style={{
                    fontSize: "18px",
                    fontWeight: "900",
                    letterSpacing: "0.08em",
                    fontFamily: "'Oswald', sans-serif",
                    margin: 0,
                  }}
                >
                  TRACKING HISTORY
                </h2>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {lastSyncLabel && (
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                      Last updated: <strong style={{ color: "#00FF9D" }}>{lastSyncLabel}</strong>
                    </span>
                  )}

                  <button
                    onClick={handleSyncCitypak}
                    disabled={isSyncing}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{ animation: isSyncing ? "spin 1s linear infinite" : "none" }}
                    >
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                    <span>{isSyncing ? "Syncing..." : "Refresh Live Status"}</span>
                  </button>
                </div>
              </div>

              {/* Timeline list */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  paddingLeft: "40px",
                }}
              >
                {/* Timeline Line */}
                <div
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "14px",
                    bottom: "14px",
                    width: "2px",
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                  }}
                />

                {/* STEP 1: Order Placed */}
                <div style={{ position: "relative", marginBottom: "32px" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "-38px",
                      top: "0px",
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      backgroundColor: "#00FF9D",
                      border: "2px solid #00FF9D",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#121212",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        color: "#ffffff",
                        margin: 0,
                      }}
                    >
                      Order Placed
                    </h3>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.4)",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {orderPlacedFormatted}
                    </p>
                  </div>
                </div>

                {/* Order approval by Admin. */}
                <div style={{ position: "relative", marginBottom: "32px" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "-38px",
                      top: "0px",
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      backgroundColor: isAdminApproved ? "#00FF9D" : "#121212",
                      border: isAdminApproved
                        ? "2px solid #00FF9D"
                        : "2px solid rgba(255, 255, 255, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isAdminApproved
                        ? "#121212"
                        : "rgba(255, 255, 255, 0.25)",
                    }}
                  >
                    {isAdminApproved ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(255,255,255,0.15)",
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        color: isAdminApproved
                          ? "#ffffff"
                          : "rgba(255, 255, 255, 0.35)",
                        margin: 0,
                      }}
                    >
                      Admin Approved
                    </h3>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.4)",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {isAdminApproved
                        ? order.confirmedAt
                          ? `${getFormattedDate(order.confirmedAt)} · ${getFormattedTime(order.confirmedAt)}`
                          : "Approved"
                        : "Pending"}
                    </p>
                  </div>
                </div>

                {/* STEP 3: Package Prepared */}
                <div style={{ position: "relative", marginBottom: "32px" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "-38px",
                      top: "0px",
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      backgroundColor: isPackagePrepared
                        ? "#00FF9D"
                        : "#121212",
                      border: isPackagePrepared
                        ? "2px solid #00FF9D"
                        : "2px solid rgba(255, 255, 255, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isPackagePrepared
                        ? "#121212"
                        : "rgba(255, 255, 255, 0.25)",
                    }}
                  >
                    {isPackagePrepared ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(255,255,255,0.15)",
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        color: isPackagePrepared
                          ? "#ffffff"
                          : "rgba(255, 255, 255, 0.35)",
                        margin: 0,
                      }}
                    >
                      Package Preparing
                    </h3>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.4)",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {isPackagePrepared
                        ? order.preparingAt
                          ? `${getFormattedDate(order.preparingAt)} · ${getFormattedTime(order.preparingAt)}`
                          : order.updatedAt
                          ? `${getFormattedDate(order.updatedAt)} · ${getFormattedTime(order.updatedAt)}`
                          : "Prepared"
                        : "Pending"}
                    </p>
                    {isPackagePrepared && !isReadyForCourierPickup && (
                      <p
                        style={{
                          fontSize: "13px",
                          color: "rgba(255,255,255,0.7)",
                          margin: "10px 0 0 0",
                          lineHeight: "1.6",
                        }}
                      >
                        Our warehouse team has picked and packed your items for shipment.
                      </p>
                    )}
                  </div>
                </div>

                {/* STEP 4: Ready for Courier Pickup */}
                <div style={{ position: "relative", marginBottom: "32px" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "-38px",
                      top: "0px",
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      backgroundColor: isReadyForCourierPickup ? "#00FF9D" : "#121212",
                      border: isReadyForCourierPickup
                        ? "2px solid #00FF9D"
                        : "2px solid rgba(255, 255, 255, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isReadyForCourierPickup
                        ? "#121212"
                        : "rgba(255, 255, 255, 0.25)",
                    }}
                  >
                    {isReadyForCourierPickup ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(255,255,255,0.15)",
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        color: isReadyForCourierPickup
                          ? "#ffffff"
                          : "rgba(255, 255, 255, 0.35)",
                        margin: 0,
                      }}
                    >
                      Ready for Courier Pickup
                    </h3>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.4)",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {isReadyForCourierPickup
                        ? order.parcelReadyAt
                          ? `${getFormattedDate(order.parcelReadyAt)} · ${getFormattedTime(order.parcelReadyAt)}`
                          : "Staged for Pickup"
                        : "Pending"}
                    </p>
                    {isReadyForCourierPickup && !isHandedToCourier && (
                      <p
                        style={{
                          fontSize: "13px",
                          color: "rgba(255,255,255,0.7)",
                          margin: "10px 0 0 0",
                          lineHeight: "1.6",
                        }}
                      >
                        Your parcel has been picked, packed, and assigned a Citypak waybill. Staged at warehouse waiting for courier pickup.
                      </p>
                    )}
                  </div>
                </div>

                {/* STEP 5: Handed to Citypak Courier */}
                <div style={{ position: "relative", marginBottom: "32px" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "-38px",
                      top: "0px",
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      backgroundColor: isHandedToCourier ? "#00FF9D" : "#121212",
                      border: isHandedToCourier
                        ? "2px solid #00FF9D"
                        : "2px solid rgba(255, 255, 255, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isHandedToCourier
                        ? "#121212"
                        : "rgba(255, 255, 255, 0.25)",
                    }}
                  >
                    {isHandedToCourier ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(255,255,255,0.15)",
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        color: isHandedToCourier
                          ? "#ffffff"
                          : "rgba(255, 255, 255, 0.35)",
                        margin: 0,
                      }}
                    >
                      Handed to Courier
                    </h3>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.4)",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {isHandedToCourier
                        ? order.sentAt
                          ? `${getFormattedDate(order.sentAt)} · ${getFormattedTime(order.sentAt)}`
                          : "In Transit"
                        : "Pending"}
                    </p>
                    {isHandedToCourier && !isFinished && statusStr !== "returned" && (
                      <p
                        style={{
                          fontSize: "13px",
                          color: "rgba(255,255,255,0.7)",
                          margin: "10px 0 0 0",
                          lineHeight: "1.6",
                        }}
                      >
                        Package collected by Citypak courier and in transit to delivery destination.
                      </p>
                    )}
                  </div>
                </div>

                {/* CONDITIONAL STEP: Returned (Only displayed if parcel was actually returned) */}
                {statusStr === "returned" && (
                  <div style={{ position: "relative", marginBottom: "32px" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "-38px",
                        top: "0px",
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        backgroundColor: "#FF3B30",
                        border: "2px solid #FF3B30",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "15px",
                          fontWeight: "800",
                          color: "#FF3B30",
                          margin: 0,
                        }}
                      >
                        Parcel Returned
                      </h3>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "rgba(255,255,255,0.4)",
                          margin: "4px 0 0 0",
                        }}
                      >
                        {order.updatedAt
                          ? `${getFormattedDate(order.updatedAt)} · ${getFormattedTime(order.updatedAt)}`
                          : "Returned"}
                      </p>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "rgba(255,59,48,0.9)",
                          margin: "10px 0 0 0",
                          lineHeight: "1.6",
                        }}
                      >
                        The courier delivery attempt was unsuccessful and the parcel has been returned to the warehouse.
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 6: Finished */}
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "-38px",
                      top: "0px",
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      backgroundColor: isFinished ? "#00FF9D" : "#121212",
                      border: isFinished
                        ? "2px solid #00FF9D"
                        : "2px solid rgba(255, 255, 255, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isFinished
                        ? "#121212"
                        : "rgba(255, 255, 255, 0.25)",
                    }}
                  >
                    {isFinished ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(255,255,255,0.15)",
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        color: isFinished
                          ? "#ffffff"
                          : "rgba(255, 255, 255, 0.35)",
                        margin: 0,
                      }}
                    >
                      Completed
                    </h3>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.4)",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {isFinished
                        ? order.deliveredAt
                          ? `${getFormattedDate(order.deliveredAt)} · ${getFormattedTime(order.deliveredAt)}`
                          : "Completed"
                        : "Pending"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancel Card Section */}
            {canCancel ? (
              <div
                style={{
                  backgroundColor: "rgba(255, 77, 77, 0.02)",
                  border: "1px solid rgba(255, 77, 77, 0.12)",
                  borderRadius: "16px",
                  padding: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: "900",
                      letterSpacing: "0.08em",
                      color: "#ff4d4d",
                      textTransform: "uppercase",
                      margin: 0,
                      fontFamily: "'Oswald', sans-serif",
                    }}
                  >
                    CANCEL ORDER
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "rgba(255, 255, 255, 0.5)",
                      margin: "6px 0 0 0",
                      lineHeight: "1.5",
                    }}
                  >
                    Cash on Delivery orders can be cancelled directly only
                    before Admin approval.
                  </p>
                </div>
                <div>
                  <button
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="order-action-btn"
                    style={{
                      backgroundColor: "transparent",
                      border: "1px solid #ff4d4d",
                      color: "#ff4d4d",
                      padding: "10px 24px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(255, 77, 77, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {isCancelling ? "Cancelling..." : "CANCEL ORDER"}
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                  borderRadius: "16px",
                  padding: "24px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "900",
                    letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    margin: 0,
                    fontFamily: "'Oswald', sans-serif",
                  }}
                >
                  CANCEL ORDER
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "rgba(255, 255, 255, 0.3)",
                    margin: "6px 0 0 0",
                    lineHeight: "1.5",
                  }}
                >
                  {statusStr === "cancelled"
                    ? "This order has been cancelled successfully."
                    : isBankTransfer
                      ? "Bank Transfer orders cannot be cancelled directly. Contact Support to request cancellation."
                      : order.pendingCheckout
                        ? "This order cannot be cancelled directly. Contact Support to request cancellation."
                        : "This order has already been approved by Admin. Contact Support to request cancellation."}
                </p>
                {statusStr !== "cancelled" && (
                  <Link
                    href="mailto:vergo.wearofficial@gmail.com"
                    style={{
                      display: "inline-block",
                      marginTop: "12px",
                      color: "#00FF9D",
                      fontSize: "12px",
                      fontWeight: "700",
                      textDecoration: "underline",
                    }}
                  >
                    Contact Support to Cancel Order
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right Column (Sidebar Order Details Cards) */}
          <div className="order-sidebar">
            {/* ORDER DETAILS SUMMARY Card */}
            <div className="order-detail-card" style={{ padding: "24px" }}>
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: "900",
                  color: "#ffffff",
                  letterSpacing: "0.08em",
                  marginBottom: "20px",
                  textTransform: "uppercase",
                  fontFamily: "'Oswald', sans-serif",
                }}
              >
                ORDER DETAILS
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                {order.orderItems.map((item) => {
                  const variant = item.variant;
                  return (
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}
                      key={item.orderItemId}
                    >
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          position: "relative",
                          backgroundColor: "#1c1c1e",
                          borderRadius: "8px",
                          overflow: "hidden",
                        }}
                      >
                        <Image
                          src={variant?.images[0]?.imageUrl || "/logo.png"}
                          alt={variant?.product?.name || "Product"}
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4
                          style={{
                            fontSize: "13px",
                            fontWeight: "800",
                            color: "#ffffff",
                            margin: 0,
                          }}
                        >
                          {variant?.product?.name}
                        </h4>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "rgba(255,255,255,0.4)",
                            marginTop: "4px",
                          }}
                        >
                          SIZE: {typeof variant?.size === "object" ? (variant?.size as any)?.name : (variant?.size || (item as any)?.size || "N/A")} | QTY: {item.quantity}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "800",
                            color: "#00FF9D",
                            marginTop: "4px",
                          }}
                        >
                          Rs.{" "}
                          {Number(item.unitPrice).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total calculations */}
              <div
                style={{
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  paddingTop: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontWeight: "600",
                    }}
                  >
                    SUBTOTAL
                  </span>
                  <span style={{ color: "#ffffff", fontWeight: "700" }}>
                    Rs.{" "}
                    {Number(order.productTotal).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontWeight: "600",
                    }}
                  >
                    SHIPPING
                  </span>
                  <span
                    style={{
                      color:
                        Number(order.deliveryFee) === 0 ? "#00FF9D" : "#ffffff",
                      fontWeight: "700",
                    }}
                  >
                    {Number(order.deliveryFee) === 0
                      ? "FREE"
                      : `Rs. ${Number(order.deliveryFee).toLocaleString()}`}
                  </span>
                </div>

                <div
                  style={{
                    borderTop: "1px dashed rgba(255, 255, 255, 0.1)",
                    marginTop: "8px",
                    paddingTop: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: "900",
                      letterSpacing: "0.05em",
                      color: "#ffffff",
                      fontFamily: "'Oswald', sans-serif",
                    }}
                  >
                    TOTAL
                  </span>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "900",
                      color: "#ffffff",
                      fontFamily: "'Oswald', sans-serif",
                    }}
                  >
                    Rs.{" "}
                    {Number(order.totalAmount).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* SHIPPING ADDRESS Card */}
            <div className="order-detail-card" style={{ padding: "24px" }}>
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: "900",
                  color: "#ffffff",
                  letterSpacing: "0.08em",
                  marginBottom: "16px",
                  textTransform: "uppercase",
                  fontFamily: "'Oswald', sans-serif",
                }}
              >
                SHIPPING ADDRESS
              </h3>
              {order.shippingDetails ? (
                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: "1.6",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <p
                    style={{
                      fontWeight: "700",
                      color: "#ffffff",
                      margin: "0 0 6px 0",
                    }}
                  >
                    {order.shippingDetails.receiverName}
                  </p>
                  <p style={{ margin: "0 0 4px 0" }}>
                    {order.shippingDetails.addressLine1}
                  </p>
                  {order.shippingDetails.addressLine2 && (
                    <p style={{ margin: "0 0 4px 0" }}>
                      {order.shippingDetails.addressLine2}
                    </p>
                  )}
                  <p style={{ margin: "0 0 4px 0" }}>
                    {order.shippingDetails.city},{" "}
                    {order.shippingDetails.district}
                  </p>
                  {order.shippingDetails.postalCode && (
                    <p style={{ margin: "0 0 4px 0" }}>
                      {order.shippingDetails.postalCode}
                    </p>
                  )}
                  <p style={{ margin: "0 0 4px 0" }}>Sri Lanka</p>
                </div>
              ) : (
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.4)",
                    margin: 0,
                  }}
                >
                  No shipping details available.
                </p>
              )}
            </div>

            {/* CONTACT Card */}
            <div className="order-detail-card" style={{ padding: "24px" }}>
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: "900",
                  color: "#ffffff",
                  letterSpacing: "0.08em",
                  marginBottom: "12px",
                  textTransform: "uppercase",
                  fontFamily: "'Oswald', sans-serif",
                }}
              >
                CONTACT
              </h3>
              {order.assignedEmployee ? (
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      color: "#00FF9D",
                      letterSpacing: "0.08em",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                    }}
                  >
                    PREPARATION EMPLOYEE
                  </div>
                  <p style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", margin: "0 0 4px 0" }}>
                    {order.assignedEmployee.firstName} {order.assignedEmployee.lastName}
                  </p>
                  <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", margin: 0 }}>
                    Phone: <strong style={{ color: "#ffffff" }}>{order.assignedEmployee.phone || "Not provided"}</strong>
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", margin: 0 }}>
                  Assigned employee contact will be displayed once claimed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
