"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CircleUserRound, Clapperboard, Info } from "lucide-react";
import { getUserFriendlyErrorMessage, getErrorPresentation } from "@/lib/utils/error";
import { STAGES } from "@/constants/landing";
import { DURATION_MIN, DURATION_MAX } from "@/lib/validation/duration";
import { SUBMIT_TIMEOUT_MS } from "@/components/generate/constants";
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/validation/aspectRatio";
import type { AvatarPresetId } from "@/lib/types/avatar";
import { isEnterprisePlan, type PlanId } from "@/lib/plans";
import WarpShaderHero from "@/components/ui/warp-shader";

function CreateBrandMark({ className }: { className?: string }) {
  return (
    <span
      className={
        "relative inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/10 bg-zinc-950/80 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_8px_24px_-12px_rgba(0,0,0,0.8)] overflow-hidden " +
        (className ?? "")
      }
      aria-hidden
    >
      <span className="pointer-events-none absolute -top-3 -right-3 h-7 w-7 rounded-full bg-amber-400/35 blur-[10px]" />
      <span className="pointer-events-none absolute -bottom-3 -left-3 h-7 w-7 rounded-full bg-teal-400/25 blur-[10px]" />
      <svg viewBox="0 0 32 32" fill="none" className="relative h-[18px] w-[18px]">
        <path
          d="M9 22V10"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M14 22h9"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M5.5 26.5L26.5 5.5"
          stroke="url(#cutline-mark-cut)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="2.4 3.2"
        />
        <defs>
          <linearGradient
            id="cutline-mark-cut"
            x1="5.5"
            y1="26.5"
            x2="26.5"
            y2="5.5"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#5eead4" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

type JobStatus = "pending" | "processing" | "completed" | "failed";
type Mode = "slideshow" | "talking_object";
type VideoKind = "slideshow" | "talking_cartoon" | "talking_real";
type TalkingRealMode = "studio" | "scenario";
type Platform = "general" | "linkedin" | "twitter" | "youtube_shorts";
type AvatarMode = "default" | "preset" | "upload";

const PRO_AVATAR_MODES: AvatarMode[] = ["preset", "upload"];
function canUseProAvatar(plan: PlanId): boolean {
  return plan === "professional" || plan === "enterprise";
}
function canUseCinematicScenes(plan: PlanId): boolean {
  return plan === "professional" || plan === "enterprise";
}

const POLL_MS = 2500;

type StageMeta = {
  title: string;
  description: string;
  icon: React.ReactElement;
};

const STAGE_META: StageMeta[] = [
  {
    title: "Analyzing prompt",
    description: "Reading your topic and locking the tone.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 6.5v11M14.5 6.5v11M4 9h2M4 15h2M18 9h2M18 15h2M9.5 9h5M9.5 15h5" />
      </svg>
    ),
  },
  {
    title: "Writing script",
    description: "Drafting the narrative beats and copy.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487l3.65 3.65M4 20l4-1 11.86-11.86a1 1 0 000-1.41l-2.59-2.59a1 1 0 00-1.41 0L4 14.86V20z" />
      </svg>
    ),
  },
  {
    title: "Sourcing visuals",
    description: "Pulling shots, b-roll and references.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l3-3h12l3 3v12a1 1 0 01-1 1H4a1 1 0 01-1-1V7zM3 7h18M9 4v3M15 4v3M9 13l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Generating voice",
    description: "Synthesizing the natural voiceover.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10v4M7 7v10M11 4v16M15 7v10M19 10v4" />
      </svg>
    ),
  },
  {
    title: "Rendering video",
    description: "Composing frames and exporting MP4.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18v14H3V5zM3 9h18M7 5v14M17 5v14M7 9v0M7 15v0M17 9v0M17 15v0" />
      </svg>
    ),
  },
];

const formatElapsed = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};
const AVATAR_PRESETS: Array<{
  id: AvatarPresetId;
  label: string;
  hint: string;
  imageSrc: string;
}> = [
    { id: "presenter_female_1", label: "Presenter (Female)", hint: "Professional look", imageSrc: "/avatars/presets/presenter-female-1.jpg" },
    { id: "presenter_male_1", label: "Presenter (Male)", hint: "Professional look", imageSrc: "/avatars/presets/presenter-male-1.jpg" },
    { id: "creator_female_1", label: "Creator (Female)", hint: "Casual creator vibe", imageSrc: "/avatars/presets/creator-female-1.jpg" },
    { id: "creator_male_1", label: "Creator (Male)", hint: "Casual creator vibe", imageSrc: "/avatars/presets/creator-male-1.jpg" },
  ];

const PROMPT_CHIPS = [
  { label: "Product launch", prompt: "Product launch video: highlight key features and benefits, end with a clear call-to-action. Confident, professional tone. Suitable for website and social." },
  { label: "Founder story", prompt: "Founder story: who we are, why we started, and what we stand for. Authentic and personable. For LinkedIn and about pages." },
  { label: "Customer story", prompt: "Customer success video: real results and impact in testimonial style. Authentic and inspiring. For landing pages and case studies." },
  { label: "How it works", prompt: "Explainer video: how our product or service works in simple steps. Clear, friendly tone. For onboarding and sales." },
  { label: "LinkedIn post", prompt: "Thought-leadership clip: one sharp insight or takeaway. Professional tone. Optimized for LinkedIn feed and reposts." },
  { label: "Reel / Short hook", prompt: "Scroll-stopping hook for Reels or Shorts: strong opener, one clear message. Trend-aware and shareable." },
];

