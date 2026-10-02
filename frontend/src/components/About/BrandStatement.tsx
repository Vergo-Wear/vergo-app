"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function BrandStatement() {
  const [badge, setBadge] = useState("THE ARCHIVAL MANIFESTO");
  const [title, setTitle] = useState("BUILT FOR THE STREETS. ENGINEERED FOR LONGEVITY.");
  const [description, setDescription] = useState(
    "Since day one, VERGO has challenged the disposable rhythm of fast fashion. We engineer heavyweight streetwear crafted from custom-milled organic yarn, reinforced structural silhouettes, and decentralized ownership verification."
  );

  useEffect(() => {
    fetch(`${API_URL}/customization`)
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.brandStatementBadge) setBadge(data.brandStatementBadge.toUpperCase());
          if (data.brandStatementTitle) setTitle(data.brandStatementTitle.toUpperCase());
          if (data.brandStatementDescription) setDescription(data.brandStatementDescription);
        }
      })
      .catch(() => undefined);
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
                {badge}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase leading-[1.05]">
              {title}
            </h2>

            <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed font-light max-w-xl">
              {description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 w-full">
              <div className="border-l-2 border-[#50C878] pl-4 space-y-1">
                <span className="text-xs font-black uppercase text-white tracking-wider">ETHICAL FOUNDRY</span>
                <p className="text-xs text-[#8e8e93] leading-normal">
                  Crafted strictly in fair-wage ateliers in Sri Lanka with certified organic combed yarn.
                </p>
              </div>

              <div className="border-l-2 border-[#50C878] pl-4 space-y-1">
                <span className="text-xs font-black uppercase text-white tracking-wider">ANTI-OBSOLESCENCE</span>
                <p className="text-xs text-[#8e8e93] leading-normal">
                  Built to withstand 100+ wash cycles without torquing, collar sagging, or color bleed.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <Link
                href="/collection"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded bg-white text-black hover:bg-[#50C878] transition-all font-black text-xs tracking-[0.18em] uppercase shadow-lg shadow-black/50"
              >
                <span>BROWSE THE EDIT</span>
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
              <span className="text-[9px] font-black uppercase text-[#8e8e93] tracking-widest block mb-1">PROVENANCE</span>
              <span className="text-xs font-black text-white block">VERGO LABS / DROP 01</span>
              <span className="text-[10px] text-[#50C878] font-mono mt-1 block">CRYPTOGRAPHICALLY VERIFIED</span>
            </div>
          </div>
        </div>

        {/* 4 Pillars of Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-10 border-t border-[rgba(255,255,255,0.06)]">
          <div className="p-6 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.08)] flex flex-col gap-2 hover:border-[#50C878]/40 transition-colors">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">280 GSM</span>
            <span className="text-[11px] font-black text-[#50C878] uppercase tracking-wider">Heavyweight Density</span>
            <span className="text-[12px] text-[#8e8e93] leading-relaxed">Custom milled yarn holds structure across washes without shrinking.</span>
          </div>

          <div className="p-6 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.08)] flex flex-col gap-2 hover:border-[#50C878]/40 transition-colors">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">100%</span>
            <span className="text-[11px] font-black text-[#50C878] uppercase tracking-wider">Combed Cotton</span>
            <span className="text-[12px] text-[#8e8e93] leading-relaxed">Long-staple organic fibers spun for structured breathability and skin comfort.</span>
          </div>

          <div className="p-6 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.08)] flex flex-col gap-2 hover:border-[#50C878]/40 transition-colors">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">1/1 SKU</span>
            <span className="text-[11px] font-black text-[#50C878] uppercase tracking-wider">Decentralized ID</span>
            <span className="text-[12px] text-[#8e8e93] leading-relaxed">Every piece holds an unforgeable identity in our digital inventory catalog.</span>
          </div>

          <div className="p-6 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.08)] flex flex-col gap-2 hover:border-[#50C878]/40 transition-colors">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">48 HRS</span>
            <span className="text-[11px] font-black text-[#50C878] uppercase tracking-wider">Citypak Dispatch</span>
            <span className="text-[12px] text-[#8e8e93] leading-relaxed">Door-to-door express delivery with SMS verification across Sri Lanka.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
