"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type VideoStatus = "completed" | "processing" | "failed";

type VideoCardFrameProps = {
  videoUrl?: string;
  status: VideoStatus;
  /** Compact list-row thumbnail */
  compact?: boolean;
  className?: string;
};

/**
 * Shows a real frame from the rendered MP4 (seeks to ~1s or ~8% duration).
 * Muted, no controls, pointer-events none so parent links still receive clicks.
 */
export function VideoCardFrame({ videoUrl, status, compact, className }: VideoCardFrameProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const seekToPreview = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const d = el.duration;
    let t = 0.5;
    if (Number.isFinite(d) && d > 0) {
      const eighth = Math.max(0.04, d * 0.08);
      const notPastEnd = Math.max(0.04, d - 0.06);
      t = Math.min(eighth, notPastEnd);
    }
    try {
      el.currentTime = t;
    } catch {
      setFrameReady(true);
    }
  }, []);

  const showVideo = status === "completed" && Boolean(videoUrl?.trim()) && !loadError;
  const pendingFrame = showVideo && !frameReady;
  const showFallbackIcon = !pendingFrame && !(showVideo && frameReady);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-zinc-900", className)}>
      {showVideo ? (
        <video
          ref={ref}
          src={videoUrl}
          className={cn(
            "absolute inset-0 h-full w-full object-cover pointer-events-none transition-opacity duration-500",
            frameReady ? "opacity-100" : "opacity-0"
          )}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={seekToPreview}
          onSeeked={() => setFrameReady(true)}
          onError={() => setLoadError(true)}
        />
      ) : null}

      {pendingFrame ? (
        <div
          className="absolute inset-0 bg-zinc-800/50 animate-pulse pointer-events-none"
          aria-hidden
        />
      ) : null}

      {showFallbackIcon ? (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none bg-zinc-900/20"
          aria-hidden
        >
          {status === "processing" ? (
            <svg
              className={cn("animate-spin text-zinc-500", compact ? "w-6 h-6" : "w-10 h-10")}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path
                className="opacity-80"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              className={cn("text-zinc-700", compact ? "w-8 h-8" : "w-14 h-14")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
      ) : null}
    </div>
  );
}
