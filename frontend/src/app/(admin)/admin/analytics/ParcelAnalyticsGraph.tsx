"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  period: { from: string; to: string };
  metrics: {
    pickedFmScans: number;
    undeliveredUd: number;
    inTransit: number;
    outForDelivery: number;
    completed: number;
    deliveredDl: number;
    returnedRtm: number;
    toBeReturnedRt: number;
  };
  shipmentBreakdown: Array<{ name: string; value: number; color: string }>;
  performanceSeries: Array<{ date: string; DL: number; RTM: number; UD: number; RT: number }>;
}

interface ParcelAnalyticsGraphProps {
  showMetrics?: boolean;
  showCharts?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ParcelAnalyticsGraph({
  showMetrics = true,
  showCharts = true,
}: ParcelAnalyticsGraphProps) {
  const [fromDate, setFromDate] = useState("2026-08-01");
  const [toDate, setToDate] = useState("2026-08-31");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    const token = sessionStorage.getItem("vergo_access_token");
    try {
      const res = await fetch(`${API_URL}/admin/parcel-analytics?from=${fromDate}&to=${toDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const body = await res.json();
        setData(body);
      }
    } catch (err) {
      console.error("Failed to load parcel analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const metrics = data?.metrics || {
    pickedFmScans: 0,
    undeliveredUd: 0,
    inTransit: 0,
    outForDelivery: 0,
    completed: 0,
    deliveredDl: 0,
    returnedRtm: 0,
    toBeReturnedRt: 0,
  };

  const totalBreakdown = (data?.shipmentBreakdown || []).reduce((acc, item) => acc + item.value, 0) || 1;

  return (
    <div className="bg-[#0c0c0e] text-white rounded-2xl p-4 sm:p-6 border border-white/5 my-5">
      {/* Date Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end mb-6">
        <div className="bg-[#121215] p-2.5 sm:px-4 rounded-xl border border-white/10 flex-1">
          <label className="block text-[11px] font-bold text-[#8e8e93] mb-1 uppercase tracking-wider">Period From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full border-none outline-none text-xs sm:text-sm font-bold text-white bg-transparent [color-scheme:dark]"
          />
        </div>

        <div className="bg-[#121215] p-2.5 sm:px-4 rounded-xl border border-white/10 flex-1">
          <label className="block text-[11px] font-bold text-[#8e8e93] mb-1 uppercase tracking-wider">Period To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full border-none outline-none text-xs sm:text-sm font-bold text-white bg-transparent [color-scheme:dark]"
          />
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="bg-[#00ff9d] hover:bg-[#00e68d] active:scale-95 text-[#060608] rounded-xl px-6 py-3 font-black text-xs uppercase tracking-wider cursor-pointer transition-all shadow-[0_0_12px_rgba(0,255,157,0.2)] disabled:opacity-50"
        >
          {loading ? "FILTERING..." : "FILTER"}
        </button>
      </div>

      {/* Metric Cards Top Row */}
      {showMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Picked (FM Scans) */}
          <div className="bg-[#121215] rounded-xl p-5 border border-white/5 text-center flex flex-col items-center justify-center">
            <div style={{ background: "rgba(14, 165, 233, 0.15)", color: "#0ea5e9", border: "1px solid rgba(14, 165, 233, 0.3)", width: "48px", height: "48px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 3H8L6 7h12l-2-4z" />
              </svg>
            </div>
            <div style={{ fontSize: "32px", fontWeight: "900", color: "#ffffff", fontFamily: "monospace" }}>{metrics.pickedFmScans}</div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#8e8e93", marginTop: "4px", textTransform: "uppercase" }}>Picked (FM Scans)</div>
          </div>

          {/* Hierarchy Card 2: Undelivered (UD) & Sub-nodes */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="bg-[#121215] rounded-xl p-4 sm:px-6 border border-white/5 mb-3 flex items-center justify-between">
              <div style={{ background: "rgba(234, 179, 8, 0.15)", color: "#eab308", border: "1px solid rgba(234, 179, 8, 0.3)", width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: "900", color: "#ffffff", fontFamily: "monospace" }}>{metrics.undeliveredUd}</span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#8e8e93", textTransform: "uppercase" }}>Undelivered (UD)</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#16161a] rounded-lg p-3 border border-white/5 flex items-center gap-3">
                <div style={{ background: "rgba(234, 179, 8, 0.12)", color: "#eab308", width: "34px", height: "34px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
                <div className="min-w-0">
                  <div style={{ fontSize: "18px", fontWeight: "900", color: "#ffffff", fontFamily: "monospace" }}>{metrics.inTransit}</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#8e8e93", textTransform: "uppercase" }} className="truncate">In Transit</div>
                </div>
              </div>
              <div className="bg-[#16161a] rounded-lg p-3 border border-white/5 flex items-center gap-3">
                <div style={{ background: "rgba(234, 179, 8, 0.12)", color: "#eab308", width: "34px", height: "34px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
                <div className="min-w-0">
                  <div style={{ fontSize: "18px", fontWeight: "900", color: "#ffffff", fontFamily: "monospace" }}>{metrics.outForDelivery}</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#8e8e93", textTransform: "uppercase" }} className="truncate">Out Delivery</div>
                </div>
              </div>
            </div>
          </div>

          {/* Hierarchy Card 3: Completed & Sub-nodes */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="bg-[#121215] rounded-xl p-4 sm:px-6 border border-white/5 mb-3 flex items-center justify-between">
              <div style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.3)", width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: "900", color: "#ffffff", fontFamily: "monospace" }}>{metrics.completed}</span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#8e8e93", textTransform: "uppercase" }}>Completed</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#16161a] rounded-lg p-3 border border-white/5 flex items-center gap-3">
                <div style={{ background: "rgba(34, 197, 94, 0.12)", color: "#22c55e", width: "34px", height: "34px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="min-w-0">
                  <div style={{ fontSize: "18px", fontWeight: "900", color: "#ffffff", fontFamily: "monospace" }}>{metrics.deliveredDl}</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#8e8e93", textTransform: "uppercase" }} className="truncate">Delivered</div>
                </div>
              </div>
              <div className="bg-[#16161a] rounded-lg p-3 border border-white/5 flex items-center gap-3">
                <div style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", width: "34px", height: "34px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
                <div className="min-w-0">
                  <div style={{ fontSize: "18px", fontWeight: "900", color: "#ffffff", fontFamily: "monospace" }}>{metrics.returnedRtm}</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#8e8e93", textTransform: "uppercase" }} className="truncate">Returned</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: To Be Returned (RT) */}
          <div className="bg-[#121215] rounded-xl p-5 border border-white/5 text-center flex flex-col items-center justify-center">
            <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", width: "48px", height: "48px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </div>
            <div style={{ fontSize: "32px", fontWeight: "900", color: "#ffffff", fontFamily: "monospace" }}>{metrics.toBeReturnedRt}</div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#8e8e93", marginTop: "4px", textTransform: "uppercase" }}>To Be Returned (RT)</div>
          </div>
        </div>
      )}

      {/* Bottom Row Charts: Shipment Breakdown & Delivery Performance (DL) */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Chart: Shipment breakdown */}
          <div className="bg-[#121215] rounded-2xl p-4 sm:p-6 border border-white/5">
            <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "20px" }}>Shipment Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "20px" }}>
              {(data?.shipmentBreakdown || []).map((item) => {
                const pct = Number(((item.value / totalBreakdown) * 100).toFixed(1));
                return (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "#a1a1aa" }}>{item.name}</span>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: "#ffffff", fontFamily: "monospace" }}>{item.value} ({pct}%)</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Chart: Delivery Performance (DL) */}
          <div className="bg-[#121215] rounded-2xl p-4 sm:p-6 border border-white/5 lg:col-span-2">
            <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "20px" }}>Delivery Performance (DL)</h3>
            <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "10px", overflowX: "auto" }}>
              {(data?.performanceSeries || []).length === 0 ? (
                <div style={{ width: "100%", textAlign: "center", color: "#8e8e93", fontSize: "12px", alignSelf: "center" }}>No delivery performance data recorded for this range.</div>
              ) : (
                (data?.performanceSeries || []).map((point) => (
                  <div key={point.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: "32px" }}>
                    <div style={{ background: "#00ff9d", width: "100%", maxWidth: "24px", height: `${Math.max(16, point.DL * 30)}px`, borderRadius: "4px 4px 0 0", boxShadow: "0 0 10px rgba(0, 255, 157, 0.3)" }} />
                    <span style={{ fontSize: "10px", color: "#8e8e93", marginTop: "8px", fontFamily: "monospace" }}>{point.date.slice(5)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
