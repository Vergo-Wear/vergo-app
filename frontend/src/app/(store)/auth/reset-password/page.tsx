"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseClient, getSupabaseRedirectSession } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isRequiredTempReset, setIsRequiredTempReset] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const isRequired = urlParams.get("required") === "true";
    const emailParam = urlParams.get("email") || "";

    const rawUser = sessionStorage.getItem("vergo_user");
    let storedUser: any = null;
    if (rawUser) {
      try {
        storedUser = JSON.parse(rawUser);
      } catch (e) {
        console.error("Error parsing vergo_user session:", e);
      }
    }

    const mustChange = isRequired || Boolean(storedUser?.mustChangePassword);

    if (mustChange) {
      setIsRequiredTempReset(true);
      setUserEmail(emailParam || storedUser?.email || "");
      setIsVerifying(false);
      return;
    }

    const client = createSupabaseClient();
    if (!client) {
      setIsVerifying(false);
      return;
    }

    const { data: authListener } = client.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (newSession) {
            setSession(newSession);
            setIsVerifying(false);
          }
        }
      }
    );

    const checkSession = async () => {
      try {
        const sess = await getSupabaseRedirectSession(client);
        if (sess) {
          setSession(sess);
        } else {
          const { data } = await client.auth.getSession();
          if (data?.session) {
            setSession(data.session);
          }
        }
      } catch (err: any) {
        console.error("Failed to parse reset password session:", err);
      } finally {
        setIsVerifying(false);
      }
    };

    checkSession();

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (message && message.type === "error") {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      newPassword.length < 6 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[!@#$%^&*()_+=[\]{};':"\\|<>?,./`~-]/.test(newPassword)
    ) {
      setMessage({
        text: "Password does not meet the requirements listed below.",
        type: "error",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    // Handle Required Employee Temporary Password Reset
    if (isRequiredTempReset) {
      if (!tempPassword.trim()) {
        setMessage({ text: "Please enter your temporary password.", type: "error" });
        setIsSubmitting(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/auth/employee/reset-temp-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            currentPassword: tempPassword.trim(),
            newPassword: newPassword.trim(),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to update temporary password.");
        }

        // Update local session with new tokens & set mustChangePassword = false
        const rawUser = sessionStorage.getItem("vergo_user");
        if (rawUser) {
          try {
            const parsed = JSON.parse(rawUser);
            parsed.mustChangePassword = false;
            sessionStorage.setItem("vergo_user", JSON.stringify(parsed));
          } catch (e) {
            console.error("Error updating local user session:", e);
          }
        }

        if (data.accessToken) {
          sessionStorage.setItem("vergo_access_token", data.accessToken);
        }
        if (data.refreshToken) {
          sessionStorage.setItem("vergo_refresh_token", data.refreshToken);
        }

        window.dispatchEvent(new Event("vergo-auth-change"));

        setMessage({
          text: "Password changed successfully! Redirecting to Employee Dashboard...",
          type: "success",
        });

        setTimeout(() => {
          router.push("/employee");
        }, 1500);
      } catch (err: any) {
        setMessage({
          text: err.message || "Failed to update temporary password. Please check your credentials.",
          type: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Standard Email Password Recovery Flow
    if (!session) {
      setMessage({
        text: "No active recovery session found. Please request a new recovery link.",
        type: "error",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const client = createSupabaseClient();
      if (!client) {
        throw new Error("Authentication provider is currently offline.");
      }

      const { error } = await client.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setMessage({
        text: "Your password has been successfully updated. Redirecting to sign in...",
        type: "success",
      });

      await client.auth.signOut();
      sessionStorage.removeItem("vergo_is_logged_in");
      sessionStorage.removeItem("vergo_access_token");
      sessionStorage.removeItem("vergo_refresh_token");
      sessionStorage.removeItem("vergo_user");

      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err: any) {
      setMessage({
        text: err.message || "Failed to update password. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasMinLength = newPassword.length >= 6;
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+=[\]{};':"\\|<>?,./`~-]/.test(newPassword);
  const isPasswordValid =
    hasMinLength && hasLowerCase && hasUpperCase && hasNumber && hasSpecialChar;

  const passwordRequirements = [
    { label: "At least 6 characters", met: hasMinLength },
    { label: "At least one lowercase letter (a-z)", met: hasLowerCase },
    { label: "At least one uppercase letter (A-Z)", met: hasUpperCase },
    { label: "At least one number (0-9)", met: hasNumber },
    { label: "At least one special character (!@#$%^&* etc.)", met: hasSpecialChar },
  ];

  const isPasswordInvalid = newPassword.length > 0 && !isPasswordValid;
  const isConfirmInvalid = confirmPassword.length > 1 && newPassword !== confirmPassword;

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

          <h1 className="register-title">
            {isRequiredTempReset ? "SET PERMANENT PASSWORD" : "CREATE NEW PASSWORD"}
          </h1>

          {isRequiredTempReset && (
            <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.8rem", marginBottom: "20px", textAlign: "center", lineHeight: "1.5" }}>
              Welcome! You signed in using a temporary password set by Admin. Please set a new permanent password to access the employee portal.
            </p>
          )}

          {isVerifying ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <p style={{ color: "var(--accent-muted, #8e8e93)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", animation: "pulse 1.5s infinite" }}>
                Verifying recovery tokens...
              </p>
            </div>
          ) : !isRequiredTempReset && !session ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ padding: "16px", border: "1px solid rgba(255, 77, 77, 0.2)", borderRadius: "8px", backgroundColor: "rgba(255, 77, 77, 0.05)", marginBottom: "24px" }}>
                <p style={{ color: "#ff4d4d", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: "1.4" }}>
                  Invalid or Expired Link
                </p>
                <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem", marginTop: "8px", lineHeight: "1.4" }}>
                  The recovery link is invalid, expired, or has already been used. Please request a new one.
                </p>
              </div>
              <Link
                href="/auth/forgot-password"
                className="register-submit-btn"
                style={{ display: "block", textDecoration: "none", textAlign: "center", paddingTop: "12px", paddingBottom: "12px" }}
              >
                Request Recovery Link
              </Link>
            </div>
          ) : (
            <form className="register-form" onSubmit={handleSubmit}>
              {/* Temporary Password Input (only shown when reset is required for new employee) */}
              {isRequiredTempReset && (
                <div className="input-group">
                  <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                    TEMPORARY PASSWORD
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter current temporary password"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="custom-input"
                    required
                  />
                </div>
              )}

              {/* New Password Input */}
              <div className="input-group">
                <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                  NEW PERMANENT PASSWORD
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      borderColor: isPasswordInvalid ? "#ff4d4d" : undefined,
                      boxShadow: isPasswordInvalid ? "0 0 0 1px #ff4d4d" : undefined
                    }}
                    className="custom-input"
                    required
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
                {newPassword.length > 0 && (
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
              </div>

              {/* Confirm Password Input */}
              <div className="input-group">
                <label className="input-label" style={{ display: "block", color: "var(--text-primary, #ffffff)", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", textAlign: "left" }}>
                  CONFIRM NEW PERMANENT PASSWORD
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    borderColor: isConfirmInvalid ? "#ff4d4d" : undefined,
                    boxShadow: isConfirmInvalid ? "0 0 0 1px #ff4d4d" : undefined
                  }}
                  className="custom-input"
                  required
                />
                {isConfirmInvalid && (
                  <span className="field-error-message" style={{ color: "#ff4d4d", fontSize: "0.75rem", marginTop: "4px", display: "block", textAlign: "left" }}>
                    Passwords do not match.
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isPasswordInvalid || isConfirmInvalid || !newPassword || !confirmPassword}
                className="register-submit-btn"
                style={{
                  opacity: (isSubmitting || isPasswordInvalid || isConfirmInvalid || !newPassword || !confirmPassword) ? 0.6 : 1,
                  cursor: (isSubmitting || isPasswordInvalid || isConfirmInvalid || !newPassword || !confirmPassword) ? "not-allowed" : "pointer",
                  marginTop: "16px"
                }}
              >
                {isSubmitting ? "SAVING NEW PASSWORD..." : "SAVE & GO TO DASHBOARD"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
