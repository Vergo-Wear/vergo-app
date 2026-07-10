"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";

export interface Review {
  id: string;
  productId: number;
  rating: number;
  reviewerName: string;
  comment: string;
  date: string;
  images?: string[];
  isVerified?: boolean;
}

// Category-based high quality reviews for fallback
const CATEGORY_MOCK_REVIEWS: Record<string, Omit<Review, "productId">[]> = {
  "Hoodies & Sweatshirts": [
    {
      id: "mock-hs-1",
      rating: 5,
      reviewerName: "Achinthya K.",
      comment: "The cotton weave on this is incredibly dense and heavy. Standard fit is perfectly relaxed, exactly what I was hoping for. Warm, durable, and clean details.",
      date: "2026-06-25",
      isVerified: true,
    },
    {
      id: "mock-hs-2",
      rating: 4,
      reviewerName: "Dinuka P.",
      comment: "Excellent streetwear cut. Heavy weight is very comfortable. Feels like luxury tier wear. Hand washes well without shrinking.",
      date: "2026-06-12",
      isVerified: true,
    }
  ],
  "T-Shirts": [
    {
      id: "mock-ts-1",
      rating: 5,
      reviewerName: "Sahan R.",
      comment: "Perfect boxy fit. Heavyweight neck collar doesn't sag or stretch out. Vergo keeps hitting it out of the park with these minimalist designs.",
      date: "2026-06-28",
      isVerified: true,
    },
    {
      id: "mock-ts-2",
      rating: 4,
      reviewerName: "Amila D.",
      comment: "Thick cotton feel. Feels like a proper luxury tee rather than a cheap blank. Fit is oversized, so order normal size for boxy fit or size down for clean fit.",
      date: "2026-06-05",
      isVerified: true,
    }
  ],
  "Pants & Denim": [
    {
      id: "mock-pd-1",
      rating: 5,
      reviewerName: "Menaka P.",
      comment: "Stitching is top notch. The fabric has an amazing texture and holds its shape beautifully. Pocket placement is highly functional.",
      date: "2026-06-22",
      isVerified: true,
    },
    {
      id: "mock-pd-2",
      rating: 4,
      reviewerName: "Kasun T.",
      comment: "Great drape and cut. Heavy fabric, perfect for cooler weather or evenings out. True to size and adjustable features are high quality.",
      date: "2026-05-18",
      isVerified: true,
    }
  ],
  "Accessories": [
    {
      id: "mock-ac-1",
      rating: 5,
      reviewerName: "Tharindu M.",
      comment: "Simple, high-quality accessory. Detailings are sharp and subtle, matching all my other outfits perfectly. Durable build.",
      date: "2026-06-26",
      isVerified: true,
    },
    {
      id: "mock-ac-2",
      rating: 4,
      reviewerName: "Ruwan K.",
      comment: "Really clean aesthetics. The materials feel solid. Vergo branding is nicely understated.",
      date: "2026-06-02",
      isVerified: true,
    }
  ]
};

