import React from "react";
import Link from "next/link";
import AboutCard from "./AboutCard";

export default function CollectionsGrid() {
  return (
    <section className="w-full bg-[#050507] py-28 px-6 sm:px-12 border-b border-[rgba(255,255,255,0.08)]">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="w-4 h-0.5 bg-[#50C878]" />
              <span className="text-[11px] font-black tracking-[0.25em] text-[#50C878] uppercase">
                CURATED DISCIPLINES
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
              SIGNATURE COLLECTIONS
            </h2>
          </div>

          <Link
            href="/collection"
            className="inline-flex items-center gap-2 text-xs font-black text-[#50C878] hover:text-white uppercase tracking-[0.2em] transition-colors"
          >
            <span>VIEW COMPLETE CATALOG</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        {/* 3-Column Luxury Showcase Grid using real VERGO products */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AboutCard
            label="DROP 01 — SIGNATURE"
            title="Heavyweight Oversized"
            subtitle="280 GSM luxury combed cotton with architectural boxy drape."
            image="https://res.cloudinary.com/aql7sojg/image/upload/v1788961897/products/lcut7pw9spodo8eqc4ow.jpg"
            link="/collection"
          />

          <AboutCard
            label="ESSENTIAL ARCHIVE"
            title="Minimalist Monochrome"
            subtitle="Deep black pigment dye with reinforced anti-stretch ribbing."
            image="https://res.cloudinary.com/aql7sojg/image/upload/v1788961605/products/rjapb6vhg3wedif6jwbz.jpg"
            link="/collection"
          />

          <AboutCard
            label="LABS SERIES"
            title="Decentralized Originals"
            subtitle="Cryptographically logged serial verification on every garment."
            image="https://res.cloudinary.com/aql7sojg/image/upload/v1788961559/products/wuhp84qg3h1o331c19d4.jpg"
            link="/collection"
          />
        </div>
      </div>
    </section>
  );
}
