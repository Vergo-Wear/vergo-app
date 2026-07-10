"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Address {
  id: string;
  isDefault: boolean;
  line1: string;
  line2: string;
  line3: string;
  phone: string;
}



export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; phone?: string; avatarUrl?: string }>({
    name: "VERGO_CUSTOMER",
    email: "VERGOCUSTOMER@COOL.NET",
    phone: "+94 71 0870 119",
  });

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);



  // Modals & Drawer States
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showEditAddress, setShowEditAddress] = useState(false);

  const [activeAddressId, setActiveAddressId] = useState<string | null>(null);

  // Form States
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [addressForm, setAddressForm] = useState({ line1: "", line2: "", line3: "", phone: "", isDefault: false });

  // Initial Load from LocalStorage
  useEffect(() => {
    setMounted(true);

    // 1. Auth Status & User Info
    const storedLoggedIn = localStorage.getItem("vergo_is_logged_in");
    const storedUser = localStorage.getItem("vergo_user");

    let currentUser: { name: string; email: string; phone?: string; avatarUrl?: string } = {
      name: "VERGO_CUSTOMER",
      email: "VERGOCUSTOMER@COOL.NET",
      phone: "+94 71 0870 119",
    };

    if (storedLoggedIn === "true" && storedUser) {
      setIsLoggedIn(true);
      try {
        const parsed = JSON.parse(storedUser);
        currentUser = {
          name: parsed.name || "VERGO_CUSTOMER",
          email: parsed.email || "VERGOCUSTOMER@COOL.NET",
          phone: parsed.phone || "+94 71 0870 119",
          avatarUrl: parsed.avatarUrl,
        };
        setUser(currentUser);
      } catch (e) {
        console.error("Error loading user info:", e);
      }
    } else {
      // Default mock user profile
      setUser(currentUser);
    }

    // 2. Load Addresses
    const storedAddresses = localStorage.getItem("vergo_addresses");
    if (storedAddresses) {
      try {
        setAddresses(JSON.parse(storedAddresses));
      } catch (e) {
        console.error("Error loading addresses:", e);
      }
    } else {
      // Seed default address from Figma design
      const defaultAddresses: Address[] = [
        {
          id: "addr-1",
          isDefault: true,
          line1: "NO 55/5 BOTHALE",
          line2: "MEDAGAMA",
          line3: "AMBEPUSSA",
          phone: "+94 71 0870 119",
        },
      ];
      setAddresses(defaultAddresses);
      localStorage.setItem("vergo_addresses", JSON.stringify(defaultAddresses));
    }


  }, []);

  // Sync Body Scroll Lock when modal is open
  useEffect(() => {
    if (showEditProfile || showAddAddress || showEditAddress) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showEditProfile, showAddAddress, showEditAddress]);

  if (!mounted) return null;

  // Login Demo Customer logic for testing
  const handleLoginDemo = () => {
    localStorage.setItem("vergo_is_logged_in", "true");
    const demoUser = {
      name: "VERGO_CUSTOMER",
      email: "VERGOCUSTOMER@COOL.NET",
      phone: "+94 71 0870 119",
      avatarUrl: "/images/default-avatar.png",
    };
    localStorage.setItem("vergo_user", JSON.stringify(demoUser));
    setUser(demoUser);
    setIsLoggedIn(true);
    window.dispatchEvent(new Event("vergo-auth-change"));
  };

  // Profile Edit Handling
  const openEditProfile = () => {
    setProfileForm({
      name: user.name,
      phone: user.phone || "",
    });
    setShowEditProfile(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return;

    const updatedUser = {
      ...user,
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim(),
    };
    setUser(updatedUser);

    // Save back to localStorage
    if (isLoggedIn) {
      localStorage.setItem("vergo_user", JSON.stringify(updatedUser));
    } else {
      // Auto register/login in localstorage to match visual state
      localStorage.setItem("vergo_is_logged_in", "true");
      localStorage.setItem("vergo_user", JSON.stringify(updatedUser));
      setIsLoggedIn(true);
    }

    // Trigger Navbar update
    window.dispatchEvent(new Event("vergo-auth-change"));
    setShowEditProfile(false);
  };

  // Address Add Handling
  const openAddAddress = () => {
    setAddressForm({
      line1: "",
      line2: "",
      line3: "",
      phone: user.phone || "",
      isDefault: addresses.length === 0, // default if it's the first address
    });
    setShowAddAddress(true);
  };

  const handleSaveAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.line1.trim()) return;

    const newAddress: Address = {
      id: `addr-${Date.now()}`,
      isDefault: addressForm.isDefault,
      line1: addressForm.line1.toUpperCase().trim(),
      line2: addressForm.line2.toUpperCase().trim(),
      line3: addressForm.line3.toUpperCase().trim(),
      phone: addressForm.phone.trim(),
    };

    let updatedAddresses = [...addresses];
    if (newAddress.isDefault) {
      updatedAddresses = updatedAddresses.map((a) => ({ ...a, isDefault: false }));
    }
    updatedAddresses.push(newAddress);

    setAddresses(updatedAddresses);
    localStorage.setItem("vergo_addresses", JSON.stringify(updatedAddresses));
    setShowAddAddress(false);
  };

  // Address Edit Handling
  const openEditAddress = (addr: Address) => {
    setActiveAddressId(addr.id);
    setAddressForm({
      line1: addr.line1,
      line2: addr.line2,
      line3: addr.line3,
      phone: addr.phone,
      isDefault: addr.isDefault,
    });
    setShowEditAddress(true);
  };

  const handleSaveEditAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.line1.trim() || !activeAddressId) return;

    let updatedAddresses = addresses.map((addr) => {
      if (addr.id === activeAddressId) {
        return {
          ...addr,
          line1: addressForm.line1.toUpperCase().trim(),
          line2: addressForm.line2.toUpperCase().trim(),
          line3: addressForm.line3.toUpperCase().trim(),
          phone: addressForm.phone.trim(),
          isDefault: addressForm.isDefault,
        };
      }
      return addr;
    });

    // Enforce single default address
    if (addressForm.isDefault) {
      updatedAddresses = updatedAddresses.map((addr) =>
        addr.id !== activeAddressId ? { ...addr, isDefault: false } : addr
      );
    } else {
      // Ensure at least one address is default if list is not empty
      const hasDefault = updatedAddresses.some((a) => a.isDefault);
      if (!hasDefault && updatedAddresses.length > 0) {
        updatedAddresses[0].isDefault = true;
      }
    }

    setAddresses(updatedAddresses);
    localStorage.setItem("vergo_addresses", JSON.stringify(updatedAddresses));
    setShowEditAddress(false);
    setActiveAddressId(null);
  };

  const handleDeleteAddress = (id: string) => {
    const isTargetDefault = addresses.find((a) => a.id === id)?.isDefault;
    let updatedAddresses = addresses.filter((addr) => addr.id !== id);

    if (isTargetDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }

    setAddresses(updatedAddresses);
    localStorage.setItem("vergo_addresses", JSON.stringify(updatedAddresses));
  };

  const handleSetDefaultAddress = (id: string) => {
    const updatedAddresses = addresses.map((addr) => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    setAddresses(updatedAddresses);
    localStorage.setItem("vergo_addresses", JSON.stringify(updatedAddresses));
  };

  const defaultAddress = addresses.find((addr) => addr.isDefault);
  const secondaryAddresses = addresses.filter((addr) => !addr.isDefault);

  return (
    <div className="profile-page-wrapper">
      <div className="profile-container">
        {/* Top Header section */}
        <div className="profile-header">
          <h1 className="profile-title">PROFILE</h1>
          <Link href="/profile/orders">
            <button
              type="button"
              className="order-history-btn"
            >
              ORDER HISTORY
            </button>
          </Link>
        </div>

        {/* Profile Card Summary */}
        <div className="profile-card">
          <div className="profile-field-group">
            <span className="profile-field-label">NAME</span>
            <div className="profile-field-value-wrapper">
              <span className="profile-field-value">{user.name}</span>
              <button
                type="button"
                className="profile-edit-trigger"
                onClick={openEditProfile}
                aria-label="Edit Name"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="profile-field-group">
            <span className="profile-field-label">EMAIL</span>
            <div className="profile-field-value-wrapper">
              <span className="profile-field-value email-value">{user.email}</span>
            </div>
          </div>

          <div className="profile-field-group">
            <span className="profile-field-label">MOBILE NUMBER</span>
            <div className="profile-field-value-wrapper">
              <span className="profile-field-value">{user.phone || "NOT SPECIFIED"}</span>
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="profile-card">
          {/* Section Header */}
          <div className="addresses-header-row">
            <h2 className="addresses-title">ADDRESSES</h2>
            <button
              type="button"
              className="add-address-btn"
              onClick={openAddAddress}
            >
              ADD+
            </button>
          </div>

          {/* Default Address Section */}
          <div className="profile-field-group">
            <div className="address-sub-label-row">
              <span className="address-sub-label">DEFAULT ADDRESS</span>
              {defaultAddress && (
                <button
                  type="button"
                  className="profile-edit-trigger"
                  onClick={() => openEditAddress(defaultAddress)}
                  aria-label="Edit Default Address"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
              )}
            </div>

            {defaultAddress ? (
              <div className="address-text-block" style={{ marginTop: "10px" }}>
                <div>{defaultAddress.line1}</div>
                <div>{defaultAddress.line2}</div>
                <div>{defaultAddress.line3}</div>
                <div style={{ marginTop: "4px", color: "rgba(255, 255, 255, 0.6)" }}>{defaultAddress.phone}</div>
              </div>
            ) : (
              <div className="no-address-message">NO DEFAULT ADDRESS RECORDED. CLICK "ADD+" TO SPECIFY ONE.</div>
            )}
          </div>

          {/* Secondary Addresses Section */}
          {secondaryAddresses.length > 0 && (
            <div className="profile-field-group" style={{ marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "24px" }}>
              <span className="address-sub-label">ADDITIONAL ADDRESSES</span>
              {secondaryAddresses.map((addr) => (
                <div key={addr.id} className="address-item-container">
                  <div className="address-text-block">
                    <div>{addr.line1}</div>
                    <div>{addr.line2}</div>
                    <div>{addr.line3}</div>
                    <div style={{ marginTop: "4px", color: "rgba(255, 255, 255, 0.6)" }}>{addr.phone}</div>
                  </div>
                  <div className="address-actions">
                    <button
                      type="button"
                      className="address-action-btn set-default-btn"
                      onClick={() => handleSetDefaultAddress(addr.id)}
                    >
                      SET DEFAULT
                    </button>
                    <button
                      type="button"
                      className="address-action-btn"
                      onClick={() => openEditAddress(addr)}
                    >
                      EDIT
                    </button>
                    <button
                      type="button"
                      className="address-action-btn"
                      style={{ color: "#ff4d4d" }}
                      onClick={() => handleDeleteAddress(addr.id)}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Demo Helper Panel (Only visible if not fully logged in to ease manual verification) */}
        {!isLoggedIn && (
          <div className="profile-card" style={{ border: "1px dashed #00FF9D", background: "rgba(0, 255, 157, 0.02)" }}>
            <div className="profile-field-group" style={{ alignItems: "center", gap: "12px", textAlign: "center" }}>
              <span className="profile-field-label" style={{ color: "#00FF9D" }}>VERIFICATION & TESTING MODE</span>
              <p style={{ fontSize: "0.85rem", color: "#8e8e93", margin: 0, maxWidth: "600px" }}>
                You are currently viewing this page with default mock values. Click the button below to simulate a log in session instantly.
              </p>
              <button
                type="button"
                className="order-history-btn"
                style={{ fontSize: "0.75rem", padding: "10px 20px" }}
                onClick={handleLoginDemo}
              >
                Simulate Sign-In
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: EDIT PROFILE */}
      {showEditProfile && (
        <div className="profile-modal-overlay" onClick={() => setShowEditProfile(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-trigger"
              onClick={() => setShowEditProfile(false)}
            >
              &times;
            </button>
            <h3 className="modal-header-title">Edit Profile</h3>
            <form className="modal-form" onSubmit={handleSaveProfile}>
              <div className="profile-field-group">
                <span className="profile-field-label">NAME</span>
                <input
                  type="text"
                  className="modal-input-field"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="VERGO CUSTOMER"
                  required
                  autoFocus
                />
              </div>
              <div className="profile-field-group">
                <span className="profile-field-label">MOBILE NUMBER</span>
                <input
                  type="text"
                  className="modal-input-field"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+94 71 0870 119"
                />
              </div>
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="modal-btn cancel-btn"
                  onClick={() => setShowEditProfile(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn save-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ADDRESS */}
      {showAddAddress && (
        <div className="profile-modal-overlay" onClick={() => setShowAddAddress(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-trigger"
              onClick={() => setShowAddAddress(false)}
            >
              &times;
            </button>
            <h3 className="modal-header-title">Add New Address</h3>
            <form className="modal-form" onSubmit={handleSaveAddAddress}>
              <div className="profile-field-group">
                <span className="profile-field-label">ADDRESS LINE 1</span>
                <input
                  type="text"
                  className="modal-input-field"
                  value={addressForm.line1}
                  onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                  placeholder="NO 55/5 BOTHALE"
                  required
                  autoFocus
                />
              </div>
              <div className="profile-field-group">
                <span className="profile-field-label">ADDRESS LINE 2</span>
                <input
                  type="text"
                  className="modal-input-field"
                  value={addressForm.line2}
                  onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
                  placeholder="MEDAGAMA"
                />
              </div>
              <div className="profile-field-group">
                <span className="profile-field-label">ADDRESS LINE 3</span>
                <input
                  type="text"
                  className="modal-input-field"
                  value={addressForm.line3}
                  onChange={(e) => setAddressForm({ ...addressForm, line3: e.target.value })}
                  placeholder="AMBEPUSSA"
                />
              </div>
              <div className="profile-field-group">
                <span className="profile-field-label">CONTACT PHONE NUMBER</span>
                <input
                  type="text"
                  className="modal-input-field"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  placeholder="+94 71 0870 119"
                  required
                />
              </div>
              <div className="profile-field-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  id="defaultAddressCheckboxAdd"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  style={{ width: "16px", height: "16px", accentColor: "#00FF9D", cursor: "pointer" }}
                />
                <label htmlFor="defaultAddressCheckboxAdd" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#8e8e93", cursor: "pointer", letterSpacing: "0.05em" }}>
                  SET AS DEFAULT ADDRESS
                </label>
              </div>
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="modal-btn cancel-btn"
                  onClick={() => setShowAddAddress(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn save-btn">
                  Add Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ADDRESS */}
      {showEditAddress && (
        <div className="profile-modal-overlay" onClick={() => setShowEditAddress(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-trigger"
              onClick={() => setShowEditAddress(false)}
            >
              &times;
            </button>
            <h3 className="modal-header-title">Edit Address</h3>
            <form className="modal-form" onSubmit={handleSaveEditAddress}>
              <div className="profile-field-group">
                <span className="profile-field-label">ADDRESS LINE 1</span>
                <input
                  type="text"
                  className="modal-input-field"
                  value={addressForm.line1}
                  onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                  placeholder="NO 55/5 BOTHALE"
                  required
                  autoFocus
                />
              </div>
              <div className="profile-field-group">
                <span className="profile-field-label">ADDRESS LINE 2</span>
                <input
                  type="text"
                  className="modal-input-field"
                  value={addressForm.line2}
                  onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
                  placeholder="MEDAGAMA"
                />
              </div>
              <div className="profile-field-group">
                <span className="profile-field-label">ADDRESS LINE 3</span>
                <input
                  type="text"
                  className="modal-input-field"
                  value={addressForm.line3}
                  onChange={(e) => setAddressForm({ ...addressForm, line3: e.target.value })}
                  placeholder="AMBEPUSSA"
                />
              </div>
              <div className="profile-field-group">
                <span className="profile-field-label">CONTACT PHONE NUMBER</span>
                <input
                  type="text"
                  className="modal-input-field"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  placeholder="+94 71 0870 119"
                  required
                />
              </div>
              <div className="profile-field-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  id="defaultAddressCheckboxEdit"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  disabled={addresses.length === 1 && addressForm.isDefault} // Can't unset default if it's the only one
                  style={{ width: "16px", height: "16px", accentColor: "#00FF9D", cursor: "pointer" }}
                />
                <label htmlFor="defaultAddressCheckboxEdit" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#8e8e93", cursor: "pointer", letterSpacing: "0.05em" }}>
                  SET AS DEFAULT ADDRESS
                </label>
              </div>
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="modal-btn cancel-btn"
                  onClick={() => setShowEditAddress(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn save-btn">
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
