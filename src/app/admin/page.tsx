"use client";

import Link from "next/link";
import { CutlineLogo } from "@/components/brand/CutlineLogo";
import { useState, useEffect, useCallback, Fragment } from "react";
import type { JobTelemetry } from "@/lib/telemetry/types";

type Stats = {
  totalJobs: number;
  completed: number;
  failed: number;
  avgDurationMs: number;
};

type AuthState =
  | "loading"
  | "not_configured"
  | "login"
  | "authenticated";

const FETCH_OPTS: RequestInit = { credentials: "include" };

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [jobs, setJobs] = useState<JobTelemetry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [loginSecret, setLoginSecret] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const jobsRes = await fetch("/api/telemetry?limit=50", FETCH_OPTS);
      if (jobsRes.status === 401) {
        const body = (await jobsRes.json()) as { error?: string };
        if (body.error === "Admin not configured") {
          setAuthState("not_configured");
        } else {
          setAuthState("login");
        }
        setLoading(false);
        return;
      }
      const statsRes = await fetch("/api/telemetry/stats", FETCH_OPTS);
      if (statsRes.status === 401) {
        const body = (await statsRes.json()) as { error?: string };
        if (body.error === "Admin not configured") {
          setAuthState("not_configured");
        } else {
          setAuthState("login");
        }
        setLoading(false);
        return;
      }
      setAuthState("authenticated");
      if (jobsRes.ok) {
        const jobsData = (await jobsRes.json()) as { jobs?: JobTelemetry[] };
        setJobs(jobsData.jobs ?? []);
      } else {
        setError("Failed to load telemetry.");
      }
      if (statsRes.ok) {
        const statsData = (await statsRes.json()) as Stats;
        setStats(statsData);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
      setAuthState("login");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (authState !== "authenticated") return;
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [authState, fetchData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: loginSecret }),
        credentials: "include",
      });
      const body = (await res.json()) as { error?: string };
      if (res.ok) {
        setAuthState("authenticated");
        setLoginSecret("");
        await fetchData();
      } else {
        setLoginError(body.error ?? "Invalid secret.");
      }
    } catch {
      setLoginError("Request failed.");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const formatMs = (ms: number | undefined) => {
    if (ms == null) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const statusStyle = (status: JobTelemetry["status"]) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "failed":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "running":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default:
        return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
    }
  };

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (authState === "not_configured") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <h1 className="text-lg font-semibold text-white mb-2">Admin not configured</h1>
          <p className="text-zinc-500 text-sm">
            Set ADMIN_SECRET or ADMIN_API_SECRET in your environment to enable admin access.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-zinc-400 hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (authState === "login") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
          <h1 className="text-lg font-semibold text-white mb-2">Admin login</h1>
          <p className="text-zinc-500 text-sm mb-6">
            Enter the admin secret to access pipeline telemetry.
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={loginSecret}
              onChange={(e) => setLoginSecret(e.target.value)}
              placeholder="Admin secret"
              autoComplete="current-password"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none mb-4"
            />
            {loginError && (
              <p className="text-red-400 text-sm mb-4">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginSubmitting || !loginSecret.trim()}
              className="w-full bg-white text-zinc-900 font-medium py-3 rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <Link
            href="/"
            className="mt-6 block text-center text-sm text-zinc-400 hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto h-14 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              <CutlineLogo size="sm" className="max-w-[120px] opacity-90" />
              <span>Home</span>
            </Link>
            <a
              href="/api/admin/logout"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Log out
            </a>
          </div>
          <h1 className="text-lg font-semibold text-white">Pipeline telemetry</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Total jobs
              </p>
              <p className="text-2xl font-semibold text-white mt-1">
                {stats.totalJobs}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Completed
              </p>
              <p className="text-2xl font-semibold text-emerald-400 mt-1">
                {stats.completed}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Failed
              </p>
              <p className="text-2xl font-semibold text-red-400 mt-1">
                {stats.failed}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Avg duration
              </p>
              <p className="text-2xl font-semibold text-white mt-1">
                {formatMs(stats.avgDurationMs)}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-sm text-red-400 hover:text-red-300"
            >
              Try again
            </button>
          </div>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-medium text-white">Recent jobs</h2>
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-sm text-zinc-400 hover:text-white disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {loading && jobs.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              Loading telemetry…
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              No jobs recorded. Run a video generation to see telemetry here.
              Data is stored in memory and resets on restart.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="px-6 py-3 text-zinc-500 font-medium">
                      Job ID
                    </th>
                    <th className="px-6 py-3 text-zinc-500 font-medium">
                      Status
                    </th>
                    <th className="px-6 py-3 text-zinc-500 font-medium">
                      Started
                    </th>
                    <th className="px-6 py-3 text-zinc-500 font-medium">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-zinc-500 font-medium">
                      Error
                    </th>
                    <th className="px-6 py-3 text-zinc-500 font-medium w-10" />
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <Fragment key={job.jobId}>
                      <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-6 py-3">
                          <Link
                            href={`/dashboard/videos/${job.jobId}`}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {job.jobId}
                          </Link>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${statusStyle(
                              job.status
                            )}`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-zinc-400">
                          {formatDate(job.startedAt)}
                        </td>
                        <td className="px-6 py-3 text-zinc-400">
                          {formatMs(job.durationMs)}
                        </td>
                        <td className="px-6 py-3 text-zinc-500 max-w-xs truncate">
                          {job.error ?? "-"}
                        </td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() =>
                              setExpandedJobId(
                                expandedJobId === job.jobId ? null : job.jobId
                              )
                            }
                            className="text-zinc-400 hover:text-white"
                          >
                            {expandedJobId === job.jobId ? "▼" : "▶"}
                          </button>
                        </td>
                      </tr>
                      {expandedJobId === job.jobId && job.stages.length > 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-3 bg-zinc-900/80 border-b border-zinc-800"
                          >
                            <div className="text-xs space-y-2">
                              <p className="font-medium text-zinc-400 mb-2">
                                Stage timings
                              </p>
                              <div className="flex flex-wrap gap-4">
                                {job.stages.map((s) => (
                                  <div
                                    key={s.name}
                                    className="flex items-center gap-2"
                                  >
                                    <span className="text-zinc-500">
                                      {s.name}
                                    </span>
                                    <span className="text-zinc-400">
                                      {formatMs(s.durationMs)}
                                    </span>
                                    {s.error && (
                                      <span className="text-red-400 truncate max-w-[200px]">
                                        {s.error}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          Telemetry is stored in memory and resets when the server restarts. The
          store keeps up to 500 jobs; older entries are evicted.
        </p>
      </main>
    </div>
  );
}
