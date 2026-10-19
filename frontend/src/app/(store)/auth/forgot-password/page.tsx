"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email.trim()) {
      setMessage({ text: "Please enter your email address.", type: "error" });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setMessage({ text: "Please enter a valid email address.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const client = createSupabaseClient();
      if (!client) {
        throw new Error("Authentication provider is currently unavailable.");
      }

      // Trigger password reset email from Supabase
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      // Success message (security rule: do not reveal email existance details)
      setMessage({
        text: "If this email is registered in our database, a password reset link has been dispatched.",
        type: "success",
      });
      setEmail("");
    } catch (err: any) {
      setMessage({
        text: err.message || "An unexpected error occurred. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Toast Notification Container */}
      {message && (
        <div className="auth-toast-container">
          <div className={`auth-toast ${message.type}`}>
            <span className="auth-toast-icon">
              {message.type === "success" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </span>
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <main className="auth-container">
        <div className="register-card">
          <div className="register-card-logo">
            <Image
              src="/images/wlogo.png"
              alt="VERGO"
              width={130}
              height={40}
              priority
              style={{ objectFit: "contain", width: "auto", height: "auto" }}
            />
          </div>

          <h1 className="register-title">PASSWORD RECOVERY</h1>
          <p style={{ color: "var(--accent-muted, #8e8e93)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", marginBottom: "24px", lineHeight: "1.4" }}>
            Enter your email address to receive a secure password reset link.
          </p>

          <form className="register-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="custom-input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="register-submit-btn"
              style={{
                opacity: (isSubmitting || !email.trim()) ? 0.6 : 1,
                cursor: (isSubmitting || !email.trim()) ? "not-allowed" : "pointer",
                marginTop: "16px"
              }}
            >
              {isSubmitting ? "SENDING LINK..." : "SEND RESET LINK"}
            </button>
          </form>

          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <Link
              href="/auth/login"
              style={{ color: "var(--accent, #ffffff)", textDecoration: "underline", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
