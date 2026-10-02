"use client";

import React, { useEffect, useState } from "react";
import "./reviews.css";

interface ReviewItem {
  id?: string;
  name: string;
  location?: string;
  verified?: boolean;
  garment: string;
  rating: number;
  date?: string;
  comment: string;
  showOnHome?: boolean;
}

const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    name: "Pamuda U.",
    location: "Colombo",
    verified: true,
    garment: "Vergo Heavyweight Tee (Jet Black - Size L)",
    rating: 5,
    date: "Verified Drop",
    comment:
      "The drape on this 280 GSM tee is genuinely unmatched in Sri Lanka. It holds its boxy structure throughout the day without clinging or stretching at the collar. Best streetwear purchase this year.",
  },
  {
    name: "Aakash R.",
    location: "Kandy",
    verified: true,
    garment: "Vergo Heavyweight Tee (Crimson Red - Size XL)",
    rating: 5,
    date: "Verified Drop",
    comment:
      "Delivery via Citypak arrived in less than 36 hours. The packaging and unboxing feel like a luxury boutique drop. The high-density branding and heavy cotton weight are 10/10.",
  },
  {
    name: "Dinuka M.",
    location: "Galle",
    verified: true,
    garment: "Vergo Archival Tee (Desert Sage - Size M)",
    rating: 5,
    date: "Verified Drop",
    comment:
      "Washed it twice already and zero shrinkage or collar distortion. True dropped-shoulder cut that fits like luxury overseas streetwear brands. Already waiting for the hoodie drop.",
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Reviews() {
  const [reviews, setReviews] = useState<ReviewItem[]>(DEFAULT_REVIEWS);
  const [headerInfo, setHeaderInfo] = useState({
    feedbackBadge: "VERIFIED COMMUNITY",
    feedbackTitle: "TESTED ON THE STREETS.",
    feedbackSubtitle: "Authentic feedback from verified collectors across the island.",
  });

  useEffect(() => {
    const loadReviews = () => {
      fetch(`${API_URL}/customization?t=${Date.now()}`, { cache: "no-store" })
        .then((res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (data) {
            if (data.feedbackBadge || data.feedbackTitle || data.feedbackSubtitle) {
              setHeaderInfo((prev) => ({
                feedbackBadge: data.feedbackBadge || prev.feedbackBadge,
                feedbackTitle: data.feedbackTitle || prev.feedbackTitle,
                feedbackSubtitle: data.feedbackSubtitle || prev.feedbackSubtitle,
              }));
            }
            if (Array.isArray(data.featuredFeedbacks)) {
              const visible = data.featuredFeedbacks.filter(
                (fb: ReviewItem) => fb.showOnHome !== false
              );
              if (visible.length > 0) {
                setReviews(visible);
              }
            }
          }
        })
        .catch(() => undefined);
    };

    loadReviews();

    const handleUpdate = () => loadReviews();
    window.addEventListener("vergo_customization_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("vergo_customization_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Compute aggregate stats dynamically
  const totalCount = reviews.length;
  const avgRating =
    totalCount > 0
      ? (
          reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalCount
        ).toFixed(1)
      : "5.0";

  return (
    <section className="reviews-section" id="community-reviews">
      <div className="reviews-container">
        {/* Section Header */}
        <div className="reviews-header">
          <div className="reviews-title-area">
            <span className="reviews-eyebrow">{headerInfo.feedbackBadge}</span>
            <h2 className="reviews-title">{headerInfo.feedbackTitle}</h2>
            <p className="reviews-subtitle">
              {headerInfo.feedbackSubtitle}
            </p>
          </div>

          {/* Aggregate Rating Pill */}
          <div className="reviews-aggregate-card">
            <div className="aggregate-score-row">
              <span className="aggregate-stars">★★★★★</span>
              <span className="aggregate-score">{avgRating} / 5.0</span>
            </div>
            <span className="aggregate-count">Managed & Verified by Ateliers</span>
          </div>
        </div>

        {/* Dynamic Reviews Grid */}
        <div className="reviews-grid">
          {reviews.map((rev, idx) => (
            <div key={rev.id || idx} className="review-card">
              <div className="review-card-stars">
                {[...Array(rev.rating || 5)].map((_, i) => (
                  <span key={i} className="review-star">
                    ★
                  </span>
                ))}
              </div>

              <p className="review-comment">"{rev.comment}"</p>

              <div className="review-author-row">
                <div className="review-avatar">
                  {rev.name ? rev.name.charAt(0) : "V"}
                </div>
                <div className="review-author-info">
                  <div className="review-name-wrap">
                    <span className="review-name">{rev.name}</span>
                    <span className="review-badge">
                      <svg
                        className="w-3 h-3 text-emerald-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      VERIFIED BUYER
                    </span>
                  </div>
                  <span className="review-garment">
                    {rev.garment || "Vergo Heavyweight Drop"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
