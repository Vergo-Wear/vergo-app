"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./navbar.css";

export interface NavbarProps {
  cartCount?: number;
  isLoggedIn?: boolean;
  user?: {
    name: string;
    email: string;
  };
  onLogoutClick?: () => void;
  onSearch?: (query: string) => void;
  links?: Array<{ label: string; href: string }>;
}

const defaultLinks = [
  { label: "HOME", href: "/" },
  { label: "COLLECTION", href: "/#collection" },
  { label: "ABOUT US", href: "/#aboutus" },
];

export default function Navbar({
  cartCount = 0,
  isLoggedIn = false,
  user,
  onLogoutClick,
  onSearch,
  links,
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const navLinks = links || defaultLinks;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    } else if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

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
          <form onSubmit={handleSearchSubmit} className="nav-search">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="nav-search-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nav-search-input"
            />
          </form>

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

          {isLoggedIn ? (
            <div className="user-profile-menu">
              <div className="user-initials" aria-haspopup="true">
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <div className="user-dropdown">
                <span className="user-email">{user?.email || "user@vergowear.com"}</span>
                <hr className="dropdown-divider" />
                <Link href="/admin" className="dropdown-item">Admin Dashboard</Link>
                <Link href="/profile" className="dropdown-item">My Account</Link>
                <button
                  onClick={() => {
                    if (onLogoutClick) onLogoutClick();
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
              <Link href="/auth/register" className="login-btn">
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
          {isLoggedIn ? (
            <>
              <li>
                <Link href="/profile" onClick={() => setIsOpen(false)}>
                  MY ACCOUNT
                </Link>
              </li>
              <li>
                <button
                  className="mobile-logout-btn"
                  onClick={() => {
                    setIsOpen(false);
                    if (onLogoutClick) onLogoutClick();
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
                  href="/auth/register"
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