"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import "@/styles/orders.css";

interface OrderDetails {
  orderId: string;
  orderDate: string | null;
  orderStatus: string | null;
  paymentMethod: string;
  totalAmount: string | number;
  productTotal: string | number;
  deliveryFee: string | number;
  shippingAddress: string;
  customerDetails: { firstName: string; lastName: string; email: string; phone: string } | null;
  shippingDetails: { receiverName: string; phone: string; deliveryNote: string | null } | null;
  paymentProofs: Array<{ status: string; receiptUrl: string | null }>;
  orderItems: Array<{
    orderItemId: string;
    quantity: number;
    unitPrice: string | number;
    subtotal: string | number;
    variant: { size: string; color: string; product: { name: string } | null; images: Array<{ imageUrl: string }> } | null;
  }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrder = async () => {
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) throw new Error("Please sign in to view this order.");
    const response = await fetch(`${API_URL}/orders/mine/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) throw new Error("Order not found or access was denied.");
    setOrder((await response.json()) as OrderDetails);
  };

  useEffect(() => {
    loadOrder().catch((reason: Error) => setError(reason.message)).finally(() => setIsLoading(false));
  }, [id]);

  const cancelOrder = async () => {
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) return;
    const response = await fetch(`${API_URL}/orders/mine/${id}/cancel`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.message || "This order cannot be cancelled.");
      return;
    }
    setOrder((await response.json()) as OrderDetails);
  };

  if (isLoading) return <div className="orders-page-wrapper"><div className="orders-container">Loading order...</div></div>;
  if (error || !order) return <div className="orders-page-wrapper"><div className="orders-container"><div className="empty-orders-container"><h2 className="empty-orders-title">Order Unavailable</h2><p className="empty-orders-desc">{error}</p><Link href="/profile/orders" className="shop-now-btn">Back to Orders</Link></div></div></div>;

  const canCancel = !["delivered", "cancelled", "sent"].includes((order.orderStatus || "").toLowerCase());
  return (
    <div className="orders-page-wrapper">
      <div className="orders-container">
        <div className="orders-breadcrumbs"><Link href="/">HOME</Link> / <Link href="/profile/orders">MY ORDERS</Link> / <span className="active">#{order.orderId}</span></div>
        <div className="orders-header">
          <h1 className="orders-title">ORDER #{order.orderId}</h1>
          <p className="orders-subtitle">Placed {order.orderDate ? new Date(order.orderDate).toLocaleString() : "recently"} · {order.orderStatus}</p>
        </div>
        <div className="orders-list">
          {order.orderItems.map((item) => (
            <div className="order-card" key={item.orderItemId}>
              <div className="order-card-body">
                <div className="order-product-img-wrapper"><Image src={item.variant?.images[0]?.imageUrl || "/logo.png"} alt={item.variant?.product?.name || "Product"} width={80} height={80} className="order-product-img" /></div>
                <div className="order-product-info"><h3 className="order-product-name">{item.variant?.product?.name || "Product"}</h3><div className="order-product-options"><div className="option-badge">Size: <span>{item.variant?.size}</span></div><div className="option-badge">Color: <span>{item.variant?.color}</span></div><div className="option-badge">Qty: <span>{item.quantity}</span></div></div></div>
              </div>
              <div className="order-card-footer"><span className="order-total-label">ITEM TOTAL</span><span className="order-total-value">LKR {Number(item.subtotal).toLocaleString()}</span></div>
            </div>
          ))}
        </div>
        <div className="order-card">
          <div className="order-card-header"><strong>Delivery</strong><span>{order.shippingAddress}</span></div>
          <div className="order-card-footer"><span>{order.paymentMethod.replaceAll("_", " ")}</span><strong>LKR {Number(order.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></div>
        </div>
        {canCancel && <button className="order-action-btn btn-track-package" onClick={cancelOrder}>Cancel Order</button>}
      </div>
    </div>
  );
}
