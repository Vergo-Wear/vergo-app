"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function BrandStatement() {
  const [data, setData] = useState({
    badge: "THE ARCHIVAL MANIFESTO",
    title: "BUILT FOR THE STREETS. ENGINEERED FOR LONGEVITY.",
    description:
      "Since day one, VERGO has challenged the disposable rhythm of fast fashion. We engineer heavyweight streetwear crafted from custom-milled organic yarn, reinforced structural silhouettes, and decentralized ownership verification.",
    foundingYear: "2024",
    origin: "Colombo, Sri Lanka",
    missionTitle: "OUR ATELIER MISSION",
    missionDescription:
      "VERGO was established with a singular obsession: to eliminate disposable fashion culture. Every silhouette is designed from scratch, custom knitted with heavy 280 GSM combed cotton yarn, and verified individually so collectors know exactly what they hold.",
  });

  useEffect(() => {
    const loadData = () => {
      fetch(`${API_URL}/customization?t=${Date.now()}`, { cache: "no-store" })
        .then((res) => {
          if (res.ok) return res.json();
        })
        .then((json) => {
          if (json) {
            setData((prev) => ({
              badge: json.brandStatementBadge ? json.brandStatementBadge.toUpperCase() : prev.badge,
              title: json.brandStatementTitle ? json.brandStatementTitle.toUpperCase() : prev.title,
              description: json.brandStatementDescription || prev.description,
              foundingYear: json.brandFoundingYear || prev.foundingYear,
              origin: json.brandOrigin || prev.origin,
              missionTitle: json.brandMissionTitle ? json.brandMissionTitle.toUpperCase() : prev.missionTitle,
              missionDescription: json.brandMissionDescription || prev.missionDescription,
            }));
          }
        })
        .catch(() => undefined);
    };

    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("vergo_customization_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("vergo_customization_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return (
    <section id="story" className="w-full bg-[#020202] border-t border-b border-[rgba(255,255,255,0.08)] py-28 px-6 sm:px-12 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-[#50C878]/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto space-y-20 relative z-10">
        {/* Top Split Manifesto */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Story */}
          <div className="lg:col-span-7 flex flex-col items-start gap-6 text-left">
            <div className="inline-flex items-center gap-2.5">
              <span className="w-5 h-0.5 bg-[#50C878]" />
              <span className="text-xs font-black tracking-[0.25em] text-[#50C878] uppercase">
                {data.badge}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase leading-[1.05]">
              {data.title}
            </h2>

            <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed font-light max-w-xl">
              {data.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 w-full">
              <div className="border-l-2 border-[#50C878] pl-4 space-y-1">
                <span className="text-xs font-black uppercase text-white tracking-wider">ESTABLISHED {data.foundingYear}</span>
                <p className="text-xs text-[#8e8e93] leading-normal">
                  Founded in {data.origin} as an independent luxury atelier bridging brutalism and islandwear.
                </p>
              </div>

              <div className="border-l-2 border-[#50C878] pl-4 space-y-1">
                <span className="text-xs font-black uppercase text-white tracking-wider">ANTI-DISPOSABLE PHILOSOPHY</span>
                <p className="text-xs text-[#8e8e93] leading-normal">
                  Every silhouette is engineered with structural tension points to last for years, not seasons.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <Link
                href="/collection"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded bg-white text-black hover:bg-[#50C878] transition-all font-black text-xs tracking-[0.18em] uppercase shadow-lg shadow-black/50"
              >
                <span>EXPLORE THE ATELIER ARCHIVE</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Showcase Images */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl">
              <img
                src="https://res.cloudinary.com/aql7sojg/image/upload/v1788961916/products/k5cwxe5syiy2nxfncbls.jpg"
                alt="VERGO Archival Heavyweight Garment"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#50C878]">ARCHIVAL SILHOUETTE</span>
                  <h3 className="text-lg font-black text-white uppercase">280 GSM Heavyweight Drop</h3>
                </div>
              </div>
            </div>

            {/* Overlapping Detail Card */}
            <div className="hidden sm:block absolute -bottom-6 -left-6 bg-[#0e0e12] border border-white/10 rounded-lg p-4 shadow-2xl max-w-[220px]">
              <span className="text-[9px] font-black uppercase text-[#8e8e93] tracking-widest block mb-1">ATELIER PROVENANCE</span>
              <span className="text-xs font-black text-white block">VERGO LABS / {data.origin}</span>
              <span className="text-[10px] text-[#50C878] font-mono mt-1 block">FOUNDED {data.foundingYear}</span>
            </div>
          </div>
        </div>

        {/* Mission Banner Card */}
        {data.missionDescription && (
          <div className="p-8 sm:p-10 rounded-2xl bg-[#070709] border border-[rgba(255,255,255,0.08)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 space-y-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#50C878] uppercase">CORE OBJECTIVE</span>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">{data.missionTitle}</h3>
            </div>
            <div className="lg:col-span-8">
              <p className="text-sm sm:text-base text-[#a1a1aa] font-light leading-relaxed">
                {data.missionDescription}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
