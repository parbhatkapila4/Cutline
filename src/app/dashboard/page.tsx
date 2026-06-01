"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import type { DashboardVideoItem } from "@/app/api/dashboard/videos/route";
import { authClient } from "@/lib/auth-client";
import { isEnterprisePlan } from "@/lib/plans";
import { VideoCardFrame } from "@/components/dashboard/VideoCardFrame";

type VideoStatus = "completed" | "processing" | "failed";

type UsageData = {
  plan: string;
  planLabel: string;
  videosLimit: number | null;
  apiCallsLimit: number | null;
  videosUsed: number;
  apiCallsUsed: number;
  resetDate: string;
  tokens: {
    unlimited?: boolean;
    initialBalance: number | null;
    remaining: number;
    used: number;
    usdPerToken?: number;
    totalCostUsd?: number;
    totalTokensSpent?: number;
  };
  recentActivity: {
    id: string;
    title: string;
    status: string;
    time: string;
    tokensUsed?: number;
    costUsd?: number;
  }[];
  overview?: {
    totalVideos: number;
    thisWeek: number;
    thisMonth: number;
    totalDurationMin: number;
    inProgress: number;
    storageUsed: string | null;
    avgRenderSec: number | null;
  };
};

const statusStyles: Record<VideoStatus, string> = {
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  processing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};

const DEFAULT_USAGE: UsageData = {
  plan: "free",
  planLabel: "Free",
  videosLimit: 1,
  apiCallsLimit: 1,
  videosUsed: 0,
  apiCallsUsed: 0,
  resetDate: "",
  tokens: { unlimited: false, initialBalance: 10, remaining: 10, used: 0, usdPerToken: 0.10 },
  recentActivity: [],
  overview: {
    totalVideos: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalDurationMin: 0,
    inProgress: 0,
    storageUsed: null,
    avgRenderSec: null,
  },
};

