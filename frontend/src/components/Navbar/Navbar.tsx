"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { createSupabaseClient } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { triggerManualTour } from "@/components/onboarding/OnboardingTour";
import "./navbar.css";

export interface NavbarProps {
  cartCount?: number;
  isLoggedIn?: boolean;
  user?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  onLogoutClick?: () => void;
  links?: Array<{ label: string; href: string }>;
}

const defaultLinks = [
  { label: "HOME", href: "/" },
  { label: "COLLECTION", href: "/collection" },
  { label: "ABOUT US", href: "/about" },
];

export default function Navbar({
  cartCount: cartCountProp = 0,
  isLoggedIn = false,
  user,
  onLogoutClick,
  links,
}: NavbarProps) {
  const { cartCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<NavbarProps["user"]>(user);
  const [loggedInState, setLoggedInState] = useState<boolean>(isLoggedIn);
  const [isCustomer, setIsCustomer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hideNavbar, setHideNavbar] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Auto redirect password recovery email links containing hash fragments to /auth/reset-password
    const hash = window.location.hash || "";
    if (
      (hash.includes("type=recovery") || hash.includes("access_token=")) &&
      !pathname.startsWith("/auth/reset-password")
    ) {
      router.push(`/auth/reset-password${hash}`);
      return;
    }

    if (pathname === "/auth/reset-password") {
      const urlParams = new URLSearchParams(window.location.search);
      const isRequired = urlParams.get("required") === "true";
      const rawUser = sessionStorage.getItem("vergo_user");
      let storedUser: any = null;
      if (rawUser) {
        try {
          storedUser = JSON.parse(rawUser);
        } catch (e) {}
      }
      if (isRequired || Boolean(storedUser?.mustChangePassword)) {
        setHideNavbar(true);
        return;
      }
    }
    setHideNavbar(false);
  }, [pathname, router]);

  useEffect(() => {
    const loadAuthState = () => {
      const storedUser = sessionStorage.getItem("vergo_user");
      const storedLoggedIn = sessionStorage.getItem("vergo_is_logged_in");

      if (storedLoggedIn === "true" && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setCurrentUser(parsedUser);
          setLoggedInState(true);
          setIsCustomer(
            String(parsedUser.role || "").toLowerCase() === "customer",
          );
        } catch (e) {
          console.error("Error parsing user data from localStorage:", e);
        }
      } else {
        setCurrentUser(user);
        setLoggedInState(isLoggedIn);
        setIsCustomer(false);
      }
    };

    loadAuthState();

    const handleAuthChange = () => {
      loadAuthState();
    };

    const handleAuthSubmitting = () => {
      setHideNavbar(true);
    };

    const handleAuthSubmittingDone = () => {
      setHideNavbar(false);
    };

    window.addEventListener("vergo-auth-change", handleAuthChange);
    window.addEventListener("vergo-auth-submitting", handleAuthSubmitting);
    window.addEventListener("vergo-auth-submitting-done", handleAuthSubmittingDone);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("vergo-auth-change", handleAuthChange);
      window.removeEventListener("vergo-auth-submitting", handleAuthSubmitting);
      window.removeEventListener("vergo-auth-submitting-done", handleAuthSubmittingDone);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [user, isLoggedIn]);

  // Unread notification count for the customer bell icon. Refreshes on
  // auth changes and whenever a page announces notifications were read.
  useEffect(() => {
    if (!loggedInState || !isCustomer) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    const loadUnreadCount = () => {
      authenticatedFetch("/notifications/unread-count", { cache: "no-store" })
        .then((response) => (response?.ok ? response.json() : null))
        .then((data: { count: number } | null) => {
          if (!cancelled && data) setUnreadCount(data.count);
        })
        .catch(() => {});
    };

    loadUnreadCount();
    window.addEventListener("vergo-notifications-change", loadUnreadCount);
    return () => {
      cancelled = true;
      window.removeEventListener("vergo-notifications-change", loadUnreadCount);
    };
  }, [loggedInState, isCustomer]);

  useEffect(() => {
    if (!showDropdown) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".user-profile-menu")) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [showDropdown]);

  const navLinks = links || defaultLinks;

  if (hideNavbar) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo">
          <Link href="/">
            <Image
              src="/images/wlogo.png"
              alt="VERGO"
              width={120}
              height={36}
              priority
              style={{ objectFit: "contain", width: "auto", height: "auto" }}
            />
          </Link>
        </div>

        {/* Desktop Links */}
        <ul className="nav-links" data-tour="customer-nav">
          {navLinks.map((link) => (
            <li
              key={link.label}
              {...(link.href === "/collection" ? { "data-tour": "customer-collections" } : {})}
              {...(link.href === "/about" ? { "data-tour": "customer-about" } : {})}
            >
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>

        {/* Action icons / buttons */}
        <div className="nav-actions">
          <Link href="/cart" className="icon-btn relative-btn" aria-label="Cart" data-tour="customer-cart">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <span className="cart-badge">{cartCount}</span>
          </Link>

          {loggedInState && isCustomer && (
            <Link
              href="/profile/notifications"
              className="icon-btn relative-btn"
              aria-label="Notifications"
              data-tour="customer-notifications"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="cart-badge">{unreadCount}</span>
              )}
            </Link>
          )}

          {loggedInState && isCustomer ? (
            <div className="user-profile-menu" data-tour="customer-account">
              <div
                className="user-initials"
                aria-haspopup="true"
                onClick={() => setShowDropdown((prev) => !prev)}
                style={currentUser?.avatarUrl ? { padding: 0, overflow: "hidden", background: "transparent" } : undefined}
              >
                {currentUser?.avatarUrl ? (
                  <Image
                    src={currentUser.avatarUrl}
                    alt={currentUser.name || "User Profile"}
                    width={38}
                    height={38}
                    className="user-avatar-img"
                    style={{ borderRadius: "50%", objectFit: "cover", width: "100%", height: "100%" }}
                  />
                ) : (
                  currentUser?.name ? currentUser.name[0].toUpperCase() : "U"
                )}
              </div>
              <div className={`user-dropdown ${showDropdown ? "show" : ""}`}>
                <span className="user-email">{currentUser?.email || "user@vergowear.com"}</span>
                <hr className="dropdown-divider" />
                <Link href="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>My Account</Link>
                <Link href="/profile/orders" className="dropdown-item" onClick={() => setShowDropdown(false)}>Order History</Link>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setShowDropdown(false);
                    triggerManualTour("customer");
                  }}
                >
                  Take a Tour
                </button>
                <button
                  onClick={async () => {
                    setShowDropdown(false);
                    const client = createSupabaseClient();
                    if (client) {
                      await client.auth.signOut().catch(console.error);
                    }
                    if (onLogoutClick) {
                      onLogoutClick();
                    } else {
                      sessionStorage.clear();
                      window.dispatchEvent(new Event("vergo-auth-change"));
                      router.push("/");
                    }
                  }}
                  className="dropdown-item logout-btn-item"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : loggedInState && !isCustomer ? (
            <Link
              href={
                String((currentUser as any)?.role || "").toLowerCase() === "employee"
                  ? "/employee"
                  : "/admin"
              }
              className="login-btn"
              style={{ background: "#00ff9d", color: "#000", fontWeight: 700 }}
            >
              PORTAL
            </Link>
          ) : (
            <>
              <Link href="/auth/register" className="nav-register-link">
                Register
              </Link>
              <Link href="/auth/login" className="login-btn">
                Login
              </Link>
            </>
          )}

          {/* Hamburger toggle */}
          <button
            className="hamburger"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <span className={`bar ${isOpen ? "open" : ""}`}></span>
            <span className={`bar ${isOpen ? "open" : ""}`}></span>
            <span className={`bar ${isOpen ? "open" : ""}`}></span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <div className={`mobile-menu ${isOpen ? "active" : ""}`}>
        <button
          className="mobile-menu-close"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        >
          &times;
        </button>
        <ul>
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link href={link.href} onClick={() => setIsOpen(false)}>
                {link.label}
              </Link>
            </li>
          ))}
          {loggedInState ? (
            <>
              {isCustomer && (
                <li>
                  <Link
                    href="/profile/notifications"
                    onClick={() => setIsOpen(false)}
                  >
                    NOTIFICATIONS{unreadCount > 0 ? ` (${unreadCount})` : ""}
                  </Link>
                </li>
              )}
              <li>
                <Link href="/profile" onClick={() => setIsOpen(false)}>
                  MY ACCOUNT
                </Link>
              </li>
              <li>
                <Link href="/profile/orders" onClick={() => setIsOpen(false)}>
                  ORDER HISTORY
                </Link>
              </li>
              <li>
                <button
                  className="mobile-logout-btn"
                  onClick={async () => {
                    setIsOpen(false);
                    const client = createSupabaseClient();
                    if (client) {
                      await client.auth.signOut().catch(console.error);
                    }
                    if (onLogoutClick) {
                      onLogoutClick();
                    } else {
                      sessionStorage.clear();
                      window.dispatchEvent(new Event("vergo-auth-change"));
                      router.push("/");
                    }
                  }}
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  href="/auth/login"
                  className="mobile-login-btn"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register"
                  className="mobile-register-btn"
                  onClick={() => setIsOpen(false)}
                >
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
