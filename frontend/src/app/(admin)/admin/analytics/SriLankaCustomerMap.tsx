"use client";

import React, { useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "../../../../lib/authenticated-fetch";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DistrictData {
  district: string;
  province: string;
  ordersCount: number;
  totalRevenue: number;
  customerCount: number;
  percentage: number;
}

interface DistributionResponse {
  totalOrders: number;
  totalRevenueSum: number;
  districts: DistrictData[];
}

interface DistrictGpsCoordinate {
  district: string;
  province: string;
  lat: number;
  lng: number;
}

const SRI_LANKA_GPS_DISTRICTS: DistrictGpsCoordinate[] = [
  { district: "Colombo", province: "Western", lat: 6.9271, lng: 79.8612 },
  { district: "Gampaha", province: "Western", lat: 7.0840, lng: 79.9925 },
  { district: "Kalutara", province: "Western", lat: 6.5854, lng: 79.9607 },
  { district: "Kandy", province: "Central", lat: 7.2906, lng: 80.6337 },
  { district: "Matale", province: "Central", lat: 7.4675, lng: 80.6234 },
  { district: "Nuwara Eliya", province: "Central", lat: 6.9497, lng: 80.7891 },
  { district: "Galle", province: "Southern", lat: 6.0535, lng: 80.2210 },
  { district: "Matara", province: "Southern", lat: 5.9549, lng: 80.5550 },
  { district: "Hambantota", province: "Southern", lat: 6.1429, lng: 81.1212 },
  { district: "Jaffna", province: "Northern", lat: 9.6615, lng: 80.0255 },
  { district: "Kilinochchi", province: "Northern", lat: 9.3803, lng: 80.3770 },
  { district: "Mannar", province: "Northern", lat: 8.9810, lng: 79.9044 },
  { district: "Vavuniya", province: "Northern", lat: 8.7542, lng: 80.4982 },
  { district: "Mullaitivu", province: "Northern", lat: 9.2671, lng: 80.8142 },
  { district: "Batticaloa", province: "Eastern", lat: 7.7310, lng: 81.6747 },
  { district: "Ampara", province: "Eastern", lat: 7.2955, lng: 81.6747 },
  { district: "Trincomalee", province: "Eastern", lat: 8.5874, lng: 81.2152 },
  { district: "Kurunegala", province: "North Western", lat: 7.4863, lng: 80.3647 },
  { district: "Puttalam", province: "North Western", lat: 8.0362, lng: 79.8283 },
  { district: "Anuradhapura", province: "North Central", lat: 8.3114, lng: 80.4037 },
  { district: "Polonnaruwa", province: "North Central", lat: 7.9403, lng: 81.0188 },
  { district: "Badulla", province: "Uva", lat: 6.9934, lng: 81.0550 },
  { district: "Moneragala", province: "Uva", lat: 6.8728, lng: 81.3507 },
  { district: "Ratnapura", province: "Sabaragamuwa", lat: 6.6828, lng: 80.3992 },
  { district: "Kegalle", province: "Sabaragamuwa", lat: 7.2513, lng: 80.3464 },
];

export default function SriLankaCustomerMap() {
  const [data, setData] = useState<DistributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL");
  const [activeDistrict, setActiveDistrict] = useState<DistrictData | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const fetchDistribution = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/admin/customer-distribution");
      if (res && res.ok) {
        const body = await res.json();
        setData(body);
      }
    } catch (err) {
      console.error("Failed to load customer distribution map data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribution();
  }, []);

  const districts = data?.districts || [];
  const maxOrders = Math.max(1, ...districts.map((d) => d.ordersCount));

  const getDistrictData = (districtName: string): DistrictData => {
    const found = districts.find(
      (d) => d.district.toLowerCase() === districtName.toLowerCase()
    );
    return (
      found || {
        district: districtName,
        province: "Western",
        ordersCount: 0,
        totalRevenue: 0,
        customerCount: 0,
        percentage: 0,
      }
    );
  };

  // Initialize Leaflet Map with OpenStreetMap Tile Layer
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Sri Lanka coordinates [7.8731, 80.7718]
    const map = L.map(mapContainerRef.current, {
      center: [7.8731, 80.7718],
      zoom: 7,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
    const tileUrl = cartoKey
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

    // Dark-themed OpenStreetMap Carto Tile Layer with Registered API Key
    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Leaflet Markers when distribution data or province filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    SRI_LANKA_GPS_DISTRICTS.forEach((gps) => {
      const distInfo = getDistrictData(gps.district);

      if (
        selectedProvince !== "ALL" &&
        distInfo.province.toLowerCase() !== selectedProvince.toLowerCase()
      ) {
        return;
      }

      const orders = distInfo.ordersCount;
      const ratio = Math.min(1, orders / maxOrders);
      const radius = orders > 0 ? Math.max(12, 12 + ratio * 20) : 8;

      let color = "#3f3f46";
      let fillColor = "#27272a";
      if (orders > 0) {
        if (orders === maxOrders || ratio > 0.6) {
          color = "#00FF9D";
          fillColor = "rgba(0, 255, 157, 0.4)";
        } else if (ratio > 0.2) {
          color = "#3b82f6";
          fillColor = "rgba(59, 130, 246, 0.4)";
        } else {
          color = "#f59e0b";
          fillColor = "rgba(245, 158, 11, 0.4)";
        }
      }

      const circle = L.circleMarker([gps.lat, gps.lng], {
        radius,
        color,
        fillColor,
        fillOpacity: 0.8,
        weight: 2,
      });

      const popupHtml = `
        <div style="font-family: monospace; color: #ffffff; background: #0c0c0e; padding: 10px; border-radius: 8px; border: 1px solid ${color}; min-width: 180px;">
          <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #ffffff;">${distInfo.district}</div>
          <div style="font-size: 10px; color: #8e8e93; margin-bottom: 6px;">${distInfo.province} Province</div>
          <div style="font-size: 12px; font-weight: 700; color: #00FF9D;">${distInfo.ordersCount} Orders (${distInfo.percentage}%)</div>
          <div style="font-size: 11px; font-weight: 700; color: #ffffff;">Rs. ${distInfo.totalRevenue.toLocaleString()}</div>
          <div style="font-size: 10px; color: #8e8e93; margin-top: 4px;">${distInfo.customerCount} Registered Customer(s)</div>
        </div>
      `;

      circle.bindPopup(popupHtml, {
        className: "custom-leaflet-popup",
      });

      circle.on("mouseover", () => {
        circle.openPopup();
        setActiveDistrict(distInfo);
      });

      circle.on("click", () => {
        setActiveDistrict(distInfo);
      });

      circle.addTo(markersRef.current!);
    });
  }, [data, selectedProvince, maxOrders]);

  const filteredDistricts =
    selectedProvince === "ALL"
      ? districts
      : districts.filter((d) => d.province.toLowerCase() === selectedProvince.toLowerCase());

  const provincesList = ["ALL", "Western", "Central", "Southern", "Northern", "Eastern", "North Western", "North Central", "Uva", "Sabaragamuwa"];

  return (
    <div className="admin-card p-6 border-l-4 border-l-[#00FF9D]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-3 border-b border-[rgba(255,255,255,0.05)]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold tracking-widest uppercase text-white">
              OPENSTREETMAP SRI LANKA CUSTOMER DISTRIBUTION
            </h3>
            <span className="bg-[#00FF9D]/15 text-[#00FF9D] text-[9px] font-black px-2 py-0.5 rounded border border-[#00FF9D]/30 uppercase">
              OPENSTREETMAP TILE LAYER
            </span>
          </div>
          <p className="text-[10px] text-[#8e8e93] mt-0.5">
            Real-time OpenStreetMap tile map displaying customer density & order revenue across Sri Lanka's 25 districts.
          </p>
        </div>

        {/* Province Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {provincesList.map((prov) => (
            <button
              key={prov}
              onClick={() => setSelectedProvince(prov)}
              className={`text-[9.5px] font-extrabold px-2.5 py-1 rounded transition-all cursor-pointer uppercase ${
                selectedProvince === prov
                  ? "bg-[#00FF9D] text-black font-extrabold shadow-sm"
                  : "bg-[#121215] text-[#8e8e93] hover:text-white border border-white/5"
              }`}
            >
              {prov}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* LEFT COLUMN: OPENSTREETMAP LEAFLET CONTAINER */}
        <div className="lg:col-span-7 relative flex flex-col items-center justify-center bg-[#070709] p-3 rounded-xl border border-white/5 min-h-[460px]">
          {/* Map Sub-Header */}
          <div className="w-full flex justify-between items-center mb-2 px-2 text-[10px] font-bold text-[#8e8e93]">
            <span>OPENSTREETMAP SRI LANKA GRID</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00FF9D]" /> High Volume
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" /> Medium
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Low / Zero
              </span>
            </div>
          </div>

          {/* Leaflet OSM Canvas Container */}
          <div
            ref={mapContainerRef}
            className="w-full h-[400px] rounded-lg overflow-hidden border border-white/10 z-0 shadow-lg"
          />

          {/* Active District Info Bar */}
          {activeDistrict ? (
            <div className="w-full mt-3 bg-[#121216] border border-[#00FF9D]/40 p-3 rounded-lg flex items-center justify-between text-xs animate-fade-in">
              <div>
                <div className="font-extrabold text-white font-mono-meta text-sm flex items-center gap-2">
                  <span>{activeDistrict.district}</span>
                  <span className="text-[9px] bg-[#00FF9D]/15 text-[#00FF9D] font-extrabold px-1.5 py-0.5 rounded border border-[#00FF9D]/30 uppercase">
                    {activeDistrict.province} PROVINCE
                  </span>
                </div>
                <div className="text-[11px] text-[#8e8e93] mt-0.5">
                  {activeDistrict.customerCount} registered customer(s)
                </div>
              </div>

              <div className="text-right font-mono-meta">
                <div className="text-[#00FF9D] font-extrabold text-base">
                  {activeDistrict.ordersCount} Order(s) ({activeDistrict.percentage}%)
                </div>
                <div className="text-white text-[11px] font-bold">
                  Rs. {activeDistrict.totalRevenue.toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full mt-3 bg-[#121215]/60 border border-white/5 p-2 rounded-lg text-center text-[11px] text-[#8e8e93] italic">
              Hover over or click any OpenStreetMap district circle on Sri Lanka map to view district revenue & orders.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DISTRICT RANKINGS & MARKET SHARE LIST */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">
              SRI LANKA DISTRICT RANKINGS
            </h4>
            <span className="text-[10px] text-[#8e8e93] font-mono-meta">
              {filteredDistricts.length} District(s) Listed
            </span>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {filteredDistricts.map((item, index) => {
              const barWidth = Math.max(3, (item.ordersCount / maxOrders) * 100);
              return (
                <div
                  key={item.district}
                  className="bg-[#121215] p-3 rounded-lg border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                  onClick={() => setActiveDistrict(item)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-white/5 text-[10px] font-extrabold text-[#8e8e93] flex items-center justify-center font-mono-meta">
                        {index + 1}
                      </span>
                      <div>
                        <span className="font-extrabold text-white text-xs font-mono-meta">
                          {item.district}
                        </span>
                        <span className="text-[9.5px] text-[#8e8e93] ml-2 font-medium">
                          ({item.province})
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono-meta">
                      <span className="text-[#00FF9D] font-extrabold text-xs mr-2">
                        {item.ordersCount} Orders
                      </span>
                      <span className="text-white font-bold text-xs">
                        Rs. {item.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Visual Density Progress Bar */}
                  <div className="w-full bg-[#1c1c22] h-2 rounded-full overflow-hidden flex items-center">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        index === 0
                          ? "bg-gradient-to-r from-[#00FF9D] to-[#10b981]"
                          : index < 3
                          ? "bg-[#3b82f6]"
                          : "bg-[#8e8e93]"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
