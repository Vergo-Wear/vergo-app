"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
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
    if (!formData.mobileNumber.trim()) {
      setMessage({ text: "Please enter your mobile number first.", type: "error" });
      return;
    }

    setOtpSent(true);
    setCountdown(30);
    setMessage({ text: "OTP code sent successfully to your mobile number!", type: "success" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation checks
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setMessage({ text: "Please enter both your First Name and Last Name.", type: "error" });
      return;
    }

    if (!formData.email.trim() || !formData.email.includes("@")) {
      setMessage({ text: "Please enter a valid email address.", type: "error" });
      return;
    }

    if (!formData.mobileNumber.trim()) {
      setMessage({ text: "Please enter your mobile number.", type: "error" });
      return;
    }

    if (!formData.code.trim()) {
      setMessage({ text: "Please enter the OTP verification code.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    // Simulate successful registration
    setTimeout(() => {
      setIsSubmitting(false);
      setMessage({ text: "Registration successful! Welcome to VERGO.", type: "success" });
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
              style={{ objectFit: "contain", height: "auto" }}
            />
          </div>

          <h1 className="register-title">SIGN UP</h1>

          <form className="register-form" onSubmit={handleSubmit}>
            {/* First Name Input */}
            <div className="input-group">
              <input
                type="text"
                name="firstName"
                placeholder="FIRST NAME"
                value={formData.firstName}
                onChange={handleChange}
                className="custom-input"
                autoComplete="given-name"
              />
            </div>

            {/* Last Name Input */}
            <div className="input-group">
              <input
                type="text"
                name="lastName"
                placeholder="LAST NAME"
                value={formData.lastName}
                onChange={handleChange}
                className="custom-input"
                autoComplete="family-name"
              />
            </div>

            {/* Email Input */}
            <div className="input-group">
              <input
                type="email"
                name="email"
                placeholder="EMAIL"
                value={formData.email}
                onChange={handleChange}
                className="custom-input"
                autoComplete="email"
              />
            </div>

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

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="register-submit-btn"
            >
              {isSubmitting ? "REGISTERING..." : "REGISTER"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
