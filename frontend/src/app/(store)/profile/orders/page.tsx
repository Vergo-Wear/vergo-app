"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import "@/styles/orders.css";

// Interfaces
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

export default function OrderHistoryPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [visibleCount, setVisibleCount] = useState(3); // Start by showing 3 orders (as in screenshot)

  useEffect(() => {
    setMounted(true);

    // 1. Check logged-in status
    const storedLoggedIn = localStorage.getItem("vergo_is_logged_in");
    const storedUser = localStorage.getItem("vergo_user");
    
    if (storedLoggedIn === "true" && storedUser) {
      setIsLoggedIn(true);
    }

    // 2. Fetch or seed orders
    const storedOrders = localStorage.getItem("vergo_customer_orders");
    if (storedOrders) {
      try {
        setOrders(JSON.parse(storedOrders));
      } catch (e) {
        console.error("Error parsing orders:", e);
      }
    } else {
      // Seed default orders to match screenshot + requirements
      const defaultOrders: Order[] = [
        {
          id: "VRG-8924",
          date: "Oct 24, 2023",
          status: "Delivered",
          paymentMethod: "Bank Transfer",
          paymentStatus: "Approved",
          total: 1200.00,
          items: [
            {
              productId: 1,
              name: "VERGO OVERSIZED HOODIE",
              subTitle: "Core Collection V1",
              image: "/images/hoodie.png",
              size: "L",
              color: "Obsidian Black",
              qty: 1,
              price: 1200.00
            }
          ]
        },
        {
          id: "VRG-9021",
          date: "Feb 27, 2026",
          status: "Processing",
          paymentMethod: "Cash on Delivery",
          paymentStatus: "Pending",
          total: 950.00,
          items: [
            {
              productId: 2,
              name: "GRAPHIC OVERSIZED TEE",
              subTitle: "Essentials Drop 02",
              image: "/images/tee.png",
              size: "M",
              color: "Cloud White",
              qty: 2,
              price: 475.00
            }
          ]
        },
        {
          id: "VRG-8812",
          date: "Dec 15, 2024",
          status: "In Transit",
          paymentMethod: "Bank Transfer",
          paymentStatus: "Approved",
          total: 2455.00,
          items: [
            {
              productId: 3,
              name: "TECHNICAL CARGO PANTS",
              subTitle: "Tactical Gear Set",
              image: "/images/pants.png",
              size: "32",
              color: "Olive",
              qty: 1,
              price: 1255.00
            },
            {
              productId: 10,
              name: "Minimalist Beanie - White",
              subTitle: "ESSENTIALS V1",
              image: "/images/minimalist_beanie.png",
              size: "OS",
              color: "White",
              qty: 1,
              price: 600.00
            },
            {
              productId: 11,
              name: "Vergo Tote - Black",
              subTitle: "ESSENTIALS V1",
              image: "/images/vergo_tote.png",
              size: "OS",
              color: "Black",
              qty: 1,
              price: 600.00
            }
          ]
        },
        {
          id: "VRG-8711",
          date: "Jan 10, 2026",
          status: "Cancelled",
          paymentMethod: "Bank Transfer",
          paymentStatus: "Rejected",
          total: 1800.00,
          items: [
            {
              productId: 8,
              name: "Heavyweight LS - Jet Black",
              subTitle: "ESSENTIALS V1",
              image: "/images/heavyweight_ls.png",
              size: "XL",
              color: "Jet Black",
              qty: 1,
              price: 1800.00
            }
          ]
        },
        {
          id: "VRG-8541",
          date: "May 05, 2026",
          status: "Cancelled",
          paymentMethod: "Bank Transfer",
          paymentStatus: "Expired",
          total: 1500.00,
          items: [
            {
              productId: 5,
              name: "Boxy Tee - Jet Black",
              subTitle: "ESSENTIALS V1",
              image: "/images/boxy_tee.png",
              size: "S",
              color: "Jet Black",
              qty: 1,
              price: 1500.00
            }
          ]
        }
      ];
      setOrders(defaultOrders);
      localStorage.setItem("vergo_customer_orders", JSON.stringify(defaultOrders));
    }
  }, []);

  const handleLoginDemo = () => {
    localStorage.setItem("vergo_is_logged_in", "true");
    const demoUser = {
      name: "VERGO_CUSTOMER",
      email: "VERGOCUSTOMER@COOL.NET",
      phone: "+94 71 0870 119",
      avatarUrl: "/images/default-avatar.png",
    };
    localStorage.setItem("vergo_user", JSON.stringify(demoUser));
    setIsLoggedIn(true);
    // Dispatch auth change event
    window.dispatchEvent(new Event("vergo-auth-change"));
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 3, orders.length));
  };

  if (!mounted) return null;

  // Logged-out state
  if (!isLoggedIn) {
    return (
      <div className="orders-page-wrapper">
        <div className="orders-container">
          <div className="orders-breadcrumbs">
            <Link href="/">HOME</Link> / <Link href="/profile">PROFILE</Link> / <span className="active">MY ORDERS</span>
          </div>

          <div className="empty-orders-container">
            <div className="empty-orders-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="empty-orders-title">Access Denied</h2>
            <p className="empty-orders-desc">
              Please sign in to view your account order history, tracking details, and purchase invoice receipts.
            </p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
              <button onClick={handleLoginDemo} className="shop-now-btn" style={{ background: "#00FF9D", color: "#000" }}>
                Simulate Sign-In
              </button>
              <Link href="/auth/login" className="shop-now-btn">
                Log In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty Order History state
  if (orders.length === 0) {
    return (
      <div className="orders-page-wrapper">
        <div className="orders-container">
          <div className="orders-breadcrumbs">
            <Link href="/">HOME</Link> / <Link href="/profile">PROFILE</Link> / <span className="active">MY ORDERS</span>
          </div>

          <div className="orders-header">
            <h1 className="orders-title">ORDER HISTORY</h1>
            <p className="orders-subtitle">Track, return or view details of your recent purchases.</p>
          </div>

          <div className="empty-orders-container">
            <div className="empty-orders-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <h2 className="empty-orders-title">No Orders Placed Yet</h2>
            <p className="empty-orders-desc">
              You haven't made any purchases on VERGO yet. Once you order, your packages and items will show up here.
            </p>
            <Link href="/collection" className="shop-now-btn">
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const visibleOrders = orders.slice(0, visibleCount);

  return (
    <div className="orders-page-wrapper">
      <div className="orders-container">
        {/* Breadcrumb navigation */}
        <div className="orders-breadcrumbs">
          <Link href="/">HOME</Link> / <Link href="/profile">PROFILE</Link> / <span className="active">MY ORDERS</span>
        </div>

        {/* Title block */}
        <div className="orders-header">
          <h1 className="orders-title">ORDER HISTORY</h1>
          <p className="orders-subtitle">Track, return or view details of your recent purchases.</p>
        </div>

        {/* Orders list */}
        <div className="orders-list">
          {visibleOrders.map((order) => {
            const firstItem = order.items[0];
            const hasMoreItems = order.items.length > 1;
            const extraItemsCount = order.items.length - 1;
            const totalItemsCount = order.items.reduce((acc, item) => acc + item.qty, 0);

            // Determine order badge status formatting
            const statusClass = order.status.toLowerCase().replace(" ", "-");

            return (
              <div className="order-card" key={order.id}>
                {/* Card Header metadata */}
                <div className="order-card-header">
                  <div className="order-header-meta">
                    <div className="order-header-info">
                      <span className="order-header-label">ORDER ID</span>
                      <span className="order-header-value">#{order.id}</span>
                    </div>
                    <div className="order-header-info">
                      <span className="order-header-label">DATE PLACED</span>
                      <span className="order-header-value">{order.date}</span>
                    </div>
                  </div>

                  <div className="status-badge-container">
                    <span className={`order-status-badge ${statusClass}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Card Body - Products layout */}
                {firstItem && (
                  <Link href={`/profile/orders/${order.id}`} className="order-card-body">
                    <div className="order-product-img-wrapper">
                      <Image
                        src={firstItem.image}
                        alt={firstItem.name}
                        width={80}
                        height={80}
                        className="order-product-img"
                        priority
                      />
                    </div>

                    <div className="order-product-info">
                      <h3 className="order-product-name">
                        {firstItem.name}
                        {hasMoreItems ? ` + ${extraItemsCount} MORE` : ""}
                      </h3>
                      <p className="order-product-collection">
                        {firstItem.subTitle || "VERGO STREETWEAR COLLECTION"}
                      </p>

                      <div className="order-product-options">
                        {hasMoreItems ? (
                          <>
                            <div className="option-badge">
                              Total Items: <span>{totalItemsCount}</span>
                            </div>
                            <div className="option-badge">
                              Shipment: <span>Standard</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="option-badge">
                              Size: <span>{firstItem.size}</span>
                            </div>
                            <div className="option-badge">
                              Color: <span>{firstItem.color}</span>
                            </div>
                            <div className="option-badge">
                              Qty: <span>{firstItem.qty}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                )}

                {/* Card Footer actions & totals */}
                <div className="order-card-footer">
                  <div className="order-total-section">
                    <span className="order-total-label">TOTAL AMOUNT</span>
                    <span className="order-total-value">Rs. {order.total.toFixed(2)}</span>
                  </div>

                  <div className="order-actions-container">
                    <Link href={`/profile/orders/${order.id}`} className="order-action-btn btn-view-details">
                      View Details
                    </Link>

                    {order.status === "Delivered" ? (
                      <button 
                        onClick={() => router.push(`/collection`)}
                        className="order-action-btn btn-buy-again"
                      >
                        Buy Again
                      </button>
                    ) : (
                      <button 
                        onClick={() => router.push(`/profile/orders/${order.id}`)}
                        className="order-action-btn btn-track-package"
                      >
                        Track Package
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Button */}
        {orders.length > visibleCount && (
          <div className="load-more-container">
            <button className="load-more-btn" onClick={handleLoadMore}>
              LOAD PREVIOUS ORDERS v
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
