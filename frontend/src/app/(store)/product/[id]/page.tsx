"use client";

import { useState } from "react";
import Image from "next/image";

// Product data matching Figma design
const productGallery = [
  {
    id: 0,
    alt: "Vergo Oversized Tee - Front View",
    src: "/images/tee.png",
  },
  {
    id: 1,
    alt: "Vergo Oversized Tee - Back View",
    src: "/images/tee.png",
  },
  {
    id: 2,
    alt: "Vergo Oversized Tee - Fabric Detail",
    src: "/images/sweatshirt.png",
  },
  {
    id: 3,
    alt: "Vergo Oversized Tee - Model View",
    src: "/images/tee.png",
  },
];

const completeTheLookItems = [
  {
    id: 1,
    title: "Vergo Cargo Pants - Olive",
    price: "LKR 6,200.00",
    image: "/images/pants.png",
  },
  {
    id: 2,
    title: "Vergo Bucket Hat - Black",
    price: "LKR 2,800.00",
    image: "/images/sweatshirt.png",
  },
  {
    id: 3,
    title: "Vergo X Street Kicks V1",
    price: "LKR 13,500.00",
    image: "/images/tee.png",
  },
  {
    id: 4,
    title: "Vergo Heavyweight Hoodie",
    price: "LKR 8,900.00",
    image: "/images/hoodie.png",
  },
];

export default function ProductDetailPage() {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("M");
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    details: true,
    shipping: false,
  });
  const [toast, setToast] = useState<string | null>(null);

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddToCart = () => {
    setToast(`Added "Vergo Oversized Tee" (Size ${selectedSize}) to your cart!`);
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  return (
    <div className="product-detail-wrapper">

      <main className="product-detail-container">
        {/* Breadcrumbs */}
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <a href="#" className="breadcrumb-link">HOME</a>
          <span className="breadcrumb-separator">›</span>
          <a href="#" className="breadcrumb-link">COLLECTIONS</a>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">VERGO OVERSIZED TEE</span>
        </nav>

        {/* Main Product Grid */}
        <section className="product-main-grid">
          {/* Left Column: Gallery */}
          <div className="product-gallery">
            <div className="main-image-container">
              <Image
                src={productGallery[activeImageIndex].src}
                alt={productGallery[activeImageIndex].alt}
                fill
                priority
                className="main-product-img"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            <div className="thumbnail-list">
              {productGallery.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setActiveImageIndex(index)}
                  className={`thumbnail-btn ${activeImageIndex === index ? "active" : ""}`}
                  aria-label={`View thumbnail ${index + 1}`}
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="thumbnail-img"
                    sizes="120px"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Product Details */}
          <div className="product-info-panel">
            <span className="product-category-badge">PREMIUM STREETWEAR</span>
            <h1 className="product-title">VERGO OVERSIZED TEE</h1>
            <p className="product-collection">ESSENTIALS V1</p>

            <div className="product-price">LKR 4,500.00</div>

            {/* Size Selection */}
            <div className="size-selection-section">
              <div className="size-header">
                <span className="size-label">SELECT SIZE</span>
                <button type="button" className="size-guide-link">Size Guide</button>
              </div>

              <div className="size-options-grid">
                {["S", "M", "L", "XL"].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`size-btn ${selectedSize === size ? "selected" : ""}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              className="add-to-cart-btn"
            >
              ADD TO CART
            </button>

            {/* Accordions */}
            <div className="accordions-container">
              {/* Details & Fit */}
              <div className={`accordion-item ${openAccordions.details ? "open" : ""}`}>
                <button
                  type="button"
                  className="accordion-header"
                  onClick={() => toggleAccordion("details")}
                >
                  <span>DETAILS & FIT</span>
                  <svg
                    className="accordion-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openAccordions.details && (
                  <div className="accordion-content">
                    <p>
                      Crafted from 240GSM heavy-weight premium cotton, the Vergo Oversized Tee offers a relaxed, drop-shoulder silhouette designed for maximum comfort and a modern streetwear aesthetic.
                    </p>
                    <ul className="accordion-features-list">
                      <li>100% Organic Cotton</li>
                      <li>Pre-shrunk fabric</li>
                      <li>Double-needle stitching</li>
                      <li>Signature Vergo branding on chest</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Shipping Info */}
              <div className={`accordion-item ${openAccordions.shipping ? "open" : ""}`}>
                <button
                  type="button"
                  className="accordion-header"
                  onClick={() => toggleAccordion("shipping")}
                >
                  <span>SHIPPING INFO</span>
                  <svg
                    className="accordion-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openAccordions.shipping && (
                  <div className="accordion-content">
                    <p>
                      Standard island-wide delivery within Sri Lanka takes 2-4 business days. Free shipping on all orders over LKR 15,000. Express same-day delivery available for Colombo orders placed before 12 PM.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Complete The Look Section */}
        <section className="complete-look-section">
          <div className="complete-look-header">
            <div>
              <h2 className="complete-look-title">COMPLETE THE LOOK</h2>
              <p className="complete-look-subtitle">Hand-picked styles to match your fit.</p>
            </div>
            <div className="carousel-nav-btns">
              <button type="button" className="carousel-arrow-btn" aria-label="Previous items">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button type="button" className="carousel-arrow-btn" aria-label="Next items">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="look-grid">
            {completeTheLookItems.map((item) => (
              <div key={item.id} className="look-card">
                <div className="look-image-wrapper">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="look-img"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="look-info">
                  <h3 className="look-card-title">{item.title}</h3>
                  <span className="look-card-price">{item.price}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Toast notification */}
      {toast && (
        <div className="toast-notification">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF9D" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
