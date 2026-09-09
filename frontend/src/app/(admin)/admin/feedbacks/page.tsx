"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

interface AdminReview {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  customerId: string;
  reviewerName: string;
  reviewerEmail: string;
  rating: number;
  comment: string;
  isHidden: boolean;
  date: string;
  images: string[];
}

export default function AdminFeedbacksPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Lightbox modal state
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Delete modal state
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReviews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/admin/reviews");
      if (!res || !res.ok) throw new Error(`Unable to fetch reviews (${res?.status || "error"})`);
      const data = (await res.json()) as AdminReview[];
      setReviews(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load customer feedback.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Search text filter
      const matchesSearch =
        searchQuery === "" ||
        r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reviewerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reviewerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.comment.toLowerCase().includes(searchQuery.toLowerCase());

      // Rating filter
      const matchesRating =
        ratingFilter === "all" || r.rating === parseInt(ratingFilter, 10);

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "visible" && !r.isHidden) ||
        (statusFilter === "hidden" && r.isHidden);

      return matchesSearch && matchesRating && matchesStatus;
    });
  }, [reviews, searchQuery, ratingFilter, statusFilter]);

  // Calculated Metrics for Admin Analysis
  const metrics = useMemo(() => {
    if (reviews.length === 0) {
      return {
        total: 0,
        average: "0.0",
        positivePercent: 0,
        hiddenCount: 0,
        ratingCount: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = (sum / total).toFixed(1);

    const positive = reviews.filter((r) => r.rating >= 4).length;
    const positivePercent = Math.round((positive / total) * 100);
    const hiddenCount = reviews.filter((r) => r.isHidden).length;

    const ratingCount: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (ratingCount[r.rating] !== undefined) ratingCount[r.rating]++;
    });

    return {
      total,
      average,
      positivePercent,
      hiddenCount,
      ratingCount,
    };
  }, [reviews]);

  // Actions: Toggle Visibility
  const handleToggleVisibility = async (reviewId: string) => {
    try {
      const res = await authenticatedFetch(`/admin/reviews/${reviewId}/toggle-visibility`, {
        method: "PATCH",
      });
      if (!res || !res.ok) throw new Error("Failed to update visibility.");
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, isHidden: !r.isHidden } : r))
      );
    } catch (err: any) {
      alert(err?.message || "Could not toggle review visibility.");
    }
  };

  // Actions: Delete Review
  const handleDeleteReview = async () => {
    if (!deletingReviewId) return;
    setIsDeleting(true);
    try {
      const res = await authenticatedFetch(`/admin/reviews/${deletingReviewId}`, {
        method: "DELETE",
      });
      if (!res || !res.ok) throw new Error("Failed to delete review.");
      setReviews((prev) => prev.filter((r) => r.id !== deletingReviewId));
      setDeletingReviewId(null);
    } catch (err: any) {
      alert(err?.message || "Could not delete review.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-wider uppercase text-white">
            CUSTOMER FEEDBACK & SENTIMENT
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Analyze customer preferences, fit sentiment, and moderate product reviews.
          </p>
        </div>
        <button
          onClick={fetchReviews}
          className="px-4 py-2 bg-[#18181c] hover:bg-[#222226] text-xs font-bold text-gray-300 rounded-lg border border-white/10 transition-colors flex items-center gap-2 self-start md:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          REFRESH DATA
        </button>
      </div>

      {/* Overview Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TOTAL FEEDBACKS</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-white">{metrics.total}</span>
            <span className="text-xs text-gray-400">Reviews submitted</span>
          </div>
        </div>

        <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">AVERAGE RATING</span>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-3xl font-black text-[#00FF9D]">{metrics.average}</span>
            <div className="flex text-[#00FF9D] text-lg">
              {"★".repeat(Math.round(parseFloat(metrics.average)))}
              <span className="text-gray-600">{"★".repeat(5 - Math.round(parseFloat(metrics.average)))}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">POSITIVE SATISFACTION</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-emerald-400">{metrics.positivePercent}%</span>
            <span className="text-xs text-gray-400">4★ & 5★ ratings</span>
          </div>
        </div>

        <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">MODERATION STATUS</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-amber-400">{metrics.hiddenCount}</span>
            <span className="text-xs text-gray-400">Hidden from customers</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#111113] border border-white/10 p-4 rounded-xl mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search by product, customer name or review text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#18181c] border border-white/10 text-white text-xs px-4 py-2.5 pl-10 rounded-lg focus:outline-none focus:border-[#00FF9D]/50 transition-colors"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Rating Dropdown */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-[#18181c] border border-white/10 text-white text-xs px-3 py-2.5 rounded-lg focus:outline-none focus:border-[#00FF9D]/50"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars (Excellent)</option>
            <option value="4">4 Stars (Great)</option>
            <option value="3">3 Stars (Average)</option>
            <option value="2">2 Stars (Poor)</option>
            <option value="1">1 Star (Terrible)</option>
          </select>

          {/* Visibility Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#18181c] border border-white/10 text-white text-xs px-3 py-2.5 rounded-lg focus:outline-none focus:border-[#00FF9D]/50"
          >
            <option value="all">All Statuses</option>
            <option value="visible">Visible Only</option>
            <option value="hidden">Hidden Only</option>
          </select>
        </div>
      </div>

      {/* Feedback Items Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="inline-block w-8 h-8 border-2 border-t-[#00FF9D] border-gray-600 rounded-full animate-spin mb-3"></div>
          <p className="text-xs uppercase tracking-widest font-bold">Loading Customer Feedbacks...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-center text-xs font-semibold">
          {error}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-[#111113] border border-white/10 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No customer reviews match your search or filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`bg-[#111113] border ${
                review.isHidden ? "border-amber-500/40 bg-amber-950/5" : "border-white/10"
              } rounded-xl p-5 transition-all hover:border-white/20`}
            >
              <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center pb-4 border-b border-white/5">
                {/* Product Info */}
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-black flex-shrink-0">
                    <Image
                      src={review.productImage || "/logo.png"}
                      alt={review.productName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <Link
                      href={`/collection/${review.productId}`}
                      target="_blank"
                      className="font-bold text-sm text-white hover:text-[#00FF9D] transition-colors"
                    >
                      {review.productName}
                    </Link>
                    <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                      <span>Customer: <strong className="text-gray-200">{review.reviewerName}</strong></span>
                      <span>({review.reviewerEmail})</span>
                    </div>
                  </div>
                </div>

                {/* Rating & Status */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex text-[#00FF9D] text-sm justify-end">
                      {"★".repeat(review.rating)}
                      <span className="text-gray-600">{"★".repeat(5 - review.rating)}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{formatDate(review.date)}</span>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded tracking-wider uppercase ${
                      review.isHidden
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {review.isHidden ? "HIDDEN" : "VISIBLE"}
                  </span>
                </div>
              </div>

              {/* Comment Content */}
              <div className="py-4">
                <div className="max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-xs text-gray-200 leading-relaxed font-medium whitespace-pre-line">
                    {review.comment}
                  </p>
                </div>

                {/* Attached Images */}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {review.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImage(img)}
                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 hover:border-[#00FF9D] transition-colors cursor-pointer"
                      >
                        <Image src={img} alt="Attachment" fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Moderation Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(review.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    review.isHidden
                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30"
                  }`}
                >
                  {review.isHidden ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      SHOW REVIEW
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 013.682-.813c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m-5.858 5.908a3 3 0 11-4.243-4.243" />
                      </svg>
                      HIDE REVIEW
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingReviewId(review.id)}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  DELETE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setActiveImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute top-4 right-4 text-white text-2xl bg-black/60 w-10 h-10 rounded-full flex items-center justify-center hover:bg-black"
            >
              ✕
            </button>
            <Image
              src={activeImage}
              alt="Enlarged Attachment"
              width={800}
              height={600}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingReviewId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181c] border border-white/15 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#111113]">
              <h3 className="text-sm font-black text-red-400 uppercase tracking-wider">DELETE REVIEW</h3>
              <button
                onClick={() => setDeletingReviewId(null)}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                Are you sure you want to permanently delete this customer review? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setDeletingReviewId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-transparent border border-white/20 text-xs font-bold text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteReview}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-red-500 text-xs font-bold text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
