"use client";

import { useEffect, useState } from "react";
import "./newsletter.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "already_subscribed" | "error"
  >("idle");
  const [responseMsg, setResponseMsg] = useState("");
  const [title, setTitle] = useState("Stay in the loop");
  const [subtitle, setSubtitle] = useState(
    "Join our decentralized mailing list. Get early access to drops and real-time inventory verification alerts.",
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadCustomization = async () => {
      try {
        const response = await fetch(`${API_URL}/customization`, {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data.newsletterTitle) setTitle(data.newsletterTitle);
        if (data.newsletterSubtitle) setSubtitle(data.newsletterSubtitle);
      } catch {
        // Customization is optional.
      }
    };

    void loadCustomization();

    return () => controller.abort();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/customization/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.status === "already_subscribed") {
        setStatus("already_subscribed");
        setResponseMsg(
          data.message || "This email is already registered on our customer list!",
        );
      } else if (data.status === "success" || res.ok) {
        setStatus("success");
        setResponseMsg(
          data.message || "You have been added to our customer list!",
        );
        setEmail("");
      } else {
        setStatus("error");
        setResponseMsg(data.message || "Unable to subscribe. Please try again.");
      }
    } catch {
      setStatus("error");
      setResponseMsg("Connection error. Please try again later.");
    }
  };

  return (
    <section className="newsletter">
      <div className="newsletter-container">
        <div className="newsletter-text">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <div className="newsletter-action">
          {status === "success" ? (
            <div className="newsletter-success">
              <span className="success-icon">✓</span>
              <div>
                <strong>Subscription Confirmed</strong>
                <p>{responseMsg}</p>
              </div>
            </div>
          ) : status === "already_subscribed" ? (
            <div className="newsletter-already-subscribed">
              <span className="info-icon">i</span>
              <div style={{ flex: 1 }}>
                <strong>Already Registered</strong>
                <p>{responseMsg}</p>
              </div>
              <button
                className="try-again-btn"
                onClick={() => {
                  setStatus("idle");
                  setResponseMsg("");
                }}
              >
                Try Another Email
              </button>
            </div>
          ) : (
            <div className="newsletter-form-container">
              <form onSubmit={handleSubmit} className="newsletter-form">
                <input
                  type="email"
                  className="newsletter-input"
                  placeholder="ENTER YOUR EMAIL ADDRESS"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="newsletter-btn"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "SUBMITTING..." : "JOIN"}
                </button>
              </form>
              {status === "error" && (
                <p style={{ color: "#ff4d4d", fontSize: "12px", marginTop: "8px", fontWeight: 600 }}>
                  {responseMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
