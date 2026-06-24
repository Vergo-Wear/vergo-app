"use client";

import { useState } from "react";
import Image from "next/image";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo">
          <Image
            src="/images/wlogo.png"
            alt="VERGO"
            width={120}
            height={36}
            priority
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Desktop Links */}
        <ul className="nav-links">
          <li><a href="#home">HOME</a></li>
          <li><a href="#collection">COLLECTION</a></li>
          <li><a href="#about">ABOUT</a></li>
        </ul>

        {/* Action icons / buttons */}
        <div className="nav-actions">
          <div className="nav-search">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-search-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search items"
              className="nav-search-input"
            />
          </div>

          <button className="icon-btn relative-btn" aria-label="Cart">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="cart-badge">2</span>
          </button>

          <button className="login-btn">Login</button>

          {/* Hamburger toggle */}
          <button className="hamburger" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            <span className={`bar ${isOpen ? "open" : ""}`}></span>
            <span className={`bar ${isOpen ? "open" : ""}`}></span>
            <span className={`bar ${isOpen ? "open" : ""}`}></span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <div className={`mobile-menu ${isOpen ? "active" : ""}`}>
        <ul>
          <li><a href="#home" onClick={() => setIsOpen(false)}>HOME</a></li>
          <li><a href="#collection" onClick={() => setIsOpen(false)}>COLLECTION</a></li>
          <li><a href="#about" onClick={() => setIsOpen(false)}>ABOUT</a></li>
          <li><button className="mobile-login-btn" onClick={() => setIsOpen(false)}>Login</button></li>
        </ul>
      </div>
    </nav>
  );
}