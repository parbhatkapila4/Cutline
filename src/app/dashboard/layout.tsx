import { Suspense } from "react";
import { RequireSession } from "@/components/auth/RequireSession";
import { SignUpTracker } from "@/components/analytics/SignUpTracker";
import { DashboardFallback } from "@/components/dashboard/DashboardFallback";
import DashboardLoading from "./loading";
import VideoLoading from "./videos/[jobId]/loading";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-root">
      <Suspense
        fallback={<DashboardFallback library={<DashboardLoading />} video={<VideoLoading />} />}
      >
        <RequireSession fallbackPath="/dashboard">
          <SignUpTracker />
          {children}
        </RequireSession>
      </Suspense>
    </div>
  );
}
