"use client";

import { useEffect, useState } from "react";

interface ManagedOrder {
  orderId: string; orderDate: string | null; totalAmount: string | number; paymentMethod: string; orderStatus: string | null;
  customerDetails: { firstName: string; lastName: string } | null;
  paymentProofs: Array<{ status: string; receiptUrl: string | null }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function OrdersPage() {
  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("vergo_access_token");
    if (!token) return setError("Admin authentication is required.");
    fetch(`${API_URL}/orders/manage`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("Unable to retrieve orders."); return response.json(); })
      .then(setOrders)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return <div className="space-y-8 select-none text-xs">
    <div><h2 className="text-sm font-bold tracking-widest text-white uppercase">ORDER MANAGEMENT</h2><p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">Live database orders</p></div>
    {error && <div className="admin-card p-6 text-red-400">{error}</div>}
    <div className="admin-card p-6 overflow-x-auto"><table className="w-full text-left text-xs min-w-[700px]"><thead><tr className="text-[#8e8e93]"><th>ORDER ID</th><th>CUSTOMER</th><th>DATE</th><th>AMOUNT</th><th>METHOD</th><th>PAYMENT</th><th>STATUS</th></tr></thead><tbody>
      {orders.map((order) => <tr key={order.orderId} className="border-t border-white/5"><td className="py-4 font-mono-meta">#{order.orderId}</td><td>{order.customerDetails ? `${order.customerDetails.firstName} ${order.customerDetails.lastName}` : "Guest"}</td><td>{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "-"}</td><td>LKR {Number(order.totalAmount).toLocaleString()}</td><td>{order.paymentMethod.replaceAll("_", " ")}</td><td>{order.paymentProofs[0]?.status || "N/A"}</td><td>{order.orderStatus || "Pending"}</td></tr>)}
      {orders.length === 0 && !error && <tr><td colSpan={7} className="py-8 text-center text-[#8e8e93]">No orders in the database.</td></tr>}
    </tbody></table></div>
  </div>;
}
