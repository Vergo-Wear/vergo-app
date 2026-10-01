"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import "./hero.css";

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
}

const DEFAULT_SLIDES: AdCampaign[] = [
  {
    id: "default-slide-1",
    title: "SIGNATURE ALL-SEASON DROP 01",
    badge: "NEW ARRIVAL",
    description:
      "280 GSM dense combed cotton tees, shirts & hoodies. Engineered for tropical comfort and structured drape across Sri Lanka.",
    type: "image",
    mediaUrl:
      "https://res.cloudinary.com/aql7sojg/image/upload/v1788961916/products/k5cwxe5syiy2nxfncbls.jpg",
    destinationUrl: "/collection",
    ctaText: "SHOP COLLECTION",
    isActive: true,
  },
  {
    id: "default-slide-2",
    title: "HEAVYWEIGHT ARCHITECTURAL FIT",
    badge: "280 GSM COTTON",
    description:
      "Boxy oversized cut that retains its structure throughout the day. Islandwide express delivery across Sri Lanka.",
    type: "image",
    mediaUrl:
      "https://res.cloudinary.com/aql7sojg/image/upload/v1788961897/products/lcut7pw9spodo8eqc4ow.jpg",
    destinationUrl: "/collection",
    ctaText: "EXPLORE TEES",
    isActive: true,
  },
  {
    id: "default-slide-3",
    title: "TIMELESS ATELIER SILHOUETTE",
    badge: "LIMITED DROP",
    description:
      "Designed in Colombo with high-density ribbed collar and dropped shoulders for effortless tropical luxury.",
    type: "image",
    mediaUrl:
      "https://res.cloudinary.com/aql7sojg/image/upload/v1788961605/products/rjapb6vhg3wedif6jwbz.jpg",
    destinationUrl: "/collection",
    ctaText: "SHOP APPAREL",
    isActive: true,
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const AUTO_PLAY_INTERVAL = 5500; // 5.5 seconds per slide

export default function Hero() {
  const [slides, setSlides] = useState<AdCampaign[]>(DEFAULT_SLIDES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Fetch active ads from the Admin Ads page / backend customization
  useEffect(() => {
    fetch(`${API_URL}/customization`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.ads)) {
          const activeAds = data.ads.filter(
            (ad: AdCampaign) =>
              ad.isActive &&
              ad.mediaUrl &&
              !ad.title?.toUpperCase().includes("WINTER")
          );
          if (activeAds.length > 0) {
            setSlides(activeAds);
          }
        }
      })
      .catch(() => undefined);
  }, []);

  // Automated Slideshow Timer
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      nextSlide();
    }, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [slides.length, isHovered, nextSlide]);

  const currentSlide = slides[currentIndex] || slides[0] || DEFAULT_SLIDES[0];

  const headline =
    currentSlide.title && !currentSlide.title.toUpperCase().includes("WINTER")
      ? currentSlide.title.toUpperCase()
      : "SIGNATURE ALL-SEASON DROP 01";

  const subtitle =
    currentSlide.description &&
    !currentSlide.description.toLowerCase().includes("decentralized")
      ? currentSlide.description
      : "280 GSM dense combed cotton tees, shirts & hoodies. Engineered for tropical comfort and structured drape across Sri Lanka.";

  const ctaText = currentSlide.ctaText || "SHOP COLLECTION";
  const targetLink = currentSlide.destinationUrl || "/collection";

  const toggleSound = () => {
    const activeVideo = videoRefs.current[currentSlide.id];
    if (activeVideo) {
      activeVideo.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    const activeVideo = videoRefs.current[currentSlide.id];
    if (activeVideo) {
      if (isPlaying) {
        activeVideo.pause();
        setIsPlaying(false);
      } else {
        activeVideo.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <section
      className="carnage-hero-section"
      aria-label="Vergo Wear Hero Slideshow"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Slideshow Media Layers */}
      <div className="carnage-hero-media">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.id || idx}
              className={`carnage-slide-layer ${isActive ? "active" : "inactive"}`}
            >
              {slide.type === "video" ? (
                <video
                  ref={(el) => {
                    videoRefs.current[slide.id] = el;
                  }}
                  src={slide.mediaUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="carnage-hero-video"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <img
                  src={slide.mediaUrl}
                  alt={slide.title || "Vergo Wear Campaign"}
                  className="carnage-hero-img"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
              )}
            </div>
          );
        })}

        {/* Cinematic Vignette Overlay */}
        <div className="carnage-hero-overlay" />
      </div>

      {/* Hero Bottom-Left Content */}
      <div className="carnage-hero-content-wrap">
        <div className="carnage-hero-content" key={currentIndex}>
          <h1 className="carnage-hero-headline">{headline}</h1>
          <p className="carnage-hero-subtitle">{subtitle}</p>

          <div className="carnage-hero-btn-row">
            <Link href={targetLink} className="carnage-hero-btn vergo-hero-btn-primary">
              {ctaText}
            </Link>
            <Link href="/collection" className="carnage-hero-btn vergo-hero-btn-secondary">
              EXPLORE ARCHIVE
            </Link>
          </div>
        </div>
      </div>

      {/* Slideshow Segment Indicators (Clickable) */}
      {slides.length > 1 && (
        <div className="hero-slide-indicators" aria-label="Slideshow pagination">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`hero-slide-dot ${idx === currentIndex ? "active" : ""}`}
              aria-label={`Jump to slide ${idx + 1}`}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Arrow Controls & Video Sound */}
      <div className="hero-slide-controls-right">
        {slides.length > 1 && (
          <div className="hero-slide-nav-arrows">
            <button
              onClick={prevSlide}
              className="hero-slide-arrow-btn"
              title="Previous slide"
              aria-label="Previous slide"
            >
              ‹
            </button>
            <button
              onClick={nextSlide}
              className="hero-slide-arrow-btn"
              title="Next slide"
              aria-label="Next slide"
            >
              ›
            </button>
          </div>
        )}

        {/* Video Sound / Play Controls (When current slide is video) */}
        {currentSlide.type === "video" && (
          <div className="hero-video-ctrl-group">
            <button
              onClick={togglePlay}
              className="carnage-ctrl-btn"
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isPlaying ? "Pause" : "Play"}
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
              className="carnage-ctrl-btn"
              title={isMuted ? "Unmute" : "Mute"}
              aria-label={isMuted ? "Unmute" : "Mute"}
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
        )}
      </div>
    </section>
  );
}