"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { useAdmin } from "../AdminContext";

interface EarningsSummary {
  vergoConfirmedNetIncome: number;
  bankTransferProductIncome: number;
  bankTransferCourierFees: number;
  bankTransferTotalCollected: number;
  confirmedCodIncome: number;
  pendingCodIncome: number;
  codCourierFeesDirect: number;
  citypakCourierFeesTotal: number;
  citypakPayableFromBankTransfers: number;
  returnedCodDeductions: number;
  totalGrossVolume: number;
  totalOrdersCount: number;
  totalCompletedOrders: number;
  totalDeliveredCodOrders: number;
  totalPendingCodOrders: number;
  totalReturnedOrders: number;
}

interface EarningsLedgerItem {
  orderId: string;
  displayId: string;
  orderDate: string;
  customerName: string;
  paymentMethod: string;
  orderStatus: string;
  productAmount: number;
  deliveryFee: number;
  totalAmount: number;
  isReturnedOrCancelled: boolean;
  isBank: boolean;
  isCod: boolean;
  codStatus: "CONFIRMED" | "PENDING" | "UPFRONT_BANK" | "RETURNED";
  citypakTransferRequired: number;
  recognizedProductIncome: number;
}

interface EarningsData {
  summary: EarningsSummary;
  ledger: EarningsLedgerItem[];
}

