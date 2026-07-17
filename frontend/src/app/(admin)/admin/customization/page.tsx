"use client";

import React, { useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";

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
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function CustomizationPage() {
  const { addNotification } = useAdmin();
  
  const [settings, setSettings] = useState<CustomizationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("vergo_access_token");
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

    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) {
      addNotification("Authentication session expired. Please log in again.", "error");
      return;
    }

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
      const response = await fetch(`${API_URL}/customization`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Access denied. Admin privileges required.");
        }
        const errData = await response.json();
        throw new Error(errData.message || "Failed to update customizations.");
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
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">BRAND STATEMENT</h3>
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
