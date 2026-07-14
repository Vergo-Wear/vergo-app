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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [draft, setDraft] = useState<CustomerProfile | null>(null);
  const [activeModal, setActiveModal] = useState<"profile" | "address" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      .then(setProfile)
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
      const response = await fetch(`${API_URL}/customers/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          phone: draft.phone?.trim() || null,
          defaultShippingAddress: draft.defaultShippingAddress?.trim() || null,
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
            <h2 id="address-title" className="addresses-title">ADDRESSES</h2>
            <button type="button" className="add-address-btn" onClick={() => openModal("address")}>{profile.defaultShippingAddress ? "EDIT" : "ADD+"}</button>
          </div>
          <div className="profile-field-group">
            <span className="address-sub-label">DEFAULT ADDRESS</span>
            {profile.defaultShippingAddress ? <div className="address-text-block">{profile.defaultShippingAddress}</div> : <p className="no-address-message">NO DEFAULT ADDRESS RECORDED.</p>}
          </div>
        </section>
      </div>

      {activeModal && draft && (
        <div className="profile-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="profile-modal-content" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close-trigger" onClick={() => setActiveModal(null)} title="Close" aria-label="Close">&times;</button>
            <h2 id="profile-modal-title" className="modal-header-title">{activeModal === "profile" ? "Edit Profile" : `${profile.defaultShippingAddress ? "Edit" : "Add"} Address`}</h2>
            <form className="modal-form" onSubmit={saveProfile}>
              {activeModal === "profile" ? <>
                <label className="profile-field-group"><span className="profile-field-label">FIRST NAME</span><input className="modal-input-field" value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} required autoFocus /></label>
                <label className="profile-field-group"><span className="profile-field-label">LAST NAME</span><input className="modal-input-field" value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} required /></label>
                <label className="profile-field-group"><span className="profile-field-label">MOBILE NUMBER</span><input className="modal-input-field" value={draft.phone || ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="+94 77 123 4567" /></label>
              </> : <label className="profile-field-group"><span className="profile-field-label">DEFAULT SHIPPING ADDRESS</span><textarea className="modal-input-field profile-address-input" value={draft.defaultShippingAddress || ""} onChange={(event) => setDraft({ ...draft, defaultShippingAddress: event.target.value })} placeholder="Street, city, district, postal code" required autoFocus /></label>}
              <div className="modal-actions-row"><button type="button" className="modal-btn cancel-btn" onClick={() => setActiveModal(null)}>Cancel</button><button type="submit" className="modal-btn save-btn" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button></div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
