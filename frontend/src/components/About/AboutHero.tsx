"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const DEFAULT_BANNER = "https://res.cloudinary.com/aql7sojg/image/upload/v1788961916/products/k5cwxe5syiy2nxfncbls.jpg";

export default function AboutHero() {
  const [badge, setBadge] = useState("OUR PHILOSOPHY");
  const [title, setTitle] = useState("DEFINING MODERN LUXURY");
  const [subtitle, setSubtitle] = useState(
    "We engineer heavyweight streetwear with provenance and purpose — responsibly built, architecturally tailored, and verifiably authentic."
  );

  useEffect(() => {
    fetch(`${API_URL}/customization`)
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.aboutHeroBadge) setBadge(data.aboutHeroBadge.toUpperCase());
          if (data.aboutHeroTitle) setTitle(data.aboutHeroTitle.toUpperCase());
          if (data.aboutHeroSubtitle) setSubtitle(data.aboutHeroSubtitle);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <section className="relative w-full bg-[#050507] overflow-hidden border-b border-[rgba(255,255,255,0.08)]">
      {/* Background with Dark Atmospheric Gradients */}
      <div className="absolute inset-0 z-0">
        <img
          src={DEFAULT_BANNER}
          alt="VERGO Archival Background"
          className="w-full h-full object-cover object-center opacity-25 filter grayscale contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/90 via-[#050507]/80 to-[#050507]" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#050507]/50 to-[#050507]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-24 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#50C878]/10 border border-[#50C878]/25 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#50C878] shadow-[0_0_8px_#50C878]" />
          <span className="text-[11px] font-black tracking-[0.25em] text-[#50C878] uppercase">
            {badge}
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase leading-[1.05]">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-[#a1a1aa] max-w-2xl mx-auto font-light leading-relaxed">
          {subtitle}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/collection"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#50C878] text-black font-black text-xs uppercase tracking-[0.2em] rounded shadow-lg shadow-[#50C878]/20 hover:bg-[#43a864] transition-all"
          >
            <span>SHOP LATEST ARCHIVE</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>

          <a
            href="#story"
            className="inline-flex items-center gap-2 px-8 py-4 border border-[rgba(255,255,255,0.18)] hover:border-white text-white font-black text-xs uppercase tracking-[0.2em] rounded hover:bg-white/5 transition-all"
          >
            <span>DISCOVER OUR STORY</span>
          </a>
        </div>

        {/* Stat Highlights Bar */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-12 border-t border-[rgba(255,255,255,0.06)] text-left">
          <div>
            <span className="block text-2xl sm:text-3xl font-black text-white font-mono">280 GSM</span>
            <span className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider">Heavyweight Fabric</span>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-black text-white font-mono">100%</span>
            <span className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider">Organic Combed Cotton</span>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-black text-white font-mono">1/1</span>
            <span className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider">Decentralized SKU</span>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-black text-white font-mono">48 HRS</span>
            <span className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider">Islandwide Courier</span>
          </div>
        </div>
      </div>
    </section>
  );
}
