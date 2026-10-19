"use client";

import React, { useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

interface StandardFeature {
  number: string;
  tag: string;
  title: string;
  description: string;
}

interface CustomizationSettings {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  highlightsTitle: string;
  highlightsSubtitle: string;
  newsletterTitle: string;
  newsletterSubtitle: string;
  aboutHeroBadge: string;
  aboutHeroTitle: string;
  aboutHeroSubtitle: string;
  brandStatementBadge: string;
  brandStatementTitle: string;
  brandStatementDescription: string;
  brandFoundingYear?: string;
  brandOrigin?: string;
  brandMissionTitle?: string;
  brandMissionDescription?: string;
  ownerBadge?: string;
  ownerTitle?: string;
  ownerSubtitle?: string;
  ownerName?: string;
  ownerRole?: string;
  ownerBio?: string;
  ownerQuote?: string;
  ownerImageUrl?: string;
  bankName: string;
  bankBranch: string;
  bankAccountName?: string;
  bankAccountNumber: string;
  standardBadge?: string;
  standardTitle?: string;
  standardSubtitle?: string;
  standardFeatures?: StandardFeature[];
  feedbackBadge?: string;
  feedbackTitle?: string;
  feedbackSubtitle?: string;
  aboutCollectionsBadge?: string;
  aboutCollectionsTitle?: string;
  aboutCollections?: Array<{
    label: string;
    title: string;
    subtitle: string;
    image: string;
    link?: string;
  }>;
  whatsappNumber?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function CustomizationPage() {
  const { addNotification } = useAdmin();

  const [settings, setSettings] = useState<CustomizationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const token =
      sessionStorage.getItem("vergo_access_token") ||
      localStorage.getItem("vergo_access_token");
    if (!token) {
      setUnauthorized(true);
      setIsLoading(false);
      return;
    }

    fetch(`${API_URL}/customization`, {
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load website settings.");
        return res.json();
      })
      .then((data) => {
        setSettings(data);
        setIsLoading(false);
      })
      .catch((err) => {
        addNotification(err.message || "Failed to load website settings.", "error");
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    // Input Validations
    if (settings.heroTitle.trim().length < 2) {
      addNotification("Hero title must be at least 2 characters.", "error");
      return;
    }
    if (settings.heroSubtitle.trim().length < 2) {
      addNotification("Hero subtitle must be at least 2 characters.", "error");
      return;
    }

    setIsSaving(true);
    try {
      let response = await authenticatedFetch("/customization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      // Fallback if authenticatedFetch returned null
      if (!response) {
        const token =
          sessionStorage.getItem("vergo_access_token") ||
          localStorage.getItem("vergo_access_token");
        if (token) {
          response = await fetch(`${API_URL}/customization`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(settings),
          });
        }
      }

      if (!response || !response.ok) {
        if (response && (response.status === 401 || response.status === 403)) {
          throw new Error("Access denied. Admin privileges required.");
        }
        const errData = response ? await response.json().catch(() => ({})) : {};
        throw new Error(errData.message || "Failed to update customizations.");
      }

      // Notify customer tabs via storage event and custom window event
      try {
        localStorage.setItem("vergo_customization_updated", Date.now().toString());
        window.dispatchEvent(new Event("vergo_customization_updated"));
      } catch {
        // storage quota/disabled fallback
      }

      addNotification("Website customizations successfully updated and published.", "success");
    } catch (err: any) {
      addNotification(err.message || "Failed to save website customization.", "error");
    } finally {
      setIsSaving(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-xs text-[#8e8e93] uppercase font-bold tracking-widest animate-pulse">LOADING CONFIGURATION...</p>
      </div>
    );
  }

  if (!settings) return null;

  // Real-time Validation check (character > 1 check)
  const isHeroTitleInvalid = settings.heroTitle.length > 1 && settings.heroTitle.trim().length < 2;
  const isHeroSubtitleInvalid = settings.heroSubtitle.length > 1 && settings.heroSubtitle.trim().length < 2;
  const isAboutTitleInvalid = settings.aboutHeroTitle.length > 1 && settings.aboutHeroTitle.trim().length < 2;
  const isBrandDescriptionInvalid = settings.brandStatementDescription.length > 1 && settings.brandStatementDescription.trim().length < 5;

  return (
    <div className="space-y-8 select-none text-xs">
      <div>
        <h2 className="text-sm font-bold tracking-widest text-white uppercase">WEBSITE CUSTOMIZATION</h2>
        <p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">Manage landing page layout headers, titles, newsletter forms and philosophy statements</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Landing Page Settings */}
          <div className="space-y-6">
            <div className="admin-card p-6">
              <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">HERO BANNER CONFIGURATION</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Hero Status Badge</label>
                  <input
                    type="text"
                    value={settings.heroBadge}
                    onChange={(e) => setSettings({ ...settings, heroBadge: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="e.g. AVAILABLE NOW"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Hero Title</label>
                  <textarea
                    rows={3}
                    value={settings.heroTitle}
                    onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                    style={{
                      borderColor: isHeroTitleInvalid ? "#ff4d4d" : undefined,
                      boxShadow: isHeroTitleInvalid ? "0 0 0 1px #ff4d4d" : undefined
                    }}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white font-mono-meta"
                    placeholder="Use \n for line break"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Hero Description</label>
                  <textarea
                    rows={2}
                    value={settings.heroSubtitle}
                    onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                    style={{
                      borderColor: isHeroSubtitleInvalid ? "#ff4d4d" : undefined,
                      boxShadow: isHeroSubtitleInvalid ? "0 0 0 1px #ff4d4d" : undefined
                    }}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Hero CTA Button Text</label>
                  <input
                    type="text"
                    value={settings.heroButtonText}
                    onChange={(e) => setSettings({ ...settings, heroButtonText: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Highlights Copy */}
            <div className="admin-card p-6">
              <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">NEW RELEASES HEADER</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Title</label>
                  <input
                    type="text"
                    value={settings.highlightsTitle}
                    onChange={(e) => setSettings({ ...settings, highlightsTitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Description</label>
                  <input
                    type="text"
                    value={settings.highlightsSubtitle}
                    onChange={(e) => setSettings({ ...settings, highlightsSubtitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Engineered for Longevity (The Vergo Standard) */}
            <div className="admin-card p-6">
              <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">THE VERGO STANDARD (LONGEVITY SECTION)</h3>
                  <p className="text-[10px] text-[#8e8e93] mt-0.5 uppercase">Homepage craftsmanship showcase & 4 feature pillars</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Badge</label>
                  <input
                    type="text"
                    value={settings.standardBadge ?? "THE VERGO STANDARD"}
                    onChange={(e) => setSettings({ ...settings, standardBadge: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="e.g. THE VERGO STANDARD"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Title</label>
                  <input
                    type="text"
                    value={settings.standardTitle ?? "ENGINEERED FOR LONGEVITY."}
                    onChange={(e) => setSettings({ ...settings, standardTitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white font-semibold"
                    placeholder="e.g. ENGINEERED FOR LONGEVITY."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Subtitle</label>
                  <textarea
                    rows={2}
                    value={settings.standardSubtitle ?? "Heavyweight construction, reinforced tension points, and authentic materials."}
                    onChange={(e) => setSettings({ ...settings, standardSubtitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="Description text under section heading"
                  />
                </div>

                {/* 4 Feature Pillars Customization */}
                <div className="pt-2">
                  <span className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-3">Feature Pillars (Cards 01 - 04)</span>
                  <div className="space-y-3">
                    {(settings.standardFeatures || [
                      { number: "01", tag: "CUSTOM DENSE WEAVE", title: "280 GSM Luxury Combed Cotton", description: "Structured heavyweight drape that holds shape wash after wash." },
                      { number: "02", tag: "ARCHIVAL TAILORING", title: "Reinforced Micro-Rib Collar", description: "Double-needle neckband binding for zero collar stretching." },
                      { number: "03", tag: "DECENTRALIZED PROOF", title: "100% Verified Authenticity", description: "Cryptographic ledger verification on every individual SKU." },
                      { number: "04", tag: "CITYPAK LOGISTICS", title: "Express Nationwide Dispatch", description: "24–48h courier delivery via Citypak with live SMS tracking." },
                    ]).map((feat, index) => (
                      <div key={index} className="p-3 bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-400 tracking-wider">PILLAR {feat.number || `0${index + 1}`}</span>
                          <input
                            type="text"
                            value={feat.number}
                            onChange={(e) => {
                              const updated = [...(settings.standardFeatures || [])];
                              if (!updated[index]) updated[index] = { ...feat };
                              updated[index] = { ...updated[index], number: e.target.value };
                              setSettings({ ...settings, standardFeatures: updated });
                            }}
                            className="w-16 bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded px-2 py-0.5 text-center text-xs text-white"
                            placeholder="01"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-medium text-[#8e8e93] uppercase mb-0.5">Tag / Category</label>
                            <input
                              type="text"
                              value={feat.tag}
                              onChange={(e) => {
                                const updated = [...(settings.standardFeatures || [])];
                                if (!updated[index]) updated[index] = { ...feat };
                                updated[index] = { ...updated[index], tag: e.target.value };
                                setSettings({ ...settings, standardFeatures: updated });
                              }}
                              className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-white"
                              placeholder="e.g. CUSTOM DENSE WEAVE"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-medium text-[#8e8e93] uppercase mb-0.5">Feature Title</label>
                            <input
                              type="text"
                              value={feat.title}
                              onChange={(e) => {
                                const updated = [...(settings.standardFeatures || [])];
                                if (!updated[index]) updated[index] = { ...feat };
                                updated[index] = { ...updated[index], title: e.target.value };
                                setSettings({ ...settings, standardFeatures: updated });
                              }}
                              className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-white font-medium"
                              placeholder="e.g. 280 GSM Luxury Combed Cotton"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-medium text-[#8e8e93] uppercase mb-0.5">Description</label>
                          <textarea
                            rows={2}
                            value={feat.description}
                            onChange={(e) => {
                              const updated = [...(settings.standardFeatures || [])];
                              if (!updated[index]) updated[index] = { ...feat };
                              updated[index] = { ...updated[index], description: e.target.value };
                              setSettings({ ...settings, standardFeatures: updated });
                            }}
                            className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-white"
                            placeholder="Structured heavyweight drape that holds shape..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Verified Community / Feedback Section Header */}
            <div className="admin-card p-6">
              <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">COMMUNITY FEEDBACK HEADER</h3>
                <p className="text-[10px] text-[#8e8e93] mt-0.5 uppercase">Headline and description for "Tested on the Streets" section</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Eyebrow Badge</label>
                  <input
                    type="text"
                    value={settings.feedbackBadge ?? "VERIFIED COMMUNITY"}
                    onChange={(e) => setSettings({ ...settings, feedbackBadge: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="e.g. VERIFIED COMMUNITY"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Title</label>
                  <input
                    type="text"
                    value={settings.feedbackTitle ?? "TESTED ON THE STREETS."}
                    onChange={(e) => setSettings({ ...settings, feedbackTitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white font-semibold"
                    placeholder="e.g. TESTED ON THE STREETS."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Subtitle</label>
                  <input
                    type="text"
                    value={settings.feedbackSubtitle ?? "Authentic feedback from verified collectors across the island."}
                    onChange={(e) => setSettings({ ...settings, feedbackSubtitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="e.g. Authentic feedback from verified collectors across the island."
                  />
                </div>
              </div>
            </div>

            {/* Newsletter Setup */}
            <div className="admin-card p-6">
              <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">NEWSLETTER CALLOUT</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Header Title</label>
                  <input
                    type="text"
                    value={settings.newsletterTitle}
                    onChange={(e) => setSettings({ ...settings, newsletterTitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Description Text</label>
                  <textarea
                    rows={2}
                    value={settings.newsletterSubtitle}
                    onChange={(e) => setSettings({ ...settings, newsletterSubtitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="admin-card p-6">
              <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">BANK TRANSFER DETAILS</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Bank Name</label>
                  <input
                    type="text"
                    value={settings.bankName}
                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="e.g. Commercial Bank"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Branch</label>
                  <input
                    type="text"
                    value={settings.bankBranch}
                    onChange={(e) => setSettings({ ...settings, bankBranch: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="e.g. Colombo Main Branch"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Account Name</label>
                  <input
                    type="text"
                    value={settings.bankAccountName ?? ""}
                    onChange={(e) => setSettings({ ...settings, bankAccountName: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="e.g. VERGO ATELIER PVT LTD"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Account Number</label>
                  <input
                    type="text"
                    value={settings.bankAccountNumber}
                    onChange={(e) => setSettings({ ...settings, bankAccountNumber: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="e.g. 1234 - 5678 - 9012"
                  />
                </div>
              </div>
            </div>

            {/* Customer Concierge WhatsApp Settings */}
            <div className="admin-card p-6">
              <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">WHATSAPP CONCIERGE</h3>
                <p className="text-[10px] text-[#8e8e93] mt-0.5 uppercase">Floating WhatsApp contact button displayed on Home, Collection, and About Us pages</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    WhatsApp Phone Number (with Country Code)
                  </label>
                  <input
                    type="text"
                    value={settings.whatsappNumber ?? "+94771234567"}
                    onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white font-mono"
                    placeholder="e.g. +94771234567 or 0771234567"
                  />
                  <p className="text-[11px] text-[#8e8e93] mt-1.5">
                    Customers clicking the floating button on the website will be directed to this number on WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* About Page Settings */}
          <div className="space-y-6">
            <div className="admin-card p-6">
              <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">ABOUT PAGE HERO</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Philosophy Tag</label>
                  <input
                    type="text"
                    value={settings.aboutHeroBadge}
                    onChange={(e) => setSettings({ ...settings, aboutHeroBadge: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">About Heading</label>
                  <input
                    type="text"
                    value={settings.aboutHeroTitle}
                    onChange={(e) => setSettings({ ...settings, aboutHeroTitle: e.target.value })}
                    style={{
                      borderColor: isAboutTitleInvalid ? "#ff4d4d" : undefined,
                      boxShadow: isAboutTitleInvalid ? "0 0 0 1px #ff4d4d" : undefined
                    }}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">About Subtitle</label>
                  <textarea
                    rows={3}
                    value={settings.aboutHeroSubtitle}
                    onChange={(e) => setSettings({ ...settings, aboutHeroSubtitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Brand Statement Settings */}
            <div className="admin-card p-6">
              <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">BRAND STATEMENT & ORIGINS</h3>
                <p className="text-[10px] text-[#8e8e93] mt-0.5 uppercase">About Page Brand History, Origin & Atelier Mission</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Statement Badge</label>
                  <input
                    type="text"
                    value={settings.brandStatementBadge}
                    onChange={(e) => setSettings({ ...settings, brandStatementBadge: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Statement Title</label>
                  <input
                    type="text"
                    value={settings.brandStatementTitle}
                    onChange={(e) => setSettings({ ...settings, brandStatementTitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Description Text</label>
                  <textarea
                    rows={4}
                    value={settings.brandStatementDescription}
                    onChange={(e) => setSettings({ ...settings, brandStatementDescription: e.target.value })}
                    style={{
                      borderColor: isBrandDescriptionInvalid ? "#ff4d4d" : undefined,
                      boxShadow: isBrandDescriptionInvalid ? "0 0 0 1px #ff4d4d" : undefined
                    }}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Founding Year</label>
                    <input
                      type="text"
                      value={settings.brandFoundingYear ?? "2024"}
                      onChange={(e) => setSettings({ ...settings, brandFoundingYear: e.target.value })}
                      className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                      placeholder="e.g. 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Origin Location</label>
                    <input
                      type="text"
                      value={settings.brandOrigin ?? "Colombo, Sri Lanka"}
                      onChange={(e) => setSettings({ ...settings, brandOrigin: e.target.value })}
                      className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                      placeholder="e.g. Colombo, Sri Lanka"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Atelier Mission Heading</label>
                  <input
                    type="text"
                    value={settings.brandMissionTitle ?? "OUR ATELIER MISSION"}
                    onChange={(e) => setSettings({ ...settings, brandMissionTitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="e.g. OUR ATELIER MISSION"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Atelier Mission Description</label>
                  <textarea
                    rows={3}
                    value={settings.brandMissionDescription ?? ""}
                    onChange={(e) => setSettings({ ...settings, brandMissionDescription: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="Description of the brand purpose & production mission"
                  />
                </div>
              </div>
            </div>

            {/* Founder / Creative Direction Settings */}
            <div className="admin-card p-6">
              <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">FOUNDER & LEADERSHIP</h3>
                <p className="text-[10px] text-[#8e8e93] mt-0.5 uppercase">About Page Owner, Founder Story & Creative Direction</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Badge</label>
                    <input
                      type="text"
                      value={settings.ownerBadge ?? "CREATIVE DIRECTION & LEADERSHIP"}
                      onChange={(e) => setSettings({ ...settings, ownerBadge: e.target.value })}
                      className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                      placeholder="e.g. CREATIVE DIRECTION"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Title</label>
                    <input
                      type="text"
                      value={settings.ownerTitle ?? "THE VISION BEHIND VERGO"}
                      onChange={(e) => setSettings({ ...settings, ownerTitle: e.target.value })}
                      className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white font-semibold"
                      placeholder="e.g. THE VISION BEHIND VERGO"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Subtitle / Sub-heading</label>
                  <input
                    type="text"
                    value={settings.ownerSubtitle ?? ""}
                    onChange={(e) => setSettings({ ...settings, ownerSubtitle: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="e.g. Bridging architectural brutalism with elevated Sri Lankan textile craftsmanship."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Owner / Founder Name</label>
                    <input
                      type="text"
                      value={settings.ownerName ?? ""}
                      onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
                      className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white font-medium"
                      placeholder="e.g. Kasun Fernando"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Role / Title</label>
                    <input
                      type="text"
                      value={settings.ownerRole ?? ""}
                      onChange={(e) => setSettings({ ...settings, ownerRole: e.target.value })}
                      className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                      placeholder="e.g. Founder & Creative Director"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Founder Biography / Journey</label>
                  <textarea
                    rows={4}
                    value={settings.ownerBio ?? ""}
                    onChange={(e) => setSettings({ ...settings, ownerBio: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="The story, inspiration, and background of the founder/owner..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Founder Quote / Philosophy Note</label>
                  <textarea
                    rows={2}
                    value={settings.ownerQuote ?? ""}
                    onChange={(e) => setSettings({ ...settings, ownerQuote: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white italic"
                    placeholder='"Streetwear is structural architecture you live inside..."'
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Founder / Studio Image URL</label>
                  <input
                    type="url"
                    value={settings.ownerImageUrl ?? ""}
                    onChange={(e) => setSettings({ ...settings, ownerImageUrl: e.target.value })}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    placeholder="https://images.unsplash.com/... or Cloudinary URL"
                  />
                </div>
              </div>
            </div>

            {/* Signature Collections Showcase Settings */}
            <div className="admin-card p-6">
              <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">ABOUT PAGE SIGNATURE COLLECTIONS</h3>
                <p className="text-[10px] text-[#8e8e93] mt-0.5 uppercase">3-Card Luxury Showcase Grid at bottom of About Us</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Eyebrow</label>
                    <input
                      type="text"
                      value={settings.aboutCollectionsBadge ?? "CURATED DISCIPLINES"}
                      onChange={(e) => setSettings({ ...settings, aboutCollectionsBadge: e.target.value })}
                      className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">Section Title</label>
                    <input
                      type="text"
                      value={settings.aboutCollectionsTitle ?? "SIGNATURE COLLECTIONS"}
                      onChange={(e) => setSettings({ ...settings, aboutCollectionsTitle: e.target.value })}
                      className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white font-semibold"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <span className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-3">Collection Cards (1 - 3)</span>
                  <div className="space-y-3">
                    {(settings.aboutCollections || [
                      {
                        label: "DROP 01 — SIGNATURE",
                        title: "Heavyweight Oversized",
                        subtitle: "280 GSM luxury combed cotton with architectural boxy drape.",
                        image: "https://res.cloudinary.com/aql7sojg/image/upload/v1788961897/products/lcut7pw9spodo8eqc4ow.jpg",
                        link: "/collection"
                      },
                      {
                        label: "ESSENTIAL ARCHIVE",
                        title: "Minimalist Monochrome",
                        subtitle: "Deep black pigment dye with reinforced anti-stretch ribbing.",
                        image: "https://res.cloudinary.com/aql7sojg/image/upload/v1788961605/products/rjapb6vhg3wedif6jwbz.jpg",
                        link: "/collection"
                      },
                      {
                        label: "LABS SERIES",
                        title: "Decentralized Originals",
                        subtitle: "Cryptographically logged serial verification on every garment.",
                        image: "https://res.cloudinary.com/aql7sojg/image/upload/v1788961916/products/k5cwxe5syiy2nxfncbls.jpg",
                        link: "/collection"
                      }
                    ]).map((item, idx) => (
                      <div key={idx} className="p-3 bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded space-y-2">
                        <span className="text-[10px] font-bold text-emerald-400 tracking-wider">CARD 0{idx + 1}</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-medium text-[#8e8e93] uppercase mb-0.5">Card Badge / Tag</label>
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => {
                                const updated = [...(settings.aboutCollections || [])];
                                if (!updated[idx]) updated[idx] = { ...item };
                                updated[idx] = { ...updated[idx], label: e.target.value };
                                setSettings({ ...settings, aboutCollections: updated });
                              }}
                              className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-medium text-[#8e8e93] uppercase mb-0.5">Card Title</label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const updated = [...(settings.aboutCollections || [])];
                                if (!updated[idx]) updated[idx] = { ...item };
                                updated[idx] = { ...updated[idx], title: e.target.value };
                                setSettings({ ...settings, aboutCollections: updated });
                              }}
                              className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-medium text-[#8e8e93] uppercase mb-0.5">Card Subtitle / Description</label>
                          <input
                            type="text"
                            value={item.subtitle}
                            onChange={(e) => {
                              const updated = [...(settings.aboutCollections || [])];
                              if (!updated[idx]) updated[idx] = { ...item };
                              updated[idx] = { ...updated[idx], subtitle: e.target.value };
                              setSettings({ ...settings, aboutCollections: updated });
                            }}
                            className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-medium text-[#8e8e93] uppercase mb-0.5">Card Image URL</label>
                          <input
                            type="url"
                            value={item.image}
                            onChange={(e) => {
                              const updated = [...(settings.aboutCollections || [])];
                              if (!updated[idx]) updated[idx] = { ...item };
                              updated[idx] = { ...updated[idx], image: e.target.value };
                              setSettings({ ...settings, aboutCollections: updated });
                            }}
                            className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-white font-mono text-[11px]"
                            placeholder="https://res.cloudinary.com/..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end pt-4 border-t border-[rgba(255,255,255,0.05)]">
          <button
            type="submit"
            disabled={isSaving || isHeroTitleInvalid || isHeroSubtitleInvalid || isAboutTitleInvalid || isBrandDescriptionInvalid}
            className="bg-white text-black hover:bg-[#eaeaea] active:bg-[#d9d9d9] disabled:bg-white/20 disabled:text-[#8e8e93] disabled:cursor-not-allowed font-bold tracking-widest px-6 py-2.5 rounded transition-all uppercase cursor-pointer"
          >
            {isSaving ? "PUBLISHING..." : "PUBLISH CHANGES"}
          </button>
        </div>
      </form>
    </div>
  );
}
