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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("vergo_access_token");
    if (!token) {
      setError("Please sign in to view your account.");
      return;
    }
    fetch(`${API_URL}/customers/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to retrieve your profile.");
        return response.json() as Promise<CustomerProfile>;
      })
      .then(setProfile)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    const token = localStorage.getItem("vergo_access_token");
    if (!token) return;
    setIsSaving(true);
    setMessage(null);
    const response = await fetch(`${API_URL}/customers/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        defaultShippingAddress: profile.defaultShippingAddress,
      }),
    });
    setIsSaving(false);
    if (!response.ok) {
      setMessage("Unable to save your profile.");
      return;
    }
    const updated = (await response.json()) as CustomerProfile;
    setProfile(updated);
    const storedUser = localStorage.getItem("vergo_user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      localStorage.setItem("vergo_user", JSON.stringify({ ...user, name: `${updated.firstName} ${updated.lastName}`, phone: updated.phone, defaultShippingAddress: updated.defaultShippingAddress, customerId: updated.customerId }));
      window.dispatchEvent(new Event("vergo-auth-change"));
    }
    setMessage("Profile saved.");
  };

  if (error) return <div className="profile-page-wrapper"><div className="profile-container"><div className="profile-empty-state"><h1>Account unavailable</h1><p>{error}</p><Link href="/auth/login" className="profile-action-btn">Log In</Link></div></div></div>;
  if (!profile) return <div className="profile-page-wrapper"><div className="profile-container">Loading profile...</div></div>;

  return (
    <div className="profile-page-wrapper">
      <div className="profile-container">
        <div className="profile-header"><h1>MY ACCOUNT</h1><p>{profile.email}</p></div>
        <div className="profile-content-grid">
          <form className="profile-section-card" onSubmit={saveProfile}>
            <h2>Profile Details</h2>
            <label>First name<input value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} /></label>
            <label>Last name<input value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} /></label>
            <label>Phone<input value={profile.phone || ""} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
            <label>Default shipping address<textarea value={profile.defaultShippingAddress || ""} onChange={(event) => setProfile({ ...profile, defaultShippingAddress: event.target.value })} /></label>
            {message && <p>{message}</p>}
            <button className="profile-action-btn" disabled={isSaving}>{isSaving ? "Saving..." : "Save Profile"}</button>
          </form>
          <div className="profile-section-card"><h2>Orders</h2><p>View purchases, delivery status, and cancellation availability.</p><Link href="/profile/orders" className="profile-action-btn">View Orders</Link></div>
        </div>
      </div>
    </div>
  );
}
