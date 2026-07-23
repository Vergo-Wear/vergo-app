"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseClient, getSupabaseRedirectSession } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    emailOrMobile: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pendingProfileCompletion, setPendingProfileCompletion] = useState(false);
  const [oauthSession, setOauthSession] = useState<any>(null);
  const [profileCompletionForm, setProfileCompletionForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

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
    } else if (name === "phone") {
      const cleanVal = value.replace(/[\s-()]/g, '');
      if (!value.trim()) {
        errMsg = "WhatsApp Number is required.";
      } else if (cleanVal.length > 0 && !/^(?:\+94|0)?7[0-9]{8}$/.test(cleanVal)) {
        errMsg = "Invalid Sri Lankan WhatsApp number (e.g. 0771234567).";
      }
    }
    setErrors((prev) => ({ ...prev, [name]: errMsg }));
    return errMsg;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefill = sessionStorage.getItem("vergo_login_prefill");
      if (prefill && prefill !== "checkout") {
        setFormData((prev) => ({ ...prev, emailOrMobile: prefill }));
      }
    }
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    const client = createSupabaseClient();
    if (!client) return;

    const handleAuthSession = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      try {
        const session = await getSupabaseRedirectSession(client);
        if (session) {
          setIsSubmitting(true);

          // Strip the OAuth hash/query from the URL immediately so it can't be replayed
          if (typeof window !== "undefined" && window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
          }

          // Call backend to check if this Google user has a registered account
          const signinRes = await fetch(`${apiUrl}/auth/customer/google-signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: session.access_token }),
          });

          const signinData = await signinRes.json();

          if (!signinRes.ok) {
            throw new Error(signinData.message || "Access denied. Failed to verify Google account.");
          }

          // New user — show the complete-profile screen
          if (signinData.needsOnboarding) {
            const googleFullName = session.user.user_metadata?.full_name || "";
            const googleFirstName = session.user.user_metadata?.given_name || googleFullName.split(" ")[0] || "";
            const googleLastName = session.user.user_metadata?.family_name || googleFullName.split(" ").slice(1).join(" ") || "";

            setProfileCompletionForm({
              firstName: googleFirstName,
              lastName: googleLastName,
              phone: "",
            });
            setOauthSession(session);
            setPendingProfileCompletion(true);
            setIsSubmitting(false);
            return;
          }

          // Returning customer — profile already exists
          const profileData = signinData.profile;
          if (!profileData || profileData.status !== "active") {
            throw new Error(`Account is "${profileData?.status || "inactive"}". Access is only permitted for active accounts.`);
          }

          // Fetch display name from customer record
          let displayName = "";
          let databaseProfile = {};
          try {
            const res = await fetch(`${apiUrl}/customers/profile/${session.user.id}`);
            if (res.ok) {
              const customerData = await res.json();
              databaseProfile = customerData;
              displayName = `${customerData.firstName} ${customerData.lastName}`;
            }
          } catch (e) {
            console.warn(e);
          }

          if (!displayName) {
            displayName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0].toUpperCase() || "Vergo User";
          }

          // Save auth info to local storage
          sessionStorage.setItem("vergo_is_logged_in", "true");
          sessionStorage.setItem("vergo_access_token", session.access_token);
          sessionStorage.setItem("vergo_refresh_token", session.refresh_token || "");
          sessionStorage.setItem(
            "vergo_user",
            JSON.stringify({
              id: session.user.id,
              name: displayName,
              email: session.user.email,
              avatarUrl: session.user.user_metadata?.avatar_url || "/images/default-avatar.png",
              role: "Customer",
              ...databaseProfile,
            })
          );

          window.dispatchEvent(new Event("vergo-auth-change"));

          setMessage({ text: "Signed in successfully with Google! Redirecting...", type: "success" });

          const redirectPath = sessionStorage.getItem("vergo_login_prefill") ? "/checkout" : "/";
          sessionStorage.removeItem("vergo_login_prefill");

          setTimeout(() => {
            router.push(redirectPath);
          }, 1000);
        }
      } catch (err: any) {
        console.warn("OAuth callback processing failed:", err.message || err);
        setIsSubmitting(false);

        // Clear Supabase session on failure so we can try again
        await client.auth.signOut();

        setMessage({ text: err.message || "Failed to process Google sign in.", type: "error" });
      }
    };

    handleAuthSession();

  }, [router]);

  const handleProfileCompletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields on submit
    const firstNameErr = validateField("firstName", profileCompletionForm.firstName);
    const lastNameErr = validateField("lastName", profileCompletionForm.lastName);
    const phoneErr = validateField("phone", profileCompletionForm.phone);

    if (firstNameErr || lastNameErr || phoneErr) {
      setMessage({ text: "Please correct the errors in the form before submitting.", type: "error" });
      return;
    }

    const cleanPhone = profileCompletionForm.phone.replace(/[\s-()]/g, '');
    const resolvedPhone = cleanPhone.startsWith('+94') ? cleanPhone : cleanPhone.startsWith('0') ? '+94' + cleanPhone.substring(1) : '+94' + cleanPhone;

    setIsSubmitting(true);
    setMessage(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      const capitalize = (str: string) => str.trim().replace(/\b\w/g, c => c.toUpperCase());
      const capitalizedFirstName = capitalize(profileCompletionForm.firstName);
      const capitalizedLastName = capitalize(profileCompletionForm.lastName);
      const displayName = `${capitalizedFirstName} ${capitalizedLastName}`;

      // Generate a unique username from first + last name
      const cleanFirstName = capitalizedFirstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanLastName = capitalizedLastName.toLowerCase().replace(/[^a-z0-9]/g, '');
      let baseUsername = `${cleanFirstName}_${cleanLastName}`;
      if (!cleanFirstName && !cleanLastName) {
        baseUsername = oauthSession.user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      }
      const uniqueUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;

      // Single backend call — creates profile (role=Customer) + customer record atomically
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

      // Save auth info to local storage
      sessionStorage.setItem("vergo_is_logged_in", "true");
      sessionStorage.setItem("vergo_access_token", oauthSession.access_token);
      sessionStorage.setItem("vergo_refresh_token", oauthSession.refresh_token || "");
      sessionStorage.setItem(
        "vergo_user",
        JSON.stringify({
          id: oauthSession.user.id,
          name: displayName,
          email: oauthSession.user.email,
          avatarUrl: oauthSession.user.user_metadata?.avatar_url || "/images/default-avatar.png",
          role: "Customer",
          ...(data.customer || {}),
        })
      );

      window.dispatchEvent(new Event("vergo-auth-change"));

      setMessage({ text: "Profile completed successfully! Redirecting...", type: "success" });

      const redirectPath = sessionStorage.getItem("vergo_login_prefill") ? "/checkout" : "/";
      sessionStorage.removeItem("vergo_login_prefill");

      setTimeout(() => {
        router.push(redirectPath);
      }, 1000);
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
  };

  const handleGoogleSignIn = async (e: React.MouseEvent) => {
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
          redirectTo: `${window.location.origin}/auth/login`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.warn("Google sign in failed:", err.message || err);
      setMessage({ text: err.message || "Failed to initiate Google sign in.", type: "error" });
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.emailOrMobile.trim()) {
      setMessage({ text: "Please enter your email or mobile number.", type: "error" });
      return;
    }

    if (!formData.password.trim()) {
      setMessage({ text: "Please enter your password.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      let signinData: any = null;
      let loginError: string | null = null;
      
      // Step 1: Try Customer Signin
      try {
        const res = await fetch(`${apiUrl}/auth/customer/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailOrPhone: formData.emailOrMobile,
            password: formData.password,
          }),
        });
        
        const data = await res.json();
        if (res.ok) {
          signinData = data;
        } else {
          // If status is 403 (Forbidden) and message suggests role mismatch, we'll try employee
          // Otherwise, if profile is blocked or details are wrong, we stop
          if (res.status === 403 && data.message && data.message.includes("role")) {
            // role mismatch, continue to employee signin
          } else {
            loginError = data.message || "Sign in failed.";
          }
        }
      } catch (err: any) {
        loginError = err.message || "Failed to contact auth service.";
      }

      // Step 2: Try Employee Signin (if not authenticated and no other block errors)
      if (!signinData && !loginError) {
        try {
          const res = await fetch(`${apiUrl}/auth/employee/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emailOrPhone: formData.emailOrMobile,
              password: formData.password,
            }),
          });
          
          const data = await res.json();
          if (res.ok) {
            signinData = data;
          } else {
            if (res.status === 403 && data.message && data.message.includes("role")) {
              // role mismatch, continue to admin signin
            } else {
              loginError = data.message || "Sign in failed.";
            }
          }
        } catch (err: any) {
          loginError = err.message || "Failed to contact auth service.";
        }
      }

      // Step 3: Try Admin Signin (if not authenticated and no other block errors)
      if (!signinData && !loginError) {
        try {
          const res = await fetch(`${apiUrl}/auth/admin/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emailOrPhone: formData.emailOrMobile,
              password: formData.password,
            }),
          });
          
          const data = await res.json();
          if (res.ok) {
            signinData = data;
          } else {
            loginError = data.message || "Sign in failed.";
          }
        } catch (err: any) {
          loginError = err.message || "Failed to contact auth service.";
        }
      }

      // If we still don't have signinData, throw the error
      if (!signinData) {
        throw new Error(loginError || "Invalid credentials.");
      }

      // Step 4: Login succeeded! Now resolve the user's display name
      const userId = signinData.user.id;
      const userRole = signinData.user.role;
      let displayName = "";
      let databaseProfile: Record<string, unknown> = {};

      if (userRole === "Customer") {
        try {
          const profileRes = await fetch(`${apiUrl}/customers/profile/${userId}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            databaseProfile = profileData;
            displayName = `${profileData.firstName} ${profileData.lastName}`;
          }
        } catch (e) {
          console.warn("Failed to fetch customer profile name:", e);
        }
      } else if (userRole === "Employee") {
        try {
          const profileRes = await fetch(`${apiUrl}/employees/profile/${userId}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            databaseProfile = profileData;
            displayName = `${profileData.firstName} ${profileData.lastName}`;
          }
        } catch (e) {
          console.warn("Failed to fetch employee profile name:", e);
        }
      }

      // Fallback display name
      if (!displayName) {
        displayName = userRole === "Admin" ? "Vergo Admin" : (signinData.user.email.split("@")[0].toUpperCase());
      }

      // Step 5: Store authentication details in localStorage
      sessionStorage.setItem("vergo_is_logged_in", "true");
      sessionStorage.setItem("vergo_access_token", signinData.accessToken);
      sessionStorage.setItem("vergo_refresh_token", signinData.refreshToken);
      sessionStorage.setItem(
        "vergo_user",
        JSON.stringify({
          id: userId,
          name: displayName,
          email: signinData.user.email,
          avatarUrl: "/images/default-avatar.png",
          role: userRole,
          ...databaseProfile,
        })
      );

      // Dispatch authentication change event to trigger Navbar update
      window.dispatchEvent(new Event("vergo-auth-change"));

      setMessage({ text: "Sign in successful! Redirecting...", type: "success" });
      
      // Step 6: Redirect to the role-specific page
      setTimeout(() => {
        if (userRole === "Customer") {
          const redirectPath = sessionStorage.getItem("vergo_login_prefill") ? "/checkout" : "/";
          sessionStorage.removeItem("vergo_login_prefill");
          router.push(redirectPath);
        } else if (userRole === "Employee") {
          router.push("/employee");
        } else if (userRole === "Admin") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }, 1000);
    } catch (err: any) {
      console.warn("Sign in failed:", err.message || err);
      setMessage({
        text: err.message || "An unexpected error occurred. Please check your credentials and try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pendingProfileCompletion) {
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

            <h1 className="register-title">COMPLETE PROFILE</h1>
            <p className="auth-subtitle" style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px", textAlign: "center" }}>
              Please provide your details and a contact phone number to complete registration.
            </p>

            <form className="register-form" onSubmit={handleProfileCompletionSubmit}>
              {/* First Name Input */}
              <div className="input-group">
                <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                  FIRST NAME *
                </label>
                <input
                  type="text"
                  placeholder="Enter First Name"
                  value={profileCompletionForm.firstName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileCompletionForm(prev => ({ ...prev, firstName: val }));
                    if (val.length > 0) {
                      validateField("firstName", val);
                    } else {
                      setErrors(prev => ({ ...prev, firstName: "" }));
                    }
                  }}
                  className={`custom-input ${errors.firstName ? "input-error" : ""}`}
                />
                {errors.firstName && (
                  <span className="field-error-message" style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>
                    {errors.firstName}
                  </span>
                )}
              </div>

              {/* Last Name Input */}
              <div className="input-group">
                <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                  LAST NAME *
                </label>
                <input
                  type="text"
                  placeholder="Enter Last Name"
                  value={profileCompletionForm.lastName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileCompletionForm(prev => ({ ...prev, lastName: val }));
                    if (val.length > 0) {
                      validateField("lastName", val);
                    } else {
                      setErrors(prev => ({ ...prev, lastName: "" }));
                    }
                  }}
                  className={`custom-input ${errors.lastName ? "input-error" : ""}`}
                />
                {errors.lastName && (
                  <span className="field-error-message" style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>
                    {errors.lastName}
                  </span>
                )}
              </div>

              {/* Phone Input */}
              <div className="input-group">
                <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                  WHATSAPP NUMBER *
                </label>
                <input
                  type="tel"
                  placeholder="Enter WhatsApp Number (e.g. 0771234567)"
                  value={profileCompletionForm.phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileCompletionForm(prev => ({ ...prev, phone: val }));
                    if (val.length > 0) {
                      validateField("phone", val);
                    } else {
                      setErrors(prev => ({ ...prev, phone: "" }));
                    }
                  }}
                  className={`custom-input ${errors.phone ? "input-error" : ""}`}
                />
                {errors.phone && (
                  <span className="field-error-message" style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>
                    {errors.phone}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || Boolean(errors.firstName || errors.lastName || errors.phone) || !profileCompletionForm.firstName || !profileCompletionForm.phone}
                className="register-submit-btn"
                style={{
                  opacity: (isSubmitting || Boolean(errors.firstName || errors.lastName || errors.phone) || !profileCompletionForm.firstName || !profileCompletionForm.phone) ? 0.6 : 1,
                  cursor: (isSubmitting || Boolean(errors.firstName || errors.lastName || errors.phone) || !profileCompletionForm.firstName || !profileCompletionForm.phone) ? "not-allowed" : "pointer"
                }}
              >
                {isSubmitting ? "SAVING..." : "COMPLETE REGISTRATION"}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

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
            {/* Email or Mobile Input */}
            <div className="input-group">
              <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                EMAIL OR MOBILE NUMBER
              </label>
              <input
                type="text"
                name="emailOrMobile"
                placeholder="Enter Email or Mobile Number"
                value={formData.emailOrMobile}
                onChange={handleChange}
                className="custom-input"
                autoComplete="username"
              />
            </div>

            {/* Password Input with show/hide toggle */}
            <div className="input-group">
              <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                PASSWORD
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="custom-input"
                  autoComplete="current-password"
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
            </div>

            {/* Forgot Password Link */}
            <div className="forgot-password-wrapper">
              <Link
                href="/auth/forgot-password"
                className="forgot-password-link"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Login Button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.emailOrMobile.trim() || !formData.password.trim()}
              className="register-submit-btn"
              style={{
                opacity: (isSubmitting || !formData.emailOrMobile.trim() || !formData.password.trim()) ? 0.6 : 1,
                cursor: (isSubmitting || !formData.emailOrMobile.trim() || !formData.password.trim()) ? "not-allowed" : "pointer"
              }}
            >
              {isSubmitting ? "LOGGING IN..." : "LOG IN"}
            </button>

            {/* Google Sign In option */}
            <div className="auth-or-divider">
              <span>OR</span>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
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
              <span>Continue with Google</span>
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
