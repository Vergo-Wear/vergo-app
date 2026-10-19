"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdmin } from "../AdminContext";
import ParcelAnalyticsGraph from "./ParcelAnalyticsGraph";
import SriLankaCustomerMap from "./SriLankaCustomerMap";

const percentage = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

export default function AnalyticsPage() {
  const {
    inventory,
    employees,
    stats,
    analytics: databaseAnalytics,
    alerts,
    adminAlerts,
  } = useAdmin();

  const [earningsSummary, setEarningsSummary] = useState<any>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/admin/earnings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.summary) setEarningsSummary(data.summary);
      })
      .catch(() => null);
  }, []);

  const analytics = useMemo(() => {
    const totalStock = inventory.reduce((sum, item) => sum + item.inStock, 0);
    const healthyItems = inventory.filter(
      (item) => item.inStock > (item.reorderLevel || 0),
    ).length;
    const activeEmployees = employees.filter(
      (employee) => employee.status === "ON SHIFT",
    ).length;
    const criticalAlerts = adminAlerts.filter(
      (alert) => alert.severity === "critical",
    ).length;
    const warningAlerts = adminAlerts.filter(
      (alert) => alert.severity === "warning",
    ).length;
    const infoAlerts = adminAlerts.filter(
      (alert) => alert.severity === "info",
    ).length;

    const stockByNode = Object.values(
      inventory.reduce<Record<string, { node: string; units: number; items: number }>>(
        (nodes, item) => {
          const current = nodes[item.location] || {
            node: item.location,
            units: 0,
            items: 0,
          };
          current.units += item.inStock;
          current.items += 1;
          nodes[item.location] = current;
          return nodes;
        },
        {},
      ),
    ).sort((a, b) => b.units - a.units);

    return {
      totalStock,
      healthyItems,
      activeEmployees,
      criticalAlerts,
      warningAlerts,
      infoAlerts,
      stockByNode,
    };
  }, [adminAlerts, employees, inventory]);

  const maxNodeStock = Math.max(
    1,
    ...analytics.stockByNode.map((node) => node.units),
  );
  const inventoryHealth = percentage(analytics.healthyItems, inventory.length);
  const staffAvailability = percentage(
    analytics.activeEmployees,
    employees.length,
  );
  const forecast = databaseAnalytics.nextYearForecast;
  const maxForecastOrders = Math.max(
    1,
    ...forecast.monthly.map((month) => month.predictedOrders),
  );

  return (
    <div className="space-y-8 select-none">
      <div>
        <h2 className="text-xl font-bold tracking-widest text-white uppercase mb-2">
          Analytics
        </h2>
        <p className="text-xs text-[#8e8e93] font-medium tracking-wide">
          Live operational performance calculated from the admin database overview.
        </p>
      </div>

      {/* Shipment Breakdown & Delivery Performance (DL) Charts Only */}
      <ParcelAnalyticsGraph showMetrics={false} showCharts={true} />

      {/* Sri Lanka Customer Distribution Map */}
      <SriLankaCustomerMap />

      {/* Financial Income & Revenue Breakdown */}
      <section className="admin-card p-6 border-l-4 border-l-[#00FF9D]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-white/5">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">
              Financial Income & Revenue Breakdown
            </h3>
            <p className="text-[10px] text-[#8e8e93] mt-0.5">
              Net Vergo product sales vs. Citypak courier shipping fees.
            </p>
          </div>
          <Link
            href="/admin/earnings"
            className="text-xs font-bold text-[#00FF9D] hover:underline uppercase tracking-wider flex items-center gap-1"
          >
            <span>Full Earnings Page &rarr;</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-black/30 p-4 rounded-lg border border-white/5">
            <p className="text-[9px] font-bold text-[#8e8e93] uppercase tracking-widest">CONFIRMED VERGO REVENUE</p>
            <p className="text-2xl font-extrabold mt-2 text-[#00FF9D] font-mono-meta">
              Rs. {(earningsSummary?.vergoConfirmedNetIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-[#8e8e93] mt-1 font-medium">Bank + Delivered COD Product Sales</p>
          </div>

          <div className="bg-black/30 p-4 rounded-lg border border-white/5">
            <p className="text-[9px] font-bold text-[#8e8e93] uppercase tracking-widest">CONFIRMED COD REVENUE</p>
            <p className="text-2xl font-extrabold mt-2 text-[#10b981] font-mono-meta">
              Rs. {(earningsSummary?.confirmedCodIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-[#8e8e93] mt-1 font-medium">Delivered & Received COD</p>
          </div>

          <div className="bg-black/30 p-4 rounded-lg border border-white/5">
            <p className="text-[9px] font-bold text-[#8e8e93] uppercase tracking-widest">PENDING COD REVENUE</p>
            <p className="text-2xl font-extrabold mt-2 text-[#f59e0b] font-mono-meta">
              Rs. {(earningsSummary?.pendingCodIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-[#8e8e93] mt-1 font-medium">In-Transit (Awaiting Customer Receipt)</p>
          </div>

          <div className="bg-black/30 p-4 rounded-lg border border-white/5">
            <p className="text-[9px] font-bold text-[#8e8e93] uppercase tracking-widest">PAYABLE TO CITYPAK</p>
            <p className="text-2xl font-extrabold mt-2 text-[#a855f7] font-mono-meta">
              Rs. {(earningsSummary?.citypakPayableFromBankTransfers || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-[#8e8e93] mt-1 font-medium font-mono-meta">Bank Transfer Courier Fee Remittance</p>
          </div>
        </div>
      </section>

      {/* Operational Health */}
      <section className="admin-card p-6">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">
          Operational Health
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthMetric label="Inventory Health" value={inventoryHealth} />
          <HealthMetric label="Staff Availability" value={staffAvailability} />
          <HealthMetric
            label="Alert-Free Inventory"
            value={percentage(inventory.length - alerts.length, inventory.length)}
          />
        </div>
      </section>

      <section className="admin-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-7">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">
              {forecast.year} Prediction
            </h3>
            <p className="text-[10px] text-[#8e8e93] mt-1 uppercase max-w-3xl leading-relaxed">
              {forecast.methodology}
            </p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-[9px] text-[#555] uppercase tracking-widest">
                Predicted Orders
              </p>
              <p className="text-xl text-white font-bold font-mono-meta mt-1">
                {forecast.predictedOrders.toLocaleString()}
              </p>
              <p className={`text-[9px] mt-1 ${forecast.orderTrendPercent >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                {forecast.orderTrendPercent >= 0 ? "+" : ""}{forecast.orderTrendPercent}% trend
              </p>
            </div>
            <div>
              <p className="text-[9px] text-[#555] uppercase tracking-widest">
                Predicted Revenue
              </p>
              <p className="text-xl text-[#10b981] font-bold font-mono-meta mt-1">
                LKR {forecast.predictedRevenue.toLocaleString()}
              </p>
              <p className={`text-[9px] mt-1 ${forecast.revenueTrendPercent >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                {forecast.revenueTrendPercent >= 0 ? "+" : ""}{forecast.revenueTrendPercent}% trend
              </p>
            </div>
          </div>
        </div>

        {forecast.monthly.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#555] uppercase tracking-widest">
            No historical order data available for prediction
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-12 gap-3 items-end min-h-52">
            {forecast.monthly.map((month) => (
              <div key={month.month} className="flex flex-col justify-end h-full min-h-44">
                <div className="text-center mb-2">
                  <p className="text-xs text-white font-bold font-mono-meta">
                    {month.predictedOrders}
                  </p>
                  <p className="text-[8px] text-[#555] mt-1">
                    {Math.round(month.predictedRevenue / 1000)}K LKR
                  </p>
                </div>
                <div className="h-28 bg-white/[0.03] rounded-t flex items-end overflow-hidden">
                  <div
                    className="w-full bg-gradient-to-t from-[#10b981] to-[#34d399] rounded-t min-h-1"
                    style={{
                      height: `${percentage(month.predictedOrders, maxForecastOrders)}%`,
                    }}
                  />
                </div>
                <p className="text-[9px] text-[#8e8e93] text-center uppercase mt-2">
                  {new Date(`${month.month}-01T00:00:00Z`).toLocaleString("en", {
                    month: "short",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HealthMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-2 uppercase tracking-wider">
        <span className="text-[#8e8e93]">{label}</span>
        <span className="text-white font-bold">{value}%</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#10b981] rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