const PLATFORM_OPTIONS: readonly Platform[] = ["general", "youtube_shorts", "twitter", "linkedin"] as const;

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  general: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" /></svg>,
  youtube_shorts: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" /></svg>,
  twitter: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
  linkedin: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
};

function ProAvatarGate() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/4 p-4"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
        <span className="text-xs font-semibold text-amber-300">Pro &amp; Enterprise only</span>
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
        Custom avatars are available on paid plans. Upgrade to use presets or upload your own face.
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors"
      >
        View plans
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
      </Link>
    </motion.div>
  );
}

export default function CreatePage() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<Mode>("slideshow");
  const [platform, setPlatform] = useState<Platform>("general");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [dur, setDur] = useState(30);
  const [cc, setCc] = useState(true);
  const [objStyle, setObjStyle] = useState<"cartoon" | "real">("cartoon");
  const [talkingRealMode, setTalkingRealMode] = useState<TalkingRealMode>("studio");
  const [avatarMode, setAvatarMode] = useState<AvatarMode>("default");
  const [avatarPresetId, setAvatarPresetId] = useState<AvatarPresetId>("presenter_female_1");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarFileUrl, setAvatarFileUrl] = useState<string | null>(null);
  const [imgs, setImgs] = useState<File[]>([]);
  const [imgUrls, setImgUrls] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    setShareSupported(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  const [suggesting, setSuggesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userPlan, setUserPlan] = useState<PlanId>("free");
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [canGenerateByPlan, setCanGenerateByPlan] = useState(true);
  const [planLimitMessage, setPlanLimitMessage] = useState<string | null>(null);
  const canUseCinematicMode = canUseCinematicScenes(userPlan);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/dashboard/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.plan) setUserPlan(d.plan as PlanId);
        const hasVideoCap =
          typeof d?.videosLimit === "number" && Number.isFinite(d.videosLimit);
        const used =
          typeof d?.videosUsed === "number" && Number.isFinite(d.videosUsed)
            ? d.videosUsed
            : 0;
        const limit = hasVideoCap ? d.videosLimit : null;
        const exhausted = limit != null && used >= limit;
        setCanGenerateByPlan(!exhausted);
        setPlanLimitMessage(
          exhausted
            ? `You've used ${used} of ${limit} videos this month. Upgrade to continue.`
            : null
        );
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const u = imgs.map((f) => URL.createObjectURL(f));
    setImgUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [imgs]);

  useEffect(() => {
    if (!canUseCinematicMode && talkingRealMode === "scenario") {
      setTalkingRealMode("studio");
    }
  }, [canUseCinematicMode, talkingRealMode]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarFileUrl(null);
      return;
    }
    const u = URL.createObjectURL(avatarFile);
    setAvatarFileUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [avatarFile]);

  const busy = submitting || (jobId != null && (status === "pending" || status === "processing"));
  const done = status === "completed" && !!videoUrl;

  useEffect(() => {
    if (!busy) {
      setElapsedSec(0);
      return;
    }
    const startedAt = Date.now();
    setElapsedSec(0);
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [busy]);

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
      if (d.status === "completed" && d.videoUrl) {
        setVideoUrl(d.videoUrl);
        setCompletionMessage(typeof d.message === "string" && d.message.trim() ? d.message.trim() : null);
        stop();
      }
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
    if (!canGenerateByPlan) {
      setError(planLimitMessage ?? "Your plan limit has been reached. Please upgrade to continue.");
      setErrorCode("MONTHLY_LIMIT_REACHED");
      return;
    }
    if (
      mode === "talking_object" &&
      objStyle === "real" &&
      talkingRealMode === "scenario" &&
      !canUseCinematicMode
    ) {
      setError("Cinematic scenes are available on Pro and Enterprise plans. Upgrade to use this mode.");
      return;
    }
    if (
      mode === "talking_object" &&
      objStyle === "real" &&
      talkingRealMode !== "scenario" &&
      PRO_AVATAR_MODES.includes(avatarMode) &&
      !canUseProAvatar(userPlan)
    ) {
      setError("Custom avatars need a Pro plan. Switch to Default or upgrade.");
      return;
    }
    setError(null); setErrorCode(null); setVideoUrl(null); setStatus(null); setJobId(null); setCompletionMessage(null); setSubmitting(true);
    try {
      let assetIds: string[] = [];
      let avatarUploadAssetId: string | undefined;
      if (imgs.length) {
        const fd = new FormData();
        imgs.forEach((f) => fd.append("productPhotos", f));
        const u = await fetch("/api/assets/upload", { method: "POST", body: fd });
        const ud = await u.json();
        if (u.ok && ud.assetIds) assetIds = ud.assetIds;
      }
      if (mode === "talking_object" && objStyle === "real" && avatarMode === "upload") {
        if (!avatarFile) {
          setError("Please upload an avatar image or choose default/preset avatar.");
          return;
        }
        const fd = new FormData();
        fd.append("referenceImages", avatarFile);
        const uploadRes = await fetch("/api/assets/upload", { method: "POST", body: fd });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !Array.isArray(uploadData.assetIds) || uploadData.assetIds.length === 0) {
          const uploadError =
            typeof uploadData?.error === "string" && uploadData.error.trim()
              ? uploadData.error
              : "Avatar upload failed. Please try a different image.";
          setError(uploadError);
          return;
        }
        avatarUploadAssetId = String(uploadData.assetIds[0]);
      }
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), SUBMIT_TIMEOUT_MS);
      let r: Response;
      try {
        r = await fetch("/api/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: prompt.trim(), mode, platform, aspectRatio,
            durationSeconds: Math.min(DURATION_MAX, Math.max(DURATION_MIN, dur)),
            captions: cc ? "on" : "off",
            ...(assetIds.length ? { assetIds } : {}),
            ...(mode === "talking_object" ? { talkingObjectStyle: objStyle } : {}),
            ...(mode === "talking_object" && objStyle === "real" ? { talkingRealMode } : {}),
            ...(mode === "talking_object" && objStyle === "real"
              && talkingRealMode !== "scenario"
              ? {
                avatar:
                  avatarMode === "preset"
                    ? { mode: "preset", presetId: avatarPresetId }
                    : avatarMode === "upload" && avatarUploadAssetId
                      ? { mode: "upload", uploadAssetId: avatarUploadAssetId }
                      : { mode: "default" },
              }
              : {}),
          }),
          signal: ac.signal,
        });
      } finally {
        clearTimeout(t);
      }
      const d = await r.json();
      if (!r.ok) {
        const code = typeof d?.code === "string" ? d.code : null;
        setErrorCode(code);
        if (code === "MONTHLY_LIMIT_REACHED" || code === "ANON_LIMIT_REACHED") {
          setError("Your current plan limit has been reached. Please upgrade to continue creating videos.");
          setCanGenerateByPlan(false);
          if (typeof d?.details?.videosUsed === "number" && typeof d?.details?.videosLimit === "number") {
            setPlanLimitMessage(
              `You've used ${d.details.videosUsed} of ${d.details.videosLimit} videos this month. Upgrade to continue.`
            );
          }
        } else {
          setError(getUserFriendlyErrorMessage(d.error || "Failed"));
        }
        return;
      }
      setJobId(d.jobId); setStatus("pending");
    } catch (e) {
      setError(e instanceof Error && e.name === "AbortError" ? "Timed out. Try again." : "Connection failed.");
    } finally { setSubmitting(false); }
  };

  const reset = () => {
    stop(); setJobId(null); setStatus(null); setVideoUrl(null); setError(null); setErrorCode(null);
    setPrompt(""); setImgs([]); setMode("slideshow"); setPlatform("general"); setAspectRatio("16:9");
    setDur(30); setCc(true); setObjStyle("cartoon");
    setTalkingRealMode("studio");
    setAvatarMode("default"); setAvatarPresetId("presenter_female_1"); setAvatarFile(null);
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
    } catch { }
    setSuggesting(false);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => setImgs((p) => [...p, ...Array.from(e.target.files || [])].slice(0, 5));
  const rmImg = (i: number) => setImgs((p) => p.filter((_, x) => x !== i));

  const videoKind: VideoKind =
    mode === "slideshow" ? "slideshow" : objStyle === "real" ? "talking_real" : "talking_cartoon";

  const setVideoKind = (k: VideoKind) => {
    if (k === "slideshow") {
      setMode("slideshow");
    } else {
      setMode("talking_object");
      setObjStyle(k === "talking_real" ? "real" : "cartoon");
    }
  };

  return (
    <div className="h-dvh max-h-dvh flex flex-col bg-black text-white font-sans relative overflow-hidden">
      <WarpShaderHero />

      <nav className="relative z-10 shrink-0 flex items-center justify-between px-6 lg:px-10 py-3">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 shrink-0 py-0.5 rounded-xl px-1 -mx-1 transition-colors hover:bg-white/3"
        >
          <CreateBrandMark className="transition-transform duration-300 group-hover:-rotate-3" />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-white">
              CUTLINE
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500 group-hover:text-zinc-300 transition-colors hidden sm:inline">
              Studio
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">Dashboard</Link>
        </div>
      </nav>

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain">
        <AnimatePresence mode="wait">
          {busy && (
            <motion.main
              key="busy"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative min-h-full flex items-center justify-center px-6 py-6"
            >
              {(() => {
                const totalStages = STAGES.length;
                const progressPct = Math.min(99, Math.round(((stage + 0.5) / totalStages) * 100));
                const activeMeta = STAGE_META[stage] ?? STAGE_META[0];
                return (
                  <div className="w-full max-w-lg">
                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      className="relative rounded-3xl border border-white/10 bg-zinc-950/85 backdrop-blur-2xl shadow-2xl shadow-black/70 overflow-hidden"
                    >
                      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-amber-500/14 blur-3xl" aria-hidden />
                      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-teal-500/12 blur-3xl" aria-hidden />
                      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-amber-400/45 to-transparent" />
                      <div
                        className="pointer-events-none absolute inset-0 opacity-[0.045]"
                        aria-hidden
                        style={{
                          backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                          backgroundSize: "26px 26px",
                        }}
                      />

                      <div className="relative px-7 pt-7 pb-5">
                        <div className="relative mx-auto h-28 w-full max-w-[360px] rounded-2xl border border-white/10 bg-linear-to-br from-zinc-900/90 via-black to-zinc-900/90 overflow-hidden shadow-inner shadow-black/40">
                          <div className="absolute top-1.5 left-0 right-0 flex justify-between px-2.5" aria-hidden>
                            {Array.from({ length: 9 }).map((_, i) => (
                              <span key={`t-${i}`} className="block h-1.5 w-2 rounded-[2px] bg-white/8" />
                            ))}
                          </div>
                          <div className="absolute bottom-1.5 left-0 right-0 flex justify-between px-2.5" aria-hidden>
                            {Array.from({ length: 9 }).map((_, i) => (
                              <span key={`b-${i}`} className="block h-1.5 w-2 rounded-[2px] bg-white/8" />
                            ))}
                          </div>

                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative inline-flex items-center gap-2.5 rounded-xl bg-black/55 border border-white/12 px-3 py-1.5 backdrop-blur-md shadow-lg shadow-black/40">
                              <CreateBrandMark className="h-6 w-6" />
                              <span className="text-[12px] font-semibold tracking-tight text-white leading-none">
                                CUTLINE
                              </span>
                            </div>
                          </div>

                          <motion.div
                            className="absolute top-3 bottom-3 w-px bg-linear-to-b from-transparent via-amber-400 to-transparent"
                            initial={{ left: "8%" }}
                            animate={{ left: ["8%", "92%", "8%"] }}
                            transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
                            aria-hidden
                          >
                            <span className="absolute -inset-x-2 top-0 bottom-0 bg-amber-400/14 blur-md" />
                          </motion.div>

                          <div
                            className="pointer-events-none absolute left-3 right-3 bottom-4 flex items-end gap-[3px] opacity-50"
                            aria-hidden
                          >
                            {Array.from({ length: 28 }).map((_, i) => (
                              <motion.span
                                key={`wf-${i}`}
                                className="block w-[2px] rounded-full bg-linear-to-t from-amber-400/0 via-amber-400/60 to-teal-300/70"
                                initial={{ height: 4 }}
                                animate={{ height: [4, 10 + ((i * 7) % 14), 4] }}
                                transition={{
                                  duration: 1.2 + (i % 5) * 0.18,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: (i % 7) * 0.07,
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 flex items-start gap-3">
                          <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-xl bg-amber-400/22 blur-md" aria-hidden />
                            <div className="relative w-10 h-10 rounded-xl bg-linear-to-br from-amber-400/95 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
                              <span className="text-zinc-950">{activeMeta.icon}</span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-[17px] font-semibold text-white tracking-tight leading-tight">
                                {activeMeta.title}
                              </h2>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-amber-500/12 text-amber-200 border border-amber-400/30">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-70" />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                                </span>
                                In progress
                              </span>
                            </div>
                            <p className="text-[12.5px] text-zinc-400 mt-1 leading-relaxed">
                              {activeMeta.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="px-7 pb-5">
                        <div className="flex items-center justify-between mb-2 text-[11px] font-medium uppercase tracking-[0.14em]">
                          <span className="text-zinc-500">
                            Step <span className="text-zinc-300 tabular-nums">{stage + 1}</span> of <span className="text-zinc-300 tabular-nums">{totalStages}</span>
                          </span>
                          <span className="tabular-nums text-zinc-300">{progressPct}%</span>
                        </div>
                        <div className="relative h-1.5 w-full rounded-full bg-zinc-800/70 overflow-hidden ring-1 ring-white/5">
                          <motion.div
                            className="relative h-full rounded-full bg-linear-to-r from-amber-400 via-amber-300 to-teal-300 overflow-hidden"
                            initial={{ width: "0%" }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                          >
                            <motion.span
                              className="absolute inset-y-0 w-12 bg-linear-to-r from-transparent via-white/45 to-transparent"
                              initial={{ left: "-30%" }}
                              animate={{ left: ["-30%", "120%"] }}
                              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                            />
                          </motion.div>
                        </div>
                      </div>

                      <div className="px-4 sm:px-5 pb-5">
                        <div className="space-y-1">
                          {STAGES.map((_, i) => {
                            const meta = STAGE_META[i] ?? STAGE_META[0];
                            const active = i === stage;
                            const past = i < stage;
                            return (
                              <motion.div
                                key={meta.title}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.22 + i * 0.06, duration: 0.4 }}
                                className={`relative flex items-center gap-3 pl-3 pr-3.5 py-2.5 rounded-xl transition-colors duration-300 ${active
                                  ? "bg-amber-500/8 border border-amber-400/20"
                                  : past
                                    ? "border border-transparent"
                                    : "border border-transparent"
                                  }`}
                              >
                                {active ? (
                                  <span
                                    className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-linear-to-b from-amber-400 to-teal-300"
                                    aria-hidden
                                  />
                                ) : null}

                                <div
                                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${past
                                    ? "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/25"
                                    : active
                                      ? "bg-linear-to-br from-amber-400 to-amber-600 text-zinc-950 shadow-md shadow-amber-900/30"
                                      : "bg-white/4 text-zinc-600 ring-1 ring-white/8"
                                    }`}
                                >
                                  {past ? (
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    meta.icon
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`text-[13px] font-semibold leading-tight transition-colors duration-300 ${past
                                      ? "text-zinc-500"
                                      : active
                                        ? "text-white"
                                        : "text-zinc-500"
                                      }`}
                                  >
                                    {meta.title}
                                  </p>
                                  <p
                                    className={`text-[11px] mt-0.5 leading-snug truncate transition-colors duration-300 ${active ? "text-zinc-400" : "text-zinc-600"
                                      }`}
                                  >
                                    {meta.description}
                                  </p>
                                </div>

                                {active ? (
                                  <span className="shrink-0 inline-flex items-center gap-1.5 text-[10.5px] font-medium text-amber-300">
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Working
                                  </span>
                                ) : past ? (
                                  <span className="shrink-0 text-[10.5px] font-medium text-emerald-400/75">Done</span>
                                ) : (
                                  <span className="shrink-0 text-[10.5px] font-medium text-zinc-700 tabular-nums">
                                    0{i + 1}
                                  </span>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="relative px-6 py-3.5 border-t border-white/8 bg-black/40 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-500">
                          <span className="inline-flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 1.5M12 22a10 10 0 110-20 10 10 0 010 20z" />
                            </svg>
                            <span className="tabular-nums text-zinc-300">{formatElapsed(elapsedSec)}</span>
                            <span className="text-zinc-600 hidden sm:inline">elapsed</span>
                          </span>
                          <span className="h-3 w-px bg-white/10" aria-hidden />
                          <span className="hidden sm:inline">Usually 1-5 mins</span>
                        </div>
                        <button
                          onClick={() => {
                            stop();
                            setStatus("failed");
                            setError("Cancelled");
                            setJobId(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium text-zinc-400 hover:text-red-300 hover:bg-red-500/8 border border-transparent hover:border-red-500/20 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      </div>
                    </motion.div>

                    <p className="mt-4 text-center text-[11px] text-zinc-600">
                      You can leave this tab open. We will keep working in the background.
                    </p>
                  </div>
                );
              })()}
            </motion.main>
          )}

          {done && (
            <motion.main
              key="done"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative min-h-full w-full max-w-[min(1680px,96vw)] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-14 py-6 sm:py-8"
            >
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-xl bg-emerald-400/25 blur-md" aria-hidden />
                    <div className="relative w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
                      <svg className="w-5 h-5 text-emerald-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight leading-tight">
                        Your video is ready
                      </h1>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-emerald-500/12 text-emerald-300 border border-emerald-500/25">
                        MP4
                      </span>
                    </div>
                    <p className="text-[12.5px] text-zinc-400 mt-0.5">
                      Generated successfully. Download it, share it, or refine it on the dashboard.
                    </p>
                  </div>
                </div>

                <button
                  onClick={reset}
                  className="group relative inline-flex items-center justify-center gap-2 self-start sm:self-auto rounded-xl border border-white/12 bg-white/3 pl-3 pr-3.5 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-amber-500/8 hover:border-amber-400/35 transition-colors"
                >
                  <span className="relative flex items-center justify-center w-5 h-5 rounded-md bg-white/6 group-hover:bg-amber-400/20 transition-colors">
                    <svg className="w-3 h-3 text-zinc-300 group-hover:text-amber-200 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                  Create another
                </button>
              </motion.div>

              {completionMessage ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-[13px] text-amber-100/95 leading-relaxed"
                >
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{completionMessage}</span>
                </motion.div>
              ) : null}

              <div className="grid gap-5 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60 isolate"
                >
                  <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-amber-400/55 to-transparent z-10" />
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 z-10" aria-hidden />

                  <div className="relative w-full aspect-video bg-black z-1 contain-layout">
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        const d = e.currentTarget.duration;
                        if (Number.isFinite(d) && d > 0) {
                          setVideoDurationSec(Math.round(d));
                        }
                      }}
                      className="absolute inset-0 h-full w-full object-cover transform-gpu"
                    />
                    <div className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-2">
                      {videoDurationSec != null ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/70 text-zinc-100 border border-white/15 shadow-lg shadow-black/40 tabular-nums">
                          {formatElapsed(videoDurationSec)}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 shadow-lg shadow-black/40">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                        </span>
                        Ready
                      </span>
                    </div>
                  </div>

                  <div className="relative z-1 px-4 sm:px-5 py-3.5 border-t border-white/8 bg-black/70 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-amber-300/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18v14H3V5zM3 9h18M7 5v14M17 5v14" />
                      </svg>
                      <span className="text-zinc-300 font-medium">MP4 · 1080p</span>
                    </span>
                    {videoDurationSec != null ? (
                      <>
                        <span className="h-3 w-px bg-white/10" aria-hidden />
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-amber-300/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                          <span className="text-zinc-300 tabular-nums font-medium">
                            {formatElapsed(videoDurationSec)} runtime
                          </span>
                        </span>
                      </>
                    ) : null}
                    <span className="h-3 w-px bg-white/10" aria-hidden />
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-teal-300/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 8v4l2.5 1.5" />
                      </svg>
                      <span className="text-zinc-300 tabular-nums">{formatElapsed(elapsedSec)} render</span>
                    </span>
                    <span className="h-3 w-px bg-white/10 hidden sm:inline-block" aria-hidden />
                    <span className="hidden sm:inline-flex items-center gap-1.5 ml-auto">
                      <svg className="w-3.5 h-3.5 text-emerald-300/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-zinc-300">Saved to your library</span>
                    </span>
                  </div>
                </motion.div>

                <motion.aside
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  className="space-y-4"
                >
                  <div className="relative rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden">
                    <div className="pointer-events-none absolute -top-20 -right-16 h-40 w-40 rounded-full bg-amber-500/8 opacity-60" aria-hidden />
                    <div className="relative p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-3.5">
                        <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.16em] flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-400/15">
                            <svg className="w-2.5 h-2.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          Share &amp; Save
                        </h3>
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-medium text-zinc-500">
                          <span className="text-zinc-600">⌘</span>D
                        </kbd>
                      </div>

                      <div className="space-y-2">
                        <a
                          href={`/api/generate/${jobId}/download`}
                          className="group relative inline-flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-linear-to-br from-amber-300 via-amber-400 to-amber-500 text-zinc-950 text-sm font-semibold shadow-lg shadow-amber-900/30 hover:shadow-amber-700/40 hover:-translate-y-0.5 transition-all overflow-hidden"
                        >
                          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-linear-to-r from-transparent via-white/35 to-transparent" />
                          <svg className="relative w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span className="relative">Download MP4</span>
                          <span className="relative ml-auto inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider opacity-70">
                            1080p
                            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </span>
                        </a>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!videoUrl) return;
                              navigator.clipboard.writeText(window.location.origin + videoUrl);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className={`group inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-[12.5px] font-medium transition-all ${copied
                              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                              : "border-white/12 bg-white/3 text-zinc-300 hover:text-white hover:bg-white/6 hover:border-white/20"
                              }`}
                            aria-live="polite"
                          >
                            {copied ? (
                              <>
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Copied
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                </svg>
                                Copy link
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!videoUrl) return;
                              const shareUrl = window.location.origin + videoUrl;
                              if (shareSupported) {
                                try {
                                  await navigator.share({
                                    title: "My Cutline video",
                                    text: "Made with Cutline.",
                                    url: shareUrl,
                                  });
                                  return;
                                } catch {
                                }
                              }
                              navigator.clipboard.writeText(shareUrl);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="group inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-white/12 bg-white/3 text-zinc-300 hover:text-white hover:bg-white/6 hover:border-white/20 text-[12.5px] font-medium transition-all"
                            title={shareSupported ? "Share via system" : "Copy share link"}
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                            </svg>
                            Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={jobId ? `/dashboard/videos/${jobId}` : "/dashboard"}
                    className="group relative block rounded-2xl border border-white/10 bg-linear-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-4 sm:p-5 overflow-hidden hover:border-amber-400/30 transition-colors"
                  >
                    <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-teal-500/8 opacity-50" aria-hidden />
                    <div className="relative flex items-start gap-3">
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/12 border border-amber-400/25 flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-white leading-tight">
                          Refine with AI
                        </p>
                        <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">
                          Tweak the tone, pacing, or angle in your dashboard.
                        </p>
                      </div>
                      <svg
                        className="w-4 h-4 mt-1 text-zinc-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>

                  <div className={`grid gap-2 text-[12px] ${isEnterprisePlan(userPlan) ? "grid-cols-1" : "grid-cols-2"}`}>
                    <Link
                      href="/dashboard"
                      className="group inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/8 bg-white/3 text-zinc-400 hover:text-white hover:bg-white/6 hover:border-white/15 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                      </svg>
                      All my videos
                    </Link>
                    {!isEnterprisePlan(userPlan) ? (
                      <Link
                        href="/pricing"
                        className="group inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-amber-400/20 bg-amber-500/6 text-amber-200/90 hover:text-amber-100 hover:bg-amber-500/12 hover:border-amber-400/35 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.405 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.405 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
                        </svg>
                        Upgrade plan
                      </Link>
                    ) : null}
                  </div>
                </motion.aside>
              </div>
            </motion.main>
          )}

          {!busy && !done && (
            <motion.main key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative min-h-full flex flex-col items-center justify-center px-6 lg:px-10 py-6 sm:py-8">
              <div className="w-full max-w-[min(1660px,96vw)] mx-auto">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden">
                  <div className="grid md:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr] 2xl:grid-cols-[380px_1fr]">
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
                          {PLATFORM_OPTIONS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPlatform(p)}
                              className={`flex items-center justify-center gap-2 w-full min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${platform === p ? "border-blue-500/50 bg-blue-500/10 text-white" : "border-zinc-700/80 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/80 hover:text-zinc-300"}`}
                            >
                              <span className={platform === p ? "text-blue-200" : "text-zinc-500"}>{PLATFORM_ICONS[p]}</span>
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
                          <label className="block text-sm font-medium text-white mb-1.5">How should this video be made?</label>
                          <p className="text-xs text-zinc-500 mb-3">Pick one. We build exactly what you pick.</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(
                              [
                                {
                                  id: "slideshow" as const,
                                  title: "Slideshow",
                                  body: "Images + voiceover. Reliable for any topic.",
                                },
                                {
                                  id: "talking_cartoon" as const,
                                  title: "Talking (cartoon)",
                                  body: "Character speaks on camera. Works for most prompts.",
                                },
                                {
                                  id: "talking_real" as const,
                                  title: "Talking (realistic)",
                                  body: "Looks like a real speaker. The video provider may block some scripts; neutral wording helps.",
                                },
                              ] as const
                            ).map(({ id, title, body }) => {
                              const selected = videoKind === id;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => setVideoKind(id)}
                                  className={`p-4 rounded-xl border text-left transition-all h-full ${selected ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/20" : "border-zinc-800 hover:border-zinc-700"}`}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-amber-400" : "border-zinc-700"}`}>
                                      {selected && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                                    </div>
                                    <span className="text-sm font-medium text-white">{title}</span>
                                  </div>
                                  <p className="text-xs text-zinc-500 leading-relaxed">{body}</p>
                                </button>
                              );
                            })}
                          </div>
                          {mode === "talking_object" && objStyle === "real" && (
                            <div className="mt-5">
                              <div className="rounded-2xl border border-zinc-800/90 bg-linear-to-b from-zinc-900/45 to-zinc-950/90 p-4 sm:p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                                <div className="mb-4 sm:mb-5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                                    Realistic speaker
                                  </p>
                                  <h4 className="mt-1.5 text-base font-semibold text-white tracking-tight">
                                    Look and setting
                                  </h4>
                                  <p className="mt-1.5 text-[13px] leading-snug text-zinc-400 max-w-xl">
                                    Same realistic pipeline: pick a controlled studio frame or a moving, environment-driven take.
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setTalkingRealMode("studio")}
                                    className={`group relative rounded-xl border text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${talkingRealMode === "studio"
                                      ? "border-amber-500/40 bg-amber-500/6 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]"
                                      : "border-zinc-800/90 bg-zinc-950/30 hover:border-zinc-600/80 hover:bg-zinc-900/40"
                                      }`}
                                  >
                                    <div className="flex gap-3.5 p-4">
                                      <span
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${talkingRealMode === "studio"
                                          ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                                          : "border-zinc-700/80 bg-zinc-900/50 text-zinc-500 group-hover:text-zinc-400"
                                          }`}
                                        aria-hidden
                                      >
                                        <CircleUserRound className="h-5 w-5" strokeWidth={1.6} />
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="text-[15px] font-semibold text-white leading-tight">
                                            Studio framing
                                          </span>
                                          <span
                                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${talkingRealMode === "studio"
                                              ? "border-amber-400"
                                              : "border-zinc-600"
                                              }`}
                                            aria-hidden
                                          >
                                            {talkingRealMode === "studio" && (
                                              <span className="h-2 w-2 rounded-full bg-amber-400" />
                                            )}
                                          </span>
                                        </div>
                                        <p className="mt-2 text-xs leading-relaxed text-zinc-500 group-hover:text-zinc-400">
                                          Talking-head composition with a calm backdrop. Avatar presets and image uploads apply.
                                        </p>
                                      </div>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!canUseCinematicMode) return;
                                      setTalkingRealMode("scenario");
                                    }}
                                    disabled={!canUseCinematicMode}
                                    className={`group relative rounded-xl border text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${talkingRealMode === "scenario"
                                      ? "border-amber-500/40 bg-amber-500/6 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]"
                                      : !canUseCinematicMode
                                        ? "border-zinc-800/90 bg-zinc-950/20 opacity-55 cursor-not-allowed"
                                        : "border-zinc-800/90 bg-zinc-950/30 hover:border-zinc-600/80 hover:bg-zinc-900/40"
                                      }`}
                                  >
                                    <div className="flex gap-3.5 p-4">
                                      <span
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${talkingRealMode === "scenario"
                                          ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                                          : !canUseCinematicMode
                                            ? "border-zinc-700/80 bg-zinc-900/40 text-zinc-500"
                                            : "border-zinc-700/80 bg-zinc-900/50 text-zinc-500 group-hover:text-zinc-400"
                                          }`}
                                        aria-hidden
                                      >
                                        <Clapperboard className="h-5 w-5" strokeWidth={1.6} />
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="text-[15px] font-semibold text-white leading-tight">
                                            Cinematic scenes
                                          </span>
                                          {!canUseCinematicMode && (
                                            <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                                              Pro
                                            </span>
                                          )}
                                          <span
                                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${talkingRealMode === "scenario"
                                              ? "border-amber-400"
                                              : "border-zinc-600"
                                              }`}
                                            aria-hidden
                                          >
                                            {talkingRealMode === "scenario" && (
                                              <span className="h-2 w-2 rounded-full bg-amber-400" />
                                            )}
                                          </span>
                                        </div>
                                        <p className="mt-2 text-xs leading-relaxed text-zinc-500 group-hover:text-zinc-400">
                                          On-location motion and context tied to your topic, closer to a polished reel. Generation focuses on full scenes.
                                        </p>
                                        {!canUseCinematicMode && (
                                          <p className="mt-2 text-[11px] leading-relaxed text-amber-300/90">
                                            Available on Professional and Enterprise plans.
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                </div>

                                {talkingRealMode === "scenario" && (
                                  <div className="mt-4 flex gap-3 rounded-xl border border-zinc-700/60 bg-zinc-950/50 px-3.5 py-3 sm:px-4">
                                    <Info
                                      className="h-4 w-4 shrink-0 text-zinc-500 mt-0.5"
                                      strokeWidth={2}
                                      aria-hidden
                                    />
                                    <p className="text-[12px] leading-relaxed text-zinc-400">
                                      <span className="text-zinc-300 font-medium">Note.</span>{" "}
                                      This mode uses full-scene video generation. Custom avatar presets and uploads are not applied; look and setting follow your prompt and topic.
                                    </p>
                                  </div>
                                )}
                              </div>

                              {talkingRealMode === "studio" ? (
                                <>
                                  <p className="text-xs font-medium text-gray-500 mb-2 mt-5">Avatar</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {(["default", "preset", "upload"] as const).map((m) => {
                                      const isPro = PRO_AVATAR_MODES.includes(m);
                                      const locked = isPro && !canUseProAvatar(userPlan);
                                      return (
                                        <button
                                          key={m}
                                          type="button"
                                          onClick={() => setAvatarMode(m)}
                                          className={`relative px-3 py-2 rounded-lg border text-sm transition-all ${avatarMode === m
                                            ? "border-blue-500/50 bg-blue-500/10 text-blue-200"
                                            : "border-zinc-700 text-gray-500 hover:border-zinc-600 hover:text-gray-400"
                                            }`}
                                        >
                                          {locked && (
                                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-px text-[9px] font-semibold tracking-wide text-amber-400 bg-zinc-900 border border-amber-500/30 rounded-full leading-none">
                                              ✦ Pro
                                            </span>
                                          )}
                                          {m === "default" ? "Default" : m === "preset" ? "Preset" : "Upload"}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {avatarMode === "preset" && (
                                    canUseProAvatar(userPlan) ? (
                                      <motion.div
                                        layout
                                        initial={{ opacity: 0.85, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="mt-4 rounded-2xl border border-zinc-700/90 bg-linear-to-b from-zinc-900/80 to-black/40 p-2.5 sm:p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                                      >
                                        <div className="grid grid-cols-2 gap-2.5">
                                          {AVATAR_PRESETS.map((preset) => (
                                            <button
                                              key={preset.id}
                                              type="button"
                                              onClick={() => setAvatarPresetId(preset.id)}
                                              className={`group relative aspect-square w-full rounded-lg border-2 overflow-hidden text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${avatarPresetId === preset.id
                                                ? "border-amber-400 ring-2 ring-amber-500/35 shadow-lg shadow-amber-950/40"
                                                : "border-zinc-700 hover:border-zinc-500"
                                                }`}
                                            >
                                              <img
                                                src={preset.imageSrc}
                                                alt={preset.label}
                                                className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                                                loading="lazy"
                                                onError={(e) => {
                                                  const img = e.currentTarget;
                                                  img.onerror = null;
                                                  img.src = "/avatars/presets/fallback.svg";
                                                }}
                                              />
                                              <div
                                                className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent"
                                                aria-hidden
                                              />
                                              <div className="absolute bottom-0 left-0 right-0 p-2">
                                                <p className="text-xs font-semibold text-white drop-shadow-md leading-tight">
                                                  {preset.label}
                                                </p>
                                                <p className="text-[10px] text-zinc-200/80 mt-0.5 drop-shadow leading-tight">
                                                  {preset.hint}
                                                </p>
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      </motion.div>
                                    ) : (
                                      <ProAvatarGate />
                                    )
                                  )}

                                  {avatarMode === "upload" && (
                                    canUseProAvatar(userPlan) ? (
                                      <div className="mt-3">
                                        <input
                                          ref={avatarFileRef}
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => avatarFileRef.current?.click()}
                                          className="w-full rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
                                        >
                                          {avatarFile ? "Change avatar image" : "Upload avatar image"}
                                        </button>
                                        {avatarFileUrl ? (
                                          <div className="mt-2 flex items-center gap-3">
                                            <img src={avatarFileUrl} alt="Avatar preview" className="w-12 h-12 rounded-lg object-cover border border-zinc-700" />
                                            <div className="min-w-0">
                                              <p className="text-xs text-zinc-400 truncate">{avatarFile?.name}</p>
                                              <button
                                                type="button"
                                                onClick={() => setAvatarFile(null)}
                                                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-[11px] text-zinc-600 mt-2">Use a clear face photo for best results.</p>
                                        )}
                                      </div>
                                    ) : (
                                      <ProAvatarGate />
                                    )
                                  )}
                                </>
                              ) : null}
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
                          disabled={!prompt.trim() || prompt.trim().length < 5 || submitting || !canGenerateByPlan}
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
                        {!canGenerateByPlan && (
                          <div className="basis-full text-right">
                            <p className="text-xs text-amber-300">
                              {planLimitMessage ?? "Plan limit reached."}
                              {!isEnterprisePlan(userPlan) ? (
                                <>
                                  {" "}
                                  <Link href="/pricing" className="underline hover:text-amber-200">
                                    Upgrade plan
                                  </Link>
                                </>
                              ) : null}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {error && (() => {
                  const presentation = getErrorPresentation(error, errorCode);
                  const isQuota = presentation.tone === "quota";
                  const isProvider = presentation.tone === "provider";
                  const tone = isQuota
                    ? {
                      wrap: "bg-amber-500/8 border-amber-500/30",
                      iconWrap: "bg-amber-500/15 ring-1 ring-amber-500/30",
                      iconFg: "text-amber-300",
                      title: "text-amber-100",
                      body: "text-amber-200/80",
                      retryBtn: "border-amber-500/30 text-amber-100 hover:bg-amber-500/10",
                      dismissBtn: "text-amber-300/60 hover:text-amber-200 hover:bg-amber-500/10",
                    }
                    : isProvider
                      ? {
                        wrap: "bg-orange-500/8 border-orange-500/30",
                        iconWrap: "bg-orange-500/15 ring-1 ring-orange-500/30",
                        iconFg: "text-orange-300",
                        title: "text-orange-100",
                        body: "text-orange-200/80",
                        retryBtn: "border-orange-500/30 text-orange-100 hover:bg-orange-500/10",
                        dismissBtn: "text-orange-300/60 hover:text-orange-200 hover:bg-orange-500/10",
                      }
                      : {
                        wrap: "bg-red-500/8 border-red-500/30",
                        iconWrap: "bg-red-500/15 ring-1 ring-red-500/30",
                        iconFg: "text-red-300",
                        title: "text-red-100",
                        body: "text-red-200/80",
                        retryBtn: "border-red-500/30 text-red-100 hover:bg-red-500/10",
                        dismissBtn: "text-red-300/60 hover:text-red-200 hover:bg-red-500/10",
                      };
                  const Icon = isQuota ? (
                    <svg className={`w-5 h-5 ${tone.iconFg}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  ) : presentation.tone === "timeout" ? (
                    <svg className={`w-5 h-5 ${tone.iconFg}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 1.5M12 22a10 10 0 110-20 10 10 0 010 20z" />
                    </svg>
                  ) : presentation.tone === "network" ? (
                    <svg className={`w-5 h-5 ${tone.iconFg}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 20.25h.008v.008H12v-.008z" />
                    </svg>
                  ) : (
                    <svg className={`w-5 h-5 ${tone.iconFg}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  );
                  return (
                    <motion.div
                      role="alert"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 flex items-start gap-3.5 px-5 py-4 rounded-2xl border ${tone.wrap}`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${tone.iconWrap}`}>
                        {Icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${tone.title}`}>{presentation.title}</p>
                        <p className={`mt-0.5 text-[13px] leading-relaxed ${tone.body}`}>{presentation.message}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {presentation.canUpgrade && !isEnterprisePlan(userPlan) && (
                            <Link
                              href="/pricing"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors"
                            >
                              Upgrade plan
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                              </svg>
                            </Link>
                          )}
                          {presentation.canRetry && !busy && (
                            <button
                              type="button"
                              onClick={() => {
                                setError(null);
                                setErrorCode(null);
                                void submit();
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-transparent transition-colors ${tone.retryBtn}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992V4.356M2.985 19.644v-4.992h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.183" />
                              </svg>
                              Try again
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setError(null); setErrorCode(null); }}
                        aria-label="Dismiss error"
                        className={`shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg transition-colors ${tone.dismissBtn}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  );
                })()}
              </div>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