// Premium Star Rating Display Component
const StarRating = ({ rating, size = 16 }: { rating: number; size?: number }) => {
  return (
    <div style={{ display: "flex", gap: "3px" }}>
      {[1, 2, 3, 4, 5].map((index) => {
        const fillPercent = Math.max(0, Math.min(100, (rating - (index - 1)) * 100));
        
        return (
          <div key={index} style={{ position: "relative", width: `${size}px`, height: `${size}px` }}>
            {/* Empty Star */}
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="2"
              style={{ display: "block" }}
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            
            {/* Filled Star Overlay */}
            {fillPercent > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: `${fillPercent}%`,
                  overflow: "hidden",
                  height: "100%"
                }}
              >
                <svg
                  width={size}
                  height={size}
                  viewBox="0 0 24 24"
                  fill="#00FF9D"
                  stroke="#00FF9D"
                  strokeWidth="2"
                  style={{ display: "block" }}
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Interactive Star Selector for Form
interface StarRatingSelectorProps {
  rating: number;
  onChange: (rating: number) => void;
  hoverRating: number;
  onHoverChange: (rating: number) => void;
}

const StarRatingSelector = ({ rating, onChange, hoverRating, onHoverChange }: StarRatingSelectorProps) => {
  const activeRating = hoverRating > 0 ? hoverRating : rating;
  
  const ratingTexts: Record<number, string> = {
    1: "Terrible",
    2: "Poor",
    3: "Average",
    4: "Great",
    5: "Excellent"
  };

  return (
    <div className="star-selector-container">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((index) => {
          const isFilled = index <= activeRating;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onChange(index)}
              onMouseEnter={() => onHoverChange(index)}
              onMouseLeave={() => onHoverChange(0)}
              className="star-selector-btn"
              aria-label={`Rate ${index} Stars`}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill={isFilled ? "#00FF9D" : "none"}
                stroke={isFilled ? "#00FF9D" : "rgba(255,255,255,0.35)"}
                strokeWidth="2"
                className={`star-svg ${isFilled ? "filled" : ""}`}
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </button>
          );
        })}
        {activeRating > 0 && (
          <span className="star-text-indicator">{ratingTexts[activeRating]}</span>
        )}
      </div>
    </div>
  );
};

interface ProductFeedbackProps {
  productId: number;
  productCategory: string;
  autoOpenForm?: boolean;
}

export default function ProductFeedback({ productId, productCategory, autoOpenForm }: ProductFeedbackProps) {
  // Reviews state (both static mock and user-submitted local reviews)
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (autoOpenForm) {
      setIsFormOpen(true);
      const timer = setTimeout(() => {
        const element = document.getElementById("product-reviews-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoOpenForm]);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Form Fields State
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState("");
  const [comment, setComment] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate Mock reviews for the current product
  const initialMockReviews = useMemo(() => {
    const categoryReviews = CATEGORY_MOCK_REVIEWS[productCategory] || CATEGORY_MOCK_REVIEWS["T-Shirts"];
    return categoryReviews.map((r, index) => ({
      ...r,
      id: `mock-${productId}-${index}`,
      productId: productId,
    }));
  }, [productId, productCategory]);

  // Load reviews from local storage + combine with mocks
  useEffect(() => {
    const localKey = `vergo_product_reviews_${productId}`;
    const stored = localStorage.getItem(localKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Review[];
        setReviews([...parsed, ...initialMockReviews]);
      } catch (e) {
        setReviews(initialMockReviews);
      }
    } else {
      setReviews(initialMockReviews);
    }
  }, [productId, initialMockReviews]);

  // Computed metrics
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return {
        average: 0,
        total: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = parseFloat((sum / reviews.length).toFixed(1));
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    reviews.forEach((r) => {
      const rate = Math.round(r.rating) as 5 | 4 | 3 | 2 | 1;
      if (breakdown[rate] !== undefined) {
        breakdown[rate]++;
      }
    });

    return {
      average: avg,
      total: reviews.length,
      breakdown
    };
  }, [reviews]);

  // Split reviews into latest 2 and the remaining ones
  const latestReviews = useMemo(() => {
    return reviews.slice(0, 2);
  }, [reviews]);

  const otherReviews = useMemo(() => {
    return reviews.slice(2);
  }, [reviews]);

  // Handle image upload and base64 conversion
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    
    if (uploadedPhotos.length + filesArray.length > 3) {
      setFormError("Maximum 3 photos allowed per review.");
      return;
    }

    filesArray.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setFormError("Only image files are allowed.");
        return;
      }
      if (file.size > 1024 * 1024) {
        setFormError("Images must be under 1MB each to support fast caching.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setUploadedPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.onerror = () => {
        setFormError("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    });

    // Reset file input value so same file can be uploaded again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove photo from selection
  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Handle Form Submission
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (rating === 0) {
      setFormError("Please select a star rating.");
      return;
    }
    if (!reviewerName.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!comment.trim() || comment.length < 8) {
      setFormError("Please enter a review comment of at least 8 characters.");
      return;
    }

    const newReview: Review = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId,
      rating,
      reviewerName: reviewerName.trim(),
      comment: comment.trim(),
      date: new Date().toISOString().split("T")[0],
      images: uploadedPhotos,
      isVerified: true
    };

    // Save to LocalStorage
    const localKey = `vergo_product_reviews_${productId}`;
    const stored = localStorage.getItem(localKey);
    let userReviews: Review[] = [];
    if (stored) {
      try {
        userReviews = JSON.parse(stored) as Review[];
      } catch (err) {}
    }
    const updatedUserReviews = [newReview, ...userReviews];
    localStorage.setItem(localKey, JSON.stringify(updatedUserReviews));

    // Update state to prepend review
    setReviews([newReview, ...reviews]);

    // Show success message and clear form
    setFormSuccess(true);
    setRating(0);
    setReviewerName("");
    setComment("");
    setUploadedPhotos([]);

    // Auto collapse form after brief delay
    setTimeout(() => {
      setFormSuccess(false);
      setIsFormOpen(false);
    }, 2000);
  };

  // Formatted date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr.includes("-")) return dateStr; // already formatted or relative
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <section id="product-reviews-section" className="feedback-section">
      <div className="feedback-divider"></div>
      
      <div className="feedback-header">
        <h2 className="feedback-section-title">CUSTOMER RATINGS & REVIEWS</h2>
        {autoOpenForm && (
          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`write-review-toggle-btn ${isFormOpen ? "active" : ""}`}
          >
            {isFormOpen ? "CLOSE FORM" : "WRITE A REVIEW"}
          </button>
        )}
      </div>

      {/* Review Form - Collapsible container */}
      {autoOpenForm && (
        <div className={`review-form-wrapper ${isFormOpen ? "open" : ""}`}>
          <form onSubmit={handleSubmitReview} className="review-form">
            <h3 className="form-title">SHARE YOUR VERDICT</h3>
            
            {formSuccess ? (
              <div className="form-success-alert">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF9D" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <div>
                  <h4>REVIEW SUBMITTED SUCCESSFULLY!</h4>
                  <p>Thank you for sharing your feedback with the Vergo community.</p>
                </div>
              </div>
            ) : (
              <div className="form-grid">
                {/* Star Selection Row */}
                <div className="form-group">
                  <label className="form-label">YOUR RATING *</label>
                  <StarRatingSelector
                    rating={rating}
                    onChange={setRating}
                    hoverRating={hoverRating}
                    onHoverChange={setHoverRating}
                  />
                </div>

                {/* Reviewer Name Row */}
                <div className="form-group">
                  <label htmlFor="reviewerName" className="form-label">YOUR NAME *</label>
                  <input
                    id="reviewerName"
                    type="text"
                    placeholder="e.g. Sahan R."
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="form-input"
                    maxLength={50}
                    required
                  />
                </div>

                {/* Review Comment Textarea */}
                <div className="form-group full-width">
                  <label htmlFor="reviewComment" className="form-label">REVIEW COMMENT *</label>
                  <textarea
                    id="reviewComment"
                    placeholder="Tell us about the fabric weight, sizing, comfort, and general quality..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="form-textarea"
                    rows={4}
                    maxLength={1000}
                    required
                  ></textarea>
                </div>

                {/* Photo Upload Row */}
                <div className="form-group full-width">
                  <label className="form-label">ADD PHOTOS (MAX 3)</label>
                  <div className="photo-upload-container">
                    <div
                      className="photo-upload-zone"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="upload-icon">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span className="upload-text">CLICK TO UPLOAD PHOTOS</span>
                      <span className="upload-subtext">Max 1MB per image. JPG, PNG, WEBP</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        style={{ display: "none" }}
                      />
                    </div>

                    {uploadedPhotos.length > 0 && (
                      <div className="photo-previews-grid">
                        {uploadedPhotos.map((photo, index) => (
                          <div key={index} className="photo-preview-item">
                            <Image
                              src={photo}
                              alt={`Upload Preview ${index + 1}`}
                              fill
                              className="preview-img"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="remove-photo-btn"
                              aria-label="Remove Photo"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Action Row */}
                {formError && <div className="form-error-message">{formError}</div>}
                
                <div className="form-submit-container full-width">
                  <button type="submit" className="submit-review-btn">
                    SUBMIT FEEDBACK
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Main Feedback Layout Grid */}
      <div className="feedback-layout-grid">
        {/* Left Side: Summary & Distribution Dashboard */}
        <div className="feedback-summary-card">
          <div className="average-rating-container">
            <span className="average-rating-num">{stats.average}</span>
            <div className="average-rating-stars-wrapper">
              <StarRating rating={stats.average} size={22} />
              <span className="average-rating-count">Based on {stats.total} {stats.total === 1 ? "review" : "reviews"}</span>
            </div>
          </div>

          <div className="rating-distribution-list">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.breakdown[stars as 5 | 4 | 3 | 2 | 1] || 0;
              const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={stars} className="distribution-row">
                  <span className="distribution-stars-label">{stars} ★</span>
                  <div className="distribution-bar-bg">
                    <div
                      className="distribution-bar-fill"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <span className="distribution-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Reviews List */}
        <div className="reviews-list-container">
          {reviews.length === 0 ? (
            <div className="empty-reviews-state">
              <p>No reviews have been left for this apparel item yet.</p>
              <p className="empty-subtext">Be the first to share your size details and fit experience!</p>
            </div>
          ) : (
            <div className="reviews-layout-stack">
              {/* Latest 2 Reviews */}
              <div className="reviews-list">
                {latestReviews.map((review) => (
                  <div key={review.id} className="review-card">
                    <div className="review-card-header">
                      <div className="reviewer-info">
                        <div className="reviewer-avatar">
                          {review.reviewerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="reviewer-name-row">
                            <span className="reviewer-name">{review.reviewerName}</span>
                            {review.isVerified && (
                              <span className="verified-badge">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                VERIFIED BUYER
                              </span>
                            )}
                          </div>
                          <span className="review-date">{formatDate(review.date)}</span>
                        </div>
                      </div>

                      <div className="review-card-stars">
                        <StarRating rating={review.rating} size={14} />
                      </div>
                    </div>

                    <div className="review-card-content">
                      <p className="review-comment">{review.comment}</p>
                      
                      {review.images && review.images.length > 0 && (
                        <div className="review-attached-photos">
                          {review.images.map((photo, imgIndex) => (
                            <div
                              key={imgIndex}
                              className="review-photo-thumbnail"
                              onClick={() => setActiveLightboxImg(photo)}
                            >
                              <Image
                                src={photo}
                                alt={`${review.reviewerName}'s product upload ${imgIndex + 1}`}
                                fill
                                sizes="80px"
                                className="thumbnail-img"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Other Reviews displayed Horizontally */}
              {otherReviews.length > 0 && (
                <div className="other-feedbacks-container">
                  <h4 className="other-feedbacks-title">ADDITIONAL FEEDBACK</h4>
                  <div className="other-feedbacks-scroll">
                    {otherReviews.map((review) => (
                      <div key={review.id} className="review-card other-card">
                        <div className="review-card-header">
                          <div className="reviewer-info">
                            <div className="reviewer-avatar">
                              {review.reviewerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="reviewer-name-row">
                                <span className="reviewer-name">{review.reviewerName}</span>
                              </div>
                              <span className="review-date">{formatDate(review.date)}</span>
                            </div>
                          </div>

                          <div className="review-card-stars">
                            <StarRating rating={review.rating} size={12} />
                          </div>
                        </div>

                        <div className="review-card-content">
                          <p className="review-comment">{review.comment}</p>
                          
                          {review.images && review.images.length > 0 && (
                            <div className="review-attached-photos">
                              {review.images.map((photo, imgIndex) => (
                                <div
                                  key={imgIndex}
                                  className="review-photo-thumbnail"
                                  onClick={() => setActiveLightboxImg(photo)}
                                >
                                  <Image
                                    src={photo}
                                    alt={`${review.reviewerName}'s product upload ${imgIndex + 1}`}
                                    fill
                                    sizes="80px"
                                    className="thumbnail-img"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal (Blurred Overlay Backdrop) */}
      {activeLightboxImg && (
        <div
          className="lightbox-overlay"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setActiveLightboxImg(null)}
              aria-label="Close Lightbox"
            >
              ✕
            </button>
            <div className="lightbox-img-wrapper">
              <Image
                src={activeLightboxImg}
                alt="Product Feedback Full Resolution"
                fill
                sizes="90vw"
                className="lightbox-img"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
