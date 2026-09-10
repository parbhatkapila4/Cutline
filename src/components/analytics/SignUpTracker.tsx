"use client";

import { useEffect } from "react";
import { trackSignUp } from "@/lib/analytics/ga";
export const NEW_USER_PARAM = "new";
export function SignUpTracker() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(NEW_USER_PARAM) !== "1") return;
    url.searchParams.delete(NEW_USER_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    trackSignUp();
  }, []);

  return null;
}
