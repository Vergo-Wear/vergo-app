"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import "./floating-actions.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function FloatingActions() {
  const pathname = usePathname();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [customWhatsapp, setCustomWhatsapp] = useState<string>("+94771234567");

  // Eligible customer pages: Home (/), Collection (/collection), and About Us (/about)
  const isTargetPage =
    pathname === "/" ||
    pathname === "/collection" ||
    pathname.startsWith("/collection/") ||
    pathname === "/about";

  useEffect(() => {
    if (!isTargetPage) return;

    const loadWhatsappData = () => {
      fetch(`${API_URL}/customization?t=${Date.now()}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.whatsappNumber) {
            setCustomWhatsapp(data.whatsappNumber);
          }
        })
        .catch(() => undefined);
    };

    loadWhatsappData();

    const handleUpdate = () => loadWhatsappData();
    window.addEventListener("vergo_customization_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("vergo_customization_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [isTargetPage]);

  if (!isTargetPage) return null;

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Format clean international digits for WhatsApp wa.me link
  const rawClean = (customWhatsapp || "+94771234567").replace(/\D/g, "");
  // If user entered local Sri Lankan format e.g. 0771234567, normalize to 94771234567
  const formattedWhatsappNumber = rawClean.startsWith("0")
    ? `94${rawClean.slice(1)}`
    : rawClean;

  const whatsappMessage = encodeURIComponent(
    "Hello VERGO Atelier! I'm browsing your collection and need assistance."
  );
  const whatsappUrl = `https://wa.me/${formattedWhatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="vergo-floating-actions" aria-label="Quick Actions">
      {/* Floating WhatsApp Concierge Icon */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="vergo-floating-btn vergo-whatsapp-btn"
        aria-label="Chat with VERGO on WhatsApp"
        title="Chat on WhatsApp"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="vergo-floating-svg whatsapp-svg"
        >
          <path d="M12.031 2C6.495 2 2 6.495 2 12.031c0 1.968.566 3.805 1.547 5.372L2.096 22l4.774-1.428A10.007 10.007 0 0 0 12.031 22c5.536 0 10.031-4.495 10.031-10.031C22.062 6.495 17.567 2 12.031 2Zm0 18.337a8.27 8.27 0 0 1-4.225-1.157l-.303-.18-2.825.845.845-2.753-.197-.314A8.257 8.257 0 0 1 3.766 12.03c0-4.557 3.708-8.265 8.265-8.265 4.557 0 8.265 3.708 8.265 8.265 0 4.558-3.708 8.307-8.265 8.307Zm4.526-6.19c-.248-.124-1.467-.723-1.694-.805-.228-.083-.393-.124-.559.124-.165.248-.641.805-.786.971-.144.165-.29.186-.537.062a6.782 6.782 0 0 1-1.993-1.229 7.485 7.485 0 0 1-1.38-1.719c-.145-.248-.016-.382.108-.505.112-.11.248-.29.372-.434.124-.145.166-.248.248-.414.083-.165.042-.31-.02-.434-.063-.124-.559-1.345-.766-1.842-.2-.484-.403-.418-.559-.426l-.476-.008c-.165 0-.434.062-.662.31-.227.248-.868.848-.868 2.067 0 1.219.889 2.398 1.013 2.563.124.165 1.748 2.67 4.237 3.743.592.256 1.054.409 1.415.524.595.19 1.137.163 1.565.099.478-.071 1.467-.6 1.674-1.178.207-.579.207-1.075.145-1.178-.062-.104-.228-.166-.475-.29Z" />
        </svg>
        <span className="vergo-whatsapp-pulse" aria-hidden="true" />
      </a>

      {/* Go To Top Icon Button (Appears below WhatsApp) */}
      <button
        type="button"
        onClick={scrollToTop}
        className={`vergo-floating-btn vergo-scroll-top-btn ${showScrollTop ? "visible" : ""
          }`}
        aria-label="Scroll to top"
        title="Go to top"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="vergo-floating-svg"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  );
}
