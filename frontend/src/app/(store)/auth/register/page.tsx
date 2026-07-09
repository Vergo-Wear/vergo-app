"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (message) setMessage(null);
  };

  const handleGoogleSignUp = (e: React.MouseEvent) => {
    e.preventDefault();
    setMessage({ text: "Google Sign Up is not configured yet. This is a demo.", type: "error" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation checks
    if (!formData.firstName.trim()) {
      setMessage({ text: "Please enter your first name.", type: "error" });
      return;
    }

    if (!formData.lastName.trim()) {
      setMessage({ text: "Please enter your last name.", type: "error" });
      return;
    }

    if (!formData.email.trim() || !formData.email.includes("@")) {
      setMessage({ text: "Please enter a valid email address.", type: "error" });
      return;
    }

    const cleanedMobile = formData.mobileNumber.replace(/\D/g, "");
    if (cleanedMobile.length !== 10) {
      setMessage({ text: "Please enter a valid 10-digit mobile number.", type: "error" });
      return;
    }

    if (!formData.password) {
      setMessage({ text: "Please enter a password.", type: "error" });
      return;
    }

    if (!formData.confirmPassword) {
      setMessage({ text: "Please confirm your password.", type: "error" });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    // Simulate successful registration
    setTimeout(() => {
      setIsSubmitting(false);

      // Store user information in localStorage
      localStorage.setItem("vergo_is_logged_in", "true");
      localStorage.setItem(
        "vergo_user",
        JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          avatarUrl: "/images/default-avatar.png",
        })
      );

      // Dispatch authentication change event to trigger Navbar update
      window.dispatchEvent(new Event("vergo-auth-change"));

      setMessage({ text: "Registration successful! Welcome to VERGO. Redirecting...", type: "success" });

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

          <h1 className="register-title">SIGN UP</h1>

          <form className="register-form" onSubmit={handleSubmit}>
            {/* First Name & Last Name (Side by side on desktop) */}
            <div className="input-row">
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

            {/* Mobile Number Input */}
            <div className="input-group">
              <input
                type="tel"
                name="mobileNumber"
                placeholder="MOBILE NUMBER"
                value={formData.mobileNumber}
                onChange={handleChange}
                className="custom-input"
                autoComplete="tel"
              />
            </div>

            {/* Password Input with show/hide toggle */}
            <div className="input-group">
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="PASSWORD"
                  value={formData.password}
                  onChange={handleChange}
                  className="custom-input"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input with show/hide toggle */}
            <div className="input-group">
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="CONFIRM PASSWORD"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="custom-input"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
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

            {/* Google Sign Up option */}
            <div className="auth-or-divider">
              <span>OR</span>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignUp}
              className="google-btn"
            >
              <span className="google-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.259h2.909c1.702-1.567 2.683-3.874 2.683-6.617z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.595.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.453.346 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.32 0 2.508.454 3.44 1.346l2.582-2.58C13.463.896 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
              </span>
              <span>Sign up with Google</span>
            </button>

            {/* Divider Line */}
            <div className="auth-divider"></div>

            {/* Section Header */}
            <div className="auth-section-title">ALREADY HAVE AN ACCOUNT?</div>

            {/* Login Button */}
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="auth-secondary-btn"
            >
              LOG IN
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
