"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getUserFriendlyErrorMessage } from "@/lib/utils/error";
import { STAGES } from "@/constants/landing";
import { DURATION_MIN, DURATION_MAX } from "@/lib/validation/duration";
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/validation/aspectRatio";
import WarpShaderHero from "@/components/ui/warp-shader";

type JobStatus = "pending" | "processing" | "completed" | "failed";
type Mode = "slideshow" | "talking_object";
type Platform = "general" | "linkedin" | "twitter" | "youtube_shorts";

const POLL_MS = 2500;

const PROMPT_CHIPS = [
  { label: "Product launch", prompt: "Product launch video: highlight key features and benefits, end with a clear call-to-action. Confident, professional tone. Suitable for website and social." },
  { label: "Founder story", prompt: "Founder story: who we are, why we started, and what we stand for. Authentic and personable. For LinkedIn and about pages." },
  { label: "Customer story", prompt: "Customer success video: real results and impact in testimonial style. Authentic and inspiring. For landing pages and case studies." },
  { label: "How it works", prompt: "Explainer video: how our product or service works in simple steps. Clear, friendly tone. For onboarding and sales." },
  { label: "LinkedIn post", prompt: "Thought-leadership clip: one sharp insight or takeaway. Professional tone. Optimized for LinkedIn feed and reposts." },
  { label: "Reel / Short hook", prompt: "Scroll-stopping hook for Reels or Shorts: strong opener, one clear message. Trend-aware and shareable." },
];

