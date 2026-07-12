"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import "@/styles/orders.css";

interface DatabaseOrder {
  orderId: string;
  orderDate: string | null;
  orderStatus: string | null;
  paymentMethod: string;
  totalAmount: string | number;
  orderItems: Array<{
    quantity: number;
    unitPrice: string | number;
    variant: {
      size: string;
      color: string;
      product: { name: string } | null;
      images: Array<{ imageUrl: string }>;
    } | null;
  }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<DatabaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("vergo_access_token");
    if (!token) {
      setError("Please sign in to view your order history.");
      setIsLoading(false);
      return;
    }
    fetch(`${API_URL}/orders/mine`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to retrieve your orders.");
        return response.json() as Promise<DatabaseOrder[]>;
      })
      .then(setOrders)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="orders-page-wrapper">
      <div className="orders-container">
        <div className="orders-breadcrumbs">
          <Link href="/">HOME</Link> / <Link href="/profile">PROFILE</Link> / <span className="active">MY ORDERS</span>
        </div>
        <div className="orders-header">
          <h1 className="orders-title">ORDER HISTORY</h1>
          <p className="orders-subtitle">Track or view details of your purchases.</p>
        </div>

        {isLoading && <div className="empty-orders-container">Loading orders...</div>}
        {error && (
          <div className="empty-orders-container">
            <h2 className="empty-orders-title">Orders Unavailable</h2>
            <p className="empty-orders-desc">{error}</p>
            <Link href="/auth/login" className="shop-now-btn">Log In</Link>
          </div>
        )}
        {!isLoading && !error && orders.length === 0 && (
          <div className="empty-orders-container">
            <h2 className="empty-orders-title">No Orders Placed Yet</h2>
            <p className="empty-orders-desc">Your completed checkouts will appear here.</p>
            <Link href="/collection" className="shop-now-btn">Start Shopping</Link>
          </div>
        )}

        <div className="orders-list">
          {orders.map((order) => {
            const firstItem = order.orderItems[0];
            const variant = firstItem?.variant;
            const statusClass = (order.orderStatus || "pending").toLowerCase().replaceAll(" ", "-");
            return (
              <div className="order-card" key={order.orderId}>
                <div className="order-card-header">
                  <div className="order-header-meta">
                    <div className="order-header-info">
                      <span className="order-header-label">ORDER ID</span>
                      <span className="order-header-value">#{order.orderId}</span>
                    </div>
                    <div className="order-header-info">
                      <span className="order-header-label">DATE PLACED</span>
                      <span className="order-header-value">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "Pending"}
                      </span>
                    </div>
                  </div>
                  <span className={`order-status-badge ${statusClass}`}>{order.orderStatus || "Pending"}</span>
                </div>
                {firstItem && (
                  <Link href={`/profile/orders/${order.orderId}`} className="order-card-body">
                    <div className="order-product-img-wrapper">
                      <Image src={variant?.images[0]?.imageUrl || "/logo.png"} alt={variant?.product?.name || "Order item"} width={80} height={80} className="order-product-img" />
                    </div>
                    <div className="order-product-info">
                      <h3 className="order-product-name">{variant?.product?.name || "Product"}</h3>
                      <div className="order-product-options">
                        <div className="option-badge">Size: <span>{variant?.size || "-"}</span></div>
                        <div className="option-badge">Color: <span>{variant?.color || "-"}</span></div>
                        <div className="option-badge">Qty: <span>{firstItem.quantity}</span></div>
                      </div>
                    </div>
                  </Link>
                )}
                <div className="order-card-footer">
                  <div className="order-total-section">
                    <span className="order-total-label">TOTAL AMOUNT</span>
                    <span className="order-total-value">LKR {Number(order.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <Link href={`/profile/orders/${order.orderId}`} className="order-action-btn btn-view-details">View Details</Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
