"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";

export function DashboardFallback({
  library,
  video,
}: {
  library: ReactNode;
  video: ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  return <>{segment === "videos" ? video : library}</>;
}