export default function DashboardPage() {
  const [videos, setVideos] = useState<DashboardVideoItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData>(DEFAULT_USAGE);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [videoFilter, setVideoFilter] = useState<VideoStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<DashboardVideoItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileMenuOpen]);

  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    setVideosError(null);
    try {
      const res = await fetch("/api/dashboard/videos");
      if (res.ok) {
        const data = (await res.json()) as DashboardVideoItem[] | unknown;
        setVideosError(null);
        if (Array.isArray(data)) setVideos(data);
      } else {
        let msg = "Failed to load videos. Please try again.";
        try {
          const body = (await res.json()) as { error?: string };
          if (typeof body?.error === "string" && body.error.trim()) msg = body.error;
        } catch {
        }
        setVideosError(msg);
      }
    } catch {
      setVideosError("Failed to load videos. Please try again.");
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, []);

  const requestDelete = useCallback((video: DashboardVideoItem) => {
    setDeleteError(null);
    setConfirmTarget(video);
  }, []);

  const cancelDelete = useCallback(() => {
    if (deletingId) return;
    setConfirmTarget(null);
    setDeleteError(null);
  }, [deletingId]);

  const confirmDelete = useCallback(async () => {
    const video = confirmTarget;
    if (!video) return;
    setDeletingId(video.id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/dashboard/videos/${encodeURIComponent(video.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const msg = typeof data.error === "string" && data.error.trim() ? data.error : "Could not delete the video.";
        setDeleteError(msg);
        return;
      }
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      setConfirmTarget(null);
      setToast({ kind: "success", message: `“${video.title.trim() || "Video"}” was deleted.` });
    } catch {
      setDeleteError("Could not delete the video. Check your connection and try again.");
    } finally {
      setDeletingId(null);
    }
  }, [confirmTarget]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!confirmTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelDelete();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [confirmTarget, cancelDelete]);

  const fetchUsage = useCallback(async () => {
    setUsageLoading(true);
    setUsageError(null);
    try {
      const res = await fetch("/api/dashboard/usage");
      if (res.ok) {
        const data = (await res.json()) as UsageData;
        setUsageError(null);
        setUsage(data);
      } else {
        let msg = "Failed to load usage. Please try again.";
        try {
          const body = (await res.json()) as { error?: string };
          if (typeof body?.error === "string" && body.error.trim()) msg = body.error;
        } catch {
        }
        setUsageError(msg);
      }
    } catch {
      setUsageError("Failed to load usage. Please try again.");
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const filteredVideos = videos.filter((v) => {
    const matchStatus = videoFilter === "all" || v.status === videoFilter;
    const matchSearch =
      !searchQuery.trim() ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const freeVideoCapReached =
    !usageLoading &&
    !usageError &&
    usage.plan === "free" &&
    usage.videosLimit != null &&
    usage.videosUsed >= usage.videosLimit;

  return (
    <div className="h-screen overflow-hidden bg-black text-white flex flex-col">
      {freeVideoCapReached ? (
        <div className="relative shrink-0 z-20 overflow-hidden border-b border-amber-400/20 bg-linear-to-b from-zinc-950 via-zinc-950 to-black px-4 py-3.5 sm:px-6">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_140%_at_100%_-30%,rgba(251,191,36,0.14),transparent_50%)]"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-400/35 to-transparent" aria-hidden />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 gap-3 sm:gap-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/9 text-amber-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[13px] font-semibold leading-snug tracking-tight text-white sm:text-sm">
                  Monthly limit reached
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-400 sm:text-[13px]">
                  Your included Free-plan video for this month is already used. Your library below is unchanged. Upgrade anytime to generate more.
                </p>
              </div>
            </div>
            {!isEnterprisePlan(usage.plan) ? (
              <Link
                href="/pricing"
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_12px_28px_-14px_rgba(0,0,0,0.85)] ring-1 ring-white/25 transition-colors hover:bg-zinc-100 hover:ring-white/40 sm:w-auto"
              >
                View plans
                <svg className="h-4 w-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
        aria-expanded={mobileMenuOpen}
        aria-controls="dashboard-mobile-menu"
        className="lg:hidden fixed top-3 left-3 z-40 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-zinc-950/80 backdrop-blur-md text-zinc-200 hover:text-white hover:bg-zinc-900 shadow-lg shadow-black/40 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
        </svg>
      </button>
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black transition-opacity duration-300 ${mobileMenuOpen ? "opacity-60" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden
      />
      <div className="flex flex-1 min-h-0 w-full">
        <aside
          id="dashboard-mobile-menu"
          aria-label="Dashboard menu"
          className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] flex flex-col border-r border-white/10 overflow-hidden py-6 px-4 bg-zinc-950 shadow-2xl transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-72 lg:max-w-none lg:shrink-0 lg:h-full lg:bg-zinc-950/40 lg:backdrop-blur-sm lg:shadow-none lg:transition-none lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="lg:hidden flex items-center justify-between mb-4 shrink-0">
            <span className="text-sm font-semibold text-white">Menu</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto gap-6 scrollbar-hide">
            <div className="rounded-xl border border-white/10 bg-zinc-950/90 p-4 transition-colors hover:border-white/15">
              <h2 className="text-sm font-semibold text-white mb-3">Usage</h2>
              {usageLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div>
                    <div className="h-3 w-24 bg-zinc-800 rounded mb-2" />
                    <div className="h-2 rounded-full bg-zinc-800" />
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-zinc-800 rounded mb-2" />
                    <div className="h-2 rounded-full bg-zinc-800" />
                  </div>
                  <div className="h-3 w-32 bg-zinc-800 rounded mt-3" />
                </div>
              ) : usageError ? (
                <div>
                  <p className="text-xs text-red-400">{usageError}</p>
                  <button type="button" onClick={() => fetchUsage()} className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">Try again</button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-zinc-400">Videos this month</span>
                        <span className="font-medium text-white">
                          {usage.videosLimit == null ? `${usage.videosUsed} / Unlimited` : `${usage.videosUsed} / ${usage.videosLimit}`}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-linear-to-r from-amber-400 to-orange-500" style={{ width: `${usage.videosLimit ? Math.min(100, (usage.videosUsed / usage.videosLimit) * 100) : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-zinc-400">API calls</span>
                        <span className="font-medium text-white">
                          {usage.apiCallsLimit == null
                            ? `${usage.apiCallsUsed.toLocaleString()} / Unlimited`
                            : `${usage.apiCallsUsed.toLocaleString()} / ${usage.apiCallsLimit.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-linear-to-r from-teal-400 to-emerald-500" style={{ width: `${usage.apiCallsLimit ? Math.min(100, (usage.apiCallsUsed / usage.apiCallsLimit) * 100) : 0}%` }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">Resets on {usage.resetDate || "-"}</p>
                </>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950/90 p-4 transition-colors hover:border-white/15">
              <h2 className="text-sm font-semibold text-white mb-3">Recent activity</h2>
              {usageLoading ? (
                <div className="space-y-2.5 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-800" />
                      <div className="flex-1 min-w-0">
                        <div className="h-3 w-3/4 bg-zinc-800 rounded" />
                        <div className="h-[11px] w-1/2 bg-zinc-800 rounded mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : usageError ? (
                <div>
                  <p className="text-xs text-red-400">{usageError}</p>
                  <button type="button" onClick={() => fetchUsage()} className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">Try again</button>
                </div>
              ) : usage.recentActivity.length === 0 ? (
                <p className="text-xs text-zinc-500">No recent activity</p>
              ) : (
                <ul className="space-y-2.5">
                  {usage.recentActivity.map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-white/5 transition-colors">
                      <span className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${a.status === "completed" ? "bg-emerald-500" : a.status === "processing" ? "bg-amber-500" : "bg-red-500"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{a.title}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                          <span>{a.time} · {a.status}</span>
                          {a.tokensUsed != null && a.tokensUsed > 0 ? (
                            <span className="text-violet-400/80">· {a.tokensUsed} tokens</span>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950/90 p-4 transition-colors hover:border-white/15">
              <h2 className="text-sm font-semibold text-white mb-3">Tokens</h2>
              {usageLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="h-8 w-12 bg-zinc-800 rounded" />
                    <div className="h-3 w-24 bg-zinc-800 rounded" />
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800" />
                  <div className="h-3 w-full bg-zinc-800 rounded" />
                  <div className="h-3 w-32 bg-zinc-800 rounded" />
                  <div className="h-9 w-full bg-zinc-800 rounded mt-3" />
                </div>
              ) : usageError ? (
                <div>
                  <p className="text-xs text-red-400">{usageError}</p>
                  <button type="button" onClick={() => fetchUsage()} className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">Try again</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <span className="text-2xl font-bold text-white">
                      {(usage.tokens.totalTokensSpent ?? usage.tokens.used ?? 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-500">credits used</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    Total charged on <span className="text-zinc-400">your</span> account from completed videos (same as token deductions we record per finished job). Failed or cancelled jobs don’t count.
                  </p>
                  {usage.tokens.unlimited ? (
                    <p className="text-[11px] text-emerald-400/80 font-medium">Unlimited plan · no fixed token cap</p>
                  ) : null}
                  {!usage.tokens.unlimited && usage.tokens.usdPerToken ? (
                    <p className="text-[11px] text-emerald-400/80 font-medium">
                      ~${(usage.tokens.remaining * usage.tokens.usdPerToken).toFixed(2)} wallet balance (estimate)
                    </p>
                  ) : null}
                  {!usage.tokens.unlimited ? (
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-amber-400 to-orange-500"
                        style={{
                          width: `${usage.tokens.initialBalance
                            ? Math.min(100, (usage.tokens.remaining / usage.tokens.initialBalance) * 100)
                            : 0}%`,
                        }}
                      />
                    </div>
                  ) : null}
                  {!usage.tokens.unlimited ? (
                    <div className="flex justify-between text-[11px] text-zinc-500 gap-2">
                      <span>Wallet balance</span>
                      <span className="text-zinc-400 font-medium tabular-nums text-right">
                        {usage.tokens.initialBalance != null
                          ? `${usage.tokens.remaining.toLocaleString()} / ${usage.tokens.initialBalance.toLocaleString()} credits left`
                          : `${usage.tokens.remaining.toLocaleString()} credits left`}
                      </span>
                    </div>
                  ) : null}
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Cost varies by video length &amp; mode. AI video (Veo) costs more than slideshow.
                  </p>
                  <div className="pt-1 space-y-1">
                    {usage.tokens.totalCostUsd != null && usage.tokens.totalCostUsd > 0 ? (
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>Total generation cost (completed)</span>
                        <span className="text-zinc-400 font-medium">${usage.tokens.totalCostUsd.toFixed(2)}</span>
                      </div>
                    ) : null}
                  </div>
                  {!usage.tokens.unlimited ? (
                    <button
                      type="button"
                      className="w-full mt-3 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
                    >
                      Add tokens
                    </button>
                  ) : (
                    <p className="mt-3 text-[11px] text-zinc-500 text-center">
                      Generation is covered by your plan - no wallet top-ups.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950/90 p-4 shrink-0 transition-colors hover:border-white/15">
              <h2 className="text-sm font-semibold text-white mb-3">Plan</h2>
              {usageLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 w-16 bg-zinc-800 rounded" />
                  <div className="h-3 w-32 bg-zinc-800 rounded" />
                  <div className="h-9 w-full bg-zinc-800 rounded mt-3" />
                </div>
              ) : usageError ? (
                <div>
                  <p className="text-xs text-red-400">{usageError}</p>
                  <button type="button" onClick={() => fetchUsage()} className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">Try again</button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-white">{usage.planLabel}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {usage.videosLimit == null ? "Unlimited videos / month" : `${usage.videosLimit} videos / month`} ·{" "}
                    {usage.apiCallsLimit == null
                      ? "Unlimited API calls"
                      : usage.apiCallsLimit >= 1000
                        ? `${usage.apiCallsLimit / 1000}k API calls`
                        : `${usage.apiCallsLimit} API calls`}
                  </p>
                  {!isEnterprisePlan(usage.plan) ? (
                    <Link
                      href="/pricing"
                      className="w-full mt-3 py-2 rounded-lg border border-white/10 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-center block"
                    >
                      Upgrade plan
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="mt-auto pt-4 shrink-0 space-y-2">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5L12 4l9 7.5M5.25 10v9a.75.75 0 00.75.75h3.75v-5.25A1.5 1.5 0 0111.25 13h1.5a1.5 1.5 0 011.5 1.5v5.25H18a.75.75 0 00.75-.75v-9" />
              </svg>
              Home
            </Link>
            <button
              type="button"
              onClick={async () => {
                try {
                  await authClient.signOut({ fetchOptions: { onSuccess: () => { } } });
                } finally {
                  window.location.href = "/";
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v3.75m0 10.5V18a2.25 2.25 0 002.25 2.25h6a2.25 2.25 0 002.25-2.25v-3.75m-10.5 0h10.5" />
              </svg>
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto pt-20 lg:pt-8 pb-16 px-6 lg:px-10 xl:px-12 scrollbar-hide">

          <section id="overview" className="mb-10">
            {(() => {
              const totalVideos = videos.length;
              const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
              const thisWeek = videos.filter((v) => {
                const t = typeof v.timestamp === "number" ? v.timestamp : NaN;
                return Number.isFinite(t) && t >= weekAgo;
              }).length;
              const completed = videos.filter((v) => v.status === "completed").length;

              return (
                <>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-7 font-mono text-[10px] tracking-[0.3em] uppercase text-zinc-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="relative inline-flex w-1.5 h-1.5" aria-hidden>
                        <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                        <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </span>
                      <span className="text-emerald-300/90 font-semibold">
                        {usageLoading ? "Loading" : `${usage.planLabel} Plan`}
                      </span>
                    </span>
                    <span className="text-white/15">/</span>
                    <span className="text-zinc-400">Studio Ready</span>
                    <span className="h-px flex-1 bg-white/[0.06] mx-1 min-w-[24px]" aria-hidden />
                    <span className="text-zinc-400 tabular-nums">
                      <span className="text-zinc-300">{totalVideos}</span>{" "}
                      {totalVideos === 1 ? "Video" : "Videos"}
                    </span>
                    <span className="text-white/15">·</span>
                    <span className="text-zinc-400 tabular-nums">
                      <span className="text-zinc-300">{thisWeek}</span> This Week
                    </span>
                    <span className="text-white/15 hidden sm:inline">·</span>
                    <span className="text-zinc-400 tabular-nums hidden sm:inline">
                      <span className="text-zinc-300">{completed}</span> Shipped
                    </span>
                  </div>

                  <h1
                    className="font-black uppercase leading-[0.86] tracking-[-0.04em] text-[clamp(2.6rem,6.5vw,5.5rem)] text-transparent bg-clip-text mb-4 max-w-[14ch]"
                    style={{
                      fontFamily:
                        "'Inter', 'Helvetica Neue', system-ui, sans-serif",
                      fontWeight: 900,
                      backgroundImage:
                        "linear-gradient(180deg, #ffffff 0%, #e9e9ea 55%, #b9b9bd 100%)",
                    }}
                  >
                    Welcome back.
                  </h1>

                  <p className="text-[14.5px] sm:text-[15.5px] text-zinc-400 leading-relaxed max-w-[58ch] mb-8">
                    One sentence in. A finished MP4 out - script, visuals, voice, and edit, rendered in about 60 seconds.
                  </p>

                  {/* CTA row */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href="/create"
                      className="group relative inline-flex items-center gap-2.5 pl-5 pr-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-[14px] font-semibold tracking-[-0.005em] shadow-[0_14px_32px_-10px_rgba(251,191,36,0.55)] hover:shadow-[0_18px_38px_-10px_rgba(251,191,36,0.7)] transition-all overflow-hidden"
                    >
                      <span
                        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-linear-to-r from-transparent via-white/40 to-transparent"
                        aria-hidden
                      />
                      <svg className="relative w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span className="relative">Create new video</span>
                      <svg className="relative w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>

                    {!isEnterprisePlan(usage.plan) ? (
                      <Link
                        href="/pricing"
                        className="group inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] backdrop-blur-md text-[13px] font-medium text-amber-200/90 hover:text-amber-100 hover:bg-amber-500/[0.12] hover:border-amber-400/40 transition-colors sm:ml-auto"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.405 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.405 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
                        </svg>
                        Upgrade plan
                      </Link>
                    ) : null}
                  </div>
                </>
              );
            })()}
          </section>

          <section id="videos" className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-semibold text-white tracking-tight">My videos</h2>
                <span className="text-sm text-zinc-500 tabular-nums">{filteredVideos.length}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Search videos"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-60 pl-9 pr-3 py-2 rounded-lg bg-zinc-900/60 border border-white/10 text-white placeholder:text-zinc-500 text-sm focus:border-amber-300/40 focus:bg-zinc-900 focus:ring-0 focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex rounded-lg border border-white/10 p-0.5 bg-zinc-900/60">
                  {(["all", "completed", "processing", "failed"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setVideoFilter(f)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${videoFilter === f ? "bg-amber-400/15 text-amber-200 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.3)]" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {videosLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-zinc-950 overflow-hidden animate-pulse">
                    <div className="aspect-video bg-zinc-800" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                      <div className="h-3 w-full bg-zinc-800 rounded" />
                      <div className="h-3 w-1/2 bg-zinc-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : videosError ? (
              <div className="rounded-xl border border-white/10 bg-zinc-950 p-8 text-center">
                <p className="text-red-400 font-medium">{videosError}</p>
                <button type="button" onClick={() => fetchVideos()} className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">Try again</button>
              </div>
            ) : filteredVideos.length === 0 ? (
              (() => {
                const isFiltered = videos.length > 0;
                return (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] px-6 py-20 sm:py-24 text-center">
                    <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.10] bg-zinc-900/60 text-zinc-500">
                      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        {isFiltered ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 17a7 7 0 110-14 7 7 0 010 14z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        )}
                      </svg>
                    </div>

                    <h3 className="text-[16px] font-semibold text-white tracking-[-0.01em] mb-1.5">
                      {isFiltered ? "Nothing matches that filter" : "Your library is empty"}
                    </h3>

                    <p className="text-[13px] text-zinc-500 leading-relaxed max-w-[42ch] mx-auto mb-6">
                      {isFiltered
                        ? "Try clearing the search or switching to a different status."
                        : "Generate your first video from a single sentence — script, visuals, voice, and edit in about 60 seconds."}
                    </p>

                    <div className="flex items-center justify-center gap-2">
                      {isFiltered ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setVideoFilter("all");
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/[0.10] bg-white/[0.03] text-[12.5px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.20] transition-colors"
                        >
                          Clear filters
                        </button>
                      ) : null}
                      <Link
                        href="/create"
                        className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-zinc-950 text-[12.5px] font-semibold hover:bg-zinc-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        {isFiltered ? "Create new video" : "Create your first video"}
                      </Link>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                {filteredVideos.map((video) => (
                  <div key={video.id} className="rounded-xl border border-white/10 bg-zinc-950 overflow-hidden hover:border-white/20 transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-20px_rgba(0,0,0,0.9)]">
                    <Link href={`/dashboard/videos/${video.id}`} className="block">
                      <div className="aspect-video relative overflow-hidden bg-zinc-900">
                        <div className="absolute inset-0">
                          <VideoCardFrame videoUrl={video.videoUrl} status={video.status} />
                        </div>
                        <div className="pointer-events-none absolute inset-0 z-1 bg-linear-to-tr from-amber-400/5 via-transparent to-teal-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className={`absolute top-3 right-3 z-2 px-2 py-0.5 rounded text-xs font-medium border ${statusStyles[video.status]}`}>
                          {video.status}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-white truncate" title={video.title}>{video.title}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate" title={video.prompt}>{video.prompt}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500">
                          <span>{video.date}</span>
                          <span>·</span>
                          <span>{video.duration}</span>
                        </div>
                      </div>
                    </Link>
                    <div className="px-4 pb-4 flex gap-2 items-center">
                      <Link href={`/dashboard/videos/${video.id}`} className="flex-1 text-center text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 rounded-lg transition-colors">View</Link>
                      {video.status === "completed" && video.videoUrl ? (
                        <a href={video.videoUrl} download className="flex-1 text-center text-sm font-medium text-black bg-white hover:bg-zinc-200 px-3 py-2 rounded-lg transition-colors">Download</a>
                      ) : null}
                      {video.status === "completed" && video.videoUrl ? (
                        <button type="button" className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors" title="Copy link">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 01-5.656-5.656l1-1M10.172 13.828a4 4 0 010-5.656l2-2a4 4 0 115.656 5.656l-1 1" />
                          </svg>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => requestDelete(video)}
                        disabled={deletingId === video.id}
                        className="group/del p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/40 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
                        title="Delete video"
                        aria-label={`Delete video ${video.title}`}
                      >
                        {deletingId === video.id ? (
                          <svg className="w-[18px] h-[18px] animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg
                            className="w-[18px] h-[18px] transition-transform duration-200 group-hover/del:scale-110 group-hover/del:-rotate-6"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.75}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
                            <path d="M19 6l-.84 13.07A2 2 0 0 1 16.16 21H7.84a2 2 0 0 1-2-1.93L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {confirmTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-video-title"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md animate-[fadeIn_140ms_ease-out]"
            onClick={cancelDelete}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] overflow-hidden animate-[popIn_180ms_cubic-bezier(0.2,0.9,0.3,1.2)]">
            <div className="absolute -top-32 -right-24 h-64 w-64 rounded-full bg-red-500/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-24 h-64 w-64 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
            <div className="relative px-6 pt-6 pb-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30">
                  <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 6h18" />
                    <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
                    <path d="M19 6l-.84 13.07A2 2 0 0 1 16.16 21H7.84a2 2 0 0 1-2-1.93L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="delete-video-title" className="text-lg font-semibold text-white leading-snug">Delete this video?</h2>
                  <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
                    You&apos;re about to permanently delete{" "}
                    <span className="font-medium text-white">
                      “{(confirmTarget.title.trim() || "Untitled video").length > 60
                        ? (confirmTarget.title.trim() || "Untitled video").slice(0, 60) + "…"
                        : (confirmTarget.title.trim() || "Untitled video")}”
                    </span>
                    . This removes the file, links, and all related data. This cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cancelDelete}
                  disabled={deletingId !== null}
                  className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
                  aria-label="Close dialog"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {deleteError ? (
                <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                  {deleteError}
                </div>
              ) : null}
            </div>

            <div className="relative px-6 py-4 bg-white/2 border-t border-white/5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={deletingId !== null}
                className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/4 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/8 hover:border-white/20 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deletingId !== null}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-linear-to-b from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(239,68,68,0.6)] hover:from-red-500 hover:to-red-700 active:from-red-600 active:to-red-700 transition-all disabled:opacity-60 disabled:pointer-events-none"
              >
                {deletingId !== null ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Deleting…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 6h18" />
                      <path d="M19 6l-.84 13.07A2 2 0 0 1 16.16 21H7.84a2 2 0 0 1-2-1.93L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                    Delete video
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[slideUp_220ms_ease-out]">
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-md ${toast.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-100"
              }`}
            role="status"
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${toast.kind === "success" ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
              {toast.kind === "success" ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12l5 5L20 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              )}
            </span>
            <p className="text-sm font-medium pr-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-1 -mr-1 p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
