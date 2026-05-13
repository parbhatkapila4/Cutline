"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin animated progress bar at the top of the viewport during route transitions.
 * Fires on every pathname / search-params change, fills to ~85% over the navigation
 * window, then completes to 100% and fades out once the new route paints.
 *
 * Visible at z-[100] with a subtle glow. Linear/Vercel-style.
 */
export function TopProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstPaint = useRef(true);

  useEffect(() => {
    if (isFirstPaint.current) {
      isFirstPaint.current = false;
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);

    const raf = requestAnimationFrame(() => {
      setVisible(true);
      setProgress(8);

      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 85) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return p;
          }
          const remaining = 85 - p;
          const step = Math.max(0.4, remaining * 0.08);
          return p + step;
        });
      }, 80);

      completeTimeoutRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setProgress(100);
        fadeTimeoutRef.current = setTimeout(() => {
          setVisible(false);
          setTimeout(() => setProgress(0), 250);
        }, 200);
      }, 600);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[100] pointer-events-none"
      style={{ height: 2 }}
    >
      <div
        className="h-full origin-left"
        style={{
          width: "100%",
          transform: `scaleX(${progress / 100})`,
          opacity: visible ? 1 : 0,
          transition:
            "transform 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms ease-out",
          background:
            "linear-gradient(90deg, #10B981 0%, #14B8A6 50%, #06B6D4 100%)",
          boxShadow: visible
            ? "0 0 8px rgba(16, 185, 129, 0.55), 0 0 2px rgba(16, 185, 129, 0.65)"
            : "none",
        }}
      />
    </div>
  );
}
