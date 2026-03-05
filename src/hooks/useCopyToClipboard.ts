"use client";

import { useCallback, useState } from "react";

const COPY_FEEDBACK_DURATION_MS = 2000;

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      const fullUrl =
        typeof window !== "undefined" ? `${window.location.origin}${text}` : text;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { copy, copied };
}
