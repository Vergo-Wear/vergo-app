"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const router = useRouter();
  const [isCheckingCheckout, setIsCheckingCheckout] = useState(false);
  const {
    cart,
    updateQuantity,
    removeFromCart,
    cartCount,
    cartSubtotal,
    formatLkr,
  } = useCart();

  const handleCheckout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("vergo_checkout_timestamp", Date.now().toString());
    }
    router.push("/checkout");
  };

  return (
    <div className="cart-page-wrapper">
      <div className="cart-page-container">
        {/* Breadcrumbs */}
        <nav className="cart-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" className="cart-breadcrumb-link">
            HOME
          </Link>
          <span className="cart-breadcrumb-separator">›</span>
          <span className="cart-breadcrumb-current">YOUR CART</span>
        </nav>

        {/* Cart Header */}
        <div className="cart-header">
          <h1 className="cart-title">CART</h1>
          <span className="cart-item-count">
            {cartCount} {cartCount === 1 ? "ITEM" : "ITEMS"}
          </span>
        </div>

        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="empty-cart-container">
            <svg
              className="empty-cart-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            <h2 className="empty-cart-title">Your Cart is Empty</h2>
            <p className="empty-cart-message">
              Looks like you haven't added anything to your cart yet. Explore
              our latest collections to find your perfect fit.
            </p>
            <Link href="/collection" className="empty-cart-btn">
              Explore Collection
            </Link>
          </div>
        ) : (
          /* Cart Grid Layout */
          <div className="cart-grid">
            {/* Left Column: Cart Items */}
            <div className="cart-items-list">
              {cart.map((item) => (
                <div
                  key={`${item.product.id}-${item.size}-${item.color ?? "default"}`}
                  className="cart-item-card"
                >
                  {/* Product Image */}
                  <div className="cart-item-image-wrapper">
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      className="cart-item-image"
                      sizes="130px"
                      priority
                    />
                  </div>

                  {/* Product Details */}
                  <div className="cart-item-info">
                    <div className="cart-item-header">
                      <h3 className="cart-item-name">{item.product.name}</h3>
                      <p className="cart-item-subtitle">
                        {item.color || item.product.colors?.[0] || "Default"}
                      </p>
                    </div>

                    <div className="cart-item-details">
                      {/* Size Display */}
                      <div className="detail-group">
                        <span className="detail-label">SIZE</span>
                        <span className="detail-value">{item.size}</span>
                      </div>

                      {/* Quantity Selector */}
                      <div className="detail-group">
                        <span className="detail-label">QUANTITY</span>
                        <div className="quantity-control">
                          <button
                            type="button"
                            className="quantity-btn"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.size,
                                item.quantity - 1,
                                item.color,
                              )
                            }
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="quantity-value">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="quantity-btn"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.size,
                                item.quantity + 1,
                                item.color,
                              )
                            }
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Price display */}
                    <div className="cart-item-price">
                      {item.product.lkrPrice}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    className="cart-item-remove-btn"
                    onClick={() =>
                      removeFromCart(item.product.id, item.size, item.color)
                    }
                    aria-label="Remove item"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Right Column: Order Summary & Promo Code */}
            <div className="cart-summary-column">
              {/* Order Summary Box */}
              <div className="summary-card">
                <h2 className="summary-title">ORDER SUMMARY</h2>

                <div className="summary-row">
                  <span className="summary-label">SUBTOTAL</span>
                  <span className="summary-value">
                    {formatLkr(cartSubtotal)}
                  </span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">
                    DELIVERY <span className="delivery-badge">CITYPAK</span>
                  </span>
                  <span className="summary-value calculated-next">
                    Calculated next
                  </span>
                </div>


                <hr className="summary-divider" />

                <div className="total-row">
                  <span className="total-label">TOTAL</span>
                  <span className="total-value">{formatLkr(cartSubtotal)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="checkout-btn"
                >
                  PROCEED TO CHECKOUT
                </button>

              </div>

              {/* Promo Code Card */}
              <div className="summary-card promo-card">
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="promo-form"
                >
                  <input
                    type="text"
                    placeholder="PROMO CODE"
                    className="promo-input"
                  />
                  <button type="submit" className="promo-apply-btn">
                    APPLY
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
