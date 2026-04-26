import { useCallback, useEffect, useRef, useState } from "react";
import {
  POLL_BACKOFF_FACTOR,
  POLL_INITIAL_DELAY_MS,
  POLL_MAX_DELAY_MS,
  POLL_MAX_TOTAL_MS,
  type JobStatus,
  type JobVariation,
} from "@/components/generate/constants";

export function getNextPollDelay(delayMs: number) {
  return Math.min(delayMs * POLL_BACKOFF_FACTOR, POLL_MAX_DELAY_MS);
}

export function hasPollingTimedOut(pollStartTime: number, now = Date.now()) {
  return now - pollStartTime >= POLL_MAX_TOTAL_MS;
}

export function useJobPolling(jobId: string | null) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [variations, setVariations] = useState<JobVariation[] | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const pollStartTime = Date.now();
    const poll = async (id: string, delayMs: number): Promise<void> => {
      try {
        const res = await fetch(`/api/generate/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong");
          setStatus("failed");
          stopPolling();
          return;
        }
        setStatus(data.status);
        if (data.status === "completed" && data.videoUrl) {
          setVideoUrl(data.videoUrl);
          setIsPreview(data.isPreview === true);
          setVariations(data.variations ?? null);
          stopPolling();
          return;
        }
        if (data.status === "failed") {
          setError(data.error || "Generation failed");
          stopPolling();
          return;
        }
        if (data.status === "cancelled") {
          stopPolling();
          return;
        }
        if (hasPollingTimedOut(pollStartTime)) {
          setError("Taking longer than expected. You can refresh later.");
          setStatus("failed");
          stopPolling();
          return;
        }
        const nextDelay = getNextPollDelay(delayMs);
        pollRef.current = setTimeout(() => {
          pollRef.current = null;
          void poll(id, nextDelay);
        }, nextDelay);
      } catch {
        if (hasPollingTimedOut(pollStartTime)) {
          setError("Taking longer than expected. You can refresh later.");
          setStatus("failed");
          stopPolling();
          return;
        }
        const nextDelay = getNextPollDelay(delayMs);
        pollRef.current = setTimeout(() => {
          pollRef.current = null;
          void poll(id, nextDelay);
        }, nextDelay);
      }
    };
    pollRef.current = setTimeout(() => {
      pollRef.current = null;
      void poll(jobId, POLL_INITIAL_DELAY_MS);
    }, POLL_INITIAL_DELAY_MS);
    return () => stopPolling();
  }, [jobId, setError, setIsPreview, setStatus, setVariations, setVideoUrl, stopPolling]);

  return {
    status,
    setStatus,
    videoUrl,
    setVideoUrl,
    variations,
    setVariations,
    isPreview,
    setIsPreview,
    error,
    setError,
    stopPolling,
  };
}
