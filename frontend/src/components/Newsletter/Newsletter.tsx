"use client";

import { useEffect, useState } from "react";
import "./newsletter.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [title, setTitle] = useState("Stay in the loop");
  const [subtitle, setSubtitle] = useState("Join our decentralized mailing list. Get early access to drops and real-time inventory verification alerts.");

  useEffect(() => {
    fetch(`${API_URL}/customization`)
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.newsletterTitle) setTitle(data.newsletterTitle);
          if (data.newsletterSubtitle) setSubtitle(data.newsletterSubtitle);
        }
      })
      .catch((err) => console.error("Failed to load newsletter customizations", err));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    // Simulate API request
    setTimeout(() => {
      setStatus("success");
      setEmail("");
    }, 1200);
  };

  return (
    <section className="newsletter">
      <div className="newsletter-container">
        <div className="newsletter-text">
          <h2>{title}</h2>
          <p>
            {subtitle}
          </p>
        </div>

        <div className="newsletter-action">
          {status === "success" ? (
            <div className="newsletter-success">
              <span className="success-icon">✓</span>
              <p>You have been added to the list. Early access details will be sent to your email.</p>
            </div>
          ) : (
            <div className="newsletter-form-container">
              <form onSubmit={handleSubmit} className="newsletter-form">
                <input
                  type="email"
                  placeholder="ENTER YOUR EMAIL Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" disabled={status === "loading"}>
                  {status === "loading" ? "SUBMITTING..." : "JOIN"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
