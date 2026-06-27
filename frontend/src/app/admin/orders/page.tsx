"use client";

import React, { useState } from "react";
import { useAdmin } from "../AdminContext";

interface Order {
  id: string;
  customerName: string;
  date: string;
  amount: string;
  paymentMethod: "Bank Transfer" | "Cash on Delivery";
  paymentProof: "Pending Approval" | "Approved" | "Missing" | "N/A";
  deliveryStatus: "Pending" | "Processing" | "Ready to Ship" | "Dispatched" | "Delivered";
  waybill?: string;
}

export default function OrdersPage() {
  const { addNotification } = useAdmin();
  const [selectedProofImg, setSelectedProofImg] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([
    {
      id: "VRG-9842",
      customerName: "John Doe",
      date: "2026-06-25",
      amount: "18,500 LKR",
      paymentMethod: "Bank Transfer",
      paymentProof: "Approved",
      deliveryStatus: "Dispatched",
      waybill: "KB-90485923",
    },
    {
      id: "VRG-9843",
      customerName: "Sarah Smith",
      date: "2026-06-26",
      amount: "9,200 LKR",
      paymentMethod: "Bank Transfer",
      paymentProof: "Pending Approval",
      deliveryStatus: "Processing",
    },
    {
      id: "VRG-9844",
      customerName: "David Perera",
      date: "2026-06-27",
      amount: "12,400 LKR",
      paymentMethod: "Cash on Delivery",
      paymentProof: "N/A",
      deliveryStatus: "Processing",
    },
    {
      id: "VRG-9845",
      customerName: "Michael Tan",
      date: "2026-06-27",
      amount: "6,500 LKR",
      paymentMethod: "Bank Transfer",
      paymentProof: "Missing",
      deliveryStatus: "Pending",
    },
  ]);

  const approvePayment = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          addNotification(`Payment approved for order #${orderId}.`, "success");
          return { ...o, paymentProof: "Approved", deliveryStatus: "Ready to Ship" };
        }
        return o;
      })
    );
  };

  const dispatchKoombiyo = (orderId: string) => {
    const waybillNum = `KB-${Math.floor(10000000 + Math.random() * 90000000)}`;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          addNotification(`Dispatched via Koombiyo. Waybill generated: ${waybillNum}`, "success");
          return { ...o, deliveryStatus: "Dispatched", waybill: waybillNum };
        }
        return o;
      })
    );
  };

  return (
    <div className="space-y-8 select-none text-xs">
      <div>
        <h2 className="text-sm font-bold tracking-widest text-white uppercase">ORDER MANAGEMENT</h2>
        <p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">Verify payments, upload slips, and dispatch parcels via Koombiyo Delivery</p>
      </div>

      <div className="admin-card p-6">
        <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">ACTIVE ORDERS</h3>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.04)] text-[#8e8e93]">
                <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">ORDER ID</th>
                <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">CUSTOMER</th>
                <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">DATE</th>
                <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">AMOUNT</th>
                <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">METHOD</th>
                <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">PAYMENT PROOF</th>
                <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">DELIVERY STATUS</th>
                <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.01] transition-all">
                  <td className="py-4 pr-3 font-bold text-white font-mono-meta">
                    #{order.id}
                  </td>
                  <td className="py-4 pr-3 text-white font-semibold">
                    {order.customerName}
                  </td>
                  <td className="py-4 pr-3 text-[#8e8e93] font-mono-meta font-medium">
                    {order.date}
                  </td>
                  <td className="py-4 pr-3 text-white font-mono-meta font-bold">
                    {order.amount}
                  </td>
                  <td className="py-4 pr-3 text-[#8e8e93] font-medium uppercase tracking-wide">
                    {order.paymentMethod}
                  </td>
                  <td className="py-4 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide border uppercase ${
                          order.paymentProof === "Approved"
                            ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30"
                            : order.paymentProof === "Pending Approval"
                            ? "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30 cursor-pointer hover:bg-[#f59e0b]/25"
                            : order.paymentProof === "Missing"
                            ? "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30"
                            : "bg-[#252525] text-[#8e8e93] border-white/5"
                        }`}
                        onClick={() => {
                          if (order.paymentProof === "Pending Approval") {
                            setSelectedProofImg(order.id);
                          }
                        }}
                      >
                        {order.paymentProof}
                      </span>
                      {order.paymentProof === "Pending Approval" && (
                        <button
                          onClick={() => setSelectedProofImg(order.id)}
                          className="text-[9px] text-[#8e8e93] hover:text-white underline cursor-pointer"
                        >
                          View Slip
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-4 pr-3">
                    <div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide border uppercase ${
                          order.deliveryStatus === "Dispatched"
                            ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30"
                            : order.deliveryStatus === "Ready to Ship"
                            ? "bg-white text-black border-white"
                            : "bg-[#161616] text-[#8e8e93] border-[rgba(255,255,255,0.08)]"
                        }`}
                      >
                        {order.deliveryStatus}
                      </span>
                      {order.waybill && (
                        <div className="text-[9px] text-[#8e8e93] font-mono-meta mt-1 font-bold">
                          WAYBILL: {order.waybill}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      {order.paymentProof === "Pending Approval" && (
                        <button
                          onClick={() => approvePayment(order.id)}
                          className="bg-white text-black hover:bg-[#eaeaea] font-bold px-2.5 py-1 rounded transition-all cursor-pointer"
                        >
                          Approve Payment
                        </button>
                      )}
                      {order.deliveryStatus === "Ready to Ship" && (
                        <button
                          onClick={() => dispatchKoombiyo(order.id)}
                          className="bg-[#10b981] text-black hover:bg-[#059669] font-bold px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>Dispatch Koombiyo</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT PROOF DIALOG MODAL */}
      {selectedProofImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div
            className="w-full max-w-sm bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-md shadow-2xl overflow-hidden p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-sm font-bold tracking-widest uppercase text-white flex items-center gap-2">
                VERIFY BANK TRANSFER SLIP
              </h3>
              <button
                onClick={() => setSelectedProofImg(null)}
                className="text-[#8e8e93] hover:text-white cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Simulated Slip image */}
              <div className="aspect-[3/4] w-full bg-[#1c1c1e] rounded flex flex-col items-center justify-center border border-[rgba(255,255,255,0.05)] relative p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 text-[#8e8e93] flex items-center justify-center mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-white font-bold mb-1 font-mono-meta">BANK TRANSFER RECEIPT</div>
                <div className="text-[10px] text-[#8e8e93] space-y-1 mt-2">
                  <p>Order Reference: <span className="text-white font-bold">#{selectedProofImg}</span></p>
                  <p>Transaction ID: <span className="text-white font-semibold">TXN-49032598</span></p>
                  <p>Transfer Amount: <span className="text-[#10b981] font-bold">LKR 9,200.00</span></p>
                  <p>Status: <span className="text-[#f59e0b] font-bold">Unverified</span></p>
                </div>
                <div className="absolute inset-x-0 bottom-4 px-4">
                  <div className="h-0.5 bg-dashed bg-white/10 w-full mb-3" />
                  <p className="text-[8px] text-[#555] uppercase tracking-widest font-mono-meta">Verified signature: SHA256-AE34F91</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <button
                  type="button"
                  onClick={() => {
                    addNotification(`Payment proof rejected for order #${selectedProofImg}.`, "error");
                    setSelectedProofImg(null);
                  }}
                  className="flex-1 bg-transparent hover:bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] font-bold tracking-widest px-4 py-2.5 rounded-md transition-all uppercase cursor-pointer"
                >
                  REJECT SLIP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    approvePayment(selectedProofImg!);
                    setSelectedProofImg(null);
                  }}
                  className="flex-1 bg-white text-black hover:bg-[#eaeaea] font-bold tracking-widest px-4 py-2.5 rounded-md transition-all uppercase cursor-pointer"
                >
                  APPROVE SLIP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
