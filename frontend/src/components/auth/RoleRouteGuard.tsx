"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type VergoRole = "admin" | "employee" | "customer";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function normalizeRole(rawRole: string | undefined): VergoRole | null {
  const role = rawRole?.trim().toLowerCase();
  return role === "admin" || role === "employee" || role === "customer"
    ? role
    : null;
}

async function readAuthenticatedRole(): Promise<VergoRole | null> {
  const isLoggedIn = sessionStorage.getItem("vergo_is_logged_in") === "true";
  const accessToken = sessionStorage.getItem("vergo_access_token");
  if (!isLoggedIn || !accessToken) return null;

  try {
    const response = await fetch(`${API_URL}/profiles/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem("vergo_is_logged_in");
      sessionStorage.removeItem("vergo_access_token");
      sessionStorage.removeItem("vergo_refresh_token");
      sessionStorage.removeItem("vergo_user");
      return null;
    }
    if (!response.ok) return null;

    const profile = (await response.json()) as {
      status?: string;
      role?: { roleName?: string } | null;
    };
    if (profile.status?.toLowerCase() !== "active") return null;
    return normalizeRole(profile.role?.roleName);
  } catch {
    return null;
  }
}

function homeForRole(role: VergoRole | null) {
  if (role === "admin") return "/admin";
  if (role === "employee") return "/employee";
  return "/";
}

function AccessCheck() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-black text-xs font-bold uppercase tracking-[0.2em] text-white/60"
    >
      Checking access...
    </div>
  );
}

export function RoleRouteGuard({
  allowedRole,
  children,
}: {
  allowedRole: VergoRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    void readAuthenticatedRole().then((role) => {
      if (!isCurrent) return;
      if (role === allowedRole) {
        setIsAuthorized(true);
        return;
      }
      router.replace(homeForRole(role));
    });
    return () => {
      isCurrent = false;
    };
  }, [allowedRole, router]);

  return isAuthorized ? children : <AccessCheck />;
}

export function StoreRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [canAccessStore, setCanAccessStore] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    void readAuthenticatedRole().then((role) => {
      if (!isCurrent) return;
      if (role === "admin" || role === "employee") {
        router.replace(homeForRole(role));
        return;
      }
      setCanAccessStore(true);
    });
    return () => {
      isCurrent = false;
    };
  }, [router]);

  return canAccessStore ? children : <AccessCheck />;
}
