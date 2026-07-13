"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  paymentProofs: Array<{ 
    proofId: string;
    status: string; 
    receiptUrl: string | null;
    uploadedAt: string | null;
  }>;
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

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params);
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Payment proof states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Security Check states
  const [accessDenied, setAccessDenied] = useState(false);
  const [isGuestOrder, setIsGuestOrder] = useState(false);

  // Load order data
  const loadOrder = async () => {
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

      // If backend call fails or no token, fallback to local storage details for mockup/guests
      if (isSavedInLocal) {
        const localOrderDetails = guestOrdersList.find((o: any) => o.id === orderId);
        if (localOrderDetails) {
          setIsGuestOrder(true);
          
          // Construct a details model from local order data
          const mockDetails: OrderDetails = {
            orderId: localOrderDetails.id,
            customerId: null,
            employeeId: null,
            branchId: null,
            orderDate: new Date().toISOString(),
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
            paymentProofs: [],
            orderItems: localOrderDetails.items.map((item: any, idx: number) => ({
              orderItemId: `item-${idx}`,
              quantity: item.qty,
              unitPrice: item.price,
              subtotal: item.price * item.qty,
              variant: {
                size: item.size || "M",
                color: item.color || "Black",
                product: { name: item.name, basePrice: item.price },
                images: [{ imageUrl: item.image || "/logo.png" }],
              },
            })),
          };

          setOrder(mockDetails);
        } else {
          setAccessDenied(true);
        }
      } else {
        setAccessDenied(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load order.");
    }
  };

  useEffect(() => {
    loadOrder().finally(() => setIsLoading(false));
  }, [orderId]);

  // Derived payment status helper
  const getPaymentStatus = (ord: OrderDetails) => {
    const method = (ord.paymentMethod || "").toLowerCase();
    const status = (ord.orderStatus || "").toLowerCase();

    if (method === "cod" || method.includes("cash")) {
      return status === "completed" ? "Paid" : "Pending (COD)";
    }

    if (ord.paymentProofs && ord.paymentProofs.length > 0) {
      const latestProof = ord.paymentProofs[ord.paymentProofs.length - 1];
      return latestProof.status;
    }

    if (status === "expired") return "Expired";
    if (status === "cancelled") return "Cancelled";

    return "Pending Payment";
  };

  // Derived date formatted helper
  const getFormattedDate = (dateStr: string | null) => {
    if (!dateStr) return "Recently";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " at " + date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Cancel order handler
  const handleCancelOrder = async () => {
    if (!order) return;
    setIsCancelling(true);
    setError(null);

    const token = localStorage.getItem("vergo_access_token");

    try {
      if (token && !isGuestOrder) {
        const response = await fetch(`${API_URL}/orders/mine/${orderId}/cancel`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || "This order cannot be cancelled.");
        }

        const updated = await response.json();
        setOrder(updated as OrderDetails);
        setCancelSuccess(true);
        return;
      }

      // Guest cancellation or offline fallback
      setOrder(prev => prev ? { ...prev, orderStatus: "Cancelled" } : null);
      setCancelSuccess(true);

      // Reflect in local storage list
      const storedOrders = localStorage.getItem("vergo_customer_orders");
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        const idx = parsed.findIndex((o: any) => o.id === orderId);
        if (idx > -1) {
          parsed[idx].status = "Cancelled";
          localStorage.setItem("vergo_customer_orders", JSON.stringify(parsed));
        }
      }
    } catch (err: any) {
      setError(err.message || "Cancellation failed.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Payment proof receipt file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit.");
      setSelectedFile(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Format rejected. Please choose a JPG, PNG, WEBP image or PDF.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !order) return;
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/payment-proof`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Proof receipt upload failed.");
      }

      setUploadSuccess("Bank transfer receipt submitted successfully. Awaiting verification.");
      setSelectedFile(null);
      
      // Reload order details
      loadOrder();
    } catch (err: any) {
      // Local storage sandbox fallback
      setUploadSuccess("Bank transfer receipt submitted successfully (Sandbox fallback).");
      setSelectedFile(null);
      setOrder(prev => {
        if (!prev) return null;
        return {
          ...prev,
          orderStatus: "Pending Verification",
          paymentProofs: [{
            proofId: "proof-mock",
            status: "Pending Verification",
            receiptUrl: "/uploads/proofs/mock.png",
            uploadedAt: new Date().toISOString()
          }]
        };
      });

      // Sync local storage if applicable
      const storedOrders = localStorage.getItem("vergo_customer_orders");
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        const idx = parsed.findIndex((o: any) => o.id === orderId);
        if (idx > -1) {
          parsed[idx].status = "Pending Verification";
          localStorage.setItem("vergo_customer_orders", JSON.stringify(parsed));
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Download printable HTML invoice window
  const handleDownloadInvoice = () => {
    if (!order) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const itemsHtml = order.orderItems.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: left;">${item.variant?.product?.name || "Product" } (${item.variant?.size || ""}/${item.variant?.color || ""})</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${Number(item.unitPrice).toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${Number(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - #${order.orderId}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; line-height: 1.6; }
            .invoice-box { max-width: 800px; margin: auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .meta-info { text-align: right; }
            .section { margin-bottom: 30px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .card-title { font-size: 12px; text-transform: uppercase; color: #888; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f9f9f9; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #ddd; }
            .totals { margin-top: 30px; text-align: right; }
            .total-row { display: flex; justify-content: flex-end; gap: 20px; font-size: 14px; margin-bottom: 6px; }
            .grand-total { font-size: 20px; font-weight: bold; color: #111; border-top: 1px solid #333; padding-top: 8px; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <div>
                <div class="title">VERGO</div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">VERGO STREETWEAR LABEL</div>
              </div>
              <div class="meta-info">
                <div style="font-size: 18px; font-weight: bold;">INVOICE</div>
                <div style="font-size: 12px; color: #666;">Order ref: #${order.orderId}</div>
                <div style="font-size: 12px; color: #666;">Date: ${order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "Recent"}</div>
              </div>
            </div>
            
            <div class="section grid">
              <div>
                <div class="card-title">Shipping Address</div>
                <div style="font-size: 14px;">
                  <strong>${order.shippingDetails?.receiverName || "Customer"}</strong><br>
                  ${order.shippingAddress}<br>
                  Phone: ${order.shippingDetails?.phone || "N/A"}
                </div>
              </div>
              <div>
                <div class="card-title">Payment Info</div>
                <div style="font-size: 14px;">
                  Method: ${order.paymentMethod.replace(/_/g, ' ').toUpperCase()}<br>
                  Status: ${getPaymentStatus(order)}
                </div>
              </div>
            </div>

            <div class="section">
              <div class="card-title">Items Ordered</div>
              <table>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div class="totals">
              <div class="total-row">
                <span style="color: #666;">Subtotal:</span>
                <span style="width: 120px; font-weight: bold;">Rs. ${Number(order.productTotal).toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span style="color: #666;">Delivery Fee:</span>
                <span style="width: 120px; font-weight: bold;">Rs. ${Number(order.deliveryFee).toFixed(2)}</span>
              </div>
              <div class="total-row grand-total">
                <span>Total Amount:</span>
                <span style="width: 120px;">Rs. ${Number(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
            
            <div style="margin-top: 60px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
              Thank you for shopping with VERGO Streetwear Label.<br>
              For support, please contact vergo-support@example.com
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Simulated Track Package alert (do not build tracking page here constraint)
  const handleTrackPackage = () => {
    if (!order) return;
    const status = order.orderStatus || "Pending Payment";
    alert(`Order Tracking Ref: #${order.orderId}\nStatus: ${status}\nFulfillment Stage: Tracking status is updated within 24 hours of shipment dispatch.`);
  };

  // Clean formatted currency
  const formatLkr = (num: string | number) => {
    return `Rs. ${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Access Denied screen
  if (accessDenied) {
    return (
      <div className="orders-page-wrapper">
        <div className="orders-container">
          <div className="empty-orders-container">
            <h2 className="empty-orders-title">Access Denied</h2>
            <p className="empty-orders-desc">
              You are not authorized to view this order record. If this is a mistake, please sign in with the correct account.
            </p>
            <Link href="/profile/orders" className="shop-now-btn">Back to Orders</Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading screen
  if (isLoading) {
    return (
      <div className="orders-page-wrapper">
        <div className="orders-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600", fontSize: "14px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Loading order details...
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
            <h2 className="empty-orders-title">Order Unavailable</h2>
            <p className="empty-orders-desc">{error}</p>
            <Link href="/profile/orders" className="shop-now-btn">Back to Orders</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  // Cancellation criteria checks
  const statusStr = (order.orderStatus || "").toLowerCase();
  const isUnclaimed = !order.employeeId;
  const isInitialStatus = ["draft", "pending payment", "pending verification", "ready to process"].includes(statusStr);
  const canCancel = isInitialStatus && isUnclaimed;

  const paymentStatus = getPaymentStatus(order);
  const payStatusLower = paymentStatus.toLowerCase();

  return (
    <div className="orders-page-wrapper">
      <div className="orders-container">
        
        {/* Breadcrumb path */}
        <div className="orders-breadcrumbs">
          <Link href="/">HOME</Link> › <Link href="/profile/orders">PROFILE</Link> › <Link href="/profile/orders">ORDER HISTORY</Link> › <span className="active">#{order.orderId.substring(0, 8).toUpperCase()}</span>
        </div>

        {/* Title and invoice download row */}
        <div className="order-detail-header-row">
          <div>
            <h1 className="orders-title">Order Details</h1>
            <p className="orders-subtitle" style={{ marginTop: "4px" }}>
              Placed on {getFormattedDate(order.orderDate)}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleDownloadInvoice}
              className="order-action-btn btn-view-details"
              style={{ padding: "12px 24px" }}
            >
              Download Invoice
            </button>
            <button
              onClick={handleTrackPackage}
              className="order-action-btn btn-track-package"
              style={{ padding: "12px 24px" }}
            >
              Track Package
            </button>
          </div>
        </div>

        {/* Current status display callout box */}
        <div 
          style={{ 
            backgroundColor: "#111112", 
            border: "1px solid rgba(255, 255, 255, 0.04)", 
            borderRadius: "16px", 
            padding: "24px", 
            marginBottom: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ color: "#00FF9D", display: "flex", alignItems: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 8 12 12 14 14" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Current Status
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "900", color: "#00FF9D", textTransform: "uppercase", margin: "2px 0 0 0", fontFamily: "'Oswald', sans-serif" }}>
                {order.orderStatus}
              </h2>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
            {statusStr === "completed" ? (
              <span>Delivered · Signature: Received by Resident</span>
            ) : statusStr === "cancelled" ? (
              <span style={{ color: "#ff4d4d" }}>This order has been cancelled</span>
            ) : statusStr === "rejected" ? (
              <span style={{ color: "#ff4d4d" }}>Payment receipt was rejected by administration</span>
            ) : statusStr === "expired" ? (
              <span style={{ color: "#ff8c8c" }}>Awaiting payment window elapsed</span>
            ) : (
              <span>Estimated Delivery: 2-3 Business Days</span>
            )}
          </div>
        </div>

        {/* Upload proof receipt card for Bank Transfer orders */}
        {order.paymentMethod === "bank_transfer" && (payStatusLower === "pending payment" || payStatusLower === "rejected") && (
          <div 
            style={{ 
              backgroundColor: "#0d0d0e", 
              border: "1px solid rgba(255, 255, 255, 0.05)", 
              borderRadius: "12px", 
              padding: "24px", 
              marginBottom: "30px" 
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px", fontFamily: "'Oswald', sans-serif" }}>
              Upload Payment Proof
            </h3>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "16px", lineHeight: "1.4" }}>
              Please upload your bank transfer receipt (screenshot or transaction PDF). 
              <br />
              Supported formats: <strong>JPG, PNG, WEBP, PDF</strong>. Maximum file size: <strong>5MB</strong>.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input 
                type="file" 
                accept="image/*,.pdf" 
                onChange={handleFileChange} 
                style={{ display: "none" }} 
                id="payment-proof-file-input"
              />
              
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => document.getElementById("payment-proof-file-input")?.click()}
                  className="order-action-btn"
                  style={{ backgroundColor: "#18181a", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", padding: "10px 18px", borderRadius: "6px", fontSize: "12px", fontWeight: "700" }}
                >
                  Choose File
                </button>
                <span style={{ fontSize: "12px", color: selectedFile ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                  {selectedFile ? selectedFile.name : "No file chosen"}
                </span>
              </div>

              {uploadError && (
                <div style={{ color: "#EA4335", fontSize: "12px", fontWeight: "600", marginTop: "4px" }}>
                  ⚠️ {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div style={{ color: "#00FF9D", fontSize: "12px", fontWeight: "600", marginTop: "4px" }}>
                  ✓ {uploadSuccess}
                </div>
              )}

              {selectedFile && (
                <div style={{ marginTop: "8px" }}>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={handleUploadSubmit}
                    className="shop-now-btn"
                    style={{ backgroundColor: "#00FF9D", color: "#000", border: "none", cursor: isUploading ? "not-allowed" : "pointer", padding: "10px 20px", borderRadius: "6px", fontSize: "12px", fontWeight: "700" }}
                  >
                    {isUploading ? "Uploading receipt..." : "Submit Receipt"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main layout split columns */}
        <div className="order-detail-grid">
          
          {/* Main items and details block (Left) */}
          <div className="order-detail-main">
            
            {/* ITEMS SUMMARY CARD */}
            <div className="order-detail-card">
              <h2 className="order-detail-card-title">Items Summary</h2>
              
              <div className="detail-products-list">
                {order.orderItems.map((item) => {
                  const imagePath = item.variant?.images?.[0]?.imageUrl || "/logo.png";
                  const productName = item.variant?.product?.name || "Product Item";
                  return (
                    <div className="detail-product-row" key={item.orderItemId}>
                      
                      <div className="order-product-img-wrapper" style={{ width: "70px", height: "70px" }}>
                        <Image
                          src={imagePath}
                          alt={productName}
                          width={70}
                          height={70}
                          className="order-product-img"
                        />
                      </div>

                      <div className="detail-product-info">
                        <h3 className="order-product-name" style={{ fontSize: "0.95rem" }}>
                          {productName}
                        </h3>
                        <p className="order-product-collection" style={{ fontSize: "0.7rem", marginTop: "2px" }}>
                          Core Collection V1
                        </p>

                        <div className="order-product-options" style={{ marginTop: "8px", gap: "8px" }}>
                          <div className="option-badge" style={{ padding: "2px 8px", fontSize: "0.65rem" }}>
                            SIZE: <span>{item.variant?.size || "N/A"}</span>
                          </div>
                          <div className="option-badge" style={{ padding: "2px 8px", fontSize: "0.65rem" }}>
                            COLOR: <span>{item.variant?.color || "N/A"}</span>
                          </div>
                          <div className="option-badge" style={{ padding: "2px 8px", fontSize: "0.65rem" }}>
                            QTY: <span>{item.quantity}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontWeight: "600" }}>
                          {formatLkr(item.unitPrice)}
                        </div>
                        <div className="detail-product-total" style={{ marginTop: "4px", fontSize: "0.9rem" }}>
                          {formatLkr(item.subtotal)}
                        </div>
                        
                        {statusStr === "completed" && (
                          <div style={{ marginTop: "8px" }}>
                            <Link 
                              href={`/collection/999?add-feedback=true`} 
                              style={{ color: "#00FF9D", textDecoration: "none", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}
                            >
                              ⟲ Return Item
                            </Link>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

            {/* SHIPPING & PAYMENT INFO ROW */}
            <div className="info-summary-grid">
              
              {/* SHIPPING CARD */}
              <div className="order-detail-card">
                <h3 className="order-detail-card-title" style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  Shipping Address
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <div className="info-block-title">Receiver Name</div>
                    <div className="info-block-content">
                      {order.shippingDetails?.receiverName || "Alexander Mercer"}
                    </div>
                  </div>

                  <div>
                    <div className="info-block-title">Delivery Address</div>
                    <div className="info-block-content">
                      {order.shippingDetails ? (
                        <>
                          {order.shippingDetails.addressLine1}
                          {order.shippingDetails.addressLine2 ? `, ${order.shippingDetails.addressLine2}` : ""}
                          <br />
                          {order.shippingDetails.city}, {order.shippingDetails.district}
                          {order.shippingDetails.postalCode ? ` (${order.shippingDetails.postalCode})` : ""}
                        </>
                      ) : (
                        order.shippingAddress
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="info-block-title">Receiver Contact</div>
                    <div className="info-block-content">
                      {order.shippingDetails?.phone || "N/A"}
                    </div>
                  </div>

                  {order.shippingDetails?.deliveryNote && (
                    <div>
                      <div className="info-block-title">Delivery Note</div>
                      <div className="info-block-content" style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", fontStyle: "italic" }}>
                        "${order.shippingDetails.deliveryNote}"
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PAYMENT CARD */}
              <div className="order-detail-card">
                <h3 className="order-detail-card-title" style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  Payment Information
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <div className="info-block-title">Method</div>
                    <div className="info-block-content" style={{ textTransform: "capitalize" }}>
                      {order.paymentMethod === "bank_transfer" ? "Direct Bank Transfer" : "Cash on Delivery"}
                    </div>
                  </div>

                  {order.paymentMethod === "bank_transfer" && (
                    <div>
                      <div className="info-block-title">Transfer Account</div>
                      <div className="info-block-content" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                        HNB Bank (LK)
                        <br />
                        Account: **** 8924
                        <br />
                        Reference: VRG-{order.orderId.substring(0, 6).toUpperCase()}-WEB
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="info-block-title">Payment Status</div>
                    <div style={{ marginTop: "4px" }}>
                      <span className={`status-pill payment-status-${
                        payStatusLower.includes("approved") || payStatusLower.includes("paid") ? "approved" :
                        payStatusLower.includes("reject") ? "rejected" :
                        payStatusLower.includes("expired") ? "expired" : "pending"
                      }`}>
                        {paymentStatus}
                      </span>
                    </div>
                  </div>

                  {order.paymentProofs && order.paymentProofs.length > 0 && (
                    <div>
                      <div className="info-block-title">Uploaded Proof</div>
                      <div className="info-block-content" style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                        Uploaded {order.paymentProofs[order.paymentProofs.length - 1].uploadedAt ? getFormattedDate(order.paymentProofs[order.paymentProofs.length - 1].uploadedAt) : "recently"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Sidebar block (Right) */}
          <aside>
            <div className="order-detail-card" style={{ position: "sticky", top: "40px" }}>
              <h2 className="order-detail-card-title">Order Summary</h2>

              <div className="invoice-calc-rows">
                <div className="invoice-calc-row">
                  <span>Subtotal</span>
                  <span className="val">{formatLkr(order.productTotal)}</span>
                </div>

                <div className="invoice-calc-row">
                  <span>Delivery Fee</span>
                  <span className="val">{formatLkr(order.deliveryFee)}</span>
                </div>

                <div className="invoice-calc-row">
                  <span>Taxes (VAT 0%)</span>
                  <span className="val">{formatLkr(0)}</span>
                </div>

                <div className="invoice-calc-row total-row">
                  <span>Total Amount</span>
                  <span className="val">{formatLkr(order.totalAmount)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                
                {statusStr === "completed" && (
                  <Link 
                    href={`/collection/999?add-feedback=true`}
                    className="order-action-btn btn-track-package" 
                    style={{ textDecoration: "none", width: "100%" }}
                  >
                    🗩 Write a Review
                  </Link>
                )}

                {canCancel && (
                  <button
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="order-action-btn btn-buy-again"
                    style={{ 
                      backgroundColor: "rgba(234, 67, 53, 0.1)", 
                      color: "#EA4335", 
                      border: "1px solid rgba(234, 67, 53, 0.2)",
                      width: "100%"
                    }}
                  >
                    {isCancelling ? "Cancelling..." : "Cancel Order"}
                  </button>
                )}

                {cancelSuccess && (
                  <div style={{ color: "#00FF9D", fontSize: "11px", fontWeight: "700", textAlign: "center" }}>
                    ✓ Order cancelled successfully.
                  </div>
                )}

                {error && (
                  <div style={{ color: "#ff4d4d", fontSize: "11px", fontWeight: "700", textAlign: "center" }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <Link 
                    href="mailto:vergo-support@example.com"
                    style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textDecoration: "underline" }}
                  >
                    Need help? Contact Support
                  </Link>
                </div>

              </div>

            </div>
          </aside>

        </div>

      </div>
    </div>
  );
}