export default function EarningsPage() {
  const { addNotification } = useAdmin();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/admin/earnings");
      if (res && res.ok) {
        const body = await res.json();
        setData(body);
      } else {
        addNotification("Failed to retrieve earnings dataset.", "error");
      }
    } catch (err) {
      console.error("Error fetching earnings data:", err);
      addNotification("Unable to connect to financial service.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const summary = data?.summary || {
    vergoConfirmedNetIncome: 0,
    bankTransferProductIncome: 0,
    bankTransferCourierFees: 0,
    bankTransferTotalCollected: 0,
    confirmedCodIncome: 0,
    pendingCodIncome: 0,
    codCourierFeesDirect: 0,
    citypakCourierFeesTotal: 0,
    citypakPayableFromBankTransfers: 0,
    returnedCodDeductions: 0,
    totalGrossVolume: 0,
    totalOrdersCount: 0,
    totalCompletedOrders: 0,
    totalDeliveredCodOrders: 0,
    totalPendingCodOrders: 0,
    totalReturnedOrders: 0,
  };

  const filteredLedger = (data?.ledger || []).filter((item) => {
    const matchesSearch =
      item.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.orderId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPayment =
      paymentFilter === "all" ||
      (paymentFilter === "bank" && item.isBank) ||
      (paymentFilter === "cod" && item.isCod);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "confirmed" && (item.isBank || item.codStatus === "CONFIRMED")) ||
      (statusFilter === "pending" && item.codStatus === "PENDING") ||
      (statusFilter === "returned" && item.isReturnedOrCancelled);

    return matchesSearch && matchesPayment && matchesStatus;
  });

  const handleExportCSV = () => {
    if (!data?.ledger || data.ledger.length === 0) {
      addNotification("No earnings data available to export.", "info");
      return;
    }

    try {
      const headers = "Order ID,Customer,Order Date,Payment Method,Order Status,COD Status,Vergo Product Share (LKR),Citypak Courier Fee (LKR),Citypak Payable from Bank (LKR),Total Charged (LKR),Net Recognized Revenue (LKR)\n";
      const rows = data.ledger
        .map(
          (row) =>
            `"${row.displayId}","${row.customerName}","${row.orderDate ? new Date(row.orderDate).toLocaleString() : ""}","${row.paymentMethod}","${row.orderStatus}","${row.codStatus}",${row.productAmount},${row.deliveryFee},${row.citypakTransferRequired},${row.totalAmount},${row.recognizedProductIncome}`
        )
        .join("\n");

      const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `vergo_earnings_report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addNotification("Financial ledger CSV report exported successfully.", "success");
    } catch {
      addNotification("Failed to export financial report.", "error");
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[22px] font-black text-white font-mono-meta tracking-wider uppercase">
            FINANCIAL EARNINGS & REVENUE
          </div>
          <p className="text-xs text-[#8e8e93] font-medium mt-1">
            Live calculation of Vergo net product revenue, COD delivery confirmation status, Bank Transfer courier fee collection, and Citypak remittance obligations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEarnings}
            className="p-2 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded hover:border-white/20 text-[#8e8e93] hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
            title="Refresh financial data"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? "Refreshing..." : "Refresh Data"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-[#00FF9D]/10 hover:bg-[#00FF9D]/20 text-[#00FF9D] border border-[#00FF9D]/30 font-bold px-4 py-2 rounded text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* TOP SUMMARY METRICS GRID (4 Cards) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Vergo Confirmed Net Revenue */}
        <div className="admin-card p-6 border-l-4 border-l-[#00FF9D] flex flex-col justify-between min-h-40">
          <div>
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase">CONFIRMED VERGO REVENUE</h4>
              <span className="bg-[#00FF9D]/15 text-[#00FF9D] text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                PRODUCT SHARE
              </span>
            </div>
            <div className="text-3xl font-extrabold mt-3 text-[#00FF9D] font-mono-meta">
              Rs. {summary.vergoConfirmedNetIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-[11px] text-[#8e8e93] font-medium mt-3">
            Product item sales from Bank Transfers + Delivered COD orders.
          </p>
        </div>

        {/* Card 2: Confirmed COD Income (Delivered Only) */}
        <div className="admin-card p-6 border-l-4 border-l-[#10b981] flex flex-col justify-between min-h-40">
          <div>
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase">CONFIRMED COD INCOME</h4>
              <span className="bg-[#10b981]/15 text-[#10b981] text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                DELIVERED ONLY
              </span>
            </div>
            <div className="text-3xl font-extrabold mt-3 text-[#10b981] font-mono-meta">
              Rs. {summary.confirmedCodIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-[11px] text-[#8e8e93] font-medium mt-3">
            Received & confirmed COD product sales ({summary.totalDeliveredCodOrders} order(s)).
          </p>
        </div>

        {/* Card 3: Pending COD Income (In-Transit / Unconfirmed) */}
        <div className="admin-card p-6 border-l-4 border-l-[#f59e0b] flex flex-col justify-between min-h-40">
          <div>
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase">PENDING COD INCOME</h4>
              <span className="bg-[#f59e0b]/15 text-[#f59e0b] text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                AWAITING RECEIPT
              </span>
            </div>
            <div className="text-3xl font-extrabold mt-3 text-[#f59e0b] font-mono-meta">
              Rs. {summary.pendingCodIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-[11px] text-[#8e8e93] font-medium mt-3">
            In-transit COD orders ({summary.totalPendingCodOrders} order(s)). Unconfirmed until customer receives parcel.
          </p>
        </div>

        {/* Card 4: Citypak Remittance Payable from Bank Transfers */}
        <div className="admin-card p-6 border-l-4 border-l-[#a855f7] flex flex-col justify-between min-h-40">
          <div>
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase">PAYABLE TO CITYPAK</h4>
              <span className="bg-[#a855f7]/15 text-[#a855f7] text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                BANK REMITTANCE
              </span>
            </div>
            <div className="text-3xl font-extrabold mt-3 text-[#a855f7] font-mono-meta">
              Rs. {summary.citypakPayableFromBankTransfers.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-[11px] text-[#8e8e93] font-medium mt-3">
            Courier delivery fees collected in Vergo bank account to transfer to Citypak.
          </p>
        </div>
      </section>

      {/* SECONDARY FINANCIAL HIGHLIGHTS (3 Grid Cards) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Highlight 1: Bank Transfer Total Breakdown */}
        <div className="admin-card p-6 border border-[#3b82f6]/20 bg-gradient-to-r from-[#3b82f6]/5 to-transparent">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#3b82f6]">
              BANK TRANSFER RECEIPTS TOTAL
            </span>
            <span className="bg-[#3b82f6]/20 text-[#3b82f6] text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
              DEPOSITED IN VERGO BANK
            </span>
          </div>
          <div className="text-2xl font-extrabold mt-3 text-white font-mono-meta">
            Rs. {summary.bankTransferTotalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#8e8e93] mt-2 space-y-1 font-mono-meta">
            <div className="flex justify-between">
              <span>Product Share (Vergo):</span>
              <span className="text-white font-bold">Rs. {summary.bankTransferProductIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Courier Fee (Transfer to Citypak):</span>
              <span className="text-[#a855f7] font-bold">Rs. {summary.bankTransferCourierFees.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Highlight 2: Citypak Total Courier Pool */}
        <div className="admin-card p-6">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#8e8e93]">
              TOTAL CITYPAK COURIER FEES POOL
            </span>
            <span className="bg-white/10 text-white text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
              ALL ORDERS
            </span>
          </div>
          <div className="text-2xl font-extrabold mt-3 text-[#a855f7] font-mono-meta">
            Rs. {summary.citypakCourierFeesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#8e8e93] mt-2 space-y-1 font-mono-meta">
            <div className="flex justify-between">
              <span>Vergo Bank Remittance:</span>
              <span className="text-[#a855f7] font-bold">Rs. {summary.citypakPayableFromBankTransfers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Doorstep COD Collection:</span>
              <span className="text-white font-bold">Rs. {summary.codCourierFeesDirect.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Highlight 3: COD Return & Refund Deductions */}
        <div className="admin-card p-6 border border-[#ef4444]/20 bg-gradient-to-r from-[#ef4444]/5 to-transparent">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#ef4444]">
              COD RETURN & REFUND DEDUCTIONS
            </span>
            <span className="bg-[#ef4444]/20 text-[#ef4444] text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
              SYSTEM DEDUCTION
            </span>
          </div>
          <div className="text-2xl font-extrabold mt-3 text-[#ef4444] font-mono-meta">
            - Rs. {summary.returnedCodDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#8e8e93] mt-2 leading-relaxed">
            Deducted for returned or cancelled COD parcels ({summary.totalReturnedOrders} order(s)). Product income is never recognized for returned COD orders.
          </p>
        </div>
      </section>

      {/* FINANCIAL LEDGER TABLE SECTION */}
      <section className="admin-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-3 border-b border-[rgba(255,255,255,0.05)]">
          <div>
            <h3 className="text-xs font-bold tracking-widest uppercase text-white">
              FINANCIAL ORDERS LEDGER & REMITTANCE LOG
            </h3>
            <p className="text-[10px] text-[#8e8e93] mt-0.5">
              Itemized ledger showing product share, courier fee split, COD confirmation status, and Citypak bank remittance requirement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search order ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#121215] border border-[rgba(255,255,255,0.08)] text-white text-xs rounded px-3 py-1.5 focus:outline-none focus:border-white/30 w-48 md:w-60"
              />
            </div>

            {/* Payment Channel Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-[#121215] border border-[rgba(255,255,255,0.08)] text-white text-xs rounded px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">All Payment Methods</option>
              <option value="bank">Bank Transfer</option>
              <option value="cod">Cash On Delivery</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#121215] border border-[rgba(255,255,255,0.08)] text-white text-xs rounded px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed / Paid</option>
              <option value="pending">Pending COD Delivery</option>
              <option value="returned">Returned / Cancelled</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto custom-scrollbar">
          {filteredLedger.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8e8e93]">
              No financial records match the specified filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.04)] text-[#8e8e93]">
                  <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">ORDER / CUSTOMER</th>
                  <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">PAYMENT CHANNEL</th>
                  <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">VERGO PRODUCT SHARE</th>
                  <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">CITYPAK COURIER FEE</th>
                  <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">CITYPAK REMITTANCE</th>
                  <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase">COD CONFIRMATION</th>
                  <th className="pb-3 pt-1 font-bold tracking-wider text-[9px] uppercase text-right">RECOGNIZED REVENUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                {filteredLedger.map((row) => (
                  <tr key={row.orderId} className={`hover:bg-white/[0.01] transition-all ${row.isReturnedOrCancelled ? "bg-[#ef4444]/[0.02]" : ""}`}>
                    {/* Order / Customer */}
                    <td className="py-3.5 pr-3">
                      <div className="font-bold text-white font-mono-meta">{row.displayId}</div>
                      <div className="text-[10px] text-[#8e8e93] font-medium">{row.customerName}</div>
                      <div className="text-[9px] text-[#555] font-mono-meta mt-0.5">
                        {row.orderDate ? new Date(row.orderDate).toLocaleString() : "N/A"}
                      </div>
                    </td>

                    {/* Payment Channel */}
                    <td className="py-3.5 pr-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide border uppercase ${
                        row.isBank
                          ? "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30"
                          : "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30"
                      }`}>
                        {row.paymentMethod}
                      </span>
                    </td>

                    {/* Vergo Product Share */}
                    <td className="py-3.5 pr-3 font-mono-meta font-bold text-white">
                      Rs. {row.productAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Citypak Courier Fee */}
                    <td className="py-3.5 pr-3 font-mono-meta text-[#a855f7]">
                      Rs. {row.deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Citypak Remittance Obligation */}
                    <td className="py-3.5 pr-3 font-mono-meta">
                      {row.isBank ? (
                        <span className="text-[#a855f7] font-bold bg-[#a855f7]/10 px-2 py-0.5 rounded border border-[#a855f7]/30 text-[10px] inline-block">
                          Transfer to Citypak: Rs. {row.deliveryFee.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[#8e8e93] text-[10px] italic">
                          Collected Doorstep by Citypak
                        </span>
                      )}
                    </td>

                    {/* COD Confirmation Status */}
                    <td className="py-3.5 pr-3">
                      {row.isBank ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30 uppercase">
                          UPFRONT PAID
                        </span>
                      ) : row.codStatus === "CONFIRMED" ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30 uppercase flex items-center gap-1 w-max">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                          CONFIRMED (DELIVERED)
                        </span>
                      ) : row.codStatus === "PENDING" ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30 uppercase flex items-center gap-1 w-max">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
                          PENDING DELIVERY
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30 uppercase">
                          RETURNED / CANCELLED
                        </span>
                      )}
                    </td>

                    {/* Recognized Revenue */}
                    <td className="py-3.5 text-right font-mono-meta font-extrabold">
                      {row.isReturnedOrCancelled ? (
                        <span className="text-[#ef4444] inline-flex flex-col items-end">
                          <span>Rs. 0.00</span>
                          <span className="text-[8.5px] text-[#ef4444]/70 font-normal">(-Rs. {row.productAmount.toLocaleString()} Deducted)</span>
                        </span>
                      ) : row.codStatus === "PENDING" ? (
                        <span className="text-[#f59e0b] inline-flex flex-col items-end">
                          <span>Rs. 0.00</span>
                          <span className="text-[8.5px] text-[#f59e0b]/70 font-normal">(Rs. {row.productAmount.toLocaleString()} Pending)</span>
                        </span>
                      ) : (
                        <span className="text-[#00FF9D]">
                          Rs. {row.recognizedProductIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
