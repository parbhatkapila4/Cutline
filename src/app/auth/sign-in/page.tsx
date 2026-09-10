"use client";

import { SignInPage } from "@/components/ui/sign-in";
import { NEW_USER_PARAM } from "@/components/analytics/SignUpTracker";

const RETURN_TO_PARAM = "redirect";
const DEFAULT_DESTINATION = "/dashboard";
function safeReturnTo(): string {
  if (typeof window === "undefined") return DEFAULT_DESTINATION;
  const raw = new URLSearchParams(window.location.search).get(RETURN_TO_PARAM);
  if (!raw) return DEFAULT_DESTINATION;
  if (!raw.startsWith("/")) return DEFAULT_DESTINATION;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_DESTINATION;
  return raw;
}

function withNewUserFlag(destination: string): string {
  return destination + (destination.includes("?") ? "&" : "?") + NEW_USER_PARAM + "=1";
}

export default function AuthSignInPage() {
  const handleGoogleSignIn = async () => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const destination = safeReturnTo();
    const res = await fetch(`${base}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "google",
        callbackURL: destination,
        newUserCallbackURL: withNewUserFlag(destination),
      }),
      redirect: "manual",
    });
    if (res.status === 302) {
      const url = res.headers.get("Location");
      if (url) {
        window.location.href = url;
        return;
      }
    }
    if (res.status === 200) {
      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg =
        (data && typeof data.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error) ||
        `Sign-in failed (${res.status}). Run "npm run auth:migrate" if you haven't, and check the terminal for details.`;
      alert(msg);
      return;
    }
  };

  return (
    <SignInPage
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
      onGoogleSignIn={handleGoogleSignIn}
    />
  );
}
