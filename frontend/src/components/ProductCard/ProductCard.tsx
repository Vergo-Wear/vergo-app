"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import "./product-card.css";

export default function ProductCard({ product }: any) {
  const router = useRouter();
  const { addToCart } = useCart();

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
                const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : "M";
                addToCart(product, defaultSize, 1, product.colors && product.colors.length > 0 ? product.colors[0] : undefined);
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