"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import "@/styles/orders.css";
import "@/styles/notifications.css";

interface CustomerNotification {
  notificationId: string;
  orderId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const formatOrderNumber = (orderId: string) =>
  `#${orderId.slice(0, 8).toUpperCase()}`;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    authenticatedFetch("/notifications", { cache: "no-store" })
      .then(async (response) => {
        if (!response) throw new Error("Please sign in to view your notifications.");
        if (!response.ok) throw new Error("Unable to retrieve your notifications.");
        setNotifications((await response.json()) as CustomerNotification[]);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setIsLoading(false));
  }, []);

  const markAsRead = async (notificationId: string) => {
    setMarkingId(notificationId);
    try {
      const response = await authenticatedFetch(
        `/notifications/${notificationId}/read`,
        { method: "PATCH" },
      );
      if (response?.ok) {
        setNotifications((current) =>
          current.map((notification) =>
            notification.notificationId === notificationId
              ? { ...notification, isRead: true }
              : notification,
          ),
        );
        // Lets the navbar bell refresh its unread count badge.
        window.dispatchEvent(new Event("vergo-notifications-change"));
      }
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="orders-page-wrapper">
      <div className="orders-container">
        <div className="orders-breadcrumbs">
          <Link href="/">HOME</Link> / <Link href="/profile">PROFILE</Link> /{" "}
          <span className="active">NOTIFICATIONS</span>
        </div>
        <div className="orders-header">
          <h1 className="orders-title">NOTIFICATIONS</h1>
          <p className="orders-subtitle">Updates about your orders and payments.</p>
        </div>

        {isLoading && <div className="empty-orders-container">Loading notifications...</div>}
        {error && (
          <div className="empty-orders-container">
            <h2 className="empty-orders-title">Notifications Unavailable</h2>
            <p className="empty-orders-desc">{error}</p>
            <Link href="/auth/login" className="shop-now-btn">Log In</Link>
          </div>
        )}
        {!isLoading && !error && notifications.length === 0 && (
          <div className="empty-orders-container">
            <h2 className="empty-orders-title">No Notifications Yet</h2>
            <p className="empty-orders-desc">
              Order and payment updates will appear here.
            </p>
            <Link href="/profile/orders" className="shop-now-btn">View Orders</Link>
          </div>
        )}

        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              className={`notification-card ${notification.isRead ? "" : "unread"}`}
              key={notification.notificationId}
            >
              <div className="notification-card-header">
                <h3 className="notification-title">{notification.title}</h3>
                <span
                  className={`notification-read-badge ${notification.isRead ? "read" : "unread"}`}
                >
                  {notification.isRead ? "Read" : "Unread"}
                </span>
              </div>
              <p className="notification-message">{notification.message}</p>
              <div className="notification-meta">
                <div className="notification-meta-info">
                  <Link
                    href={`/profile/orders/${notification.orderId}`}
                    className="notification-order-link"
                  >
                    ORDER {formatOrderNumber(notification.orderId)}
                  </Link>
                  <span>
                    {new Date(notification.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                {!notification.isRead && (
                  <button
                    type="button"
                    className="notification-mark-read-btn"
                    disabled={markingId === notification.notificationId}
                    onClick={() => markAsRead(notification.notificationId)}
                  >
                    {markingId === notification.notificationId
                      ? "Marking..."
                      : "Mark as Read"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
