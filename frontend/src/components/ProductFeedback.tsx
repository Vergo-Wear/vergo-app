"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";

export interface Review {
  id: string;
  productId: string;
  customerId?: string;
  rating: number;
  reviewerName: string;
  comment: string;
  date: string;
  images?: string[];
  isVerified?: boolean;
}

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
  productId: string;
  productCategory: string;
  autoOpenForm?: boolean;
}

export default function ProductFeedback({ productId, autoOpenForm }: ProductFeedbackProps) {
  // Reviews are loaded from and saved to the backend.
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
  const [canReview, setCanReview] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [myReviewId, setMyReviewId] = useState<string | null>(null);
  const [myCustomerId, setMyCustomerId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState("");
  const [comment, setComment] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openMenuReviewId, setOpenMenuReviewId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuReviewId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFormOpen(false);
    };
    if (isFormOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFormOpen]);

  const loadEligibilityAndMine = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const token = sessionStorage.getItem("vergo_access_token");
    if (token) {
      fetch(`${apiUrl}/products/${productId}/reviews/eligibility`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.canReview === "boolean") {
            setCanReview(data.canReview);
          }
        })
        .catch(() => setCanReview(false));

      fetch(`${apiUrl}/products/${productId}/reviews/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((myReview) => {
          if (myReview) {
            setHasExistingReview(true);
            setMyReviewId(myReview.id);
            setRating(myReview.rating || 0);
            setComment(myReview.comment || "");
            if (myReview.images && Array.isArray(myReview.images)) {
              setUploadedPhotos(myReview.images);
            }
          } else {
            setHasExistingReview(false);
            setMyReviewId(null);
          }
        })
        .catch(() => {});
    } else {
      setCanReview(false);
    }
  };

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(`${apiUrl}/products/${productId}/reviews`)
      .then((response) => {
        if (!response.ok) return [];
        return response.json() as Promise<Review[]>;
      })
      .then(setReviews)
      .catch((error) => {
        console.error(error);
        setReviews([]);
      });

    const storedUser = sessionStorage.getItem("vergo_user");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.customerId) setMyCustomerId(u.customerId);
        const nameStr = [u.firstName, u.lastName ? `${u.lastName.charAt(0)}.` : ""].filter(Boolean).join(" ");
        if (nameStr) {
          setReviewerName(nameStr);
        }
      } catch (e) {
        // Ignore parse error
      }
    }

    loadEligibilityAndMine();
  }, [productId]);

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

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 900;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve((e.target?.result as string) || "");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

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

    const allowedExtensions = [".png", ".jpg", ".jpeg", ".heiv", ".heic"];

    for (const file of filesArray) {
      const fileName = file.name.toLowerCase();
      const hasValidExt = allowedExtensions.some((ext) => fileName.endsWith(ext));

      if (!hasValidExt) {
        setFormError(`"File format not allowed. Only PNG, JPG, and HEIV photos up to 3MB are supported.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        setFormError("Images must be under 3MB each.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    Promise.all(filesArray.map((file) => compressImageFile(file)))
      .then((compressedImages) => {
        const validImages = compressedImages.filter(Boolean);
        setUploadedPhotos((prev) => [...prev, ...validImages].slice(0, 3));
      })
      .catch(() => {
        setFormError("Failed to compress image file.");
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

function validateReviewModeration(comment: string): { isValid: boolean; reason?: string } {
  const text = comment.trim();
  if (!text || text.length < 8) {
    return { isValid: false, reason: "Review comment must be at least 8 characters long." };
  }

  // 1. Check for promotional links/URLs
  const urlPattern = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|xyz|top|online|ru|net|org|site|click))/i;
  if (urlPattern.test(text)) {
    return {
      isValid: false,
      reason: "Promotional links, website URLs, and external domains are not permitted in product reviews.",
    };
  }

  // 2. Check for repeated character spam (e.g. "aaaaaa", "qwertyqwerty")
  const repeatedCharPattern = /(.)\1{5,}/i;
  if (repeatedCharPattern.test(text)) {
    return {
      isValid: false,
      reason: "Review contains repetitive spam characters or gibberish. Please provide clear feedback.",
    };
  }

  // 3. Check for repeated word spam (e.g. "fake fake fake fake fake")
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = new Map<string, number>();
  let maxRepeatedWord = 0;
  for (const word of words) {
    if (word.length > 2) {
      const count = (wordCount.get(word) || 0) + 1;
      wordCount.set(word, count);
      if (count > maxRepeatedWord) maxRepeatedWord = count;
    }
  }
  if (words.length >= 5 && maxRepeatedWord / words.length > 0.5) {
    return {
      isValid: false,
      reason: "Review contains repetitive spam phrases. Please provide constructive feedback.",
    };
  }

  // 4. Check for ALL CAPS shouting abuse (>15 chars, 90%+ uppercase)
  const lettersOnly = text.replace(/[^a-zA-Z]/g, "");
  if (lettersOnly.length >= 15) {
    const uppercaseLetters = lettersOnly.replace(/[^A-Z]/g, "").length;
    if (uppercaseLetters / lettersOnly.length > 0.9) {
      return {
        isValid: false,
        reason: "Excessive ALL-CAPS text detected. Please write your review using standard casing.",
      };
    }
  }

  // 5. Check for Hate Speech & Profanity
  const profanityList = [
    "bitch", "bastard", "cunt", "fuck", "fucking", "fucker", "shit", "shitty", "dick",
    "asshole", "motherfucker", "whore", "slut", "nigger", "nigga", "faggot", "retard",
    "pussy", "cock", "crap", "idiot", "dumbass", "bullshit"
  ];
  
  const textLower = text.toLowerCase();
  for (const word of profanityList) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(textLower)) {
      return {
        isValid: false,
        reason: "Your review contains profane language or hate speech flagged by our content policy. Honest feedback is welcome, but please keep language respectful.",
      };
    }
  }

  return { isValid: true };
}

  // Handle Form Submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (rating === 0) {
      setFormError("Please select a star rating.");
      return;
    }
    const moderation = validateReviewModeration(comment);
    if (!moderation.isValid) {
      setFormError(moderation.reason || "Review content violates moderation policy.");
      return;
    }

    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) {
      setFormError("Please sign in as a customer to submit a review.");
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/products/${productId}/reviews/mine`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rating, comment: comment.trim(), images: uploadedPhotos }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      setFormError(errData?.message || "Unable to save your review.");
      return;
    }
    const refreshed = await fetch(`${apiUrl}/products/${productId}/reviews`);
    if (refreshed.ok) {
      const updatedReviews = (await refreshed.json()) as Review[];
      setReviews(updatedReviews);
      const mine = updatedReviews.find((r) => r.customerId && r.customerId === myCustomerId);
      if (mine) setMyReviewId(mine.id);
    }

    // Show success message and update state
    setHasExistingReview(true);
    setFormSuccess(true);
    loadEligibilityAndMine();

    // Auto collapse form after brief delay
    setTimeout(() => {
      setFormSuccess(false);
      setIsFormOpen(false);
    }, 2000);
  };

  const handleEditMyReview = () => {
    setIsFormOpen(true);
    const element = document.getElementById("product-reviews-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDeleteMyReview = async () => {
    setFormError(null);
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) {
      setFormError("Please sign in to delete your review.");
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    try {
      const response = await fetch(`${apiUrl}/products/${productId}/reviews/mine`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Unable to delete review.");
      }
      const refreshed = await fetch(`${apiUrl}/products/${productId}/reviews`);
      if (refreshed.ok) {
        setReviews((await refreshed.json()) as Review[]);
      }
      setHasExistingReview(false);
      setMyReviewId(null);
      setRating(0);
      setComment("");
      setUploadedPhotos([]);
      setIsFormOpen(false);
      loadEligibilityAndMine();
    } catch (err: any) {
      setFormError(err?.message || "Failed to delete review.");
    }
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
        {canReview && (
          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`write-review-toggle-btn ${isFormOpen ? "active" : ""}`}
          >
            {isFormOpen ? "CLOSE FORM" : "WRITE A REVIEW"}
          </button>
        )}
      </div>

      {/* Review Form Modal Popup */}
      {isFormOpen && (
        <div
          className="review-modal-overlay"
          onClick={() => setIsFormOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Review Form"
        >
          <div
            className="review-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="review-modal-header">
              <h3 className="review-modal-title">
                {hasExistingReview ? "EDIT YOUR REVIEW" : "SHARE YOUR VERDICT"}
              </h3>
              <button
                type="button"
                className="size-guide-close-btn"
                onClick={() => setIsFormOpen(false)}
                aria-label="Close form"
              >
                ✕
              </button>
            </div>

            <div className="review-modal-body">
              <form onSubmit={handleSubmitReview} className="review-form">
                {formSuccess ? (
                  <div className="form-success-alert">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF9D" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <div>
                      <h4>{hasExistingReview ? "REVIEW UPDATED SUCCESSFULLY!" : "REVIEW SUBMITTED SUCCESSFULLY!"}</h4>
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
                        value={reviewerName || "Verified Customer"}
                        readOnly
                        disabled
                        className="form-input"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          color: "rgba(255, 255, 255, 0.6)",
                          cursor: "not-allowed",
                          border: "1px solid rgba(255, 255, 255, 0.1)"
                        }}
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
                          <span className="upload-subtext">Max 3MB per image. PNG, JPG, HEIV only</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".png,.jpg,.jpeg,.heiv,.heic,image/png,image/jpeg,image/heic,image/heif"
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
                        {hasExistingReview ? "UPDATE REVIEW" : "SUBMIT FEEDBACK"}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
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
                {latestReviews.map((review) => {
                  const isMyReview = (myReviewId && review.id === myReviewId) || (myCustomerId && review.customerId === myCustomerId);
                  return (
                    <div
                      key={review.id}
                      className={`review-card ${isMyReview ? "my-review-card" : ""}`}
                    >
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

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div className="review-card-stars">
                            <StarRating rating={review.rating} size={14} />
                          </div>

                          {isMyReview && (
                            <div className="review-actions-menu-container" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="review-three-dots-btn"
                                onClick={() => setOpenMenuReviewId(openMenuReviewId === review.id ? null : review.id)}
                                aria-label="Review options"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="12" cy="5" r="2.2" />
                                  <circle cx="12" cy="12" r="2.2" />
                                  <circle cx="12" cy="19" r="2.2" />
                                </svg>
                              </button>
                              {openMenuReviewId === review.id && (
                                <div className="review-menu-dropdown">
                                  <button
                                    type="button"
                                    className="review-menu-item"
                                    onClick={() => {
                                      setOpenMenuReviewId(null);
                                      handleEditMyReview();
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    <span>Edit</span>
                                  </button>
                                  <div className="review-menu-divider" />
                                  <button
                                    type="button"
                                    className="review-menu-item danger"
                                    onClick={() => {
                                      setOpenMenuReviewId(null);
                                      setIsDeleteConfirmOpen(true);
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveLightboxImg(photo);
                                }}
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
                  );
                })}
              </div>

              {/* Other Reviews displayed Horizontally */}
              {otherReviews.length > 0 && (
                <div className="other-feedbacks-container">
                  <h4 className="other-feedbacks-title">ADDITIONAL FEEDBACK</h4>
                  <div className="other-feedbacks-scroll">
                    {otherReviews.map((review) => {
                      const isMyReview = (myReviewId && review.id === myReviewId) || (myCustomerId && review.customerId === myCustomerId);
                      return (
                        <div
                          key={review.id}
                          className={`review-card other-card ${isMyReview ? "my-review-card" : ""}`}
                        >
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

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div className="review-card-stars">
                                <StarRating rating={review.rating} size={12} />
                              </div>

                              {isMyReview && (
                                <div className="review-actions-menu-container" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="review-three-dots-btn"
                                    onClick={() => setOpenMenuReviewId(openMenuReviewId === review.id ? null : review.id)}
                                    aria-label="Review options"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="12" cy="5" r="2.2" />
                                      <circle cx="12" cy="12" r="2.2" />
                                      <circle cx="12" cy="19" r="2.2" />
                                    </svg>
                                  </button>
                                  {openMenuReviewId === review.id && (
                                    <div className="review-menu-dropdown">
                                      <button
                                        type="button"
                                        className="review-menu-item"
                                        onClick={() => {
                                          setOpenMenuReviewId(null);
                                          handleEditMyReview();
                                        }}
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                        <span>Edit</span>
                                      </button>
                                      <div className="review-menu-divider" />
                                      <button
                                        type="button"
                                        className="review-menu-item danger"
                                        onClick={() => {
                                          setOpenMenuReviewId(null);
                                          setIsDeleteConfirmOpen(true);
                                        }}
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="3 6 5 6 21 6"></polyline>
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveLightboxImg(photo);
                                    }}
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
                      );
                    })}
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

      {/* Delete Confirmation Modal Popup */}
      {isDeleteConfirmOpen && (
        <div
          className="size-guide-modal-overlay"
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div
            className="size-guide-modal-content"
            style={{ maxWidth: "440px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-guide-modal-header" style={{ background: "#18181c" }}>
              <h3 className="size-guide-modal-title" style={{ color: "#ff4d4d" }}>
                DELETE REVIEW
              </h3>
              <button
                type="button"
                className="size-guide-close-btn"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="size-guide-modal-body" style={{ flexDirection: "column", gap: "20px", textAlign: "center", padding: "24px" }}>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.95rem", lineHeight: "1.5", margin: 0 }}>
                Are you sure you want to delete your review? This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  style={{
                    flex: 1,
                    padding: "10px 18px",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#ffffff",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    handleDeleteMyReview();
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 18px",
                    borderRadius: "8px",
                    background: "#ff4d4d",
                    border: "none",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
