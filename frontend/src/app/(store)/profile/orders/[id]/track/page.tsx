"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/orders.css";

interface OrderDetails {
  orderId: string;
  customerId: string | null;
  employeeId: string | null;
  branchId: string | null;
  orderDate: string | null;
  totalAmount: string | number;
  productTotal: string | number;
  deliveryFee: string | number;
  shippingAddress: string;
  orderStatus: string | null;
  paymentMethod: string;
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
  orderItems: Array<{
    orderItemId: string;
    quantity: number;
    unitPrice: string | number;
    subtotal: string | number;
    variant: { 
      size: string; 
      color: string; 
      product: { name: string; basePrice: string | number } | null; 
      images: Array<{ imageUrl: string }> 
    } | null;
  }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function PackageTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params);
  const router = useRouter();
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Fetch tracking data
  const loadOrderData = async () => {
    setError(null);
    const token = localStorage.getItem("vergo_access_token");
    const storedUser = localStorage.getItem("vergo_user");
    const loggedIn = localStorage.getItem("vergo_is_logged_in") === "true";
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

    try {
      if (token) {
        const response = await fetch(`${API_URL}/orders/mine/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          
          // Verify customer ownership if order has customerId
          if (data.customerId && user && user.customerId && user.customerId !== data.customerId) {
            setAccessDenied(true);
            return;
          }

          setOrder(data as OrderDetails);
          return;
        }
      }

      // Guest / Offline fallback
      if (isSavedInLocal) {
        const localOrderDetails = guestOrdersList.find((o: any) => o.id === orderId);
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
            shippingAddress: "Alexander Mercer, 42 Technical District, Innovation Way, Colombo, Sri Lanka",
            orderStatus: localOrderDetails.status,
            paymentMethod: localOrderDetails.paymentMethod === "Bank Transfer" ? "bank_transfer" : "cod",
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
            orderItems: (localOrderDetails.items || []).map((item: any, idx: number) => ({
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
            })),
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
    const token = localStorage.getItem("vergo_access_token");

    try {
      if (token) {
        const response = await fetch(`${API_URL}/orders/mine/${orderId}/cancel`, {
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
              You are not authorized to track this order record. Please verify your login credentials.
            </p>
            <Link href="/profile/orders" className="shop-now-btn">Back to Orders</Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Loading
  if (isLoading) {
    return (
      <div className="orders-page-wrapper">
        <div className="orders-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600", fontSize: "14px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
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
            <Link href="/profile/orders" className="shop-now-btn">Back to Orders</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  // Track status codes
  const statusStr = (order.orderStatus || "").toLowerCase();
  const isUnclaimed = !order.employeeId;
  const isInitialStatus = ["draft", "pending payment", "pending verification", "ready to process"].includes(statusStr);
  const canCancel = isInitialStatus && isUnclaimed;

  // Estimated delivery box header text color / banner pill
  let statusBannerClass = "delivered";
  let statusBannerText = "Delivered";

  if (statusStr.includes("pending") || statusStr === "draft") {
    statusBannerClass = "pending";
    statusBannerText = "Preparing Shipment";
  } else if (statusStr === "cancelled") {
    statusBannerClass = "cancelled";
    statusBannerText = "Cancelled";
  } else if (statusStr === "sent for delivery") {
    statusBannerClass = "in-transit";
    statusBannerText = "In Transit";
  } else if (statusStr === "ready") {
    statusBannerClass = "in-transit";
    statusBannerText = "Ready for Courier";
  } else if (statusStr === "completed") {
    statusBannerClass = "delivered";
    statusBannerText = "Delivered";
  } else {
    // preparing, claimed by employee, ready to process
    statusBannerClass = "in-transit";
    statusBannerText = "Preparing Shipment";
  }

  // Vertical timeline state check functions
  const orderPlacedDate = order.orderDate;
  const orderPlacedFormatted = `${getFormattedDate(orderPlacedDate)} · ${getFormattedTime(orderPlacedDate)}`;

  // Payment is approved if payment status isn't pending payment (e.g. is verified/on-progress)
  const isPaymentApproved = !["draft", "pending payment"].includes(statusStr);
  
  // Package is preparing if employee has claimed or details are preparing/ready
  const isPreparingPackage = ["claimed by employee", "preparing", "ready", "sent for delivery", "completed"].includes(statusStr);
  
  // Sent to courier
  const isSentToCourier = ["sent for delivery", "completed"].includes(statusStr);
  
  // Out for delivery / delivered
  const isOutForDelivery = ["completed"].includes(statusStr);

  return (
    <div className="orders-page-wrapper">
      <div className="orders-container wide">
        
        {/* Breadcrumb path */}
        <div className="orders-breadcrumbs">
          <Link href="/">HOME</Link> › <Link href="/profile/orders">PROFILE</Link> › <Link href="/profile/orders">MY ORDERS</Link> › <span className="active">TRACK #{order.orderId.substring(0, 8).toUpperCase()}</span>
        </div>

        {/* Title */}
        <div style={{ marginBottom: "30px" }}>
          <h1 className="orders-title" style={{ fontFamily: "'Oswald', sans-serif", fontSize: "36px", fontWeight: "900", letterSpacing: "0.05em" }}>TRACK PACKAGE</h1>
          <p className="orders-subtitle" style={{ marginTop: "4px" }}>Real-time status updates for your delivery.</p>
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
                gap: "16px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ 
                  width: "48px", 
                  height: "48px", 
                  borderRadius: "50%", 
                  backgroundColor: "rgba(255, 255, 255, 0.03)", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  color: "#00FF9D" 
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.4)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Estimated Delivery
                  </div>
                  <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#ffffff", fontFamily: "'Oswald', sans-serif", margin: "4px 0 0 0" }}>
                    {statusStr === "cancelled" ? "Cancelled" : getEstimatedDelivery(order.orderDate)}
                  </h2>
                </div>
              </div>

              {/* Status Pill Badge */}
              <span className={`order-status-badge ${statusBannerClass}`}>
                {statusBannerText}
              </span>
            </div>

            {/* Tracking History Card */}
            <div className="order-detail-card" style={{ padding: "30px", marginBottom: "24px" }}>
              <h2 className="card-title" style={{ fontSize: "18px", fontWeight: "900", letterSpacing: "0.08em", marginBottom: "24px", fontFamily: "'Oswald', sans-serif" }}>
                TRACKING HISTORY
              </h2>
              
              {/* Timeline list */}
              <div style={{ display: "flex", flexDirection: "column", position: "relative", paddingLeft: "40px" }}>
                
                {/* Timeline Line */}
                <div style={{
                  position: "absolute",
                  left: "14px",
                  top: "14px",
                  bottom: "14px",
                  width: "2px",
                  backgroundColor: "rgba(255, 255, 255, 0.06)"
                }} />

                {/* STEP 1: Order Placed */}
                <div style={{ position: "relative", marginBottom: "32px" }}>
                  <div style={{
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
                    color: "#121212"
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#ffffff", margin: 0 }}>Order Placed</h3>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "4px 0 0 0" }}>{orderPlacedFormatted}</p>
                  </div>
                </div>

                {/* STEP 2: Payment Approved */}
                <div style={{ position: "relative", marginBottom: "32px" }}>
                  <div style={{
                    position: "absolute",
                    left: "-38px",
                    top: "0px",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    backgroundColor: isPaymentApproved ? "#00FF9D" : "#121212",
                    border: isPaymentApproved ? "2px solid #00FF9D" : "2px solid rgba(255, 255, 255, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isPaymentApproved ? "#121212" : "rgba(255, 255, 255, 0.25)"
                  }}>
                    {isPaymentApproved ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)" }} />
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: "800", color: isPaymentApproved ? "#ffffff" : "rgba(255, 255, 255, 0.35)", margin: 0 }}>
                      Payment Approved
                    </h3>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "4px 0 0 0" }}>
                      {isPaymentApproved ? `${getFormattedDate(order.orderDate)} · ${getFormattedTime(order.orderDate)}` : "Pending"}
                    </p>
                  </div>
                </div>

                {/* STEP 3: Preparing Package */}
                <div style={{ position: "relative", marginBottom: "32px" }}>
                  <div style={{
                    position: "absolute",
                    left: "-38px",
                    top: "0px",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    backgroundColor: isPreparingPackage ? "rgba(0, 255, 157, 0.05)" : "#121212",
                    border: isPreparingPackage ? "2px solid #00FF9D" : "2px solid rgba(255, 255, 255, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isPreparingPackage ? "#00FF9D" : "rgba(255, 255, 255, 0.25)"
                  }}>
                    {isPreparingPackage ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="21 16 12 21 3 16" />
                        <polyline points="21 8 12 13 3 8" />
                        <line x1="12" y1="21" x2="12" y2="13" />
                        <polygon points="12 2 22 7 12 12 2 7" />
                      </svg>
                    ) : (
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)" }} />
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: "800", color: isPreparingPackage ? "#00FF9D" : "rgba(255, 255, 255, 0.35)", margin: 0 }}>
                      Preparing Package
                    </h3>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "4px 0 0 0" }}>
                      {isPreparingPackage ? `${getEstimatedDelivery(order.orderDate)} · 09:30 AM` : "Pending"}
                    </p>
                    {isPreparingPackage && !isSentToCourier && (
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", margin: "10px 0 0 0", lineHeight: "1.6" }}>
                        Our warehouse team is currently picking and packing your items for shipment.
                      </p>
                    )}
                  </div>
                </div>

                {/* STEP 4: Sent to Courier */}
                <div style={{ position: "relative", marginBottom: "32px" }}>
                  <div style={{
                    position: "absolute",
                    left: "-38px",
                    top: "0px",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    backgroundColor: "#121212",
                    border: isSentToCourier ? "2px solid #00FF9D" : "2px solid rgba(255, 255, 255, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isSentToCourier ? "#00FF9D" : "rgba(255, 255, 255, 0.25)"
                  }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isSentToCourier ? "#00FF9D" : "rgba(255,255,255,0.15)" }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: "800", color: isSentToCourier ? "#ffffff" : "rgba(255, 255, 255, 0.35)", margin: 0 }}>
                      Sent to Courier
                    </h3>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "4px 0 0 0" }}>
                      {isSentToCourier ? "Shipped" : "Pending"}
                    </p>
                  </div>
                </div>

                {/* STEP 5: Out for Delivery */}
                <div style={{ position: "relative" }}>
                  <div style={{
                    position: "absolute",
                    left: "-38px",
                    top: "0px",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    backgroundColor: "#121212",
                    border: isOutForDelivery ? "2px solid #00FF9D" : "2px solid rgba(255, 255, 255, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isOutForDelivery ? "#00FF9D" : "rgba(255, 255, 255, 0.25)"
                  }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isOutForDelivery ? "#00FF9D" : "rgba(255,255,255,0.15)" }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: "800", color: isOutForDelivery ? "#ffffff" : "rgba(255, 255, 255, 0.35)", margin: 0 }}>
                      Out for Delivery
                    </h3>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "4px 0 0 0" }}>
                      {isOutForDelivery ? "Delivered" : "Pending"}
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
                  gap: "16px"
                }}
              >
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "900", letterSpacing: "0.08em", color: "#ff4d4d", textTransform: "uppercase", margin: 0, fontFamily: "'Oswald', sans-serif" }}>
                    CANCEL ORDER
                  </h3>
                  <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)", margin: "6px 0 0 0", lineHeight: "1.5" }}>
                    You can cancel this order before our team starts preparing your package. Once dispatched, cancellations are no longer possible.
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
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 77, 77, 0.1)";
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
                  padding: "24px"
                }}
              >
                <h3 style={{ fontSize: "14px", fontWeight: "900", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", margin: 0, fontFamily: "'Oswald', sans-serif" }}>
                  CANCEL ORDER
                </h3>
                <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.3)", margin: "6px 0 0 0", lineHeight: "1.5" }}>
                  {statusStr === "cancelled" 
                    ? "This order has been cancelled successfully." 
                    : "Cancellations are no longer possible because our warehouse team has already claimed or started preparing your package."
                  }
                </p>
              </div>
            )}

          </div>

          {/* Right Column (Sidebar Order Details Cards) */}
          <div className="order-sidebar">
            
            {/* ORDER DETAILS SUMMARY Card */}
            <div className="order-detail-card" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "12px", fontWeight: "900", color: "#ffffff", letterSpacing: "0.08em", marginBottom: "20px", textTransform: "uppercase", fontFamily: "'Oswald', sans-serif" }}>
                ORDER DETAILS
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
                {order.orderItems.map((item) => {
                  const variant = item.variant;
                  return (
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }} key={item.orderItemId}>
                      <div style={{ width: "64px", height: "64px", position: "relative", backgroundColor: "#1c1c1e", borderRadius: "8px", overflow: "hidden" }}>
                        <Image 
                          src={variant?.images[0]?.imageUrl || "/logo.png"} 
                          alt={variant?.product?.name || "Product"} 
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                          {variant?.product?.name}
                        </h4>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                          SIZE: {variant?.size} | QTY: {item.quantity}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: "800", color: "#00FF9D", marginTop: "4px" }}>
                          Rs. {Number(item.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total calculations */}
              <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600" }}>SUBTOTAL</span>
                  <span style={{ color: "#ffffff", fontWeight: "700" }}>
                    Rs. {Number(order.productTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600" }}>SHIPPING</span>
                  <span style={{ color: Number(order.deliveryFee) === 0 ? "#00FF9D" : "#ffffff", fontWeight: "700" }}>
                    {Number(order.deliveryFee) === 0 ? "FREE" : `Rs. ${Number(order.deliveryFee).toLocaleString()}`}
                  </span>
                </div>
                
                <div style={{ borderTop: "1px dashed rgba(255, 255, 255, 0.1)", marginTop: "8px", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "16px", fontWeight: "900", letterSpacing: "0.05em", color: "#ffffff", fontFamily: "'Oswald', sans-serif" }}>TOTAL</span>
                  <span style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff", fontFamily: "'Oswald', sans-serif" }}>
                    Rs. {Number(order.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* SHIPPING ADDRESS Card */}
            <div className="order-detail-card" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "12px", fontWeight: "900", color: "#ffffff", letterSpacing: "0.08em", marginBottom: "16px", textTransform: "uppercase", fontFamily: "'Oswald', sans-serif" }}>
                SHIPPING ADDRESS
              </h3>
              {order.shippingDetails ? (
                <div style={{ fontSize: "13px", lineHeight: "1.6", color: "rgba(255,255,255,0.6)" }}>
                  <p style={{ fontWeight: "700", color: "#ffffff", margin: "0 0 6px 0" }}>
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
                    {order.shippingDetails.city}, {order.shippingDetails.district}
                  </p>
                  {order.shippingDetails.postalCode && (
                    <p style={{ margin: "0 0 4px 0" }}>
                      {order.shippingDetails.postalCode}
                    </p>
                  )}
                  <p style={{ margin: "0 0 4px 0" }}>
                    Sri Lanka
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
                  No shipping details available.
                </p>
              )}
            </div>

            {/* CONTACT Card */}
            <div className="order-detail-card" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "12px", fontWeight: "900", color: "#ffffff", letterSpacing: "0.08em", marginBottom: "12px", textTransform: "uppercase", fontFamily: "'Oswald', sans-serif" }}>
                CONTACT
              </h3>
              <p style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                {order.shippingDetails?.phone || order.customerDetails?.phone || "+94 77 123 4567"}
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
