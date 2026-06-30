"use client";

import { useState, use, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { products } from "@/data/product";
import ProductFeedback from "@/components/ProductFeedback";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const productId = parseInt(resolvedParams.id, 10);

  // Retrieve product from data
  const product = useMemo(() => {
    return products.find((p) => p.id === productId);
  }, [productId]);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Size options fallback or dynamic
  const sizeOptions = product?.sizes || ["S", "M", "L", "XL"];
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || "M");

  // Accordion state
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    details: true,
    shipping: false,
  });

  // Toast notification state
  const [toast, setToast] = useState<string | null>(null);

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddToCart = () => {
    if (!product) return;
    setToast(`Added "${product.name}" (Size ${selectedSize}) to your cart!`);
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Complete The Look logic: recommend 4 products from other categories or other products in catalog
  const completeTheLookItems = useMemo(() => {
    if (!product) return [];
    // Find up to 4 other products
    return products
      .filter((p) => p.id !== product.id)
      .slice(0, 4);
  }, [product]);

  if (!product) {
    return (
      <div className="product-detail-wrapper" style={{ padding: "80px 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "20px" }}>Product Not Found</h1>
        <p style={{ color: "#8e8e93", marginBottom: "40px" }}>The product you are looking for does not exist or has been removed.</p>
        <Link href="/collection" className="reset-filters-btn" style={{ padding: "12px 30px", textDecoration: "none", color: "#000" }}>
          Back to Collection
        </Link>
      </div>
    );
  }

  const productGallery = product.images || [product.image];

  return (
    <div className="product-detail-wrapper">
      <main className="product-detail-container">
        {/* Breadcrumbs */}
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" className="breadcrumb-link">HOME</Link>
          <span className="breadcrumb-separator">›</span>
          <Link href="/collection" className="breadcrumb-link">COLLECTION</Link>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">{product.name}</span>
        </nav>

        {/* Main Product Grid */}
        <section className="product-main-grid">
          {/* Left Column: Gallery */}
          <div className="product-gallery">
            <div className="main-image-container">
              <Image
                src={productGallery[activeImageIndex] || product.image}
                alt={`${product.name} View ${activeImageIndex + 1}`}
                fill
                priority
                className="main-product-img"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            {productGallery.length > 1 && (
              <div className="thumbnail-list">
                {productGallery.map((imgSrc, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`thumbnail-btn ${activeImageIndex === index ? "active" : ""}`}
                    aria-label={`View thumbnail ${index + 1}`}
                  >
                    <Image
                      src={imgSrc}
                      alt={`${product.name} Thumbnail ${index + 1}`}
                      fill
                      className="thumbnail-img"
                      sizes="120px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details */}
          <div className="product-info-panel">
            <span className="product-category-badge">{product.category}</span>
            <h1 className="product-title">{product.name}</h1>
            <p className="product-collection">{product.subTitle || "ESSENTIALS V1"}</p>

            <div className="product-price">{product.lkrPrice}</div>

            {/* Size Selection */}
            {sizeOptions.length > 0 && (
              <div className="size-selection-section">
                <div className="size-header">
                  <span className="size-label">SELECT SIZE</span>
                  <button type="button" className="size-guide-link">Size Guide</button>
                </div>

                <div className="size-options-grid">
                  {sizeOptions.map((size) => (
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
            )}

            {/* Add to Cart Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              className="add-to-cart-btn"
              disabled={!product.isAvailable}
              style={!product.isAvailable ? { background: "rgba(255,255,255,0.08)", color: "#8e8e93", border: "1px solid rgba(255,255,255,0.08)", cursor: "not-allowed" } : {}}
            >
              {product.isAvailable ? "ADD TO CART" : "SOLD OUT"}
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
                      {product.description || `Premium apparel piece designed for a modern streetwear aesthetic.`}
                    </p>
                    {product.features && product.features.length > 0 && (
                      <ul className="accordion-features-list">
                        {product.features.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    )}
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
        {completeTheLookItems.length > 0 && (
          <section className="complete-look-section">
            <div className="complete-look-header">
              <div>
                <h2 className="complete-look-title">COMPLETE THE LOOK</h2>
                <p className="complete-look-subtitle">Hand-picked styles to match your fit.</p>
              </div>
            </div>

            <div className="look-grid">
              {completeTheLookItems.map((item) => (
                <Link key={item.id} href={`/collection/${item.id}`} className="look-card" style={{ textDecoration: "none" }}>
                  <div className="look-image-wrapper">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="look-img"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <div className="look-info">
                    <h3 className="look-card-title">{item.name}</h3>
                    <span className="look-card-price">{item.lkrPrice}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Product Feedback & Reviews Section */}
        <ProductFeedback productId={product.id} productCategory={product.category} />
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
