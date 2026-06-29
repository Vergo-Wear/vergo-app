"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import "./product-card.css";

export default function ProductCard({ product }: any) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/collection/${product.id}`);
  };

  return (
    <div
      className={`product-card ${!product.isAvailable ? "sold-out" : ""}`}
      onClick={handleCardClick}
      style={{ cursor: "pointer" }}
    >
      <div className="product-image-wrapper">
        {product.isAvailable && (
          <span className="product-badge">AVAILABLE NOW</span>
        )}

        <Image
          src={product.image}
          alt={product.name}
          width={400}
          height={500}
          className="product-image"
        />

        {!product.isAvailable ? (
          <div className="sold-out-overlay">
            <div className="sold-out-box">SOLD OUT</div>
          </div>
        ) : (
          <div className="product-overlay">
            <button
              className="quick-add-btn"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <span>Quick Add</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="product-info-container">
        <div className="product-info-row">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-price">{product.lkrPrice}</p>
        </div>
      </div>
    </div>
  );
}