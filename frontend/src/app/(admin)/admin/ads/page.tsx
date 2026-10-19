"use client";

import React, { useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";
import Link from "next/link";

export interface AdCampaign {
  id: string;
  title: string;
  badge?: string;
  description?: string;
  type: "image" | "video";
  mediaUrl: string;
  destinationUrl?: string;
  ctaText?: string;
  isActive: boolean;
  placement?: string;
  createdAt?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function AdminAdsPage() {
  const { addNotification } = useAdmin();

  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [allSettings, setAllSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdCampaign | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"image" | "video">("image");
  const [formMediaUrl, setFormMediaUrl] = useState("");
  const [formDestinationUrl, setFormDestinationUrl] = useState("/collection");
  const [formCtaText, setFormCtaText] = useState("EXPLORE DROP");
  const [formPlacement, setFormPlacement] = useState("home_spotlight");
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete Confirmation Modal State
  const [adToDelete, setAdToDelete] = useState<AdCampaign | null>(null);

  // Load customizations
  const fetchAds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/customization`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load advertisements.");
      const data = await res.json();
      setAllSettings(data);
      setAds(Array.isArray(data.ads) ? data.ads : []);
    } catch (err: any) {
      addNotification(err.message || "Failed to load ads.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token =
      sessionStorage.getItem("vergo_access_token") ||
      localStorage.getItem("vergo_access_token");
    if (!token) {
      setUnauthorized(true);
      setIsLoading(false);
      return;
    }
    fetchAds();
  }, []);

  const openCreateModal = () => {
    setEditingAd(null);
    setFormTitle("");
    setFormBadge("FEATURED CAMPAIGN");
    setFormDescription("");
    setFormType("image");
    setFormMediaUrl("");
    setFormDestinationUrl("/collection");
    setFormCtaText("EXPLORE DROP");
    setFormPlacement("home_spotlight");
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (ad: AdCampaign) => {
    setEditingAd(ad);
    setFormTitle(ad.title || "");
    setFormBadge(ad.badge || "");
    setFormDescription(ad.description || "");
    setFormType(ad.type || "image");
    setFormMediaUrl(ad.mediaUrl || "");
    setFormDestinationUrl(ad.destinationUrl || "/collection");
    setFormCtaText(ad.ctaText || "EXPLORE DROP");
    setFormPlacement(ad.placement || "home_spotlight");
    setFormIsActive(ad.isActive ?? true);
    setIsModalOpen(true);
  };

  const saveAdsToBackend = async (newAdsList: AdCampaign[]) => {
    const token =
      sessionStorage.getItem("vergo_access_token") ||
      localStorage.getItem("vergo_access_token");
    if (!token) {
      addNotification("Authentication session expired. Please log in again.", "error");
      return false;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...allSettings,
        ads: newAdsList,
      };

      const res = await fetch(`${API_URL}/customization`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save advertisement.");
      }

      const updated = await res.json();
      setAllSettings(updated);
      setAds(Array.isArray(updated.ads) ? updated.ads : newAdsList);
      addNotification("Ads updated successfully.", "success");
      return true;
    } catch (err: any) {
      addNotification(err.message || "Error saving advertisement.", "error");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      addNotification("Campaign title is required.", "error");
      return;
    }
    if (!formMediaUrl.trim()) {
      addNotification("Media URL (image or video) is required.", "error");
      return;
    }

    let updatedList: AdCampaign[];

    if (editingAd) {
      updatedList = ads.map((item) =>
        item.id === editingAd.id
          ? {
              ...item,
              title: formTitle.trim(),
              badge: formBadge.trim(),
              description: formDescription.trim(),
              type: formType,
              mediaUrl: formMediaUrl.trim(),
              destinationUrl: formDestinationUrl.trim() || "/collection",
              ctaText: formCtaText.trim() || "EXPLORE DROP",
              placement: formPlacement,
              isActive: formIsActive,
            }
          : item
      );
    } else {
      const newAd: AdCampaign = {
        id: `ad-${Date.now()}`,
        title: formTitle.trim(),
        badge: formBadge.trim(),
        description: formDescription.trim(),
        type: formType,
        mediaUrl: formMediaUrl.trim(),
        destinationUrl: formDestinationUrl.trim() || "/collection",
        ctaText: formCtaText.trim() || "EXPLORE DROP",
        placement: formPlacement,
        isActive: formIsActive,
        createdAt: new Date().toISOString(),
      };
      updatedList = [newAd, ...ads];
    }

    const ok = await saveAdsToBackend(updatedList);
    if (ok) {
      setIsModalOpen(false);
    }
  };

  const toggleAdActive = async (id: string) => {
    const updated = ads.map((ad) =>
      ad.id === id ? { ...ad, isActive: !ad.isActive } : ad
    );
    await saveAdsToBackend(updated);
  };

  const confirmDeleteAd = async () => {
    if (!adToDelete) return;
    const updated = ads.filter((ad) => ad.id !== adToDelete.id);
    const ok = await saveAdsToBackend(updated);
    if (ok) {
      setAdToDelete(null);
    }
  };

  if (unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h2 className="text-lg font-bold text-red-500 tracking-wider uppercase mb-2">ACCESS UNAUTHORIZED</h2>
        <p className="text-xs text-[#8e8e93] uppercase font-semibold">You must be logged in as an Administrator to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#50C878] shadow-[0_0_8px_#50C878]" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#50C878]">CAMPAIGN & AD CENTER</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">ADVERTISEMENTS</h1>
          <p className="text-xs text-[#8e8e93] mt-1">
            Control video & image ads, promotional banners, and campaign showcases displayed on the storefront.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 bg-[#50C878] hover:bg-[#43a864] text-black font-extrabold text-xs px-5 py-2.5 rounded transition uppercase tracking-wider shadow-lg shadow-[#50C878]/10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>NEW AD CAMPAIGN</span>
        </button>
      </div>

      {/* Ads List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px] border border-[rgba(255,255,255,0.06)] rounded-lg bg-[#0d0d0f]">
          <p className="text-xs text-[#8e8e93] uppercase font-bold tracking-widest animate-pulse">
            LOADING CAMPAIGNS...
          </p>
        </div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-[rgba(255,255,255,0.12)] rounded-lg bg-[#0d0d0f]/50 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-[#8e8e93]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">NO AD CAMPAIGNS FOUND</h3>
          <p className="text-xs text-[#8e8e93] max-w-sm mb-4">
            You have not configured any advertisements yet. Create your first video or image ad to showcase on the home page.
          </p>
          <button
            onClick={openCreateModal}
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2 rounded transition uppercase tracking-wider"
          >
            + CREATE FIRST AD
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className={`flex flex-col bg-[#0d0d0f] border rounded-lg overflow-hidden transition-all duration-200 ${
                ad.isActive
                  ? "border-[rgba(255,255,255,0.12)] hover:border-[#50C878]/50 shadow-md"
                  : "border-red-900/30 opacity-70"
              }`}
            >
              {/* Media Preview Box */}
              <div className="relative aspect-video w-full bg-black/60 overflow-hidden border-b border-[rgba(255,255,255,0.06)]">
                {ad.type === "video" ? (
                  <video
                    src={ad.mediaUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    autoPlay
                  />
                ) : (
                  <img
                    src={ad.mediaUrl}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Badges Over Media */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/80 backdrop-blur border border-white/10 text-white tracking-wider">
                    {ad.type === "video" ? "VIDEO AD" : "IMAGE AD"}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-wider ${
                      ad.isActive
                        ? "bg-[#50C878] text-black"
                        : "bg-red-500/20 text-red-400 border border-red-500/40"
                    }`}
                  >
                    {ad.isActive ? "ACTIVE" : "PAUSED"}
                  </span>
                </div>
              </div>

              {/* Ad Info Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {ad.badge && (
                      <span className="text-[9px] font-black text-[#50C878] uppercase tracking-widest">
                        {ad.badge}
                      </span>
                    )}
                    <span className="text-[9px] text-[#666] uppercase">|</span>
                    <span className="text-[9px] text-[#8e8e93] uppercase tracking-wider font-mono">
                      {ad.placement || "home_spotlight"}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-white tracking-tight uppercase leading-snug">
                    {ad.title}
                  </h3>

                  {ad.description && (
                    <p className="text-xs text-[#a1a1aa] mt-1.5 line-clamp-2 leading-relaxed">
                      {ad.description}
                    </p>
                  )}
                </div>

                {/* Link & CTA Info */}
                <div className="pt-2 border-t border-[rgba(255,255,255,0.06)] text-[11px] text-[#8e8e93] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="uppercase text-[9px] tracking-wider text-[#666]">CTA:</span>
                    <span className="text-white font-bold">{ad.ctaText || "EXPLORE"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="uppercase text-[9px] tracking-wider text-[#666]">TARGET:</span>
                    <span className="text-[#50C878] font-mono text-[10px] truncate max-w-[180px]">
                      {ad.destinationUrl || "/collection"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggleAdActive(ad.id)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded transition ${
                      ad.isActive
                        ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                        : "bg-[#50C878]/10 text-[#50C878] hover:bg-[#50C878]/20 border border-[#50C878]/20"
                    }`}
                  >
                    {ad.isActive ? "PAUSE" : "ACTIVATE"}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(ad)}
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white border border-white/10 transition"
                      title="Edit Ad"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => setAdToDelete(ad)}
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                      title="Delete Ad"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121216] border border-[rgba(255,255,255,0.12)] rounded-xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#50C878] uppercase tracking-widest">
                  {editingAd ? "UPDATE CAMPAIGN" : "CREATE NEW CAMPAIGN"}
                </span>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  {editingAd ? "EDIT ADVERTISEMENT" : "NEW ADVERTISEMENT"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8e8e93] hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Ad Title */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8e8e93] mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. THE ARCHIVAL HEAVYWEIGHT CAPSULE"
                  required
                  className="w-full bg-[#18181c] border border-[rgba(255,255,255,0.1)] rounded px-3 py-2 text-white text-sm focus:border-[#50C878] outline-none"
                />
              </div>

              {/* Badge & Placement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8e8e93] mb-1">
                    Status Eyebrow Badge
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="e.g. FEATURED CAMPAIGN"
                    className="w-full bg-[#18181c] border border-[rgba(255,255,255,0.1)] rounded px-3 py-2 text-white text-sm focus:border-[#50C878] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8e8e93] mb-1">
                    Storefront Placement
                  </label>
                  <select
                    value={formPlacement}
                    onChange={(e) => setFormPlacement(e.target.value)}
                    className="w-full bg-[#18181c] border border-[rgba(255,255,255,0.1)] rounded px-3 py-2 text-white text-sm focus:border-[#50C878] outline-none"
                  >
                    <option value="home_spotlight">Home Spotlight Section</option>
                    <option value="home_video_billboard">Home Video Billboard</option>
                    <option value="collection_banner">Collection Header Banner</option>
                  </select>
                </div>
              </div>

              {/* Ad Type Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8e8e93] mb-1.5">
                  Media Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormType("image")}
                    className={`py-2 px-4 rounded text-xs font-bold uppercase tracking-wider border transition flex items-center justify-center gap-2 ${
                      formType === "image"
                        ? "bg-white text-black border-white"
                        : "bg-[#18181c] text-[#8e8e93] border-[rgba(255,255,255,0.1)] hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>IMAGE AD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType("video")}
                    className={`py-2 px-4 rounded text-xs font-bold uppercase tracking-wider border transition flex items-center justify-center gap-2 ${
                      formType === "video"
                        ? "bg-white text-black border-white"
                        : "bg-[#18181c] text-[#8e8e93] border-[rgba(255,255,255,0.1)] hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>VIDEO AD</span>
                  </button>
                </div>
              </div>

              {/* Media URL */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8e8e93] mb-1">
                  {formType === "video" ? "Video URL (MP4 / WebM / Cloudinary) *" : "Image URL (Cloudinary / Direct) *"}
                </label>
                <input
                  type="url"
                  value={formMediaUrl}
                  onChange={(e) => setFormMediaUrl(e.target.value)}
                  placeholder={
                    formType === "video"
                      ? "https://res.cloudinary.com/.../video.mp4"
                      : "https://res.cloudinary.com/.../ad-banner.jpg"
                  }
                  required
                  className="w-full bg-[#18181c] border border-[rgba(255,255,255,0.1)] rounded px-3 py-2 text-white text-sm font-mono focus:border-[#50C878] outline-none"
                />
                <p className="text-[10px] text-[#666] mt-1">
                  {formType === "video"
                    ? "Enter direct video file URL. Video will autoplay muted in loop."
                    : "Enter Cloudinary image URL or public HTTPS image link."}
                </p>
              </div>

              {/* Live Preview */}
              {formMediaUrl.trim() && (
                <div className="border border-[rgba(255,255,255,0.1)] rounded p-3 bg-black/40">
                  <span className="block text-[9px] font-bold uppercase text-[#8e8e93] mb-2">Live Media Preview</span>
                  <div className="relative aspect-video w-full rounded overflow-hidden bg-black flex items-center justify-center">
                    {formType === "video" ? (
                      <video
                        src={formMediaUrl}
                        className="w-full h-full object-cover"
                        controls
                        muted
                      />
                    ) : (
                      <img
                        src={formMediaUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Target Link & CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8e8e93] mb-1">
                    Destination URL
                  </label>
                  <input
                    type="text"
                    value={formDestinationUrl}
                    onChange={(e) => setFormDestinationUrl(e.target.value)}
                    placeholder="/collection"
                    className="w-full bg-[#18181c] border border-[rgba(255,255,255,0.1)] rounded px-3 py-2 text-white text-sm focus:border-[#50C878] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8e8e93] mb-1">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={formCtaText}
                    onChange={(e) => setFormCtaText(e.target.value)}
                    placeholder="EXPLORE DROP"
                    className="w-full bg-[#18181c] border border-[rgba(255,255,255,0.1)] rounded px-3 py-2 text-white text-sm focus:border-[#50C878] outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8e8e93] mb-1">
                  Campaign Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Engineered with 280 GSM heavyweight cotton for archival silhouette..."
                  className="w-full bg-[#18181c] border border-[rgba(255,255,255,0.1)] rounded px-3 py-2 text-white text-sm focus:border-[#50C878] outline-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="formIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#50C878] rounded cursor-pointer"
                />
                <label htmlFor="formIsActive" className="text-xs text-white font-bold cursor-pointer select-none">
                  PUBLISH AD IMMEDIATELY (ACTIVE)
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded text-xs font-bold text-[#8e8e93] hover:text-white transition uppercase tracking-wider"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded text-xs font-extrabold bg-[#50C878] hover:bg-[#43a864] text-black transition uppercase tracking-wider disabled:opacity-50"
                >
                  {isSaving ? "SAVING..." : editingAd ? "UPDATE CAMPAIGN" : "CREATE CAMPAIGN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {adToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121216] border border-red-500/20 rounded-xl w-full max-w-md p-6 shadow-2xl animate-scale-up space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">CONFIRM DELETION</h3>
                <p className="text-xs text-[#8e8e93]">This action will remove the advertisement campaign.</p>
              </div>
            </div>

            <p className="text-xs text-[#a1a1aa] bg-black/40 p-3 rounded border border-white/5">
              Are you sure you want to delete <span className="text-white font-bold">"{adToDelete.title}"</span>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdToDelete(null)}
                className="px-4 py-2 rounded text-xs font-bold text-[#8e8e93] hover:text-white transition uppercase tracking-wider"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={confirmDeleteAd}
                disabled={isSaving}
                className="px-5 py-2 rounded text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white transition uppercase tracking-wider disabled:opacity-50"
              >
                {isSaving ? "DELETING..." : "DELETE AD"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
