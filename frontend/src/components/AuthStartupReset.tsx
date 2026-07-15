"use client";

import { useState, type ReactNode } from "react";

const AUTH_STORAGE_KEYS = [
  "vergo_user",
  "vergo_is_logged_in",
  "vergo_access_token",
  "vergo_refresh_token",
];

export default function AuthStartupReset({ children }: { children: ReactNode }) {
  useState(() => {
    if (typeof window === "undefined") return true;

    AUTH_STORAGE_KEYS.forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });

    return true;
  });

  return children;
}
