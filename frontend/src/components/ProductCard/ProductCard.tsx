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

        {!product.isAvailable && (
          <div className="sold-out-overlay">
            <div className="sold-out-box">SOLD OUT</div>
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
