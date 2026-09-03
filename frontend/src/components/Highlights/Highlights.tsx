"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "../ProductCard/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import "./highlights.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Highlights() {
  const products = useProducts();
  const [title, setTitle] = useState("Newly Released");
  const [subtitle, setSubtitle] = useState("Explore our latest limited edition pieces.");

  useEffect(() => {
    fetch(`${API_URL}/customization`)
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.highlightsTitle) setTitle(data.highlightsTitle);
          if (data.highlightsSubtitle) setSubtitle(data.highlightsSubtitle);
        }
      })
      .catch((err) => console.error("Failed to load highlights customizations", err));
  }, []);

  return (
    <section id="highlights" className="highlights" data-tour="customer-products">
      <div className="highlights-header">
        <div className="highlights-title-area">
          <h2>{title}</h2>
          <p className="section-description">
            {subtitle}
          </p>
        </div>
        <div className="inventory-status">
          <span className="status-dot"></span>
          <span>INVENTORY STATUS: LIVE</span>
        </div>
      </div>

      <div className="products-grid">
        {products
          .filter((product) => product.isAvailable)
          .slice(0, 4)
          .map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
      </div>

      <div className="view-more-container">
        <Link href="/collection" className="view-more-link">
          <span>View More</span>
        </Link>
      </div>
    </section>
  );
}
