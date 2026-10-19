"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import "./campaign-ad.css";

interface AdCampaign {
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
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const DEFAULT_PROMO: AdCampaign = {
  id: "ad-default-1",
  title: "SEASON ARCHIVE DROP & PROMOTIONS",
  badge: "FEATURED CAMPAIGN",
  description: "Explore the new architectural silhouettes engineered with 280 GSM heavyweight cotton. Limited seasonal discounts available.",
  type: "image",
  mediaUrl: "https://res.cloudinary.com/aql7sojg/image/upload/v1788961916/products/k5cwxe5syiy2nxfncbls.jpg",
  destinationUrl: "/collection",
  ctaText: "EXPLORE COLLECTION",
  isActive: true,
};

export default function CampaignAd({ isTopWelcome = true }: { isTopWelcome?: boolean }) {
  const [ads, setAds] = useState<AdCampaign[]>([DEFAULT_PROMO]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/customization`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.ads)) {
          const activeAds = data.ads.filter((ad: AdCampaign) => ad.isActive);
          if (activeAds.length > 0) {
            setAds(activeAds);
          }
        }
      })
      .catch(() => undefined);
  }, []);

  const currentAd = ads[currentIndex] || ads[0] || DEFAULT_PROMO;

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <section className="campaign-ad-section" aria-label="Welcome and Featured Promotions">
      <div className="campaign-ad-container">
        {/* Welcome Note for Promotions and Sales at Top of Page */}
        {isTopWelcome && (
          <div className="campaign-welcome-header">
            <div className="campaign-welcome-eyebrow">
              <span className="campaign-dot-ping" />
              <span>WELCOME TO VERGO WEAR // PROMOTIONS & DISCOUNTS</span>
            </div>
            <h1 className="campaign-welcome-title">PROMOTIONS & SEASONAL DROPS</h1>
            <p className="campaign-welcome-subtitle">
              Welcome to Vergo Wear. Discover our latest promotional campaigns, seasonal discounts, and architectural streetwear engineered for longevity.
            </p>
          </div>
        )}

        {/* Header Bar / Eyebrow & Carousel Navigation */}
        <div className="campaign-ad-header">
          <div className="campaign-eyebrow">
            <span className="campaign-dot-ping" />
            <span>{currentAd.badge || "FEATURED PROMOTION"}</span>
          </div>

          {ads.length > 1 && (
            <div className="campaign-pager">
              {ads.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`campaign-dot-btn ${idx === currentIndex ? "active" : ""}`}
                  aria-label={`View Campaign ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Main Promo Card */}
        <div className="campaign-ad-card">
          {/* Media Viewport */}
          <div className="campaign-media-wrapper">
            {currentAd.type === "video" ? (
              <div className="campaign-video-holder">
                <video
                  ref={videoRef}
                  src={currentAd.mediaUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="campaign-video-player"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                {/* Video Controls Overlay */}
                <div className="campaign-video-controls">
                  <button
                    onClick={togglePlay}
                    className="video-ctrl-btn"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={toggleSound}
                    className="video-ctrl-btn"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="campaign-image-holder">
                <img
                  src={currentAd.mediaUrl}
                  alt={currentAd.title}
                  className="campaign-img-display"
                  loading="lazy"
                />
              </div>
            )}

            {/* Gradient Mask */}
            <div className="campaign-media-gradient" />
          </div>

          {/* Text Content Overlay */}
          <div className="campaign-content-overlay">
            <div className="campaign-meta-pill">
              <span>{currentAd.type === "video" ? "MOTION PROMOTION" : "FEATURED CAMPAIGN"}</span>
            </div>

            <h2 className="campaign-title">{currentAd.title}</h2>

            {currentAd.description && (
              <p className="campaign-description">{currentAd.description}</p>
            )}

            <div className="campaign-action-row">
              <Link
                href={currentAd.destinationUrl || "/collection"}
                className="campaign-cta-btn"
              >
                <span>{currentAd.ctaText || "EXPLORE COLLECTION"}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
