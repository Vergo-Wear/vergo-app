"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

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
          <h2>Stay in the loop</h2>
          <p>
            Join our decentralized mailing list. Get early access
            <br />to drops and real-time inventory verification alerts.
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
              <form className="newsletter-form" onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === "loading"}
                  className="newsletter-input"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="newsletter-btn"
                >
                  {status === "loading" ? "Subscribing..." : "Sign Up"}
                </button>
              </form>
              <p className="newsletter-disclaimer">
                * By signing up, you agree to our Privacy Policy and Terms of Service.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
