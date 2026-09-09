"use client";

import { useState, useEffect, use, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProductsState } from "@/hooks/useProducts";
import { sortSizes } from "@/lib/products";
import ProductFeedback from "@/components/ProductFeedback";
import { useCart } from "@/context/CartContext";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const { products, isLoading } = useProductsState();
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const searchParams = useSearchParams();
  const autoOpenFeedback = searchParams ? searchParams.get("add-feedback") === "true" : false;
  const { addToCart } = useCart();

  // Retrieve product from data
  const product = useMemo(() => {
    return products.find((p) => p.id === productId);
  }, [products, productId]);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Size & Color options (sorted from smallest to largest)
  const sizeOptions = useMemo(() => {
    const rawSizes = product?.sizes || ["S", "M", "L", "XL"];
    return sortSizes(rawSizes);
  }, [product?.sizes]);

  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || "M");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Size Guide Modal state
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSizeGuideOpen(false);
    };
    if (isSizeGuideOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSizeGuideOpen]);

  // Update selectedColor and selectedSize when product data arrives
  useEffect(() => {
    if (product) {
      if (product.colors && product.colors.length > 0 && (!selectedColor || !product.colors.includes(selectedColor))) {
        setSelectedColor(product.colors[0]);
      }
      if (sizeOptions.length > 0 && (!selectedSize || !sizeOptions.includes(selectedSize))) {
        setSelectedSize(sizeOptions[0]);
      }
    }
  }, [product, selectedColor, selectedSize, sizeOptions]);

  const selectedVariant = useMemo(
    () =>
      product?.variants.find(
        (variant) =>
          variant.size === selectedSize &&
          variant.color === selectedColor,
      ) || product?.variants.find(
        (variant) => variant.size === selectedSize || variant.color === selectedColor
      ) || product?.variants[0],
    [product, selectedSize, selectedColor]
  );

  const availableQuantity = selectedVariant?.availableQuantity ?? 0;

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
    if (!product || availableQuantity < 1) return;
    const addedQty = Math.min(quantity, availableQuantity);
    addToCart(
      product,
      selectedSize,
      addedQty,
      product.colors?.[0] || undefined,
    );
    setToast(
      `Added to cart: "${product.name}" × ${addedQty}, (Size ${selectedSize})`,
    );
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const updateQuantity = (nextQuantity: number) => {
    setQuantity(Math.max(1, Math.min(nextQuantity || 1, availableQuantity || 1)));
  };

  // Complete The Look logic: recommend 4 products from other categories or other products in catalog
  const completeTheLookItems = useMemo(() => {
    if (!product) return [];
    // Find up to 4 other products
    return products
      .filter((p) => p.id !== product.id)
      .slice(0, 4);
  }, [products, product]);

  if (isLoading) {
    return (
      <div className="product-detail-loading" role="status" aria-live="polite">
        <div className="product-loading-mark" aria-hidden="true">
          <span className="product-loading-ring" />
          <span className="product-loading-v">V</span>
        </div>
        <p className="product-loading-title">PREPARING YOUR SELECTION</p>
        <p className="product-loading-copy">Loading product details...</p>
      </div>
    );
  }

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

  const productGallery = product.images && product.images.length > 0 ? product.images : [product.image];

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
                src={productGallery[activeImageIndex] || product.image || "/logo.png"}
                alt={`${product.name} View ${activeImageIndex + 1}`}
                fill
                priority
                className="main-product-img"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            {productGallery.length > 1 && (
              <div className="thumbnail-list">
                {productGallery.map((imgSrc: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`thumbnail-btn ${activeImageIndex === index ? "active" : ""}`}
                    aria-label={`View thumbnail ${index + 1}`}
                  >
                    <Image
                      src={imgSrc || "/logo.png"}
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

            {/* Color Selection */}
            {product?.colors && product.colors.length > 0 && (
              <div className="size-selection-section">
                <div className="size-header">
                  <span className="size-label">SELECT COLOR</span>
                </div>
                <div className="size-options-grid" style={{ marginBottom: "20px" }}>
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color);
                        // Jump the main image to the selected variant's first image
                        const variantWithColor = product?.variants.find((v) => v.color === color);
                        if (variantWithColor && variantWithColor.images && variantWithColor.images.length > 0) {
                          const targetImg = variantWithColor.images[0];
                          const idx = productGallery.indexOf(targetImg);
                          if (idx !== -1) setActiveImageIndex(idx);
                        }

                        const colorAvailability = product?.variants.find(
                          (variant) => variant.color === color && variant.size === selectedSize,
                        )?.availableQuantity ?? 0;
                        setQuantity((current) => Math.max(1, Math.min(current, colorAvailability || 1)));
                      }}
                      className={`size-btn ${selectedColor === color ? "selected" : ""}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {sizeOptions.length > 0 && (
              <div className="size-selection-section">
                <div className="size-header">
                  <span className="size-label">SELECT SIZE</span>
                  <button
                    type="button"
                    className="size-guide-link"
                    onClick={() => setIsSizeGuideOpen(true)}
                  >
                    Size Guide
                  </button>
                </div>

                <div className="size-options-grid">
                  {sizeOptions.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        const sizeAvailability = product?.variants.find(
                          (variant) => variant.size === size && variant.color === selectedColor,
                        )?.availableQuantity ?? 0;
                        setQuantity((current) => Math.max(1, Math.min(current, sizeAvailability || 1)));
                      }}
                      className={`size-btn ${selectedSize === size ? "selected" : ""}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="quantity-selection-section">
              <label className="quantity-label" htmlFor="product-quantity">
                QUANTITY
              </label>
              <div className="product-quantity-control">
                <button
                  type="button"
                  className="product-quantity-btn"
                  onClick={() => updateQuantity(quantity - 1)}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <input
                  id="product-quantity"
                  className="product-quantity-input"
                  type="number"
                  min="1"
                  max={Math.max(1, availableQuantity)}
                  value={quantity}
                  onChange={(event) => updateQuantity(Number(event.target.value))}
                  disabled={availableQuantity < 1}
                  aria-label="Quantity"
                />
                <button
                  type="button"
                  className="product-quantity-btn"
                  onClick={() => updateQuantity(quantity + 1)}
                  disabled={quantity >= availableQuantity || availableQuantity < 1}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <span className="quantity-stock-note">
                {availableQuantity > 0
                  ? `${availableQuantity} available`
                  : "Selected size is out of stock"}
              </span>
            </div>

            {/* Add to Cart Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              className="add-to-cart-btn"
              disabled={!product.isAvailable || availableQuantity < 1}
              style={
                !product.isAvailable || availableQuantity < 1
                  ? { background: "rgba(255,255,255,0.08)", color: "#8e8e93", border: "1px solid rgba(255,255,255,0.08)", cursor: "not-allowed" }
                  : {}
              }
            >
              {product.isAvailable && availableQuantity > 0 ? "ADD TO CART" : "OUT OF STOCK"}
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
        <ProductFeedback productId={product.id} productCategory={product.category} autoOpenForm={autoOpenFeedback} />
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

      {/* Size Guide Modal */}
      {isSizeGuideOpen && (
        <div
          className="size-guide-modal-overlay"
          onClick={() => setIsSizeGuideOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Size Guide"
        >
          <div
            className="size-guide-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-guide-modal-header">
              <h3 className="size-guide-modal-title">
                SIZE GUIDE <span>/ VERGO</span>
              </h3>
              <button
                type="button"
                className="size-guide-close-btn"
                onClick={() => setIsSizeGuideOpen(false)}
                aria-label="Close size guide"
              >
                ✕
              </button>
            </div>
            <div className="size-guide-modal-body">
              <Image
                src="/Size Guide.png"
                alt="Vergo Wear Size Guide"
                width={800}
                height={550}
                className="size-guide-image"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
