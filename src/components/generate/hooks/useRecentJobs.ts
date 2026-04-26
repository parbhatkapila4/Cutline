import { useEffect, useState } from "react";
import type { RecentJob } from "@/components/generate/constants";

export function useRecentJobs(recentJobsOpen: boolean) {
  const [recentJobs, setRecentJobs] = useState<RecentJob[] | null>(null);
  const [recentJobsLoading, setRecentJobsLoading] = useState(false);

  useEffect(() => {
    if (!recentJobsOpen || recentJobs !== null || recentJobsLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentJobsLoading(true);
    fetch("/api/generate/jobs?limit=20")
      .then((res) => res.json())
      .then((data: { jobs?: RecentJob[] }) => {
        setRecentJobs(Array.isArray(data.jobs) ? data.jobs : []);
      })
      .catch(() => setRecentJobs([]))
      .finally(() => setRecentJobsLoading(false));
  }, [recentJobsOpen, recentJobs, recentJobsLoading]);

  return { recentJobs, recentJobsLoading, setRecentJobs };
}
