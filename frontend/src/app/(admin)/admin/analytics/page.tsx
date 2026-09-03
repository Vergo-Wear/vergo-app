"use client";

import { useMemo } from "react";
import { useAdmin } from "../AdminContext";

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

  const cards = [
    { label: "Completed Units", value: stats.completedUnits, tone: "text-[#10b981]" },
    { label: "Total Stock Units", value: analytics.totalStock, tone: "text-white" },
    { label: "Active Staff", value: stats.activeStaff, tone: "text-[#3b82f6]" },
    { label: "Pending Shipments", value: stats.pendingShipments, tone: "text-[#f59e0b]" },
  ];

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

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((card) => (
          <div key={card.label} className="admin-card p-6 min-h-32">
            <p className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-widest">
              {card.label}
            </p>
            <p className={`text-3xl font-bold mt-4 font-mono-meta ${card.tone}`}>
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="admin-card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">
                Stock Distribution
              </h3>
              <p className="text-[10px] text-[#8e8e93] mt-1 uppercase">
                Units currently available by inventory node
              </p>
            </div>
            <span className="text-[10px] text-[#8e8e93] font-mono-meta">
              {stats.activeNodes} ACTIVE NODES
            </span>
          </div>

          {analytics.stockByNode.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#555] uppercase tracking-widest">
              No inventory data available
            </div>
          ) : (
            <div className="space-y-5">
              {analytics.stockByNode.map((node) => (
                <div key={node.node}>
                  <div className="flex justify-between text-[10px] mb-2">
                    <span className="text-white font-bold font-mono-meta">
                      {node.node}
                    </span>
                    <span className="text-[#8e8e93]">
                      {node.units.toLocaleString()} units · {node.items} items
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${percentage(node.units, maxNodeStock)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card p-6">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">
            Operational Health
          </h3>
          <div className="space-y-7">
            <HealthMetric label="Inventory Health" value={inventoryHealth} />
            <HealthMetric label="Staff Availability" value={staffAvailability} />
            <HealthMetric
              label="Alert-Free Inventory"
              value={percentage(inventory.length - alerts.length, inventory.length)}
            />
          </div>
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

      <section className="admin-card overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">
                Customer Distribution
              </h3>
              <p className="text-[10px] text-[#8e8e93] mt-1 uppercase">
                Unique customers grouped by their latest order shipping address
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DistributionSummary label="Customers" value={databaseAnalytics.customerSummary.totalCustomers} />
              <DistributionSummary label="Districts" value={databaseAnalytics.customerSummary.districts} />
              <DistributionSummary label="Cities" value={databaseAnalytics.customerSummary.cities} />
              <DistributionSummary label="Orders Covered" value={databaseAnalytics.customerSummary.coveredOrders} />
            </div>
          </div>
        </div>

        {databaseAnalytics.customerDistribution.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#555] uppercase tracking-widest">
            No shipping distribution data available
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-[#121212] text-[9px] text-[#8e8e93] uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-3">District</th>
                  <th className="px-6 py-3">City</th>
                  <th className="px-6 py-3 text-right">Customers</th>
                  <th className="px-6 py-3 text-right">Distribution</th>
                  <th className="px-6 py-3 text-right">Orders</th>
                  <th className="px-6 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {databaseAnalytics.customerDistribution.map((location) => (
                  <tr key={`${location.district}-${location.city}`} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-white font-semibold">{location.district}</td>
                    <td className="px-6 py-4 text-[#8e8e93]">{location.city}</td>
                    <td className="px-6 py-4 text-right text-white font-mono-meta">{location.customers}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-[#3b82f6]" style={{ width: `${location.percentage}%` }} />
                        </div>
                        <span className="w-12 text-[#3b82f6] font-mono-meta">{location.percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-white font-mono-meta">{location.orders}</td>
                    <td className="px-6 py-4 text-right text-[#10b981] font-mono-meta">
                      LKR {location.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">
            Alert Breakdown
          </h3>
          <span className="text-[10px] text-[#8e8e93] uppercase">
            {adminAlerts.length} total events
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlertMetric label="Critical" value={analytics.criticalAlerts} color="bg-[#ef4444]" />
          <AlertMetric label="Warning" value={analytics.warningAlerts} color="bg-[#f59e0b]" />
          <AlertMetric label="Information" value={analytics.infoAlerts} color="bg-[#3b82f6]" />
        </div>
      </section>
    </div>
  );
}

function DistributionSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#121212] border border-white/5 rounded px-4 py-3 min-w-28">
      <p className="text-[8px] text-[#555] uppercase tracking-widest">{label}</p>
      <p className="text-lg text-white font-bold font-mono-meta mt-1">
        {value.toLocaleString()}
      </p>
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

function AlertMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-[#121212] border border-white/5 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-[10px] text-[#8e8e93] uppercase tracking-widest">
          {label}
        </span>
      </div>
      <span className="text-lg text-white font-bold font-mono-meta">{value}</span>
    </div>
  );
}