export default function CreatePage() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<Mode>("slideshow");
  const [platform, setPlatform] = useState<Platform>("general");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [dur, setDur] = useState(30);
  const [cc, setCc] = useState(true);
  const [objStyle, setObjStyle] = useState<"cartoon" | "real">("cartoon");
  const [imgs, setImgs] = useState<File[]>([]);
  const [imgUrls, setImgUrls] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(0);
  const [suggesting, setSuggesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = imgs.map((f) => URL.createObjectURL(f));
    setImgUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [imgs]);

  const busy = submitting || (jobId != null && (status === "pending" || status === "processing"));
  const done = status === "completed" && !!videoUrl;

  const stop = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (stageRef.current) clearInterval(stageRef.current);
    pollRef.current = stageRef.current = null;
  }, []);

  const poll = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/generate/${encodeURIComponent(id)}`);
      const d = await r.json();
      if (!r.ok) { setError(getUserFriendlyErrorMessage(d.error || "Error")); setStatus("failed"); stop(); return; }
      setStatus(d.status);
      if (d.status === "completed" && d.videoUrl) { setVideoUrl(d.videoUrl); stop(); }
      if (d.status === "failed") { setError(getUserFriendlyErrorMessage(d.error || "Failed")); stop(); }
    } catch { setError("Connection lost"); setStatus("failed"); stop(); }
  }, [stop]);

  useEffect(() => {
    if (!jobId) return;
    poll(jobId);
    pollRef.current = setInterval(() => poll(jobId), POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId, poll]);

  useEffect(() => {
    if (jobId && (status === "pending" || status === "processing")) {
      setStage(0);
      stageRef.current = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 18000);
      return () => { if (stageRef.current) clearInterval(stageRef.current); };
    }
  }, [jobId, status]);

  const submit = async () => {
    if (!prompt.trim() || prompt.trim().length < 5 || submitting) return;
    setError(null); setVideoUrl(null); setStatus(null); setJobId(null); setSubmitting(true);
    try {
      let assetIds: string[] = [];
      if (imgs.length) {
        const fd = new FormData();
        imgs.forEach((f) => fd.append("productPhotos", f));
        const u = await fetch("/api/assets/upload", { method: "POST", body: fd });
        const ud = await u.json();
        if (u.ok && ud.assetIds) assetIds = ud.assetIds;
      }
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 25_000);
      const r = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: prompt.trim(), mode, platform, aspectRatio,
          durationSeconds: Math.min(DURATION_MAX, Math.max(DURATION_MIN, dur)),
          captions: cc ? "on" : "off",
          ...(assetIds.length ? { assetIds } : {}),
          ...(mode === "talking_object" ? { talkingObjectStyle: objStyle } : {}),
        }),
        signal: ac.signal,
      });
      clearTimeout(t);
      const d = await r.json();
      if (!r.ok) { setError(getUserFriendlyErrorMessage(d.error || "Failed")); return; }
      setJobId(d.jobId); setStatus("pending");
    } catch (e) {
      setError(e instanceof Error && e.name === "AbortError" ? "Timed out. Try again." : "Connection failed.");
    } finally { setSubmitting(false); }
  };

  const reset = () => {
    stop(); setJobId(null); setStatus(null); setVideoUrl(null); setError(null);
    setPrompt(""); setImgs([]); setMode("slideshow"); setPlatform("general"); setAspectRatio("16:9");
    setDur(30); setCc(true); setObjStyle("cartoon");
  };

  const suggest = async () => {
    if (suggesting) return;
    setSuggesting(true);
    try {
      const r = await fetch("/api/suggest-prompt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() || undefined, refine: !!prompt.trim() }),
      });
      if (r.ok) { const d = await r.json(); if (d.suggestion) setPrompt(d.suggestion); }
    } catch { /* */ }
    setSuggesting(false);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => setImgs((p) => [...p, ...Array.from(e.target.files || [])].slice(0, 5));
  const rmImg = (i: number) => setImgs((p) => p.filter((_, x) => x !== i));

  const pIcons: Record<Platform, React.ReactNode> = {
    general: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" /></svg>,
    youtube_shorts: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" /></svg>,
    twitter: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
    linkedin: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
  };

  return (
    <div className="min-h-dvh bg-black text-white font-sans relative overflow-hidden">
      <WarpShaderHero />

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:shadow-rose-500/30 transition-shadow">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v4M17 2v4" /><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 10h20" /><path d="m10 14 3 2-3 2v-4z" /></svg>
          </div>
          <span className="text-base font-semibold tracking-tight text-white">CUTLINE</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">Dashboard</Link>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {/* ════════════════ GENERATING ════════════════ */}
        {busy && (
          <motion.main key="busy" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 flex items-center justify-center min-h-[calc(100dvh-72px)] px-6">
            <div className="w-full max-w-md">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="rounded-3xl border border-white/8 bg-zinc-950/80 backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden">

                {/* Top glow accent */}
                <div className="h-px w-full bg-linear-to-r from-transparent via-rose-500/40 to-transparent" />

                <div className="px-8 pt-10 pb-8">
                  {/* Animated icon */}
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full bg-rose-500/10 blur-2xl" />
                    <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: "12s" }} viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="44" stroke="url(#ringGrad)" strokeWidth="1" fill="none" strokeDasharray="6 8" />
                      <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="96" y2="96"><stop offset="0%" stopColor="#f43f5e" stopOpacity="0.6" /><stop offset="100%" stopColor="#fb7185" stopOpacity="0.1" /></linearGradient></defs>
                    </svg>
                    <svg className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] animate-spin" style={{ animationDuration: "6s", animationDirection: "reverse" }} viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="36" stroke="rgba(244,63,94,0.12)" strokeWidth="1" fill="none" />
                      <circle cx="40" cy="4" r="2.5" fill="#f43f5e"><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" /></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-xl shadow-rose-500/25">
                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v4M17 2v4" /><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 10h20" /><path d="m10 14 3 2-3 2v-4z" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-semibold text-white tracking-tight mb-1.5">Creating your video</h2>
                    <p className="text-sm text-zinc-500">Usually takes 1–3 minutes</p>
                  </div>

                  {/* Overall progress bar */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-medium text-zinc-400">Progress</span>
                      <span className="text-xs font-medium tabular-nums text-zinc-400">{Math.round(((stage + 0.5) / STAGES.length) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800/80 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-linear-to-r from-rose-500 to-rose-400"
                        initial={{ width: "0%" }}
                        animate={{ width: `${((stage + 0.5) / STAGES.length) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      />
                    </div>
                  </div>

                  {/* Pipeline steps */}
                  <div className="space-y-1">
                    {STAGES.map((s, i) => {
                      const active = i === stage;
                      const past = i < stage;
                      return (
                        <motion.div
                          key={s}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 + i * 0.08, duration: 0.4 }}
                          className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-500 ${active ? "bg-white/4" : ""}`}
                        >
                          <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold transition-all duration-500 ${past ? "bg-emerald-500/15 text-emerald-400" : active ? "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/25" : "bg-zinc-800/80 text-zinc-600"}`}>
                            {past ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            ) : active ? (
                              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            ) : (
                              <span>{i + 1}</span>
                            )}
                          </div>
                          <span className={`text-sm font-medium transition-colors duration-300 ${past ? "text-zinc-500 line-through decoration-zinc-700" : active ? "text-white" : "text-zinc-600"}`}>{s}</span>
                          {active && (
                            <div className="ml-auto flex items-center gap-2">
                              <span className="text-[11px] font-medium text-rose-400/80">Processing</span>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                              </span>
                            </div>
                          )}
                          {past && <span className="ml-auto text-[11px] font-medium text-emerald-500/60">Done</span>}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="px-8 py-4 border-t border-white/5 bg-zinc-900/30 flex items-center justify-between">
                  <p className="text-xs text-zinc-600">Step {stage + 1} of {STAGES.length}</p>
                  <button onClick={() => { stop(); setStatus("failed"); setError("Cancelled"); setJobId(null); }} className="text-xs font-medium text-zinc-500 hover:text-red-400 transition-colors">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.main>
        )}

        {/* ════════════════ COMPLETE ════════════════ */}
        {done && (
          <motion.main key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-10 max-w-5xl mx-auto px-6 lg:px-10 py-10">
            {/* Success banner */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8 px-5 py-3.5 rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/15">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-400">Your video is ready</p>
                <p className="text-[11px] text-emerald-400/50">Generated successfully</p>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              {/* Video */}
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50">
                <video src={videoUrl} controls autoPlay className="w-full aspect-video bg-black" />
              </div>

              <div className="space-y-4">
                {/* Actions */}
                <div className="rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl p-5">
                  <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Actions</h3>
                  <div className="space-y-2">
                    <a href={`/api/generate/${jobId}/download`} className="group flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 transition-all shadow-lg shadow-white/5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download MP4
                      <svg className="w-3.5 h-3.5 ml-auto text-zinc-400 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </a>
                    <button onClick={() => { navigator.clipboard.writeText(window.location.origin + videoUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-white/10 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                      {copied ? "Copied!" : "Copy share link"}
                    </button>
                  </div>
                </div>

                {/* Post-production */}
                <div className="rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl p-5">
                  <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Post-production</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Edit", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" },
                      { label: "Slow", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
                      { label: "Redo", icon: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" },
                      { label: "Style", icon: "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" },
                    ].map(({ label, icon }) => (
                      <button key={label} className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-white/5 bg-white/2 text-zinc-500 hover:text-white hover:bg-white/5 hover:border-white/10 hover:shadow-lg transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={reset} className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl border border-dashed border-white/10 text-sm text-zinc-500 hover:text-white hover:border-white/20 hover:bg-white/2 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Create another video
                </button>
              </div>
            </div>
          </motion.main>
        )}

        {/* ════════════════ CREATION FORM ════════════════ */}
        {!busy && !done && (
          <motion.main key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100dvh-72px)] px-6 lg:px-10 py-12">
            <div className="w-full max-w-5xl mx-auto">
              {/* Landing-style generate card: two-column (images left, form right) */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden">
                <div className="grid md:grid-cols-[280px_1fr]">
                  {/* Left: Your images (optional) */}
                  <div className="p-6 md:p-7 border-b md:border-b-0 md:border-r border-white/5 bg-zinc-900/50">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-white">Your images (optional)</p>
                      <p className="text-xs text-gray-500">{imgs.length}/5</p>
                    </div>
                    <div
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => { e.preventDefault(); const f = Array.from(e.dataTransfer.files).filter((x) => x.type.startsWith("image/")); setImgs((prev) => prev.concat(f).slice(0, 5)); }}
                      onClick={() => fileRef.current?.click()}
                      className="relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors border-zinc-800 hover:border-zinc-700"
                    >
                      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFile} />
                      <svg className="w-8 h-8 mx-auto mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <p className="text-sm text-gray-500">Drop images or click</p>
                      <p className="text-xs text-gray-600 mt-1">Optional • Max 5</p>
                    </div>
                    {imgUrls.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {imgUrls.map((u, i) => (
                          <div key={u} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                            <img src={u} alt="" className="w-full h-full object-cover" />
                            <button onClick={(e) => { e.stopPropagation(); rmImg(i); }} className="absolute top-1 right-1 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                      No images? We&apos;ll find visuals from the web based on your description. Or add your own and we&apos;ll use them first.
                    </p>

                    <div className="mt-6 pt-6 border-t border-white/5">
                      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Platform</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {(["general", "youtube_shorts", "twitter", "linkedin"] as Platform[]).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPlatform(p)}
                            className={`flex items-center justify-center gap-2 w-full min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${platform === p ? "border-blue-500/50 bg-blue-500/10 text-white" : "border-zinc-700/80 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/80 hover:text-zinc-300"}`}
                          >
                            <span className={platform === p ? "text-blue-200" : "text-zinc-500"}>{pIcons[p]}</span>
                            <span>{p === "general" ? "General" : p === "youtube_shorts" ? "Shorts" : p === "twitter" ? "X" : "LinkedIn"}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5">
                      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Aspect ratio</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ASPECT_RATIOS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setAspectRatio(r)}
                            className={`flex items-center justify-center min-h-[40px] rounded-xl border px-2.5 py-2 text-xs font-medium tabular-nums transition-all ${aspectRatio === r ? "border-blue-500/50 bg-blue-500/10 text-white" : "border-zinc-700/80 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/80 hover:text-zinc-300"}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Describe your video + form (same as landing hero card) */}
                  <div className="p-6 flex flex-col">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-white mb-3">Describe your video</label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                        placeholder="e.g. Create a 30-second explainer about how solar panels work, professional tone with upbeat background music"
                        rows={5}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none resize-none"
                      />
                      <div className="flex items-start justify-between mt-2 text-xs text-gray-600 gap-4">
                        <span>Be specific: topic, tone, style, audience</span>
                        <div className="flex flex-col items-end shrink-0">
                          <span>{prompt.length}/500</span>
                          <button
                            type="button"
                            onClick={suggest}
                            disabled={suggesting || prompt.trim().split(/\s+/).filter(Boolean).length <= 10}
                            className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
                          >
                            {suggesting ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Suggesting...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Suggest prompt
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {PROMPT_CHIPS.map(({ label, prompt: p }) => (
                          <button
                            key={label}
                            onClick={() => setPrompt(p)}
                            className="text-xs text-gray-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-white mb-3">Video length (seconds)</label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min={DURATION_MIN}
                            max={DURATION_MAX}
                            value={dur}
                            onChange={(e) => setDur(Number(e.target.value))}
                            className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <input
                            type="number"
                            min={DURATION_MIN}
                            max={DURATION_MAX}
                            value={dur}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (!Number.isNaN(v)) setDur(Math.min(DURATION_MAX, Math.max(DURATION_MIN, v)));
                            }}
                            className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-sm text-gray-500">sec</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {DURATION_MIN}-{DURATION_MAX} seconds. Talking object videos over 8s use multiple clips.
                        </p>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-white mb-3">Video style</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setMode("slideshow")}
                            className={`p-4 rounded-xl border text-left transition-all ${mode === "slideshow" ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 hover:border-zinc-700"}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === "slideshow" ? "border-blue-500" : "border-zinc-700"}`}>
                                {mode === "slideshow" && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                              </div>
                              <span className="text-sm font-medium text-white">Slideshow</span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">Ken Burns slideshow with images and voiceover</p>
                          </button>
                          <button
                            onClick={() => setMode("talking_object")}
                            className={`p-4 rounded-xl border text-left transition-all ${mode === "talking_object" ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 hover:border-zinc-700"}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === "talking_object" ? "border-blue-500" : "border-zinc-700"}`}>
                                {mode === "talking_object" && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                              </div>
                              <span className="text-sm font-medium text-white">Talking object</span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">Object with a face that speaks and lip-syncs</p>
                          </button>
                        </div>
                        {mode === "talking_object" && (
                          <div className="mt-3 pl-1">
                            <p className="text-xs font-medium text-gray-500 mb-2">Talking style</p>
                            <div className="flex flex-wrap gap-2">
                              {(["cartoon", "real"] as const).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setObjStyle(s)}
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${objStyle === s ? "border-amber-500/50 bg-amber-500/10 text-amber-200" : "border-zinc-700 text-gray-500 hover:border-zinc-600 hover:text-gray-600"}`}
                                >
                                  {objStyle === s && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                  {s === "cartoon" ? "Cartoon" : "Real person"}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-white mb-2">Captions</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setCc(true)}
                            className={`p-3 rounded-xl border text-left transition-all ${cc ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 hover:border-zinc-700"}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${cc ? "border-blue-500" : "border-zinc-700"}`}>
                                {cc && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                              </div>
                              <span className="text-sm font-medium text-white">With captions</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCc(false)}
                            className={`p-3 rounded-xl border text-left transition-all ${!cc ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 hover:border-zinc-700"}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${!cc ? "border-blue-500" : "border-zinc-700"}`}>
                                {!cc && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                              </div>
                              <span className="text-sm font-medium text-white">No captions</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>~60 sec</span>
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span>1080p</span>
                        <span className="text-zinc-700">·</span>
                        <span className="text-blue-400">Free</span>
                      </div>
                      <button
                        type="button"
                        onClick={submit}
                        disabled={!prompt.trim() || prompt.trim().length < 5 || submitting}
                        className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {submitting ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Starting...
                          </>
                        ) : (
                          <>
                            Generate
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" /></svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-red-500/[0.07] border border-red-500/15">
                  <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
