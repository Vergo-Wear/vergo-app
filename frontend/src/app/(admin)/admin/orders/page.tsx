"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";

interface PaymentProof {
  proofId: string;
  receiptUrl: string | null;
  status: string;
  adminNotes: string | null;
}

interface ManagedOrder {
  orderId: string;
  orderDate: string | null;
  totalAmount: string | number;
  paymentMethod: string;
  orderStatus: string;
  confirmationStatus: string;
  rejectionReason: string | null;
  customerDetails: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  paymentProofs: PaymentProof[];
  pendingCheckout?: boolean;
}

interface PendingCheckout {
  checkoutId: string;
  createdAt: string;
  totalAmount: string | number;
  paymentMethod: string;
  status: string;
  receiptUrl: string | null;
  adminNotes: string | null;
  checkoutPayload: {
    contactDetails?: {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function OrdersPage() {
  const { addNotification } = useAdmin();
  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<ManagedOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadOrders = useCallback(async () => {
    const token = sessionStorage.getItem("vergo_access_token");
    if (!API_URL || !token) {
      setIsLoading(false);
      addNotification(
        !API_URL
          ? "NEXT_PUBLIC_API_URL is not configured."
          : "Your admin session has expired. Please sign in again.",
        "error",
      );
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [ordersResponse, pendingResponse] = await Promise.all([
        fetch(`${API_URL}/orders/manage`, { headers, cache: "no-store" }),
        fetch(`${API_URL}/orders/manage/pending-checkouts`, {
          headers,
          cache: "no-store",
        }),
      ]);
      const ordersBody = await ordersResponse.json().catch(() => ({}));
      const pendingBody = await pendingResponse.json().catch(() => ({}));
      if (!ordersResponse.ok) {
        throw new Error(ordersBody.message || "Unable to load orders.");
      }
      if (!pendingResponse.ok) {
        throw new Error(
          pendingBody.message || "Unable to load pending checkouts.",
        );
      }
      const pendingOrders = (pendingBody as PendingCheckout[]).map(
        (checkout): ManagedOrder => ({
          orderId: checkout.checkoutId,
          orderDate: checkout.createdAt,
          totalAmount: checkout.totalAmount,
          paymentMethod: checkout.paymentMethod,
          orderStatus: checkout.status,
          confirmationStatus: "Pending",
          rejectionReason: checkout.adminNotes,
          customerDetails: checkout.checkoutPayload.contactDetails
            ? {
                firstName:
                  checkout.checkoutPayload.contactDetails.firstName || "",
                lastName:
                  checkout.checkoutPayload.contactDetails.lastName || "",
                email: checkout.checkoutPayload.contactDetails.email || "",
              }
            : null,
          paymentProofs: checkout.receiptUrl
            ? [
                {
                  proofId: checkout.checkoutId,
                  receiptUrl: checkout.receiptUrl,
                  status: checkout.status,
                  adminNotes: checkout.adminNotes,
                },
              ]
            : [],
          pendingCheckout: true,
        }),
      );
      setOrders([...pendingOrders, ...(ordersBody as ManagedOrder[])]);
    } catch (error) {
      addNotification(
        error instanceof Error ? error.message : "Unable to load orders.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const pendingProof = (order: ManagedOrder) =>
    order.paymentProofs.find((proof) => proof.status === "Pending Verification");

  const reviewOrder = async (
    order: ManagedOrder,
    decision: "Approved" | "Rejected",
    reason?: string,
  ) => {
    const token = sessionStorage.getItem("vergo_access_token");
    if (!API_URL || !token) {
      addNotification("Your admin session has expired. Please sign in again.", "error");
      return;
    }
    const isBankTransfer = order.paymentMethod.toLowerCase().includes("bank");
    const proof = pendingProof(order);
    if (isBankTransfer && !proof) {
      addNotification("This Bank Transfer order has no pending receipt to review.", "error");
      return;
    }

    setBusyOrderId(order.orderId);
    try {
      const endpoint = order.pendingCheckout
        ? `${API_URL}/orders/manage/pending-checkouts/${order.orderId}/review`
        : isBankTransfer
          ? `${API_URL}/orders/manage/${order.orderId}/payment-proofs/${proof!.proofId}/review`
          : `${API_URL}/orders/manage/${order.orderId}/status`;
      const payload = order.pendingCheckout || isBankTransfer
        ? { status: decision, ...(reason ? { adminNotes: reason } : {}) }
        : {
            status: decision === "Approved" ? "Ready to Process" : "Rejected",
            ...(reason ? { rejectionReason: reason } : {}),
          };
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(body.message)
          ? body.message.join(" ")
          : body.message;
        throw new Error(message || `Unable to ${decision.toLowerCase()} order.`);
      }
      addNotification(
        `${order.pendingCheckout ? "Checkout" : "Order"} #${order.orderId} ${decision.toLowerCase()} successfully.`,
        "success",
      );
      setRejectingOrder(null);
      setRejectionReason("");
      await loadOrders();
    } catch (error) {
      addNotification(
        error instanceof Error ? error.message : "Unable to review order.",
        "error",
      );
    } finally {
      setBusyOrderId(null);
    }
  };

  const statusClass = (status: string) => {
    if (status === "Approved") return "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30";
    if (status === "Rejected") return "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30";
    return "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30";
  };

  return (
    <div className="space-y-8 text-xs">
      <div>
        <h2 className="text-sm font-bold tracking-widest text-white uppercase">Order Approval</h2>
        <p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">
          Approve pending COD checkouts and submitted Bank Transfer receipts. Orders are created only after approval.
        </p>
      </div>

      <div className="admin-card p-6">
        <div className="mb-6 pb-2 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">Orders</h3>
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="text-[10px] text-[#8e8e93] hover:text-white uppercase font-bold"
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-[#8e8e93]">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-[#8e8e93]">No orders found.</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-white/5 text-[#8e8e93]">
                  {[
                    "Reference",
                    "Customer",
                    "Date",
                    "Amount",
                    "Method",
                    "Proof",
                    "Confirmation",
                    "Order Status",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} className="pb-3 pr-4 font-bold tracking-wider text-[9px] uppercase">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {orders.map((order) => {
                  const proof = pendingProof(order) ?? order.paymentProofs[0];
                  const canReview = order.confirmationStatus === "Pending";
                  const busy = busyOrderId === order.orderId;
                  return (
                    <tr key={order.orderId} className="hover:bg-white/[0.01]">
                      <td className="py-4 pr-4 font-bold text-white font-mono-meta">#{order.orderId}</td>
                      <td className="py-4 pr-4 text-white font-semibold">
                        {order.customerDetails
                          ? `${order.customerDetails.firstName} ${order.customerDetails.lastName}`
                          : "Guest"}
                      </td>
                      <td className="py-4 pr-4 text-[#8e8e93]">
                        {order.orderDate ? new Date(order.orderDate).toLocaleString() : "—"}
                      </td>
                      <td className="py-4 pr-4 text-white font-bold">
                        {Number(order.totalAmount).toLocaleString("en-LK")} LKR
                      </td>
                      <td className="py-4 pr-4 text-[#8e8e93] font-semibold">{order.paymentMethod}</td>
                      <td className="py-4 pr-4">
                        {proof?.receiptUrl ? (
                          <a
                            href={proof.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#00FF9D] underline font-bold"
                          >
                            Open receipt
                          </a>
                        ) : (
                          <span className="text-[#8e8e93]">N/A</span>
                        )}
                        {proof && <div className="text-[9px] text-[#8e8e93] mt-1">{proof.status}</div>}
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`text-[9px] font-bold px-2 py-1 rounded border uppercase ${statusClass(order.confirmationStatus)}`}>
                          {order.confirmationStatus}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-[#8e8e93]">{order.orderStatus}</td>
                      <td className="py-4">
                        {canReview ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void reviewOrder(order, "Approved")}
                              className="bg-[#10b981] text-black font-bold px-3 py-1.5 rounded disabled:opacity-50"
                            >
                              {busy ? "Saving…" : "Approve"}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setRejectingOrder(order)}
                              className="border border-[#ef4444]/40 text-[#ef4444] font-bold px-3 py-1.5 rounded disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#8e8e93]">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
          <div className="w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Reject order</h3>
            <p className="text-[#8e8e93] mt-2">
              Enter the reason shown on order #{rejectingOrder.orderId}.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              maxLength={500}
              rows={4}
              className="mt-4 w-full rounded bg-[#161616] border border-white/10 p-3 text-white outline-none focus:border-[#ef4444]"
              placeholder="Reason for rejection"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectingOrder(null);
                  setRejectionReason("");
                }}
                className="px-4 py-2 text-[#8e8e93] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim() || busyOrderId === rejectingOrder.orderId}
                onClick={() => void reviewOrder(rejectingOrder, "Rejected", rejectionReason.trim())}
                className="px-4 py-2 rounded bg-[#ef4444] text-white font-bold disabled:opacity-50"
              >
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
