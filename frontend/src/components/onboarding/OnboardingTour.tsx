"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Step, EventData, STATUS, Status } from "react-joyride";
import { customerSteps, employeeSteps, adminSteps } from "./tourSteps";

// Dynamically import Joyride with SSR disabled for Next.js compatibility
const Joyride = dynamic(
  () => import("react-joyride").then((mod) => mod.Joyride),
  { ssr: false }
);

export type TourRole = "customer" | "employee" | "admin";

interface OnboardingTourProps {
  role: TourRole;
  userId?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function getStorageKey(role: TourRole, userId?: string | null): string {
  if (role === "customer") {
    return userId
      ? `vergo_customer_onboarding_v1_${userId}`
      : "vergo_customer_onboarding_v1";
  }
  if (role === "employee") {
    return userId
      ? `vergo_employee_onboarding_v1_${userId}`
      : "vergo_employee_onboarding_v1_guest";
  }
  return userId
    ? `vergo_admin_onboarding_v1_${userId}`
    : "vergo_admin_onboarding_v1_guest";
}

export default function OnboardingTour({ role, userId: propUserId }: OnboardingTourProps) {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Determine active userId from props or sessionStorage if not provided
  useEffect(() => {
    if (propUserId) {
      setUserId(propUserId);
      return;
    }
    if (typeof window !== "undefined") {
      const rawUser = sessionStorage.getItem("vergo_user");
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          const uid = parsed.id || parsed.profileId || parsed.userId || null;
          if (uid) setUserId(String(uid));
        } catch {
          // ignore
        }
      }
    }
  }, [propUserId]);

  // Set relevant steps based on role
  useEffect(() => {
    if (role === "customer") setSteps(customerSteps);
    else if (role === "employee") setSteps(employeeSteps);
    else if (role === "admin") setSteps(adminSteps);
  }, [role]);

  const storageKey = getStorageKey(role, userId);

  // Check completion status and auto-start if appropriate
  const checkAndAutoStart = useCallback(() => {
    if (typeof window === "undefined") return;

    // Check local storage
    const localCompleted = localStorage.getItem(storageKey) === "completed";
    if (localCompleted) {
      setRun(false);
      return;
    }

    // Small delay to allow layout DOM elements to mount
    const timer = setTimeout(() => {
      setRun(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!isMounted) return;
    return checkAndAutoStart();
  }, [isMounted, checkAndAutoStart]);

  // Listen for manual replay events triggered from UI ("Take a Tour" / "Guide" buttons)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStartTour = (e: Event) => {
      const customEvt = e as CustomEvent<{ role?: TourRole }>;
      const targetRole = customEvt.detail?.role || role;
      if (targetRole === role) {
        setRun(true);
      }
    };

    window.addEventListener("vergo-start-tour", handleStartTour);
    return () => {
      window.removeEventListener("vergo-start-tour", handleStartTour);
    };
  }, [role]);

  // Handle tour completion or skip events
  const handleJoyrideEvent = (data: EventData) => {
    const { status } = data;
    const finishedStatuses: Status[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);

      // Save completion in browser storage with user-specific key
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, "completed");
      }
    }
  };

  if (!isMounted || !run || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleJoyrideEvent}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip",
      }}
      options={{
        arrowColor: "#16161a",
        backgroundColor: "#16161a",
        overlayColor: "rgba(0, 0, 0, 0.75)",
        primaryColor: "var(--emp-neon-green, #00ff9d)",
        textColor: "#f5f5f7",
        zIndex: 10000,
        showProgress: true,
      }}
      styles={{
        tooltip: {
          borderRadius: "12px",
          padding: "18px 22px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
          fontFamily: "inherit",
          maxWidth: "420px",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipTitle: {
          fontSize: "15px",
          fontWeight: 800,
          color: "#ffffff",
          letterSpacing: "0.03em",
          marginBottom: "8px",
          textTransform: "uppercase",
        },
        tooltipContent: {
          fontSize: "13px",
          lineHeight: "1.5",
          color: "#a1a1aa",
          padding: "4px 0 12px 0",
        },
        buttonPrimary: {
          backgroundColor: "var(--emp-neon-green, #00ff9d)",
          color: "#000000",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          padding: "8px 16px",
          borderRadius: "6px",
          outline: "none",
          cursor: "pointer",
          border: "none",
          transition: "transform 0.15s ease, opacity 0.15s ease",
        },
        buttonBack: {
          color: "#a1a1aa",
          fontSize: "12px",
          fontWeight: 700,
          marginRight: "10px",
          cursor: "pointer",
        },
        buttonSkip: {
          color: "#71717a",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
        },
        buttonClose: {
          color: "#a1a1aa",
          padding: "8px",
        },
      }}
    />
  );
}

// Global utility helper function to trigger manual replay from any button in the app
export function triggerManualTour(role: TourRole) {
  if (typeof window === "undefined") return;
  const key = getStorageKey(role, null);
  // Clear local storage completion temporarily so manual tour can start
  localStorage.removeItem(key);
  // Also remove user-specific key if available
  const rawUser = sessionStorage.getItem("vergo_user");
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      const uid = parsed.id || parsed.profileId || parsed.userId;
      if (uid) {
        localStorage.removeItem(getStorageKey(role, String(uid)));
      }
    } catch {
      // ignore
    }
  }
  window.dispatchEvent(new CustomEvent("vergo-start-tour", { detail: { role } }));
}
