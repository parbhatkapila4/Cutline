"use client";

import { useCallback, useRef } from "react";
import { reportVideoUsage, type VideoUsageSurface } from "@/lib/dashboard/videoUsageEvents";
export function useVideoPlayReporter(
  surface: VideoUsageSurface
): (jobId: string | null | undefined) => void {
  const reported = useRef(new Set<string>());
  return useCallback(
    (jobId) => {
      if (!jobId || reported.current.has(jobId)) return;
      reported.current.add(jobId);
      reportVideoUsage(jobId, "play_started", surface);
    },
    [surface]
  );
}
