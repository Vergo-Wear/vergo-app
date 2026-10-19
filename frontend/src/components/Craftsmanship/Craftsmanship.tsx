"use client";

import React from "react";
import "./craftsmanship.css";

const DEFAULT_PILLARS = [
  {
    number: "01",
    tag: "CUSTOM DENSE WEAVE",
    title: "280 GSM Luxury Combed Cotton",
    description: "Structured heavyweight drape that holds shape wash after wash.",
  },
  {
    number: "02",
    tag: "ARCHIVAL TAILORING",
    title: "Reinforced Micro-Rib Collar",
    description: "Double-needle neckband binding for zero collar stretching.",
  },
  {
    number: "03",
    tag: "DECENTRALIZED PROOF",
    title: "100% Verified Authenticity",
    description: "Cryptographic ledger verification on every individual SKU.",
  },
  {
    number: "04",
    tag: "CITYPAK LOGISTICS",
    title: "Express Nationwide Dispatch",
    description: "24–48h courier delivery via Citypak with live SMS tracking.",
  },
];

const ICONS = [
  (
    <svg key="i1" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  (
    <svg key="i2" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  (
    <svg key="i3" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  (
    <svg key="i4" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Craftsmanship() {
  const [data, setData] = React.useState({
    standardBadge: "THE VERGO STANDARD",
    standardTitle: "ENGINEERED FOR LONGEVITY.",
    standardSubtitle: "Heavyweight construction, reinforced tension points, and authentic materials.",
    standardFeatures: DEFAULT_PILLARS,
  });

  React.useEffect(() => {
    fetch(`${API_URL}/customization`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (json) {
          setData((prev) => ({
            standardBadge: json.standardBadge || prev.standardBadge,
            standardTitle: json.standardTitle || prev.standardTitle,
            standardSubtitle: json.standardSubtitle || prev.standardSubtitle,
            standardFeatures:
              Array.isArray(json.standardFeatures) && json.standardFeatures.length > 0
                ? json.standardFeatures
                : prev.standardFeatures,
          }));
        }
      })
      .catch(() => undefined);
  }, []);

  const features = data.standardFeatures.length > 0 ? data.standardFeatures : DEFAULT_PILLARS;

  return (
    <section className="craftsmanship-section">
      <div className="craftsmanship-container">
        {/* Section Header */}
        <div className="craftsmanship-header">
          <div className="craftsmanship-eyebrow">
            <span className="craftsmanship-line" />
            <span>{data.standardBadge}</span>
          </div>
          <h2 className="craftsmanship-title">{data.standardTitle}</h2>
          <p className="craftsmanship-subtitle">{data.standardSubtitle}</p>
        </div>

        {/* 4 Feature Pillars Grid */}
        <div className="craftsmanship-grid">
          {features.map((p, idx) => (
            <div key={p.number || idx} className="craftsmanship-card">
              <div className="craftsmanship-card-glow" />

              <div className="craftsmanship-card-top">
                <div className="craftsmanship-icon-badge">{ICONS[idx % ICONS.length]}</div>
                <span className="craftsmanship-num">{p.number || `0${idx + 1}`}</span>
              </div>

              <span className="craftsmanship-tag">{p.tag}</span>
              <h3 className="craftsmanship-card-title">{p.title}</h3>
              <p className="craftsmanship-card-desc">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
