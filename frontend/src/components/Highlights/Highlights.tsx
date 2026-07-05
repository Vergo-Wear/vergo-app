"use client";

import Link from "next/link";
import ProductCard from "../ProductCard/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import "./highlights.css";

export default function Highlights() {
  const products = useProducts();

  return (
    <section id="highlights" className="highlights">
      <div className="highlights-header">
        <div className="highlights-title-area">
          <h2>Newly Released</h2>
          <p className="section-description">
            Explore our latest limited edition pieces.
          </p>
        </div>
        <div className="inventory-status">
          <span className="status-dot"></span>
          <span>INVENTORY STATUS: LIVE</span>
        </div>
      </div>

      <div className="products-grid">
        {products
          .filter((product) => product.isAdminSelected)
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
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
