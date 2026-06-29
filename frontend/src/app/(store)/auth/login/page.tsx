"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    mobileNumber: "",
    code: "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (message) setMessage(null);
  };

  const handleRequestOtp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const cleanedMobile = formData.mobileNumber.replace(/\D/g, "");
    if (cleanedMobile.length !== 10) {
      setMessage({ text: "Please enter a valid 10-digit mobile number first.", type: "error" });
      return;
    }

    setOtpSent(true);
    setCountdown(30);
    setMessage({ text: "OTP code sent successfully to your mobile number!", type: "success" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedMobile = formData.mobileNumber.replace(/\D/g, "");
    if (cleanedMobile.length !== 10) {
      setMessage({ text: "Please enter a valid 10-digit mobile number.", type: "error" });
      return;
    }

    if (!formData.code.trim()) {
      setMessage({ text: "Please enter the OTP verification code.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    // Simulate successful sign-in
    setTimeout(() => {
      setIsSubmitting(false);

      // Store user information in localStorage
      localStorage.setItem("vergo_is_logged_in", "true");
      localStorage.setItem(
        "vergo_user",
        JSON.stringify({
          name: "Vergo Customer",
          email: "customer@vergowear.com",
          avatarUrl: "/images/default-avatar.png",
        })
      );

      // Dispatch authentication change event to trigger Navbar update
      window.dispatchEvent(new Event("vergo-auth-change"));

      setMessage({ text: "Sign in successful! Redirecting...", type: "success" });
      
      // Redirect to home/store page
      setTimeout(() => {
        router.push("/");
      }, 1000);
    }, 1200);
  };

  return (
    <div className="auth-page-wrapper">
      <main className="auth-container">
        <div className="register-card">
          {/* Brand Logo at top of card */}
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

          <h1 className="register-title">SIGN IN</h1>

          <form className="register-form" onSubmit={handleSubmit}>
            {/* Mobile Number with Request OTP */}
            <div className="input-group">
              <div className="mobile-input-wrapper">
                <input
                  type="tel"
                  name="mobileNumber"
                  placeholder="MOBILE NUMBER"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  className="custom-input"
                  autoComplete="tel"
                />
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={countdown > 0}
                  className="request-otp-btn"
                >
                  {countdown > 0 ? `RESEND IN ${countdown}S` : otpSent ? "RESEND OTP" : "REQUEST OTP"}
                </button>
              </div>
            </div>

            {/* Code (OTP) Input */}
            <div className="input-group">
              <input
                type="text"
                name="code"
                placeholder="CODE"
                value={formData.code}
                onChange={handleChange}
                className="custom-input"
                autoComplete="one-time-code"
              />
            </div>

            {/* Feedback Message */}
            {message && (
              <div className={`feedback-message ${message.type}`}>
                {message.text}
              </div>
            )}

            {/* Submit Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="register-submit-btn"
            >
              {isSubmitting ? "LOGGING IN..." : "LOG IN"}
            </button>

            {/* Divider Line */}
            <div className="auth-divider"></div>

            {/* Section Header */}
            <div className="auth-section-title">NEW CUSTOMER</div>

            {/* Register Button */}
            <button
              type="button"
              onClick={() => router.push("/auth/register")}
              className="auth-secondary-btn"
            >
              REGISTER
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
