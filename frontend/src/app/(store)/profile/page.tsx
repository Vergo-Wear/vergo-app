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

export default function ProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [draft, setDraft] = useState<CustomerProfile | null>(null);
  const [activeModal, setActiveModal] = useState<"profile" | "address" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);

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
    setMessage(null);
    setActiveModal(modal);
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token || !draft) return;

    setIsSaving(true);
    setMessage(null);
    try {
      // Restrict access: Only PATCH first name and last name.
      // Phone number and Email cannot be modified via profile page.
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
      setMessage("Profile updated successfully.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to save your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAddress = async (event: FormEvent) => {
    event.preventDefault();
    const token = sessionStorage.getItem("vergo_access_token");
    if (!token) return;

    setIsSaving(true);
    setMessage(null);
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
      setMessage("New address added successfully.");
    } catch (reason: any) {
      alert(reason.message);
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
      setMessage("Default shipping address updated successfully.");
    } catch (err: any) {
      alert(err.message);
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
      setMessage("Address deleted successfully.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (error) {
    return <main className="profile-page-wrapper"><div className="profile-container"><div className="profile-card"><h1 className="profile-title">ACCOUNT UNAVAILABLE</h1><p className="no-address-message">{error}</p><Link href="/auth/login" className="order-history-btn">LOG IN</Link></div></div></main>;
  }

  if (!profile) {
    return <main className="profile-page-wrapper"><div className="profile-container"><div className="profile-card"><p className="no-address-message">LOADING PROFILE...</p></div></div></main>;
  }

  return (
    <main className="profile-page-wrapper">
      <div className="profile-container">
        <header className="profile-header">
          <h1 className="profile-title">PROFILE</h1>
          <Link href="/profile/orders" className="order-history-btn">ORDER HISTORY</Link>
        </header>

        {message && <p className="profile-status-message" role="status">{message}</p>}

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
                  <input className="modal-input-field" value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} required autoFocus />
                </label>
                <label className="profile-field-group">
                  <span className="profile-field-label">LAST NAME</span>
                  <input className="modal-input-field" value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} required />
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
                  <input className="modal-input-field" value={addressDraft.receiverName} onChange={(e) => setAddressDraft({ ...addressDraft, receiverName: e.target.value })} placeholder="e.g. Alexander Mercer" required autoFocus />
                </label>
                <label className="profile-field-group">
                  <span className="profile-field-label">PHONE NUMBER</span>
                  <input className="modal-input-field" value={addressDraft.phone} onChange={(e) => setAddressDraft({ ...addressDraft, phone: e.target.value })} placeholder="e.g. 0771234567" required />
                </label>
                <label className="profile-field-group">
                  <span className="profile-field-label">ADDRESS LINE 1</span>
                  <input className="modal-input-field" value={addressDraft.addressLine1} onChange={(e) => setAddressDraft({ ...addressDraft, addressLine1: e.target.value })} placeholder="e.g. 42 Technical District" required />
                </label>
                <label className="profile-field-group">
                  <span className="profile-field-label">ADDRESS LINE 2 (OPTIONAL)</span>
                  <input className="modal-input-field" value={addressDraft.addressLine2} onChange={(e) => setAddressDraft({ ...addressDraft, addressLine2: e.target.value })} placeholder="e.g. Suite 101, Innovation Way" />
                </label>
                <label className="profile-field-group">
                  <span className="profile-field-label">CITY</span>
                  <input className="modal-input-field" value={addressDraft.city} onChange={(e) => setAddressDraft({ ...addressDraft, city: e.target.value })} placeholder="e.g. Colombo" required />
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
                    <input className="modal-input-field" value={addressDraft.postalCode} onChange={(e) => setAddressDraft({ ...addressDraft, postalCode: e.target.value })} placeholder="e.g. 00200" required />
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
    </main>
  );
}
