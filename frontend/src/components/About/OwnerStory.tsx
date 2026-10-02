"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function OwnerStory() {
  const [data, setData] = useState({
    ownerBadge: "CREATIVE DIRECTION & LEADERSHIP",
    ownerTitle: "THE VISION BEHIND VERGO",
    ownerSubtitle: "Bridging architectural brutalism with elevated Sri Lankan textile craftsmanship.",
    ownerName: "FOUNDER & ATELIER LEAD",
    ownerRole: "Creative Director & Founder",
    ownerBio:
      "Founded in Colombo, VERGO began as an experimental textile studio committed to producing uncompromising streetwear. Rejecting fast production and generic blanks, our creative direction prioritizes heavy draping, archival durability, and transparent small-batch production that elevates South Asian streetwear on the global stage.",
    ownerQuote:
      '"Streetwear is not merely graphic application on fabric; it is structural architecture you live inside. We build garments that outlive seasonal hype."',
    ownerImageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
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
              ownerBadge: json.ownerBadge || prev.ownerBadge,
              ownerTitle: json.ownerTitle || prev.ownerTitle,
              ownerSubtitle: json.ownerSubtitle || prev.ownerSubtitle,
              ownerName: json.ownerName || prev.ownerName,
              ownerRole: json.ownerRole || prev.ownerRole,
              ownerBio: json.ownerBio || prev.ownerBio,
              ownerQuote: json.ownerQuote || prev.ownerQuote,
              ownerImageUrl: json.ownerImageUrl || prev.ownerImageUrl,
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
    <section className="w-full bg-[#050507] border-b border-[rgba(255,255,255,0.08)] py-28 px-6 sm:px-12 relative overflow-hidden">
      {/* Background Subtle Gradient */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-[#50C878]/5 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#50C878]/10 border border-[#50C878]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#50C878] shadow-[0_0_8px_#50C878]" />
            <span className="text-[11px] font-black tracking-[0.25em] text-[#50C878] uppercase">
              {data.ownerBadge}
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            {data.ownerTitle}
          </h2>
          {data.ownerSubtitle && (
            <p className="text-sm sm:text-base text-[#a1a1aa] font-light leading-relaxed">
              {data.ownerSubtitle}
            </p>
          )}
        </div>

        {/* Founder Card Spotlight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Owner Image */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#09090b]">
              <img
                src={data.ownerImageUrl}
                alt={data.ownerName}
                className="w-full h-full object-cover object-center filter grayscale contrast-110 hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-transparent opacity-80" />

              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-[#09090b]/80 backdrop-blur-md border border-white/10">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#50C878] uppercase block">
                  {data.ownerRole}
                </span>
                <h3 className="text-lg font-black text-white uppercase tracking-wide mt-0.5">
                  {data.ownerName}
                </h3>
              </div>
            </div>
          </div>

          {/* Owner Bio and Philosophy */}
          <div className="lg:col-span-7 flex flex-col items-start gap-8 text-left">
            <div className="space-y-4">
              <span className="text-[10px] font-black tracking-[0.25em] text-[#8e8e93] uppercase block">
                ATELIER PHILOSOPHY & LEADERSHIP
              </span>
              <p className="text-base sm:text-lg text-[#e4e4e7] leading-relaxed font-light">
                {data.ownerBio}
              </p>
            </div>

            {/* Quote Block */}
            {data.ownerQuote && (
              <div className="w-full p-6 sm:p-8 rounded-xl bg-[#09090b] border-l-4 border-[#50C878] border-r border-t border-b border-white/5 relative">
                <svg
                  className="w-8 h-8 text-[#50C878]/30 absolute top-4 right-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-sm sm:text-base text-white/90 italic leading-relaxed font-serif">
                  {data.ownerQuote}
                </p>
                <span className="block mt-3 text-[10px] font-black tracking-widest text-[#50C878] uppercase">
                  — {data.ownerName}
                </span>
              </div>
            )}

            {/* Key Atelier Credentials */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4 w-full border-t border-white/5">
              <div>
                <span className="text-xs font-mono font-bold text-[#50C878]">ORIGIN</span>
                <span className="block text-sm font-bold text-white uppercase mt-0.5">Colombo, LK</span>
                <span className="text-[10px] text-[#8e8e93]">In-house Design Lab</span>
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-[#50C878]">BATCH RUNS</span>
                <span className="block text-sm font-bold text-white uppercase mt-0.5">Limited Editions</span>
                <span className="text-[10px] text-[#8e8e93]">No Mass Reprints</span>
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-[#50C878]">AUTHENTICITY</span>
                <span className="block text-sm font-bold text-white uppercase mt-0.5">1/1 Serialized</span>
                <span className="text-[10px] text-[#8e8e93]">Verifiable Ownership</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
