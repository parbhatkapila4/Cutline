import { createAuthClient } from "better-auth/react";
import { useEffect, useState } from "react";

function getBaseURL() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

const CACHED_SESSION_KEY = "cutline.session.v1";

type SessionData = ReturnType<typeof authClient.useSession>["data"];

function readCachedSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHED_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

function writeCachedSession(data: SessionData | null) {
  if (typeof window === "undefined") return;
  try {
    if (data) {
      window.localStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(data));
    } else {
      window.localStorage.removeItem(CACHED_SESSION_KEY);
    }
  } catch {
  }
}

export function useCachedSession() {
  const live = authClient.useSession();
  const [cached] = useState<SessionData | null>(() => readCachedSession());

  useEffect(() => {
    if (live.isPending) return;
    writeCachedSession(live.data ?? null);
  }, [live.isPending, live.data]);

  const data = live.isPending ? cached : (live.data ?? null);
  const isPending = live.isPending && cached == null;

  return { data, isPending, error: live.error, refetch: live.refetch };
}
