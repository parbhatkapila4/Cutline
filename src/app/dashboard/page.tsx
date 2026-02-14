"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { DashboardVideoItem } from "@/app/api/dashboard/videos/route";

type VideoStatus = "completed" | "processing" | "failed";

type UsageData = {
  plan: string;
  planLabel: string;
  videosLimit: number;
  apiCallsLimit: number;
  videosUsed: number;
  apiCallsUsed: number;
  resetDate: string;
  tokens: { initialBalance: number; remaining: number; used: number };
  recentActivity: { id: string; title: string; status: string; time: string }[];
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
  videosLimit: 10,
  apiCallsLimit: 10_000,
  videosUsed: 0,
  apiCallsUsed: 0,
  resetDate: "",
  tokens: { initialBalance: 100, remaining: 100, used: 0 },
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
  const [usage, setUsage] = useState<UsageData>(DEFAULT_USAGE);
  const [usageLoading, setUsageLoading] = useState(true);
  const [videoFilter, setVideoFilter] = useState<VideoStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/videos")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DashboardVideoItem[]) => {
        if (!cancelled && Array.isArray(data)) setVideos(data);
      })
      .catch(() => {
        if (!cancelled) setVideos([]);
      })
      .finally(() => {
        if (!cancelled) setVideosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UsageData | null) => {
        if (!cancelled && data) setUsage(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setUsageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredVideos = videos.filter((v) => {
    const matchStatus = videoFilter === "all" || v.status === videoFilter;
    const matchSearch =
      !searchQuery.trim() ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="h-screen overflow-hidden bg-black text-white flex flex-col">
      <div className="flex flex-1 min-h-0 w-full">
        <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-white/5 h-full overflow-hidden py-6 px-4">
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto gap-6 scrollbar-hide">
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Usage</h2>
              {usageLoading ? (
                <div className="space-y-3 text-xs text-zinc-500">Loading…</div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-zinc-400">Videos this month</span>
                        <span className="font-medium text-white">{usage.videosUsed} / {usage.videosLimit}</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${usage.videosLimit ? Math.min(100, (usage.videosUsed / usage.videosLimit) * 100) : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-zinc-400">API calls</span>
                        <span className="font-medium text-white">{usage.apiCallsUsed.toLocaleString()} / {usage.apiCallsLimit.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500/80" style={{ width: `${usage.apiCallsLimit ? Math.min(100, (usage.apiCallsUsed / usage.apiCallsLimit) * 100) : 0}%` }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">Resets on {usage.resetDate || "—"}</p>
                </>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Recent activity</h2>
              {usageLoading ? (
                <p className="text-xs text-zinc-500">Loading…</p>
              ) : usage.recentActivity.length === 0 ? (
                <p className="text-xs text-zinc-500">No recent activity</p>
              ) : (
                <ul className="space-y-2.5">
                  {usage.recentActivity.map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5">
                      <span className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${a.status === "completed" ? "bg-emerald-500" : a.status === "processing" ? "bg-amber-500" : "bg-red-500"}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{a.title}</p>
                        <p className="text-[11px] text-zinc-500">{a.time} · {a.status}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Tokens</h2>
              {usageLoading ? (
                <p className="text-xs text-zinc-500">Loading…</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-bold text-white">{usage.tokens.remaining}</span>
                    <span className="text-xs text-zinc-500">of {usage.tokens.initialBalance} remaining</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${usage.tokens.initialBalance ? (usage.tokens.remaining / usage.tokens.initialBalance) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    New users start with {usage.tokens.initialBalance} tokens. Each video uses tokens.
                  </p>
                  <div className="pt-1 flex justify-between text-[11px] text-zinc-500">
                    <span>Used this period: {usage.tokens.used}</span>
                  </div>
                  <button
                    type="button"
                    className="w-full mt-3 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                  >
                    Add tokens
                  </button>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-4 shrink-0">
              <h2 className="text-sm font-semibold text-white mb-3">Plan</h2>
              {usageLoading ? (
                <p className="text-xs text-zinc-500">Loading…</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-white">{usage.planLabel}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{usage.videosLimit} videos / month · {usage.apiCallsLimit >= 1000 ? `${usage.apiCallsLimit / 1000}k` : usage.apiCallsLimit} API calls</p>
                  <button
                    type="button"
                    className="w-full mt-3 py-2 rounded-lg border border-white/10 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Upgrade plan
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-auto pt-4 shrink-0">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v3.75m0 10.5V18a2.25 2.25 0 002.25 2.25h6a2.25 2.25 0 002.25-2.25v-3.75m-10.5 0h10.5" />
              </svg>
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto pt-8 pb-16 px-6 lg:px-10 xl:px-12 scrollbar-hide">

          <section id="overview" className="mb-8">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-rose-900/30 via-rose-800/10 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] from-rose-700/20 via-transparent to-transparent" />
              <div className="relative grid lg:grid-cols-2 gap-0">
                <div className="p-6 sm:p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">AI Ready</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Welcome back</h1>
                  <p className="text-zinc-400 mt-2 text-sm sm:text-base">
                    One sentence → script, visuals, voiceover, and edit. Ready in ~60 seconds.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/#create"
                      className="inline-flex items-center gap-2 bg-white text-black font-semibold px-5 py-3 rounded-xl hover:bg-zinc-200 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      Create new video
                    </Link>
                  </div>
                </div>
                <div className="hidden lg:block relative min-h-[260px] overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 260" fill="none" preserveAspectRatio="xMidYMid slice">
                    <style>
                      {`
                        @keyframes orb1{0%{transform:rotate(0deg)translateX(75px)rotate(0deg)}to{transform:rotate(360deg)translateX(75px)rotate(-360deg)}}
                        @keyframes orb2{0%{transform:rotate(120deg)translateX(90px)rotate(-120deg)}to{transform:rotate(480deg)translateX(90px)rotate(-480deg)}}
                        @keyframes orb3{0%{transform:rotate(240deg)translateX(65px)rotate(-240deg)}to{transform:rotate(600deg)translateX(65px)rotate(-600deg)}}
                        @keyframes corePulse{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.05);filter:brightness(1.2)}}
                        @keyframes ringRotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
                        @keyframes ringRotateR{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
                        @keyframes energyFlow{0%{stroke-dashoffset:100}100%{stroke-dashoffset:-100}}
                        @keyframes frameFloat1{0%,100%{transform:translate(0,0)rotate(-8deg)}50%{transform:translate(-5px,-8px)rotate(-6deg)}}
                        @keyframes frameFloat2{0%,100%{transform:translate(0,0)rotate(5deg)}50%{transform:translate(6px,-6px)rotate(7deg)}}
                        @keyframes frameFloat3{0%,100%{transform:translate(0,0)rotate(3deg)}50%{transform:translate(-4px,5px)rotate(1deg)}}
                        @keyframes particleDrift{0%,100%{transform:translateY(0)scale(1);opacity:.6}50%{transform:translateY(-12px)scale(1.3);opacity:1}}
                        @keyframes glowBreath{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.7;transform:scale(1.1)}}
                        @keyframes sparkle{0%,100%{opacity:0;transform:scale(0)}50%{opacity:1;transform:scale(1)}}
                        @keyframes waveform{0%,100%{d:path('M0,15 Q10,5 20,15 T40,15 T60,15 T80,15')}50%{d:path('M0,15 Q10,25 20,15 T40,15 T60,15 T80,15')}}
                        .orb1{animation:orb1 8s linear infinite;transform-origin:250px 130px}
                        .orb2{animation:orb2 12s linear infinite;transform-origin:250px 130px}
                        .orb3{animation:orb3 10s linear infinite;transform-origin:250px 130px}
                        .core{animation:corePulse 3s ease-in-out infinite;transform-origin:250px 130px}
                        .ring1{animation:ringRotate 25s linear infinite;transform-origin:250px 130px}
                        .ring2{animation:ringRotateR 20s linear infinite;transform-origin:250px 130px}
                        .ring3{animation:ringRotate 30s linear infinite;transform-origin:250px 130px}
                        .energy{stroke-dasharray:20 30;animation:energyFlow 2s linear infinite}
                        .frame1{animation:frameFloat1 5s ease-in-out infinite}
                        .frame2{animation:frameFloat2 6s ease-in-out infinite .3s}
                        .frame3{animation:frameFloat3 5.5s ease-in-out infinite .6s}
                        .particle{animation:particleDrift 3s ease-in-out infinite}
                        .p1{animation-delay:0s}.p2{animation-delay:.3s}.p3{animation-delay:.6s}.p4{animation-delay:.9s}.p5{animation-delay:1.2s}.p6{animation-delay:1.5s}
                        .glow{animation:glowBreath 4s ease-in-out infinite}
                        .sparkle{animation:sparkle 2s ease-in-out infinite}
                        .sp1{animation-delay:0s}.sp2{animation-delay:.4s}.sp3{animation-delay:.8s}.sp4{animation-delay:1.2s}
                      `}
                    </style>
                    <defs>
                      <linearGradient id="coreG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fda4af" /><stop offset="50%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#881337" /></linearGradient>
                      <linearGradient id="ringG1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e11d48" stopOpacity=".9" /><stop offset="100%" stopColor="#9f1239" stopOpacity=".3" /></linearGradient>
                      <linearGradient id="ringG2" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#fb7185" stopOpacity=".7" /><stop offset="100%" stopColor="#be123c" stopOpacity=".2" /></linearGradient>
                      <linearGradient id="ringG3" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#fda4af" stopOpacity=".5" /><stop offset="100%" stopColor="#f97316" stopOpacity=".1" /></linearGradient>
                      <linearGradient id="energyG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#9f1239" stopOpacity="0" /><stop offset="50%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#fda4af" stopOpacity="0" /></linearGradient>
                      <linearGradient id="frameG" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1f1a1a" /><stop offset="100%" stopColor="#0a0808" /></linearGradient>
                      <linearGradient id="screenG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#120f0f" /><stop offset="100%" stopColor="#000" /></linearGradient>
                      <radialGradient id="glowG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#f43f5e" stopOpacity=".8" /><stop offset="70%" stopColor="#9f1239" stopOpacity=".1" /><stop offset="100%" stopColor="#881337" stopOpacity="0" /></radialGradient>
                      <radialGradient id="coreInnerG" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#fff" stopOpacity=".3" /><stop offset="100%" stopColor="#fff" stopOpacity="0" /></radialGradient>
                      <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                      <filter id="softG" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="20" /></filter>
                      <filter id="frameS" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="10" stdDeviation="15" floodColor="#000" floodOpacity=".7" /></filter>
                    </defs>
                    <ellipse className="glow" cx="250" cy="130" rx="130" ry="90" fill="#9f1239" filter="url(#softG)" />
                    <g className="ring3" opacity=".25"><ellipse cx="250" cy="130" rx="110" ry="40" stroke="url(#ringG3)" strokeWidth="1" fill="none" strokeDasharray="6 12" /></g>
                    <g className="ring1" opacity=".5"><ellipse cx="250" cy="130" rx="85" ry="30" stroke="url(#ringG1)" strokeWidth="2.5" fill="none" /></g>
                    <g className="ring2" opacity=".4"><ellipse cx="250" cy="130" rx="95" ry="22" stroke="url(#ringG2)" strokeWidth="1.5" fill="none" /></g>
                    <path className="energy" d="M120 130 Q185 100 250 130 T380 130" stroke="url(#energyG)" strokeWidth="2" fill="none" />
                    <path className="energy" d="M140 145 Q195 170 250 145 T360 145" stroke="url(#energyG)" strokeWidth="1.5" fill="none" style={{ animationDelay: ".5s" }} />
                    <g className="core" filter="url(#glow)">
                      <circle cx="250" cy="130" r="40" fill="url(#glowG)" />
                      <circle cx="250" cy="130" r="28" fill="url(#coreG)" />
                      <circle cx="250" cy="130" r="28" fill="url(#coreInnerG)" />
                      <circle cx="250" cy="130" r="20" fill="#0a0a1a" />
                      <circle cx="250" cy="130" r="12" fill="#151525" />
                      <path d="M245 122 L245 138 L258 130 Z" fill="#fff" />
                    </g>
                    <g className="orb1"><circle r="8" fill="#fb7185" filter="url(#glow)" /></g>
                    <g className="orb2"><circle r="6" fill="#fda4af" filter="url(#glow)" /></g>
                    <g className="orb3"><circle r="7" fill="#e11d48" filter="url(#glow)" /></g>
                    <g className="frame1" filter="url(#frameS)">
                      <g transform="translate(50,35)">
                        <rect width="95" height="60" rx="6" fill="url(#frameG)" stroke="#ffffff20" strokeWidth="1" />
                        <rect x="4" y="4" width="87" height="44" rx="3" fill="url(#screenG)" />
                        <circle cx="47" cy="26" r="12" fill="#ffffff08" /><path d="M44 20 L44 32 L53 26 Z" fill="#fff" opacity=".9" />
                        <rect x="4" y="52" width="35" height="4" rx="2" fill="#e11d48" /><rect x="42" y="52" width="49" height="4" rx="2" fill="#ffffff15" />
                      </g>
                    </g>
                    <g className="frame2" filter="url(#frameS)">
                      <g transform="translate(355,25)">
                        <rect width="105" height="68" rx="7" fill="url(#frameG)" stroke="#ffffff20" strokeWidth="1" />
                        <rect x="5" y="5" width="95" height="50" rx="4" fill="url(#screenG)" />
                        <circle cx="52" cy="30" r="14" fill="#ffffff08" /><path d="M48 23 L48 37 L60 30 Z" fill="#fff" opacity=".9" />
                        <rect x="5" y="59" width="45" height="4" rx="2" fill="#22c55e" /><rect x="54" y="59" width="46" height="4" rx="2" fill="#ffffff15" />
                        <circle cx="88" cy="14" r="7" fill="#22c55e30" /><path d="M85 14 L87 16 L91 12" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" />
                      </g>
                    </g>
                    <g className="frame3" filter="url(#frameS)">
                      <g transform="translate(380,160)">
                        <rect width="85" height="55" rx="5" fill="url(#frameG)" stroke="#ffffff20" strokeWidth="1" />
                        <rect x="4" y="4" width="77" height="40" rx="3" fill="url(#screenG)" />
                        <circle cx="42" cy="24" r="10" fill="#ffffff08" /><path d="M39 19 L39 29 L48 24 Z" fill="#fff" opacity=".9" />
                        <rect x="4" y="48" width="25" height="3" rx="1.5" fill="#f43f5e" /><rect x="32" y="48" width="49" height="3" rx="1.5" fill="#ffffff15" />
                      </g>
                    </g>
                    <g className="frame1" filter="url(#frameS)" style={{ animationDelay: "1s" }}>
                      <g transform="translate(35,155)">
                        <rect width="75" height="50" rx="5" fill="url(#frameG)" stroke="#ffffff20" strokeWidth="1" />
                        <rect x="4" y="4" width="67" height="35" rx="3" fill="url(#screenG)" />
                        <circle cx="37" cy="21" r="9" fill="#ffffff08" /><path d="M34 16 L34 26 L42 21 Z" fill="#fff" opacity=".9" />
                        <rect x="4" y="43" width="30" height="3" rx="1.5" fill="#fb7185" /><rect x="37" y="43" width="34" height="3" rx="1.5" fill="#ffffff15" />
                      </g>
                    </g>
                    <circle className="particle p1" cx="150" cy="70" r="4" fill="#fb7185" /><circle className="particle p2" cx="350" cy="60" r="3" fill="#fda4af" />
                    <circle className="particle p3" cx="130" cy="190" r="3.5" fill="#e11d48" /><circle className="particle p4" cx="370" cy="200" r="4" fill="#fb7185" />
                    <circle className="particle p5" cx="200" cy="40" r="2.5" fill="#fecdd3" /><circle className="particle p6" cx="300" cy="220" r="3" fill="#f43f5e" />
                    <circle className="particle p2" cx="450" cy="130" r="2.5" fill="#9f1239" /><circle className="particle p4" cx="60" cy="120" r="2" fill="#fda4af" />
                    <circle className="sparkle sp1" cx="180" cy="95" r="2" fill="#fff" /><circle className="sparkle sp2" cx="320" cy="100" r="1.5" fill="#fff" />
                    <circle className="sparkle sp3" cx="220" cy="170" r="1.5" fill="#fff" /><circle className="sparkle sp4" cx="280" cy="85" r="2" fill="#fff" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                <p className="text-xs text-zinc-500 font-medium">Total videos</p>
                <p className="text-xl font-bold text-white mt-0.5">{usageLoading ? "—" : (usage.overview?.totalVideos ?? 0)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                <p className="text-xs text-zinc-500 font-medium">This week</p>
                <p className="text-xl font-bold text-white mt-0.5">{usageLoading ? "—" : (usage.overview?.thisWeek ?? 0)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                <p className="text-xs text-zinc-500 font-medium">This month</p>
                <p className="text-xl font-bold text-white mt-0.5">{usageLoading ? "—" : (usage.overview?.thisMonth ?? 0)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                <p className="text-xs text-zinc-500 font-medium">Total duration</p>
                <p className="text-xl font-bold text-white mt-0.5">{usageLoading ? "—" : `${usage.overview?.totalDurationMin ?? 0} min`}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                <p className="text-xs text-zinc-500 font-medium">Storage used</p>
                <p className="text-xl font-bold text-white mt-0.5">{usageLoading ? "—" : (usage.overview?.storageUsed ?? "—")}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                <p className="text-xs text-zinc-500 font-medium">In progress</p>
                <p className="text-xl font-bold text-white mt-0.5">{usageLoading ? "—" : (usage.overview?.inProgress ?? 0)}</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Avg. render time: {usage.overview?.avgRenderSec != null ? `~${usage.overview.avgRenderSec} sec` : "—"}
            </p>
          </section>

          <section id="videos" className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-white">My videos</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-48 pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder:text-zinc-500 text-sm focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none"
                  />
                </div>
                <div className="flex rounded-lg border border-white/10 p-0.5 bg-zinc-900/50">
                  {(["all", "completed", "processing", "failed"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setVideoFilter(f)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${videoFilter === f ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex rounded-lg border border-white/10 p-0.5 bg-zinc-900/50">
                  <button type="button" onClick={() => setViewMode("grid")} className={`p-2 rounded-md ${viewMode === "grid" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`} title="Grid">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  </button>
                  <button type="button" onClick={() => setViewMode("list")} className={`p-2 rounded-md ${viewMode === "list" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`} title="List">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  </button>
                </div>
              </div>
            </div>

            {videosLoading ? (
              <div className="rounded-xl border border-white/10 bg-zinc-950 p-12 text-center">
                <div className="w-10 h-10 mx-auto rounded-full border-2 border-white/20 border-t-white animate-spin mb-4" />
                <p className="text-zinc-400 font-medium">Loading videos...</p>
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-zinc-950 border-dashed p-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-zinc-400 font-medium">
                  {videos.length === 0 ? "No videos yet" : "No videos match your filters"}
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  {videos.length === 0 ? "Create your first video to see it here." : "Try a different filter or search."}
                </p>
                <Link href="/#create" className="inline-flex items-center gap-2 mt-4 text-blue-400 hover:text-blue-300 font-medium text-sm">Create video →</Link>
              </div>
            ) : viewMode === "list" ? (
              <div className="rounded-xl border border-white/10 bg-zinc-950 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-sm text-zinc-500">
                      <th className="py-3 px-4 font-medium">Video</th>
                      <th className="py-3 px-4 font-medium hidden sm:table-cell">Date</th>
                      <th className="py-3 px-4 font-medium hidden md:table-cell">Duration</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVideos.map((v) => (
                      <tr key={v.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                        <td className="py-3 px-4">
                          <p className="font-medium text-white truncate max-w-[200px]">{v.title}</p>
                          <p className="text-xs text-zinc-500 truncate max-w-[200px] md:hidden">{v.date} · {v.duration}</p>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 text-sm hidden sm:table-cell">{v.date}</td>
                        <td className="py-3 px-4 text-zinc-400 text-sm hidden md:table-cell">{v.duration}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusStyles[v.status]}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/dashboard/videos/${v.id}`} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5">View</Link>
                            {v.status === "completed" && v.videoUrl ? (
                              <a href={v.videoUrl} download className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5">Download</a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                {filteredVideos.map((video) => (
                  <div key={video.id} className="rounded-xl border border-white/10 bg-zinc-950 overflow-hidden hover:border-white/15 transition-colors group">
                    <Link href={`/dashboard/videos/${video.id}`} className="block">
                      <div className="aspect-video bg-zinc-900 flex items-center justify-center relative">
                        <svg className="w-14 h-14 text-zinc-700 group-hover:text-zinc-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-xs font-medium border ${statusStyles[video.status]}`}>
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
                    <div className="px-4 pb-4 flex gap-2">
                      <Link href={`/dashboard/videos/${video.id}`} className="flex-1 text-center text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 rounded-lg transition-colors">View</Link>
                      {video.status === "completed" && video.videoUrl ? (
                        <a href={video.videoUrl} download className="flex-1 text-center text-sm font-medium text-black bg-white hover:bg-zinc-200 px-3 py-2 rounded-lg transition-colors">Download</a>
                      ) : null}
                      {video.status === "completed" && video.videoUrl ? (
                        <button type="button" className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors" title="Copy link">🔗</button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
