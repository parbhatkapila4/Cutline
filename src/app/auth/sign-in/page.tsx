"use client";

import React from "react";
import { SignInPage } from "@/components/ui/sign-in";
import { authClient } from "@/lib/auth-client";
import { NEW_USER_PARAM } from "@/components/analytics/SignUpTracker";

export default function AuthSignInPage() {
  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
    });

    if (error) {
      alert(error.message ?? "Sign in failed. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const res = await fetch(`${base}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "google",
        callbackURL: "/dashboard",
        newUserCallbackURL: `/dashboard?${NEW_USER_PARAM}=1`,
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
      onSignIn={handleSignIn}
      onGoogleSignIn={handleGoogleSignIn}
    />
  );
}
