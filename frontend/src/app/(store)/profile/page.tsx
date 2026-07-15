"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import "@/styles/profile.css";

interface CustomerProfile {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  defaultShippingAddress: string | null;
}

interface UserAddress {
  addressId: string;
  customerId: string;
  receiverName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  postalCode: string;
  isPrimary: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const SRI_LANKAN_DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Moneragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa",
  "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
];

// Validation Helper Functions
const validatePhone = (p: string) => /^(?:\+94|0)?[1-9][0-9]{8}$/.test(p);
const validatePostalCode = (pc: string) => /^\d{5}$/.test(pc);
const validateName = (n: string) => n.trim().length >= 2;
const validateLine1 = (l: string) => l.trim().length >= 3;
const validateCity = (c: string) => c.trim().length >= 2;

export default function ProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [draft, setDraft] = useState<CustomerProfile | null>(null);
  const [activeModal, setActiveModal] = useState<"profile" | "address" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Address form draft state
  const [addressDraft, setAddressDraft] = useState({
    receiverName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "Colombo",
    postalCode: "",
    isPrimary: false
  });

  const loadAddresses = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/addresses/mine`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setAddresses(data);
      }
    } catch (err) {
      console.error("Failed to load customer addresses", err);
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) {
      setError("Please sign in to view your account.");
      return;
    }

    fetch(`${API_URL}/customers/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to retrieve your profile.");
        return response.json() as Promise<CustomerProfile>;
      })
      .then((data) => {
        setProfile(data);
        loadAddresses(token);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    document.body.style.overflow = activeModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeModal]);

  const openModal = (modal: "profile" | "address") => {
    if (!profile) return;
    setDraft({ ...profile });
    setActiveModal(modal);
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token || !draft) return;

    // Field Length Validations
    if (!validateName(draft.firstName)) {
      showToast("First name must be at least 2 characters.", "error");
      return;
    }
    if (!validateName(draft.lastName)) {
      showToast("Last name must be at least 2 characters.", "error");
      return;
    }

    setIsSaving(true);
    try {
      // Restrict access: Only PATCH first name and last name.
      const response = await fetch(`${API_URL}/customers/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
        }),
      });
      if (!response.ok) throw new Error("Unable to save your profile.");

      const updated = (await response.json()) as CustomerProfile;
      setProfile(updated);
      const storedUser = sessionStorage.getItem("vergo_user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        sessionStorage.setItem("vergo_user", JSON.stringify({
          ...user,
          name: `${updated.firstName} ${updated.lastName}`.trim(),
          phone: updated.phone,
          defaultShippingAddress: updated.defaultShippingAddress,
          customerId: updated.customerId,
        }));
        window.dispatchEvent(new Event("vergo-auth-change"));
      }
      setActiveModal(null);
      showToast("Profile updated successfully.", "success");
    } catch (reason: any) {
      showToast(reason.message || "Unable to save your profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAddress = async (event: FormEvent) => {
    event.preventDefault();
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) return;

    // Field Validations
    if (!validateName(addressDraft.receiverName)) {
      showToast("Receiver name must be at least 2 characters.", "error");
      return;
    }
    if (!validatePhone(addressDraft.phone)) {
      showToast("Please enter a valid Sri Lankan phone number (e.g. 0771234567).", "error");
      return;
    }
    if (!validateLine1(addressDraft.addressLine1)) {
      showToast("Address Line 1 must be at least 3 characters.", "error");
      return;
    }
    if (!validateCity(addressDraft.city)) {
      showToast("City name must be at least 2 characters.", "error");
      return;
    }
    if (!validatePostalCode(addressDraft.postalCode)) {
      showToast("Postal code must be a valid 5-digit Sri Lankan postal code.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/addresses/mine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverName: addressDraft.receiverName.trim(),
          phone: addressDraft.phone.trim(),
          addressLine1: addressDraft.addressLine1.trim(),
          addressLine2: addressDraft.addressLine2.trim() || undefined,
          city: addressDraft.city.trim(),
          district: addressDraft.district.trim(),
          postalCode: addressDraft.postalCode.trim(),
          isPrimary: addressDraft.isPrimary,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Unable to save address.");
      }

      await loadAddresses(token);
      
      // Reload customer details to sync the default address text block
      const profileRes = await fetch(`${API_URL}/customers/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }

      setActiveModal(null);
      setAddressDraft({
        receiverName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        district: "Colombo",
        postalCode: "",
        isPrimary: false
      });
      showToast("New address added successfully.", "success");
    } catch (reason: any) {
      showToast(reason.message || "Unable to save address.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMakePrimary = async (addressId: string) => {
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/addresses/mine/${addressId}/primary`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to update default address.");

      await loadAddresses(token);

      const profileRes = await fetch(`${API_URL}/customers/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }
      showToast("Default shipping address updated successfully.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to make default address.", "error");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this saved address?")) return;
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/addresses/mine/${addressId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete saved address.");

      await loadAddresses(token);

      const profileRes = await fetch(`${API_URL}/customers/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }
      showToast("Address deleted successfully.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to delete address.", "error");
    }
  };

  if (error) {
    return <main className="profile-page-wrapper"><div className="profile-container"><div className="profile-card"><h1 className="profile-title">ACCOUNT UNAVAILABLE</h1><p className="no-address-message">{error}</p><Link href="/auth/login" className="order-history-btn">LOG IN</Link></div></div></main>;
  }

  if (!profile) {
    return <main className="profile-page-wrapper"><div className="profile-container"><div className="profile-card"><p className="no-address-message">LOADING PROFILE...</p></div></div></main>;
  }

  // Address dynamic validations (if length > 1)
  const isAddressNameInvalid = addressDraft.receiverName.length > 1 && !validateName(addressDraft.receiverName);
  const isAddressPhoneInvalid = addressDraft.phone.length > 1 && !validatePhone(addressDraft.phone);
  const isAddressLine1Invalid = addressDraft.addressLine1.length > 1 && !validateLine1(addressDraft.addressLine1);
  const isAddressCityInvalid = addressDraft.city.length > 1 && !validateCity(addressDraft.city);
  const isAddressPostalInvalid = addressDraft.postalCode.length > 1 && !validatePostalCode(addressDraft.postalCode);

  // Profile dynamic validations (if length > 1)
  const isProfileFirstInvalid = draft && draft.firstName.length > 1 && !validateName(draft.firstName);
  const isProfileLastInvalid = draft && draft.lastName.length > 1 && !validateName(draft.lastName);

  return (
    <main className="profile-page-wrapper">
      <div className="profile-container">
        <header className="profile-header">
          <h1 className="profile-title">PROFILE</h1>
          <Link href="/profile/orders" className="order-history-btn">ORDER HISTORY</Link>
        </header>

        <section className="profile-card" aria-labelledby="profile-details-title">
          <div className="addresses-header-row">
            <h2 id="profile-details-title" className="addresses-title">PROFILE DETAILS</h2>
            <button type="button" className="profile-edit-trigger profile-edit-text" onClick={() => openModal("profile")} title="Edit profile" aria-label="Edit profile">EDIT</button>
          </div>
          <div className="profile-field-group"><span className="profile-field-label">NAME</span><span className="profile-field-value">{profile.firstName} {profile.lastName}</span></div>
          <div className="profile-field-group"><span className="profile-field-label">EMAIL</span><span className="profile-field-value email-value">{profile.email}</span></div>
          <div className="profile-field-group"><span className="profile-field-label">MOBILE NUMBER</span><span className="profile-field-value">{profile.phone || "NOT SPECIFIED"}</span></div>
        </section>

        <section className="profile-card" aria-labelledby="address-title">
          <div className="addresses-header-row">
            <h2 id="address-title" className="addresses-title">SAVED ADDRESSES</h2>
            <button type="button" className="add-address-btn" onClick={() => openModal("address")}>ADD+</button>
          </div>
          
          <div style={{ marginTop: "20px" }}>
            {addresses.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {addresses.map((addr) => (
                  <div key={addr.addressId} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "700", color: "#ffffff", marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>{addr.receiverName}</span>
                        {addr.isPrimary && (
                          <span style={{ fontSize: "9px", backgroundColor: "rgba(0, 255, 157, 0.1)", color: "#00FF9D", border: "1px solid rgba(0,255,157,0.2)", padding: "1px 6px", borderRadius: "4px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", lineHeight: "1.5" }}>
                        {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ""}, {addr.city}, {addr.district} ({addr.postalCode})
                      </div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                        Phone: {addr.phone}
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                      {!addr.isPrimary && (
                        <button 
                          type="button" 
                          onClick={() => handleMakePrimary(addr.addressId)}
                          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", cursor: "pointer", transition: "all 0.2s" }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#ffffff"}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
                        >
                          MAKE DEFAULT
                        </button>
                      )}
                      <button 
                        type="button" 
                        onClick={() => handleDeleteAddress(addr.addressId)}
                        style={{ background: "transparent", border: "1px solid rgba(255, 77, 77, 0.2)", color: "#ff4d4d", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 77, 77, 0.05)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-address-message">NO SAVED ADDRESSES RECORDED.</p>
            )}
          </div>
        </section>
      </div>

      {activeModal && (
        <div className="profile-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="profile-modal-content" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onClick={(event) => event.stopPropagation()} style={{ maxWidth: activeModal === "address" ? "500px" : "400px" }}>
            <button type="button" className="modal-close-trigger" onClick={() => setActiveModal(null)} title="Close" aria-label="Close">&times;</button>
            <h2 id="profile-modal-title" className="modal-header-title">{activeModal === "profile" ? "Edit Profile" : "Add Saved Address"}</h2>
            
            {activeModal === "profile" && draft ? (
              <form className="modal-form" onSubmit={saveProfile}>
                <label className="profile-field-group">
                  <span className="profile-field-label">FIRST NAME</span>
                  <input 
                    className="modal-input-field" 
                    value={draft.firstName} 
                    onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} 
                    style={{
                      borderColor: isProfileFirstInvalid ? "#ff4d4d" : undefined,
                      boxShadow: isProfileFirstInvalid ? "0 0 0 1px #ff4d4d" : undefined
                    }}
                    required 
                    autoFocus 
                  />
                </label>
                <label className="profile-field-group">
                  <span className="profile-field-label">LAST NAME</span>
                  <input 
                    className="modal-input-field" 
                    value={draft.lastName} 
                    onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} 
                    style={{
                      borderColor: isProfileLastInvalid ? "#ff4d4d" : undefined,
                      boxShadow: isProfileLastInvalid ? "0 0 0 1px #ff4d4d" : undefined
                    }}
                    required 
                  />
                </label>
                
                {/* Information Callout clarifying restrictions */}
                <div style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "12px", marginTop: "12px" }}>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: "1.5" }}>
                    Mobile Number and Email are verified account attributes and cannot be modified from the profile panel.
                  </p>
                </div>
                
                <div className="modal-actions-row">
                  <button type="button" className="modal-btn cancel-btn" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button type="submit" className="modal-btn save-btn" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button>
                </div>
              </form>
            ) : (
              <form className="modal-form" onSubmit={handleAddAddress}>
                <label className="profile-field-group">
                  <span className="profile-field-label">RECEIVER NAME</span>
                  <input 
                    className="modal-input-field" 
                    value={addressDraft.receiverName} 
                    onChange={(e) => setAddressDraft({ ...addressDraft, receiverName: e.target.value })} 
                    placeholder="e.g. Alexander Mercer" 
                    style={{
                      borderColor: isAddressNameInvalid ? "#ff4d4d" : undefined,
                      boxShadow: isAddressNameInvalid ? "0 0 0 1px #ff4d4d" : undefined
                    }}
                    required 
                    autoFocus 
                  />
                </label>
                <label className="profile-field-group">
                  <span className="profile-field-label">PHONE NUMBER</span>
                  <input 
                    className="modal-input-field" 
                    value={addressDraft.phone} 
                    onChange={(e) => setAddressDraft({ ...addressDraft, phone: e.target.value })} 
                    placeholder="e.g. 0771234567" 
                    style={{
                      borderColor: isAddressPhoneInvalid ? "#ff4d4d" : undefined,
                      boxShadow: isAddressPhoneInvalid ? "0 0 0 1px #ff4d4d" : undefined
                    }}
                    required 
                  />
                </label>
                <label className="profile-field-group">
                  <span className="profile-field-label">ADDRESS LINE 1</span>
                  <input 
                    className="modal-input-field" 
                    value={addressDraft.addressLine1} 
                    onChange={(e) => setAddressDraft({ ...addressDraft, addressLine1: e.target.value })} 
                    placeholder="e.g. 42 Technical District" 
                    style={{
                      borderColor: isAddressLine1Invalid ? "#ff4d4d" : undefined,
                      boxShadow: isAddressLine1Invalid ? "0 0 0 1px #ff4d4d" : undefined
                    }}
                    required 
                  />
                </label>
                <label className="profile-field-group">
                  <span className="profile-field-label">ADDRESS LINE 2 (OPTIONAL)</span>
                  <input className="modal-input-field" value={addressDraft.addressLine2} onChange={(e) => setAddressDraft({ ...addressDraft, addressLine2: e.target.value })} placeholder="e.g. Suite 101, Innovation Way" />
                </label>
                <label className="profile-field-group">
                  <span className="profile-field-label">CITY</span>
                  <input 
                    className="modal-input-field" 
                    value={addressDraft.city} 
                    onChange={(e) => setAddressDraft({ ...addressDraft, city: e.target.value })} 
                    placeholder="e.g. Colombo" 
                    style={{
                      borderColor: isAddressCityInvalid ? "#ff4d4d" : undefined,
                      boxShadow: isAddressCityInvalid ? "0 0 0 1px #ff4d4d" : undefined
                    }}
                    required 
                  />
                </label>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <label className="profile-field-group">
                    <span className="profile-field-label">DISTRICT</span>
                    <select 
                      className="modal-input-field" 
                      value={addressDraft.district} 
                      onChange={(e) => setAddressDraft({ ...addressDraft, district: e.target.value })}
                      style={{ backgroundColor: "#1c1c1e", border: "1px solid rgba(255,255,255,0.08)", color: "#ffffff", padding: "10px", borderRadius: "6px", width: "100%", outline: "none", cursor: "pointer" }}
                      required
                    >
                      {SRI_LANKAN_DISTRICTS.map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </label>
                  <label className="profile-field-group">
                    <span className="profile-field-label">POSTAL CODE</span>
                    <input 
                      className="modal-input-field" 
                      value={addressDraft.postalCode} 
                      onChange={(e) => setAddressDraft({ ...addressDraft, postalCode: e.target.value })} 
                      placeholder="e.g. 00200" 
                      style={{
                        borderColor: isAddressPostalInvalid ? "#ff4d4d" : undefined,
                        boxShadow: isAddressPostalInvalid ? "0 0 0 1px #ff4d4d" : undefined
                      }}
                      required 
                    />
                  </label>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0", cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={addressDraft.isPrimary} onChange={(e) => setAddressDraft({ ...addressDraft, isPrimary: e.target.checked })} style={{ accentColor: "#00FF9D", width: "16px", height: "16px" }} />
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontWeight: "600" }}>SET AS DEFAULT SHIPPING ADDRESS</span>
                </label>

                <div className="modal-actions-row">
                  <button type="button" className="modal-btn cancel-btn" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button type="submit" className="modal-btn save-btn" disabled={isSaving}>{isSaving ? "Saving..." : "Add Address"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Premium Toast Notification System */}
      {toast && (
        <div 
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: toast.type === "success" ? "rgba(0, 255, 157, 0.15)" : "rgba(255, 77, 77, 0.15)",
            border: toast.type === "success" ? "1px solid rgba(0, 255, 157, 0.3)" : "1px solid rgba(255, 77, 77, 0.3)",
            color: toast.type === "success" ? "#00FF9D" : "#ff4d4d",
            padding: "16px 24px",
            borderRadius: "8px",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
            backdropFilter: "blur(8px)",
            zIndex: 10000,
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "slideIn 0.3s ease-out forwards"
          }}
        >
          {toast.type === "success" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </main>
  );
}
