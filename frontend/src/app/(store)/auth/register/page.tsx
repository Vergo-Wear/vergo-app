"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseClient, getSupabaseRedirectSession } from "@/lib/supabase";

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

  // Google OAuth onboarding state
  const [pendingProfileCompletion, setPendingProfileCompletion] = useState(false);
  const [oauthSession, setOauthSession] = useState<any>(null);
  const [profileCompletionForm, setProfileCompletionForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [profileErrors, setProfileErrors] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
  });

  // OTP Verification state for normal customer signup
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Handle OTP resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Password validation requirements matching reset-password
  const hasMinLength = formData.password.length >= 6;
  const hasLowerCase = /[a-z]/.test(formData.password);
  const hasUpperCase = /[A-Z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const hasSpecialChar = /[!@#$%^&*()_+=[\]{};':"\\|<>?,./`~-]/.test(formData.password);
  const isPasswordValid =
    hasMinLength && hasLowerCase && hasUpperCase && hasNumber && hasSpecialChar;

  const passwordRequirements = [
    { label: "At least 6 characters", met: hasMinLength },
    { label: "At least one lowercase letter (a-z)", met: hasLowerCase },
    { label: "At least one uppercase letter (A-Z)", met: hasUpperCase },
    { label: "At least one number (0-9)", met: hasNumber },
    { label: "At least one special character (!@#$%^&* etc.)", met: hasSpecialChar },
  ];

  const isPasswordInvalid = formData.password.length > 0 && !isPasswordValid;
  const isConfirmInvalid =
    formData.confirmPassword.length > 1 && formData.password !== formData.confirmPassword;

  const validateField = (name: string, value: string) => {
    let errMsg = "";
    if (name === "firstName") {
      if (!value.trim()) {
        errMsg = "First Name is required.";
      } else if (value.trim().length < 2) {
        errMsg = "First Name must be at least 2 characters.";
      } else if (!/^[A-Za-z\s]+$/.test(value.trim())) {
        errMsg = "First Name can only contain letters and spaces.";
      }
    } else if (name === "lastName") {
      if (!value.trim()) {
        errMsg = "Last Name is required.";
      } else if (!/^[A-Za-z\s]*$/.test(value.trim())) {
        errMsg = "Last Name can only contain letters and spaces.";
      }
    } else if (name === "email") {
      if (!value.trim()) {
        errMsg = "Email is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        errMsg = "Invalid email address.";
      }
    } else if (name === "mobileNumber") {
      const cleanVal = value.replace(/[\s-()]/g, '');
      if (!value.trim()) {
        errMsg = "WhatsApp Number is required.";
      } else if (cleanVal.length > 0 && !/^(?:\+94|0)?7[0-9]{8}$/.test(cleanVal)) {
        errMsg = "Invalid Sri Lankan WhatsApp number (e.g. 0771234567).";
      }
    } else if (name === "password") {
      if (!value) {
        errMsg = "Password is required.";
      } else if (
        value.length < 6 ||
        !/[a-z]/.test(value) ||
        !/[A-Z]/.test(value) ||
        !/[0-9]/.test(value) ||
        !/[!@#$%^&*()_+=[\]{};':"\\|<>?,./`~-]/.test(value)
      ) {
        errMsg = "Password does not meet the requirements listed below.";
      }
      if (formData.confirmPassword && value !== formData.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match." }));
      } else if (formData.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: "" }));
      }
    } else if (name === "confirmPassword") {
      if (!value) {
        errMsg = "Please confirm your password.";
      } else if (value !== formData.password) {
        errMsg = "Passwords do not match.";
      }
    }
    setErrors((prev) => ({ ...prev, [name]: errMsg }));
    return errMsg;
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Handle Google OAuth callback when redirected back to this page
  useEffect(() => {
    const client = createSupabaseClient();
    if (!client) return;

    const handleAuthSession = async () => {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "");
      try {
        const session = await getSupabaseRedirectSession(client);
        if (!session) return;

        setIsSubmitting(true);

        // Strip the OAuth hash from the URL so it can't be replayed
        if (typeof window !== "undefined" && window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }

        const signinRes = await fetch(`${apiUrl}/auth/customer/google-signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: session.access_token }),
        });

        const signinData = await signinRes.json();

        if (!signinRes.ok) {
          throw new Error(signinData.message || "Failed to verify Google account.");
        }

        if (signinData.needsOnboarding) {
          // New user — show complete-profile form on this same page
          const googleFullName = session.user.user_metadata?.full_name || "";
          const googleFirstName = session.user.user_metadata?.given_name || googleFullName.split(" ")[0] || "";
          const googleLastName = session.user.user_metadata?.family_name || googleFullName.split(" ").slice(1).join(" ") || "";
          setProfileCompletionForm({ firstName: googleFirstName, lastName: googleLastName, phone: "" });
          setOauthSession(session);
          setPendingProfileCompletion(true);
          setIsSubmitting(false);
          return;
        }

        // Existing customer — log them in directly
        const profileData = signinData.profile;
        if (!profileData || profileData.status !== "active") {
          throw new Error(`Account is "${profileData?.status || "inactive"}". Access is only permitted for active accounts.`);
        }

        let displayName = "";
        let databaseProfile = {};
        try {
          const res = await fetch(`${apiUrl}/customers/profile/${session.user.id}`);
          if (res.ok) {
            const customerData = await res.json();
            databaseProfile = customerData;
            displayName = `${customerData.firstName} ${customerData.lastName}`;
          }
        } catch (e) { console.warn(e); }

        if (!displayName) {
          displayName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0].toUpperCase() || "Vergo User";
        }

        sessionStorage.setItem("vergo_is_logged_in", "true");
        sessionStorage.setItem("vergo_access_token", session.access_token);
        sessionStorage.setItem("vergo_refresh_token", session.refresh_token || "");
        sessionStorage.setItem("vergo_user", JSON.stringify({
          id: session.user.id,
          name: displayName,
          email: session.user.email,
          avatarUrl: session.user.user_metadata?.avatar_url || "/images/default-avatar.png",
          role: "Customer",
          ...databaseProfile,
        }));
        window.dispatchEvent(new Event("vergo-auth-change"));
        setMessage({ text: "Signed in successfully! Redirecting...", type: "success" });
        setTimeout(() => router.push("/"), 1000);
      } catch (err: any) {
        console.warn("Google OAuth callback failed:", err.message || err);
        setIsSubmitting(false);
        await createSupabaseClient()?.auth.signOut();
        setMessage({ text: err.message || "Failed to process Google sign in.", type: "error" });
      }
    };

    handleAuthSession();

  }, [router]);

  const validateProfileField = (name: string, value: string) => {
    let errMsg = "";
    if (name === "firstName") {
      if (!value.trim()) errMsg = "First Name is required.";
      else if (value.trim().length < 2) errMsg = "First Name must be at least 2 characters.";
      else if (!/^[A-Za-z\s]+$/.test(value.trim())) errMsg = "First Name can only contain letters and spaces.";
    } else if (name === "lastName") {
      if (!value.trim()) errMsg = "Last Name is required.";
      else if (!/^[A-Za-z\s]*$/.test(value.trim())) errMsg = "Last Name can only contain letters and spaces.";
    } else if (name === "phone") {
      const cleanVal = value.replace(/[\s-()]/g, "");
      if (!value.trim()) errMsg = "WhatsApp Number is required.";
      else if (cleanVal.length > 0 && !/^(?:\+94|0)?7[0-9]{8}$/.test(cleanVal)) errMsg = "Invalid Sri Lankan WhatsApp number (e.g. 0771234567).";
    }
    setProfileErrors(prev => ({ ...prev, [name]: errMsg }));
    return errMsg;
  };

  const handleProfileCompletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstNameErr = validateProfileField("firstName", profileCompletionForm.firstName);
    const lastNameErr = validateProfileField("lastName", profileCompletionForm.lastName);
    const phoneErr = validateProfileField("phone", profileCompletionForm.phone);
    if (firstNameErr || lastNameErr || phoneErr) {
      setMessage({ text: "Please correct the errors before submitting.", type: "error" });
      return;
    }

    const cleanPhone = profileCompletionForm.phone.replace(/[\s-()]/g, "");
    const resolvedPhone = cleanPhone.startsWith("+94") ? cleanPhone : cleanPhone.startsWith("0") ? "+94" + cleanPhone.substring(1) : "+94" + cleanPhone;

    setIsSubmitting(true);
    setMessage(null);

    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "");

    try {
      const capitalize = (str: string) => str.trim().replace(/\b\w/g, c => c.toUpperCase());
      const capitalizedFirstName = capitalize(profileCompletionForm.firstName);
      const capitalizedLastName = capitalize(profileCompletionForm.lastName);
      const displayName = `${capitalizedFirstName} ${capitalizedLastName}`;

      const cleanFirstName = capitalizedFirstName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanLastName = capitalizedLastName.toLowerCase().replace(/[^a-z0-9]/g, "");
      let baseUsername = `${cleanFirstName}_${cleanLastName}`;
      if (!cleanFirstName && !cleanLastName) {
        baseUsername = oauthSession.user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
      }
      const uniqueUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;

      const completeRes = await fetch(`${apiUrl}/auth/customer/google-complete-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: oauthSession.access_token,
          firstName: capitalizedFirstName,
          lastName: capitalizedLastName,
          phone: resolvedPhone,
          username: uniqueUsername,
        }),
      });

      const data = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(data.message || "Failed to complete profile.");
      }

      sessionStorage.setItem("vergo_is_logged_in", "true");
      sessionStorage.setItem("vergo_access_token", oauthSession.access_token);
      sessionStorage.setItem("vergo_refresh_token", oauthSession.refresh_token || "");
      sessionStorage.setItem("vergo_user", JSON.stringify({
        id: oauthSession.user.id,
        name: displayName,
        email: oauthSession.user.email,
        avatarUrl: oauthSession.user.user_metadata?.avatar_url || "/images/default-avatar.png",
        role: "Customer",
        ...(data.customer || {}),
      }));
      window.dispatchEvent(new Event("vergo-auth-change"));
      setMessage({ text: "Profile completed! Redirecting...", type: "success" });
      setTimeout(() => router.push("/"), 1000);
    } catch (err: any) {
      console.warn("Profile completion failed:", err.message || err);
      setMessage({ text: err.message || "An error occurred while saving your profile.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (message) setMessage(null);

    if (value.length > 0) {
      validateField(name, value);
    } else {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleGoogleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    const client = createSupabaseClient();
    if (!client) {
      setMessage({ text: "Supabase client is not configured.", type: "error" });
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/register`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.warn("Google sign up failed:", err.message || err);
      setMessage({ text: err.message || "Failed to initiate Google sign up.", type: "error" });
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Run all validations on submit
    const firstNameErr = validateField("firstName", formData.firstName);
    const lastNameErr = validateField("lastName", formData.lastName);
    const emailErr = validateField("email", formData.email);
    const phoneErr = validateField("mobileNumber", formData.mobileNumber);
    const passwordErr = validateField("password", formData.password);
    const confirmPasswordErr = validateField("confirmPassword", formData.confirmPassword);

    if (firstNameErr || lastNameErr || emailErr || phoneErr || passwordErr || confirmPasswordErr) {
      setMessage({ text: "Please correct the errors in the form before submitting.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "");

    try {
      const capitalize = (str: string) => {
        return str.trim().replace(/\b\w/g, c => c.toUpperCase());
      };
      const capitalizedFirstName = capitalize(formData.firstName);
      const capitalizedLastName = capitalize(formData.lastName);

      // 1. Call Backend Customer Signup API
      const signupRes = await fetch(`${apiUrl}/auth/customer/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: capitalizedFirstName,
          lastName: capitalizedLastName,
          phone: formData.mobileNumber,
          mobileNumber: formData.mobileNumber,
        }),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        throw new Error(signupData.message || "Registration failed.");
      }

      // Customer account created in unverified state; switch to OTP verification interface
      setRegisteredEmail(formData.email.trim().toLowerCase());
      setShowOtpVerification(true);
      setResendCooldown(60);
      setOtpError("");
      setOtpSuccess("");
      setMessage({
        text: "Registration initiated! Please enter the verification code sent to your email.",
        type: "success",
      });
    } catch (err: any) {
      console.warn("Registration failed:", err.message || err);
      setMessage({
        text: err.message || "An unexpected error occurred during registration. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpCode.trim();
    if (!token) {
      setOtpError("Please enter the verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    setOtpSuccess("");

    const client = createSupabaseClient();
    if (!client) {
      setOtpError("Supabase client is not configured.");
      setIsVerifyingOtp(false);
      return;
    }

    try {
      // Verify OTP with Supabase Auth for signup confirmation
      let verifyResult = await client.auth.verifyOtp({
        email: registeredEmail,
        token,
        type: "signup",
      });

      // Fallback verification type for standard email confirmation
      if (verifyResult.error) {
        const fallback = await client.auth.verifyOtp({
          email: registeredEmail,
          token,
          type: "email",
        });
        if (!fallback.error) {
          verifyResult = fallback;
        }
      }

      if (verifyResult.error) {
        throw verifyResult.error;
      }

      // Verification succeeded
      setOtpSuccess("Email verified successfully! Redirecting to sign in...");
      setOtpCode("");
      
      // Ensure local Supabase session is signed out so user signs in normally
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn("Sign out after OTP verification error:", err);
      }

      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch (err: any) {
      console.warn("OTP verification failed:", err.message || err);
      const msg = err.message || "Invalid or expired verification code. Please check and try again.";
      setOtpError(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResendingOtp) return;

    setIsResendingOtp(true);
    setOtpError("");
    setOtpSuccess("");

    const client = createSupabaseClient();
    if (!client) {
      setOtpError("Supabase client is not configured.");
      setIsResendingOtp(false);
      return;
    }

    try {
      const { error } = await client.auth.resend({
        type: "signup",
        email: registeredEmail,
      });

      if (error) {
        throw error;
      }

      setResendCooldown(60);
      setOtpSuccess("A new verification code has been sent to your email.");
    } catch (err: any) {
      console.warn("Resend OTP failed:", err.message || err);
      setOtpError(err.message || "Failed to resend verification code. Please try again later.");
    } finally {
      setIsResendingOtp(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Toast */}
      {message && (
        <div className="auth-toast-container">
          <div className={`auth-toast ${message.type}`}>
            <span className="auth-toast-icon">
              {message.type === "success" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </span>
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {showOtpVerification ? (
        /* ── Customer Signup OTP Verification Screen ── */
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
            <h1 className="register-title">VERIFY YOUR EMAIL</h1>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-secondary, #b3b3b3)",
                marginBottom: "20px",
                textAlign: "center",
                lineHeight: "1.5",
              }}
            >
              We sent a verification code to <br />
              <strong style={{ color: "#ffffff" }}>{registeredEmail}</strong>.
              <br />
              Please enter the code below to activate your account.
            </p>

            <form className="register-form" onSubmit={handleVerifyOtp}>
              <div className="input-group">
                <label
                  className="input-label"
                  style={{
                    display: "block",
                    color: "var(--text-primary, #ffffff)",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    marginBottom: "6px",
                    textAlign: "left",
                  }}
                >
                  VERIFICATION CODE (OTP) *
                </label>
                <input
                  type="text"
                  placeholder="Enter verification code"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value);
                    if (otpError) setOtpError("");
                  }}
                  autoFocus
                  maxLength={10}
                  className={`custom-input ${otpError ? "input-error" : ""}`}
                  style={{
                    letterSpacing: "4px",
                    textAlign: "center",
                    fontSize: "1.2rem",
                    fontWeight: "600",
                  }}
                />
                {otpError && (
                  <span
                    style={{
                      color: "#ff4d4d",
                      fontSize: "0.75rem",
                      marginTop: "6px",
                      display: "block",
                      textAlign: "center",
                    }}
                  >
                    {otpError}
                  </span>
                )}
                {otpSuccess && (
                  <span
                    style={{
                      color: "#4ade80",
                      fontSize: "0.8rem",
                      marginTop: "6px",
                      display: "block",
                      textAlign: "center",
                    }}
                  >
                    {otpSuccess}
                  </span>
                )}
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={isVerifyingOtp || !otpCode.trim()}
                className="register-submit-btn"
                style={{
                  opacity: isVerifyingOtp || !otpCode.trim() ? 0.6 : 1,
                  cursor: isVerifyingOtp || !otpCode.trim() ? "not-allowed" : "pointer",
                  marginTop: "10px",
                }}
              >
                {isVerifyingOtp ? "VERIFYING..." : "VERIFY & PROCEED"}
              </button>

              {/* Resend OTP - hidden once OTP is verified successfully */}
              {!otpSuccess && (
                <div
                  style={{
                    marginTop: "16px",
                    textAlign: "center",
                    fontSize: "0.85rem",
                    color: "var(--text-secondary, #b3b3b3)",
                  }}
                >
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isResendingOtp}
                    style={{
                      background: "none",
                      border: "none",
                      color:
                        resendCooldown > 0 || isResendingOtp
                          ? "var(--text-muted, #777)"
                          : "var(--color-primary, #ffffff)",
                      textDecoration: "underline",
                      cursor:
                        resendCooldown > 0 || isResendingOtp ? "not-allowed" : "pointer",
                      padding: 0,
                      fontWeight: "600",
                    }}
                  >
                    {isResendingOtp
                      ? "Sending..."
                      : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend Code"}
                  </button>
                </div>
              )}

              {/* Divider */}
              <div className="auth-divider" style={{ marginTop: "24px" }}></div>

              {/* Return to Sign In */}
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="auth-secondary-btn"
                style={{ marginTop: "12px" }}
              >
                RETURN TO SIGN IN
              </button>
            </form>
          </div>
        </main>
      ) : pendingProfileCompletion ? (
        /* ── Complete Profile Form (Google new user) ── */
        <main className="auth-container">
          <div className="register-card">
            <div className="register-card-logo">
              <Image src="/images/wlogo.png" alt="VERGO" width={130} height={40} priority style={{ objectFit: "contain", width: "auto", height: "auto" }} />
            </div>
            <h1 className="register-title">COMPLETE PROFILE</h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px", textAlign: "center" }}>
              Please provide your details to finish creating your account.
            </p>
            <form className="register-form" onSubmit={handleProfileCompletionSubmit}>
              <div className="input-group">
                <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>FIRST NAME *</label>
                <input
                  type="text"
                  placeholder="Enter First Name"
                  value={profileCompletionForm.firstName}
                  onChange={e => { const v = e.target.value; setProfileCompletionForm(p => ({ ...p, firstName: v })); if (v.length > 0) validateProfileField("firstName", v); else setProfileErrors(p => ({ ...p, firstName: "" })); }}
                  className={`custom-input ${profileErrors.firstName ? "input-error" : ""}`}
                />
                {profileErrors.firstName && <span style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>{profileErrors.firstName}</span>}
              </div>
              <div className="input-group">
                <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>LAST NAME *</label>
                <input
                  type="text"
                  placeholder="Enter Last Name"
                  value={profileCompletionForm.lastName}
                  onChange={e => { const v = e.target.value; setProfileCompletionForm(p => ({ ...p, lastName: v })); if (v.length > 0) validateProfileField("lastName", v); else setProfileErrors(p => ({ ...p, lastName: "" })); }}
                  className={`custom-input ${profileErrors.lastName ? "input-error" : ""}`}
                />
                {profileErrors.lastName && <span style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>{profileErrors.lastName}</span>}
              </div>
              <div className="input-group">
                <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>WHATSAPP NUMBER *</label>
                <input
                  type="tel"
                  placeholder="Enter WhatsApp Number (e.g. 0771234567)"
                  value={profileCompletionForm.phone}
                  onChange={e => { const v = e.target.value; setProfileCompletionForm(p => ({ ...p, phone: v })); if (v.length > 0) validateProfileField("phone", v); else setProfileErrors(p => ({ ...p, phone: "" })); }}
                  className={`custom-input ${profileErrors.phone ? "input-error" : ""}`}
                />
                {profileErrors.phone && <span style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>{profileErrors.phone}</span>}
              </div>
              <button
                type="submit"
                disabled={isSubmitting || Boolean(profileErrors.firstName || profileErrors.lastName || profileErrors.phone) || !profileCompletionForm.firstName || !profileCompletionForm.phone}
                className="register-submit-btn"
                style={{ opacity: (isSubmitting || Boolean(profileErrors.firstName || profileErrors.lastName || profileErrors.phone) || !profileCompletionForm.firstName || !profileCompletionForm.phone) ? 0.6 : 1, cursor: (isSubmitting || Boolean(profileErrors.firstName || profileErrors.lastName || profileErrors.phone) || !profileCompletionForm.firstName || !profileCompletionForm.phone) ? "not-allowed" : "pointer" }}
              >
                {isSubmitting ? "SAVING..." : "COMPLETE REGISTRATION"}
              </button>
            </form>
          </div>
        </main>
      ) : (
      /* ── Normal Sign Up Form ── */
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
                <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                  FIRST NAME *
                </label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Enter First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`custom-input ${errors.firstName ? "input-error" : ""}`}
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <span className="field-error-message" style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>
                    {errors.firstName}
                  </span>
                )}
              </div>

              <div className="input-group">
                <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                  LAST NAME *
                </label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Enter Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`custom-input ${errors.lastName ? "input-error" : ""}`}
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <span className="field-error-message" style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>
                    {errors.lastName}
                  </span>
                )}
              </div>
            </div>

            {/* Email Input */}
            <div className="input-group">
              <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                EMAIL *
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter Email Address"
                value={formData.email}
                onChange={handleChange}
                className={`custom-input ${errors.email ? "input-error" : ""}`}
                autoComplete="email"
              />
              {errors.email && (
                <span className="field-error-message" style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>
                  {errors.email}
                </span>
              )}
            </div>

            {/* Mobile Number Input */}
            <div className="input-group">
              <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                WHATSAPP NUMBER *
              </label>
              <input
                type="tel"
                name="mobileNumber"
                placeholder="Enter WhatsApp Number (e.g. 0771234567)"
                value={formData.mobileNumber}
                onChange={handleChange}
                className={`custom-input ${errors.mobileNumber ? "input-error" : ""}`}
                autoComplete="tel"
              />
              {errors.mobileNumber && (
                <span className="field-error-message" style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>
                  {errors.mobileNumber}
                </span>
              )}
            </div>

            {/* Password Input with show/hide toggle */}
            <div className="input-group">
              <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                PASSWORD *
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter Password"
                  value={formData.password}
                  onChange={handleChange}
                  style={{
                    borderColor: isPasswordInvalid ? "#ff4d4d" : undefined,
                    boxShadow: isPasswordInvalid ? "0 0 0 1px #ff4d4d" : undefined,
                  }}
                  className={`custom-input ${errors.password || isPasswordInvalid ? "input-error" : ""}`}
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  )}
                </button>
              </div>
              {formData.password.length > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    textAlign: "left",
                  }}
                >
                  <p
                    style={{
                      color: "var(--text-primary, #ffffff)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      marginBottom: "8px",
                    }}
                  >
                    Your password requires the following:
                  </p>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                    {passwordRequirements.map((req) => (
                      <li
                        key={req.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "0.75rem",
                          color: req.met ? "#00FF9D" : "#ff4d4d",
                          transition: "color 0.2s ease",
                        }}
                      >
                        {req.met ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" strokeWidth="2" />
                            <polyline points="8 12.5 11 15.5 16 9" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" strokeWidth="2" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                          </svg>
                        )}
                        <span>{req.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {errors.password && !formData.password.length && (
                <span className="field-error-message" style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>
                  {errors.password}
                </span>
              )}
            </div>

            {/* Confirm Password Input with show/hide toggle */}
            <div className="input-group">
              <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                CONFIRM PASSWORD *
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={{
                    borderColor: isConfirmInvalid ? "#ff4d4d" : undefined,
                    boxShadow: isConfirmInvalid ? "0 0 0 1px #ff4d4d" : undefined,
                  }}
                  className={`custom-input ${errors.confirmPassword || isConfirmInvalid ? "input-error" : ""}`}
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  )}
                </button>
              </div>
              {(errors.confirmPassword || isConfirmInvalid) && (
                <span className="field-error-message" style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>
                  {errors.confirmPassword || "Passwords do not match."}
                </span>
              )}
            </div>

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !isPasswordValid ||
                formData.password !== formData.confirmPassword ||
                Boolean(errors.firstName || errors.lastName || errors.email || errors.mobileNumber) ||
                !formData.firstName ||
                !formData.lastName ||
                !formData.email ||
                !formData.mobileNumber
              }
              className="register-submit-btn"
              style={{
                opacity:
                  isSubmitting ||
                  !isPasswordValid ||
                  formData.password !== formData.confirmPassword ||
                  Boolean(errors.firstName || errors.lastName || errors.email || errors.mobileNumber) ||
                  !formData.firstName ||
                  !formData.lastName ||
                  !formData.email ||
                  !formData.mobileNumber
                    ? 0.6
                    : 1,
                cursor:
                  isSubmitting ||
                  !isPasswordValid ||
                  formData.password !== formData.confirmPassword ||
                  Boolean(errors.firstName || errors.lastName || errors.email || errors.mobileNumber) ||
                  !formData.firstName ||
                  !formData.lastName ||
                  !formData.email ||
                  !formData.mobileNumber
                    ? "not-allowed"
                    : "pointer",
              }}
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
      )}
    </div>
  );
}
