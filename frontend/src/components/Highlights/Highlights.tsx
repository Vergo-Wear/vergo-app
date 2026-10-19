"use client";

import React from "react";
import Link from "next/link";
import { useProducts } from "@/hooks/useProducts";
import "./highlights.css";

export default function Highlights() {
  const products = useProducts();
  const [headerInfo, setHeaderInfo] = React.useState({
    highlightsTitle: "Newly Released",
    highlightsSubtitle: "Explore our latest limited edition pieces.",
  });

  React.useEffect(() => {
    const loadHeader = () => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/customization?t=${Date.now()}`, {
        cache: "no-store",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setHeaderInfo((prev) => ({
              highlightsTitle: data.highlightsTitle || prev.highlightsTitle,
              highlightsSubtitle: data.highlightsSubtitle || prev.highlightsSubtitle,
            }));
          }
        })
        .catch(() => undefined);
    };

    loadHeader();

    const handleUpdate = () => loadHeader();
    window.addEventListener("vergo_customization_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("vergo_customization_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Filter only active available products (or all products from the database)
  const dbProducts = products.filter((p) => p.isAvailable);

  return (
    <section id="highlights" className="newly-released-section" data-tour="customer-products">
      <div className="newly-released-container">
        {/* Section Header matching exact UI from reference */}
        <div className="newly-released-header">
          <div className="newly-title-area">
            <h2 className="newly-title">{headerInfo.highlightsTitle}</h2>
            <p className="newly-subtitle">{headerInfo.highlightsSubtitle}</p>
          </div>

          <div className="newly-inventory-status">
            <span className="newly-status-circle" aria-hidden="true" />
            <span className="newly-status-text">INVENTORY STATUS: LIVE</span>
          </div>
        </div>

        {/* Database-driven products showcase */}
        {dbProducts.length === 0 ? (
          <div className="newly-empty-box">
            <span className="newly-empty-text">Loading latest releases from catalog...</span>
          </div>
        ) : (
          <div className="newly-products-grid">
            {dbProducts.map((product) => {
              const primaryImg = product.image || (product.images && product.images[0]) || "/images/wlogo.png";
              const secondaryImg = (product.images && product.images[1]) || primaryImg;

              // Format price with LKR and amount
              let currency = "LKR";
              let amount = "3,500.00";
              const rawPrice = product.lkrPrice || product.price || "";
              if (rawPrice) {
                const parts = String(rawPrice).replace(/,/g, "").match(/([A-Za-z]+)?\s*([\d.]+)/);
                if (parts && parts[2]) {
                  if (parts[1]) currency = parts[1];
                  const num = parseFloat(parts[2]);
                  amount = isNaN(num) ? parts[2] : num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } else {
                  amount = String(rawPrice);
                }
              }

              return (
                <div key={product.id} className="newly-card">
                  <Link href={`/collection/${product.id}`} className="newly-card-media-wrap">
                    {/* AVAILABLE NOW Green Badge */}
                    <div className="newly-badge-available">AVAILABLE NOW</div>

                    {/* Primary & Hover Images */}
                    <img
                      src={primaryImg}
                      alt={product.name}
                      className="newly-card-img primary"
                      loading="lazy"
                    />
                    {secondaryImg !== primaryImg && (
                      <img
                        src={secondaryImg}
                        alt={`${product.name} Alternate`}
                        className="newly-card-img secondary"
                        loading="lazy"
                      />
                    )}
                  </Link>

                  {/* Product Details under image */}
                  <div className="newly-card-details">
                    <Link href={`/collection/${product.id}`} className="newly-card-title-link">
                      <h3 className="newly-card-name">{product.name}</h3>
                    </Link>

                    <div className="newly-card-price-col">
                      <span className="newly-card-currency">{currency}</span>
                      <span className="newly-card-amount">{amount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Centered VIEW MORE CTA */}
        <div className="newly-view-more-wrap">
          <Link href="/collection" className="newly-view-more-btn">
            VIEW MORE
          </Link>
        </div>
      </div>
    </section>
  );
}
