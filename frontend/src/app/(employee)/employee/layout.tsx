"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EmployeeProvider, useEmployee } from "./context/EmployeeContext";
import "@/styles/employee.css";

// Shared Layout Content to access EmployeeContext
function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { notifications, logoutEmployee, isEmployeeAvailable, availabilityLastNotified, toggleAvailability, searchQuery, setSearchQuery } = useEmployee();
  
  const isSearchHidden = pathname === "/employee" || pathname === "/employee/delivery-prep";
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const unreadNotifCount = notifications.length;

  const [empProfile, setEmpProfile] = useState<{
    name: string;
    role: string;
    initials: string;
  }>({
    name: "Employee",
    role: "Staff Member",
    initials: "EM",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawUser = sessionStorage.getItem("vergo_user");
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed.role === "Employee" && parsed.mustChangePassword === true) {
          window.location.href = `/auth/reset-password?required=true&email=${encodeURIComponent(parsed.email || "")}`;
          return;
        }

        const userId = parsed.id || parsed.profileId;
        const initialName = parsed.name || "Employee";
        const initialRole = parsed.position || "Staff Member";
        const initialInitials = initialName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        setEmpProfile({
          name: initialName,
          role: initialRole,
          initials: initialInitials || "EM",
        });

        if (userId) {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          fetch(`${apiUrl}/employees/profile/${userId}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.firstName && data?.lastName) {
                const fullName = `${data.firstName} ${data.lastName}`;
                const initials = fullName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                setEmpProfile({
                  name: fullName,
                  role: data.position || initialRole,
                  initials: initials || "EM",
                });
              }
            })
            .catch((e) => console.warn("Failed to load header employee profile:", e));
        }
      } catch (e) {
        console.error("Error reading employee session:", e);
      }
    }
  }, []);

  return (
    <div className="emp-layout-container flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Sidebar Navigation - Hidden on Mobile */}
      <aside className="emp-sidebar hidden md:flex">
        <div>
          <div className="emp-logo-section">
            <div className="emp-logo-text">Vergo-Emp</div>
            <div className="emp-logo-sub">Staff Portal</div>
          </div>

          <nav className="emp-nav-menu">
            <Link
              href="/employee"
              className={`emp-nav-item ${pathname === "/employee" ? "active" : ""}`}
            >
              <span className="emp-nav-item-left">
                <svg className="emp-nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                <span>Dashboard</span>
              </span>
            </Link>

            <Link
              href="/employee/orders"
              className={`emp-nav-item ${pathname.includes("/orders") ? "active" : ""}`}
            >
              <span className="emp-nav-item-left">
                <svg className="emp-nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Orders</span>
              </span>
            </Link>

            <Link
              href="/employee/product-prep"
              className={`emp-nav-item ${pathname.includes("/product-prep") || pathname.includes("/delivery-prep") ? "active" : ""}`}
            >
              <span className="emp-nav-item-left">
                <svg className="emp-nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Product Prep</span>
              </span>
            </Link>

            <Link
              href="/employee/ready-orders"
              className={`emp-nav-item ${pathname.includes("/ready-orders") ? "active" : ""}`}
            >
              <span className="emp-nav-item-left">
                <svg className="emp-nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Ready Orders</span>
              </span>
            </Link>

            <Link
              href="/employee/stock"
              className={`emp-nav-item ${pathname.includes("/stock") ? "active" : ""}`}
            >
              <span className="emp-nav-item-left">
                <svg className="emp-nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Stock</span>
              </span>
            </Link>
          </nav>
        </div>

      </aside>

      {/* Main Content Pane */}
      <div className="emp-content-area w-full">
        {/* Top Header - Mobile and Desktop Responsive */}
        <header className="emp-header flex flex-col sm:flex-row gap-3 sm:gap-0 h-auto sm:h-16 py-3 sm:py-0 px-4 sm:px-8 justify-between items-center">
          {/* Logo and Mobile controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-3 sm:gap-0">
            <div className="sm:hidden flex justify-between items-center w-full">
              <div className="flex flex-col">
                <span style={{ fontSize: "14px", fontWeight: 900, color: "var(--emp-neon-green)", letterSpacing: "0.5px" }}>VERGO-EMP</span>
                <span style={{ fontSize: "8px", color: "var(--emp-text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>Staff Portal</span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Mobile availability toggle status */}
                <button
                  onClick={toggleAvailability}
                  style={{
                    cursor: "pointer",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontWeight: 700,
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    border: isEmployeeAvailable ? "1px solid rgba(0, 255, 157, 0.2)" : "1px solid rgba(255, 120, 0, 0.2)",
                    background: isEmployeeAvailable ? "rgba(0, 255, 157, 0.05)" : "rgba(255, 120, 0, 0.05)",
                    color: isEmployeeAvailable ? "var(--emp-neon-green)" : "#ff7800",
                    textTransform: "uppercase"
                  }}
                >
                  <span style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    backgroundColor: isEmployeeAvailable ? "var(--emp-neon-green)" : "#ff7800",
                    display: "inline-block",
                  }}></span>
                  <span>{isEmployeeAvailable ? "Duty" : "Break"}</span>
                </button>
              </div>
            </div>

            {/* Search Input Box */}
            {!isSearchHidden ? (
              <div className="emp-search-container w-full sm:w-[320px]">
                <svg className="emp-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  className="emp-search-input"
                  style={{ width: "100%" }}
                  placeholder={
                    pathname.includes("/product-prep")
                      ? "Search product prep queue..."
                      : pathname.includes("/orders")
                      ? "Search orders, customers..."
                      : pathname.includes("/ready-orders")
                      ? "Search ready orders..."
                      : "Search..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            ) : (
              <div className="hidden sm:block sm:w-[320px]"></div>
            )}

            {/* Right side items */}
            <div className="emp-header-right flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
              {/* Navbar Notification Bell Icon */}
              <Link
                href="/employee/notifications"
                className="emp-header-icon-btn relative flex items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-all text-[#8e8e93] hover:text-white"
                title="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 19, height: 19 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#00ff9d] text-[#060608] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#060608]">
                    {unreadNotifCount}
                  </span>
                )}
              </Link>



              {/* Desktop Availability Toggle */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={toggleAvailability}
                  style={{
                    cursor: "pointer",
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontWeight: 700,
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    border: isEmployeeAvailable ? "1px solid rgba(0, 255, 157, 0.2)" : "1px solid rgba(255, 120, 0, 0.2)",
                    background: isEmployeeAvailable ? "rgba(0, 255, 157, 0.05)" : "rgba(255, 120, 0, 0.05)",
                    color: isEmployeeAvailable ? "var(--emp-neon-green)" : "#ff7800",
                    textTransform: "uppercase"
                  }}
                >
                  <span style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: isEmployeeAvailable ? "var(--emp-neon-green)" : "#ff7800",
                    display: "inline-block",
                    boxShadow: isEmployeeAvailable ? "0 0 6px var(--emp-neon-green-glow)" : "0 0 6px rgba(255, 120, 0, 0.3)"
                  }}></span>
                  <span>{isEmployeeAvailable ? "On Duty" : "On Break"}</span>
                </button>
                {availabilityLastNotified && (
                  <span style={{ fontSize: "10px", color: "var(--emp-text-muted)" }} title="Last Admin Notification">
                    ({availabilityLastNotified})
                  </span>
                )}
              </div>

              <span className="emp-header-divider hidden sm:block"></span>

              <div style={{ position: "relative" }}>
                <button className="emp-profile-trigger" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                  <div className="emp-profile-avatar">{empProfile.initials}</div>
                  <div className="emp-profile-info">
                    <span className="emp-profile-name">{empProfile.name}</span>
                    <span className="emp-profile-role">{empProfile.role}</span>
                  </div>
                </button>

                {showProfileMenu && (
                  <div style={{
                    position: "absolute",
                    right: 0,
                    top: "45px",
                    background: "#16161a",
                    border: "1px solid var(--emp-border)",
                    borderRadius: "8px",
                    padding: "8px 0",
                    width: "160px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    zIndex: 200
                  }}>
                    <Link
                       href="/employee/profile"
                       onClick={() => setShowProfileMenu(false)}
                       style={{
                         display: "flex",
                         alignItems: "center",
                         gap: "8px",
                         width: "100%",
                         padding: "10px 16px",
                         textAlign: "left",
                         color: "#ffffff",
                         fontSize: "13px",
                         textDecoration: "none",
                         borderBottom: "1px solid var(--emp-border)",
                         transition: "background 0.2s"
                       }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16, color: "var(--emp-neon-green)" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>My Account</span>
                    </Link>

                    <button
                      onClick={() => {
                        logoutEmployee();
                        setShowProfileMenu(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        width: "100%",
                        padding: "10px 16px",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        color: "var(--emp-danger-red)",
                        fontSize: "13px",
                        cursor: "pointer",
                        fontWeight: 700,
                        transition: "color 0.2s"
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto box-border" style={{ minWidth: 0 }}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#060608] border-t border-[rgba(255,255,255,0.05)] flex justify-around items-center h-16 z-[110] px-2 shadow-2xl">
        <Link href="/employee" className={`flex flex-col items-center gap-1 text-[10px] font-bold ${pathname === "/employee" ? "text-[#00ff9d]" : "text-gray-400"}`}>
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>Dashboard</span>
        </Link>
        
        <Link href="/employee/orders" className={`flex flex-col items-center gap-1 text-[10px] font-bold ${pathname.includes("/orders") ? "text-[#00ff9d]" : "text-gray-400"}`}>
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span>Orders</span>
        </Link>

        <Link href="/employee/product-prep" className={`flex flex-col items-center gap-1 text-[10px] font-bold ${pathname.includes("/product-prep") ? "text-[#00ff9d]" : "text-gray-400"}`}>
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          <span>Prep</span>
        </Link>

        <Link href="/employee/delivery-prep" className={`flex flex-col items-center gap-1 text-[10px] font-bold ${pathname.includes("/delivery-prep") ? "text-[#00ff9d]" : "text-gray-400"}`}>
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h6m-6 0H6m13 0h3v-4a2 2 0 00-2-2h-4v6z" />
          </svg>
          <span>Delivery</span>
        </Link>

        <Link href="/employee/stock" className={`flex flex-col items-center gap-1 text-[10px] font-bold ${pathname.includes("/stock") ? "text-[#00ff9d]" : "text-gray-400"}`}>
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span>Stock</span>
        </Link>
      </nav>

    </div>
  );
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <EmployeeProvider>
      <LayoutContent>{children}</LayoutContent>
    </EmployeeProvider>
  );
}
