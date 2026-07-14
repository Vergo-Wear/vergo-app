"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { createSupabaseClient } from "@/lib/supabase";
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

  const [currentUser, setCurrentUser] = useState<NavbarProps["user"]>(user);
  const [loggedInState, setLoggedInState] = useState<boolean>(isLoggedIn);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const loadAuthState = () => {
      const storedUser = sessionStorage.getItem("vergo_user");
      const storedLoggedIn = sessionStorage.getItem("vergo_is_logged_in");

      if (storedLoggedIn === "true" && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setCurrentUser(parsedUser);
          setLoggedInState(true);
        } catch (e) {
          console.error("Error parsing user data from localStorage:", e);
        }
      } else {
        setCurrentUser(user);
        setLoggedInState(isLoggedIn);
      }
    };

    loadAuthState();

    const handleAuthChange = () => {
      loadAuthState();
    };

    window.addEventListener("vergo-auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("vergo-auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [user, isLoggedIn]);

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
        <ul className="nav-links">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>

        {/* Action icons / buttons */}
        <div className="nav-actions">
          <Link href="/cart" className="icon-btn relative-btn" aria-label="Cart">
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
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <span className="cart-badge">{cartCount}</span>
          </Link>

          {loggedInState ? (
            <div className="user-profile-menu">
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
              <li>
                <Link href="/profile" onClick={() => setIsOpen(false)}>
                  MY ACCOUNT
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
