"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import "@/styles/orders.css";

// Interfaces (same as in page.tsx)
interface OrderItemDetail {
  productId: number;
  name: string;
  subTitle?: string;
  image: string;
  size: string;
  color: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  status: "Delivered" | "Processing" | "In Transit" | "Cancelled";
  paymentMethod: "Bank Transfer" | "Cash on Delivery";
  paymentStatus: "Pending" | "Paid" | "Approved" | "Rejected" | "Expired";
  total: number;
  items: OrderItemDetail[];
  shippingAddress?: string;
  phone?: string;
  email?: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);


  const handleFeedbackClick = () => {
    if (!order) return;
    if (order.items.length > 1) {
      setShowFeedbackModal(true);
    } else if (order.items.length === 1) {
      router.push(`/collection/${order.items[0].productId}?add-feedback=true`);
    }
  };

  useEffect(() => {
    setMounted(true);
    setIsLoading(true);

    const storedOrders = localStorage.getItem("vergo_customer_orders");
    if (storedOrders) {
      try {
        const parsedOrders: Order[] = JSON.parse(storedOrders);
        const matched = parsedOrders.find((o) => o.id === orderId);
        
        if (matched) {
          // If the order has no addresses set, inject user profile details
          const storedUser = localStorage.getItem("vergo_user");
          const storedAddresses = localStorage.getItem("vergo_addresses");
          
          let customerEmail = "customer@vergowear.com";
          let customerPhone = "+94 71 0870 119";
          let customerAddress = "NO 55/5 BOTHALE, MEDAGAMA, AMBEPUSSA";

          if (storedUser) {
            try {
              const u = JSON.parse(storedUser);
              if (u.email) customerEmail = u.email;
              if (u.phone) customerPhone = u.phone;
            } catch {}
          }

          if (storedAddresses) {
            try {
              const addrs = JSON.parse(storedAddresses);
              const def = addrs.find((a: any) => a.isDefault) || addrs[0];
              if (def) {
                customerAddress = `${def.line1}, ${def.line2}, ${def.line3}`;
                if (def.phone) customerPhone = def.phone;
              }
            } catch {}
          }

          setOrder({
            shippingAddress: customerAddress,
            phone: customerPhone,
            email: customerEmail,
            ...matched
          });
        }
      } catch (e) {
        console.error("Error loading order details:", e);
      }
    }
    setIsLoading(false);
  }, [orderId]);

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="orders-page-wrapper">
        <div className="orders-container" style={{ textAlign: "center", padding: "100px 0" }}>
          <p style={{ color: "#8e8e93", fontSize: "0.95rem" }}>LOADING ORDER DETAILS...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="orders-page-wrapper">
        <div className="orders-container">
          <div className="orders-breadcrumbs">
            <Link href="/">HOME</Link> / <Link href="/profile">PROFILE</Link> / <Link href="/profile/orders">MY ORDERS</Link> / <span className="active">NOT FOUND</span>
          </div>

          <div className="empty-orders-container">
            <h2 className="empty-orders-title">Order Not Found</h2>
            <p className="empty-orders-desc">
              We couldn't find an order with Reference ID <strong>#{orderId}</strong> in your purchase history.
            </p>
            <Link href="/profile/orders" className="shop-now-btn">
              Back to My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate pricing values
  const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const deliveryFee = order.paymentMethod === "Cash on Delivery" ? 350.00 : 250.00;
  const grandTotal = subtotal + deliveryFee;

  // Determine order status badges and descriptions
  const statusClass = order.status.toLowerCase().replace(" ", "-");
  const paymentStatusClass = order.paymentStatus.toLowerCase().replace(" ", "-");

  return (
    <div className="orders-page-wrapper">
      <div className="orders-container">
        {/* Header navigation bar */}
        <div className="orders-breadcrumbs">
          <Link href="/">HOME</Link> / <Link href="/profile">PROFILE</Link> / <Link href="/profile/orders">MY ORDERS</Link> / <span className="active">#{order.id}</span>
        </div>

        <div className="order-detail-header-row">
          <Link href="/profile/orders" className="back-to-orders-link">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2.5}
              style={{ width: "14px", height: "14px", display: "inline-block" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>
          <span style={{ fontSize: "0.8rem", color: "#8e8e93", fontWeight: 700 }}>
            PLACED ON {order.date.toUpperCase()}
          </span>
        </div>

        <div className="orders-header" style={{ marginBottom: "30px" }}>
          <h1 className="orders-title" style={{ fontSize: "2.2rem" }}>ORDER #{order.id}</h1>
          <div style={{ display: "flex", gap: "12px", marginTop: "12px", alignItems: "center" }}>
            <span className={`status-pill payment-status-${paymentStatusClass}`}>
              Payment: {order.paymentStatus}
            </span>
            <span className={`order-status-badge ${statusClass}`} style={{ border: "none", padding: "0 6px" }}>
              Status: {order.status}
            </span>
          </div>
        </div>

        {/* Bank transfer warnings and alerts */}
        {order.paymentMethod === "Bank Transfer" && order.paymentStatus === "Rejected" && (
          <div className="status-callout-box rejected">
            <strong>Payment Proof Rejected:</strong> Your uploaded bank transfer receipt was declined by administration. Please contact our support line with your Order Reference #{order.id} to verify payment and resume fulfillment.
          </div>
        )}

        {order.paymentMethod === "Bank Transfer" && order.paymentStatus === "Expired" && (
          <div className="status-callout-box expired">
            <strong>Payment Session Expired:</strong> This Bank Transfer order has been cancelled automatically because payment confirmation was not received within the required 24-hour verification window.
          </div>
        )}

        {/* Main Grid split */}
        <div className="order-detail-grid">
          
          {/* Main items detail */}
          <div className="order-detail-main">
            {/* Products Card */}
            <div className="order-detail-card">
              <h2 className="order-detail-card-title">ITEMS ORDERED</h2>
              <div className="detail-products-list">
                {order.items.map((item, idx) => (
                  <div className="detail-product-row" key={idx}>
                    <div className="order-product-img-wrapper" style={{ width: "70px", height: "70px" }}>
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={60}
                        height={60}
                        className="order-product-img"
                      />
                    </div>
                    <div className="detail-product-info">
                      <h3 className="order-product-name" style={{ fontSize: "0.9rem" }}>{item.name}</h3>
                      <p className="order-product-collection" style={{ fontSize: "0.7rem" }}>
                        {item.subTitle || "VERGO STREETWEAR"}
                      </p>
                      <div className="order-product-options" style={{ marginTop: "2px" }}>
                        <div className="option-badge" style={{ padding: "2px 6px", fontSize: "0.65rem" }}>
                          Size: <span>{item.size}</span>
                        </div>
                        <div className="option-badge" style={{ padding: "2px 6px", fontSize: "0.65rem" }}>
                          Color: <span>{item.color}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="detail-product-price-qty">
                        Rs. {item.price.toFixed(2)} x <span>{item.qty}</span>
                      </div>
                      <div className="detail-product-total" style={{ marginTop: "4px" }}>
                        Rs. {(item.price * item.qty).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Address & Delivery Card */}
            <div className="order-detail-card">
              <h2 className="order-detail-card-title">SHIPPING & PAYMENT SUMMARY</h2>
              <div className="info-summary-grid">
                <div>
                  <div className="info-block-title">Delivery Address</div>
                  <div className="info-block-content">
                    <div>{order.shippingAddress}</div>
                    <div style={{ marginTop: "6px", color: "#8e8e93" }}>Phone: {order.phone}</div>
                    <div style={{ color: "#8e8e93" }}>Email: {order.email}</div>
                  </div>
                </div>

                <div>
                  <div className="info-block-title">Method of Payment</div>
                  <div className="info-block-content">
                    <strong>{order.paymentMethod}</strong>
                    <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "#8e8e93" }}>
                      Status: <span style={{ color: "#ffffff", fontWeight: 700 }}>{order.paymentStatus}</span>
                    </div>
                    {order.paymentMethod === "Bank Transfer" && (
                      <p style={{ fontSize: "0.75rem", color: "#8e8e93", marginTop: "4px", lineHeight: "1.3" }}>
                        Receipt submitted for reference verification.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Invoice total */}
          <div>
            <div className="order-detail-card" style={{ position: "sticky", top: "24px" }}>
              <h2 className="order-detail-card-title">ORDER SUMMARY</h2>
              <div className="invoice-calc-rows">
                <div className="invoice-calc-row">
                  <span>Subtotal ({order.items.reduce((acc, i) => acc + i.qty, 0)} items)</span>
                  <span className="val">Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="invoice-calc-row">
                  <span>Shipping Fee</span>
                  <span className="val">Rs. {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="invoice-calc-row">
                  <span>Taxes (Included)</span>
                  <span className="val">Rs. 0.00</span>
                </div>
                <div className="invoice-calc-row total-row">
                  <span>Total Amount</span>
                  <span className="val">Rs. {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {order.status === "Delivered" && (
                <div style={{ marginTop: "24px" }}>
                  <button 
                    onClick={handleFeedbackClick}
                    className="shop-now-btn" 
                    style={{ width: "100%", textAlign: "center", background: "#00FF9D", color: "#000", cursor: "pointer" }}
                  >
                    Add Feedback
                  </button>
                </div>
              )}

              {order.status !== "Delivered" && order.status !== "Cancelled" && (
                <div style={{ marginTop: "24px" }}>
                  <button 
                    onClick={() => alert("Tracking feature coming soon! Waybill is being processed.")}
                    className="shop-now-btn" 
                    style={{ width: "100%", textAlign: "center", background: "#00FF9D", color: "#000", cursor: "pointer" }}
                  >
                    Track Package
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Pop-up modal to select an item to review (only shown if multiple items in order) */}
      {showFeedbackModal && (
        <div className="profile-modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <button
              type="button"
              className="modal-close-trigger"
              onClick={() => setShowFeedbackModal(false)}
            >
              &times;
            </button>
            <h3 className="modal-header-title" style={{ fontSize: "1.15rem", marginBottom: "20px", fontWeight: 900 }}>Review Purchased Item</h3>
            <p style={{ color: "#8e8e93", fontSize: "0.8rem", margin: "-12px 0 20px 0", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.02em" }}>
              Please select the product you wish to leave feedback for:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {order.items.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "14px", 
                    padding: "12px", 
                    background: "#18181a", 
                    borderRadius: "8px", 
                    border: "1px solid rgba(255,255,255,0.03)" 
                  }}
                >
                  <div className="order-product-img-wrapper" style={{ width: "50px", height: "50px", padding: 0 }}>
                    <Image src={item.image} alt={item.name} width={45} height={45} className="order-product-img" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: 800, margin: 0, textTransform: "uppercase", color: "#fff", letterSpacing: "0.02em" }}>{item.name}</h4>
                    <p style={{ fontSize: "0.7rem", color: "#8e8e93", margin: "2px 0 0 0", fontWeight: 600 }}>Size: {item.size} | Color: {item.color}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowFeedbackModal(false);
                      router.push(`/collection/${item.productId}?add-feedback=true`);
                    }}
                    className="order-action-btn btn-track-package"
                    style={{ fontSize: "0.65rem", padding: "6px 12px", borderRadius: "4px" }}
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
