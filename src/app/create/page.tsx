"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CircleUserRound, Clapperboard, Info } from "lucide-react";
import { getUserFriendlyErrorMessage, getErrorPresentation } from "@/lib/utils/error";
import { STAGES } from "@/constants/landing";
import { DURATION_MIN, DURATION_MAX } from "@/lib/validation/duration";
import { SUBMIT_TIMEOUT_MS } from "@/components/generate/constants";
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/validation/aspectRatio";
import type { AvatarPresetId } from "@/lib/types/avatar";
import { isEnterprisePlan, isProPlan, type PlanId } from "@/lib/plans";
import { ProBadge } from "@/components/ui/pro-badge";
import { useRouter } from "next/navigation";
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
  return isProPlan(plan);
}
function canUseCinematicScenes(plan: PlanId): boolean {
  return isProPlan(plan);
}

const POLL_MS = 2500;

type StageMeta = {
  title: string;
  description: string;
  icon: React.ReactElement;
};

const STAGE_GROUP_MAP: Record<string, number> = {
  intent: 0,
  narrative: 0,
  shots: 1,
  script: 1,
  asset_analysis: 2,
  visuals: 2,
  image_sourcing: 2,
  motion: 2,
  tts: 3,
  subtitles: 3,
  subtitle_refine: 3,
  veo: 4,
  heygen: 4,
  concat: 4,
  burn_subtitles: 4,
  render: 4,
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

const PLATFORM_DEFAULT_ASPECT: Record<Platform, AspectRatio> = {
  general: "16:9",
  linkedin: "16:9",
  twitter: "16:9",
  youtube_shorts: "9:16",
};

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  general: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" /></svg>,
  youtube_shorts: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" /></svg>,
  twitter: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
  linkedin: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
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
  const [pipelineStage, setPipelineStage] = useState<string | null>(null);
  const [stageDetail, setStageDetail] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    setShareSupported(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const initialPrompt = params.get("prompt");
    if (initialPrompt) setPrompt(initialPrompt);
  }, []);
  const [suggesting, setSuggesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userPlan, setUserPlan] = useState<PlanId>("free");
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [canGenerateByPlan, setCanGenerateByPlan] = useState(true);
  const [planLimitMessage, setPlanLimitMessage] = useState<string | null>(null);
  const canUseCinematicMode = canUseCinematicScenes(userPlan);
  const isPro = isProPlan(userPlan);
  const isSlideshow = mode === "slideshow";
  const router = useRouter();

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
    if (isPro) return;
    setAvatarMode((prev) => (PRO_AVATAR_MODES.includes(prev) ? "default" : prev));
    setImgs((prev) => (prev.length ? [] : prev));
  }, [isPro]);

  useEffect(() => {
    if (mode !== "slideshow") {
      setImgs((prev) => (prev.length ? [] : prev));
    }
  }, [mode]);

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
      setPipelineStage(typeof d.stage === "string" && d.stage.trim() ? d.stage.trim() : null);
      setStageDetail(typeof d.stageDetail === "string" && d.stageDetail.trim() ? d.stageDetail.trim() : null);
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
    if (!jobId) return;
    if (status !== "pending" && status !== "processing") return;
    if (!pipelineStage) {
      setStage(0);
      return;
    }
    const idx = STAGE_GROUP_MAP[pipelineStage];
    if (typeof idx === "number") setStage(idx);
  }, [jobId, status, pipelineStage]);

  useEffect(() => {
    if (jobId && (status === "pending" || status === "processing")) {
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
    if (imgs.length && !isPro) {
      setError("Uploading your own images is available on Pro and Enterprise plans. Upgrade to use them.");
      return;
    }
    setError(null); setErrorCode(null); setVideoUrl(null); setStatus(null); setJobId(null); setCompletionMessage(null); setSubmitting(true);
    try {
      let assetIds: string[] = [];
      let avatarUploadAssetId: string | undefined;
      if (imgs.length && isSlideshow) {
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
    <div className="min-h-dvh flex flex-col bg-black text-white font-sans relative">
      <WarpShaderHero />

      <nav className="relative z-20 shrink-0 flex items-center justify-between px-6 lg:px-10 py-3.5">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="group inline-flex items-center gap-2 px-2.5 py-1.5 -mx-2.5 rounded-lg text-[12.5px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <svg
            className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to dashboard</span>
        </Link>
        {(busy || done) && (
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 shrink-0 py-0.5 rounded-xl px-1 -mx-1 transition-colors hover:bg-white/3"
          >
            <CreateBrandMark className="transition-transform duration-300 group-hover:-rotate-3" />
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-white">CUTLINE</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500 group-hover:text-zinc-300 transition-colors hidden sm:inline">Studio</span>
            </span>
          </Link>
        )}
      </nav>

      <div className="relative z-10 flex-1">
        <AnimatePresence mode="wait">
          {busy && (
            <motion.main
              key="busy"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative min-h-[calc(100dvh-64px)] flex items-center justify-center px-6 py-6"
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
                            <div className="relative inline-flex items-center gap-2.5 rounded-xl bg-black/55 border border-white/12 pl-1.5 pr-3.5 py-1.5 backdrop-blur-md shadow-lg shadow-black/40">
                              <span
                                className="relative inline-flex h-6 w-6 items-center justify-center rounded-[7px] overflow-hidden ring-1 ring-white/12 bg-[#0a0a0a]"
                                aria-hidden
                              >
                                <Image
                                  src="/cutline-logo.png"
                                  alt=""
                                  width={1280}
                                  height={720}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  style={{ objectPosition: "78% 50%" }}
                                />
                              </span>
                              <span className="text-[12px] font-semibold tracking-[0.04em] text-white leading-none">
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
                                    {active && stageDetail ? stageDetail : meta.description}
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
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium leading-none text-zinc-400 hover:text-red-300 hover:bg-red-500/8 border border-transparent hover:border-red-500/20 transition-colors"
                        >
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="leading-none">Cancel</span>
                        </button>
                      </div>
                    </motion.div>

                    <p className="mt-4 text-center text-[11.5px] text-zinc-300/85">
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
              className="relative min-h-[calc(100dvh-64px)] w-full max-w-[980px] mx-auto px-4 sm:px-6 py-10 sm:py-14"
            >
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="mb-7 flex items-center gap-3 font-mono text-[10.5px] tracking-[0.32em] uppercase text-zinc-500"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="relative inline-flex w-1.5 h-1.5" aria-hidden>
                    <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-emerald-300/90 font-semibold">Ready</span>
                </span>
                <span className="text-white/15">/</span>
                <span className="text-zinc-400">MP4</span>
                <span className="text-white/15">·</span>
                <span className="text-zinc-400">1080P</span>
                {videoDurationSec != null && (
                  <>
                    <span className="text-white/15">·</span>
                    <span className="text-zinc-400 tabular-nums">{formatElapsed(videoDurationSec)}</span>
                  </>
                )}
                <span className="text-white/15">·</span>
                <span className="text-zinc-400">{aspectRatio.replace(":", "·")}</span>
                <span className="h-px flex-1 bg-white/[0.06] mx-1" aria-hidden />
                <span className="text-zinc-600 tabular-nums hidden sm:inline">
                  Render {formatElapsed(elapsedSec)}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.12, ease: [0.2, 0.7, 0.2, 1] }}
                className="font-black uppercase leading-[0.86] tracking-[-0.04em] text-[clamp(2.4rem,7vw,5.5rem)] text-transparent bg-clip-text mb-3"
                style={{
                  fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif",
                  fontWeight: 900,
                  backgroundImage: "linear-gradient(180deg, #ffffff 0%, #e9e9ea 55%, #b9b9bd 100%)",
                }}
              >
                Your video is ready.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.28, duration: 0.6 }}
                className="text-[14px] text-zinc-400 leading-relaxed mb-8 max-w-[60ch]"
              >
                Generated successfully and saved to your library. Download the MP4, share it with anyone, or refine the angle in your dashboard.
              </motion.p>

              {completionMessage ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mb-7 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] backdrop-blur-md px-4 py-3 text-[12.5px] text-amber-100/90 leading-relaxed"
                >
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-300/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{completionMessage}</span>
                </motion.div>
              ) : null}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
                className="relative mb-6"
              >
                <span aria-hidden className="pointer-events-none absolute -top-2 -left-2 w-3.5 h-px bg-white/40 z-20" />
                <span aria-hidden className="pointer-events-none absolute -top-2 -left-2 h-3.5 w-px bg-white/40 z-20" />
                <span aria-hidden className="pointer-events-none absolute -top-2 -right-2 w-3.5 h-px bg-white/40 z-20" />
                <span aria-hidden className="pointer-events-none absolute -top-2 -right-2 h-3.5 w-px bg-white/40 z-20" />
                <span aria-hidden className="pointer-events-none absolute -bottom-2 -left-2 w-3.5 h-px bg-white/40 z-20" />
                <span aria-hidden className="pointer-events-none absolute -bottom-2 -left-2 h-3.5 w-px bg-white/40 z-20" />
                <span aria-hidden className="pointer-events-none absolute -bottom-2 -right-2 w-3.5 h-px bg-white/40 z-20" />
                <span aria-hidden className="pointer-events-none absolute -bottom-2 -right-2 h-3.5 w-px bg-white/40 z-20" />

                <div
                  className="relative rounded-2xl overflow-hidden border border-white/[0.10] bg-zinc-950/85 backdrop-blur-md shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)] isolate"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.04] z-10" aria-hidden />

                  <div
                    className="relative bg-black z-1 contain-layout mx-auto w-full"
                    style={{
                      aspectRatio: aspectRatio.replace(":", " / "),
                      maxHeight: "78vh",
                      width: "auto",
                      maxWidth: "100%",
                    }}
                  >
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
                      className="absolute inset-0 h-full w-full object-contain transform-gpu"
                    />
                  </div>

                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="flex flex-col sm:flex-row gap-2 mb-10"
              >
                <a
                  href={`/api/generate/${jobId}/download`}
                  className="group relative flex-1 inline-flex items-center justify-center gap-3 px-5 py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-[14px] font-semibold tracking-[-0.005em] shadow-[0_14px_32px_-10px_rgba(251,191,36,0.55)] hover:shadow-[0_18px_38px_-10px_rgba(251,191,36,0.7)] transition-all overflow-hidden"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-linear-to-r from-transparent via-white/40 to-transparent" aria-hidden />
                  <svg className="relative w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="relative">Download MP4</span>
                  <span className="relative inline-flex items-center font-mono text-[10px] font-bold tracking-[0.16em] uppercase opacity-65">
                    1080p
                  </span>
                  <svg className="relative w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (!videoUrl) return;
                    navigator.clipboard.writeText(window.location.origin + videoUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`group inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl border text-[13px] font-medium transition-colors ${
                    copied
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                      : "border-white/[0.10] bg-white/[0.02] backdrop-blur-md text-zinc-300 hover:text-white hover:bg-white/[0.05] hover:border-white/[0.22]"
                  }`}
                  aria-live="polite"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
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
                  className="group inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl border border-white/[0.10] bg-white/[0.02] backdrop-blur-md text-zinc-300 hover:text-white hover:bg-white/[0.05] hover:border-white/[0.22] text-[13px] font-medium transition-colors"
                  title={shareSupported ? "Share via system" : "Copy share link"}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                  </svg>
                  Share
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.68 }}
                className="mb-4"
              >
                <div className="flex items-center gap-3 mb-3 font-mono text-[9.5px] font-semibold tracking-[0.32em] uppercase text-zinc-500">
                  <span>Iterate</span>
                  <span className="h-px flex-1 bg-white/[0.06]" aria-hidden />
                </div>
                <Link
                  href={jobId ? `/dashboard/videos/${jobId}` : "/dashboard"}
                  className="group relative block rounded-2xl border border-white/[0.08] bg-zinc-950/60 backdrop-blur-md hover:bg-zinc-950/80 hover:border-white/[0.18] transition-colors overflow-hidden"
                >
                  <div className="relative flex items-center gap-4 p-5">
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-amber-500/12 border border-amber-400/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-semibold text-white leading-tight tracking-[-0.005em]">
                        Refine with AI
                      </p>
                      <p className="text-[12.5px] text-zinc-400 mt-1 leading-relaxed">
                        Tweak the tone, pacing, or angle in your dashboard. Same prompt, different cut.
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-zinc-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0"
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
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.82 }}
                className="flex flex-col sm:flex-row sm:items-center gap-2.5 mt-6 pt-6 border-t border-white/[0.06]"
              >
                <button
                  onClick={reset}
                  className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-[13px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.22] backdrop-blur-md transition-colors"
                >
                  <svg className="w-3.5 h-3.5 transition-transform duration-500 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create another
                </button>
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] hover:border-white/[0.16] backdrop-blur-md transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                  </svg>
                  All my videos
                </Link>
                {!isEnterprisePlan(userPlan) ? (
                  <Link
                    href="/pricing"
                    className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] text-[13px] font-medium text-amber-200/90 hover:text-amber-100 hover:bg-amber-500/[0.12] hover:border-amber-400/40 backdrop-blur-md transition-colors sm:ml-auto"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.405 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.405 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
                    </svg>
                    Upgrade plan
                  </Link>
                ) : null}
              </motion.div>
            </motion.main>
          )}

          {!busy && !done && (
            <motion.main
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative min-h-[calc(100dvh-64px)] px-4 sm:px-6 py-5 sm:py-7"
            >
              <div className="w-full max-w-[1240px] mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="relative rounded-[16px] overflow-hidden"
                  style={{
                    background: "#111111",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 24px 60px -20px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  <span
                    className="pointer-events-none absolute top-0 left-0 right-0 h-px z-[1]"
                    aria-hidden
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)" }}
                  />

                  <div
                    className="px-7 pt-7 pb-5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <h1 className="text-[19px] font-semibold tracking-[-0.015em] text-[#ededed] m-0 mb-1">Create a video</h1>
                    <p className="text-[13px] text-zinc-500 m-0 leading-[1.5]">Fill out the details below and we&rsquo;ll handle the rest - script, voice, visuals, edit.</p>
                  </div>

                  <div className="px-7 py-7 flex flex-col gap-8">

                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-[13px] font-medium text-[#ededed] m-0 mb-1 tracking-[-0.005em]">Describe your video</h2>
                          <p className="text-[12px] text-zinc-500 m-0 leading-[1.5]">Be specific about topic, tone, style, and audience.</p>
                        </div>
                        <button
                          type="button"
                          onClick={suggest}
                          disabled={suggesting || prompt.trim().split(/\s+/).filter(Boolean).length <= 10}
                          className="shrink-0 inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[7px] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 hover:text-white hover:-translate-y-px"
                          style={{
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.09)",
                          }}
                          onMouseEnter={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = "#1c1c1c"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
                        >
                          {suggesting ? (
                            <>
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Suggesting
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              Suggest prompt
                            </>
                          )}
                        </button>
                      </div>
                      <div
                        className="relative rounded-[10px] px-4 pt-3.5 pb-3 transition-all duration-300 ease-out focus-within:[border-color:rgba(16,185,129,0.35)] focus-within:bg-[#141816] focus-within:[box-shadow:0_0_0_4px_rgba(16,185,129,0.08),0_12px_36px_-12px_rgba(16,185,129,0.18)]"
                        style={{
                          background: "#161616",
                          border: "1px solid rgba(255,255,255,0.09)",
                        }}
                      >
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                          placeholder="e.g. Create a 30-second explainer about how solar panels work, professional tone with upbeat background music"
                          rows={3}
                          className="block w-full bg-transparent border-0 outline-none resize-none text-[13.5px] leading-[1.55] tracking-[-0.005em] text-[#ededed] placeholder:text-zinc-600 p-0 min-h-[76px]"
                          style={{ fontFamily: "inherit" }}
                        />
                        <div className="flex items-center justify-between gap-2 pt-3 mt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
                            {PROMPT_CHIPS.map(({ label, prompt: p }) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => setPrompt(p)}
                                className="px-2.5 py-[3px] rounded-full text-[11.5px] tracking-[-0.003em] transition-all text-zinc-300 hover:text-white hover:-translate-y-px"
                                style={{
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid rgba(255,255,255,0.09)",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#232323"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-500">{prompt.length} / 500</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-[13px] font-medium text-[#ededed] m-0 mb-1 tracking-[-0.005em] flex items-center gap-2">
                            Your images
                            {!isSlideshow ? (
                              <span className="text-[11px] font-normal text-zinc-500 px-1.5 py-px rounded-full" style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.06)" }}>Slideshow only</span>
                            ) : isPro ? (
                              <span className="text-[11px] font-normal text-zinc-500 px-1.5 py-px rounded-full" style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.06)" }}>Optional</span>
                            ) : (
                              <ProBadge plan={userPlan} withLock />
                            )}
                          </h2>
                          <p className="text-[12px] text-zinc-500 m-0 leading-[1.5]">
                            {!isSlideshow
                              ? "Image uploads apply to Slideshow mode only. Switch the video mode below to Slideshow to add your own visuals."
                              : isPro
                                ? "No images? We'll find visuals from the web. Add your own to use them first."
                                : "We'll source visuals from the web. Upload your own images on Pro and above."}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-500">{imgs.length} / 5</span>
                      </div>
                      <div
                        className={`flex gap-1.5 flex-wrap transition-opacity ${!isSlideshow ? "opacity-40 pointer-events-none select-none" : ""}`}
                        aria-disabled={!isSlideshow}
                      >
                        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFile} />
                        <button
                          type="button"
                          onClick={() => {
                            if (!isPro) { router.push("/pricing"); return; }
                            fileRef.current?.click();
                          }}
                          aria-label={isPro ? "Add images" : "Upgrade to upload your own images"}
                          className={`w-16 h-16 rounded-[9px] cursor-pointer flex flex-col items-center justify-center gap-[3px] text-[10px] transition-all ${isPro ? "text-zinc-500 hover:text-white hover:-translate-y-px" : "text-amber-300/90 hover:text-amber-200"}`}
                          style={{
                            background: "#161616",
                            border: isPro ? "1px dashed rgba(255,255,255,0.14)" : "1px dashed rgba(251,191,36,0.32)",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#1c1c1c"; e.currentTarget.style.borderColor = isPro ? "rgba(255,255,255,0.22)" : "rgba(251,191,36,0.5)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#161616"; e.currentTarget.style.borderColor = isPro ? "rgba(255,255,255,0.14)" : "rgba(251,191,36,0.32)"; }}
                        >
                          {isPro ? (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              Add
                            </>
                          ) : (
                            <>
                              <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5v-6a1.5 1.5 0 011.5-1.5z" />
                              </svg>
                              Pro
                            </>
                          )}
                        </button>
                        {imgUrls.map((u, i) => (
                          <div key={u} className="relative w-16 h-16 rounded-[9px] overflow-hidden bg-zinc-900 ring-1 ring-white/10">
                            <img src={u} alt="" className="w-full h-full object-cover" />
                            <button onClick={(e) => { e.stopPropagation(); rmImg(i); }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-rose-500 transition-colors">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                        {Array.from({ length: Math.max(0, 5 - imgUrls.length) }).map((_, i) => (
                          <div
                            key={`slot-${i}`}
                            className="w-16 h-16 rounded-[9px] opacity-[0.35]"
                            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}
                            aria-hidden
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
                      <div className="flex flex-col gap-2.5">
                        <div>
                          <h2 className="text-[13px] font-medium text-[#ededed] m-0 mb-1 tracking-[-0.005em]">Platform</h2>
                          <p className="text-[12px] text-zinc-500 m-0 leading-[1.5]">Where this video will live.</p>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {PLATFORM_OPTIONS.map((p) => {
                            const selected = platform === p;
                            const label = p === "general" ? "General" : p === "youtube_shorts" ? "Shorts" : p === "twitter" ? "X" : "LinkedIn";
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => {
                                  setPlatform(p);
                                  setAspectRatio(PLATFORM_DEFAULT_ASPECT[p]);
                                }}
                                className="flex flex-col items-center justify-center gap-2 px-2 pt-3 pb-2.5 rounded-[8px] text-[12.5px] tracking-[-0.003em] transition-all"
                                style={
                                  selected
                                    ? {
                                        background: "#232323",
                                        border: "1px solid rgba(255,255,255,0.22)",
                                        color: "#ededed",
                                        fontWeight: 500,
                                        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
                                      }
                                    : {
                                        background: "#161616",
                                        border: "1px solid rgba(255,255,255,0.09)",
                                        color: "rgba(255,255,255,0.72)",
                                      }
                                }
                              >
                                <span style={{ color: selected ? "#ededed" : "rgba(255,255,255,0.48)" }}>{PLATFORM_ICONS[p]}</span>
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        <div>
                          <h2 className="text-[13px] font-medium text-[#ededed] m-0 mb-1 tracking-[-0.005em]">Aspect ratio</h2>
                          <p className="text-[12px] text-zinc-500 m-0 leading-[1.5]">Frame size for the output.</p>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {ASPECT_RATIOS.map((r) => {
                            const selected = aspectRatio === r;
                            const [w, h] = r.split(":").map(Number);
                            const maxBox = 22;
                            const scale = Math.min(maxBox / w, maxBox / h);
                            const boxW = Math.max(8, Math.round(w * scale));
                            const boxH = Math.max(8, Math.round(h * scale));
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setAspectRatio(r)}
                                className="flex flex-col items-center justify-center gap-2 px-1 pt-3 pb-2.5 rounded-[8px] font-mono text-[11px] tabular-nums transition-all"
                                style={
                                  selected
                                    ? {
                                        background: "#232323",
                                        border: "1px solid rgba(255,255,255,0.22)",
                                        color: "#ededed",
                                        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
                                      }
                                    : {
                                        background: "#161616",
                                        border: "1px solid rgba(255,255,255,0.09)",
                                        color: "rgba(255,255,255,0.72)",
                                      }
                                }
                              >
                                <span
                                  className="block rounded-[1.5px]"
                                  style={{
                                    width: boxW,
                                    height: boxH,
                                    border: "1px solid currentColor",
                                    opacity: selected ? 1 : 0.55,
                                  }}
                                  aria-hidden
                                />
                                <span>{r}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <div>
                        <h2 className="text-[13px] font-medium text-[#ededed] m-0 mb-1 tracking-[-0.005em]">Video length</h2>
                        <p className="text-[12px] text-zinc-500 m-0 leading-[1.5]">{DURATION_MIN}-{DURATION_MAX} seconds. Talking videos over 8s use multiple clips.</p>
                      </div>
                      <div
                        className="rounded-[10px] px-[18px] py-4 flex items-center gap-[18px]"
                        style={{
                          background: "#161616",
                          border: "1px solid rgba(255,255,255,0.09)",
                        }}
                      >
                        <div className="flex items-baseline gap-1.5 min-w-[88px]">
                          <span className="font-medium tabular-nums leading-none text-[#ededed]" style={{ fontSize: "26px", letterSpacing: "-1.2px" }}>
                            {dur}
                          </span>
                          <span className="text-[12px] text-zinc-500">sec</span>
                        </div>
                        <div className="relative flex-1">
                          <input
                            type="range"
                            min={DURATION_MIN}
                            max={DURATION_MAX}
                            value={dur}
                            onChange={(e) => setDur(Number(e.target.value))}
                            className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer z-10"
                            aria-label="Video length"
                          />
                          <div className="relative h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div
                              className="absolute left-0 top-0 h-full rounded-full"
                              style={{
                                width: `${((dur - DURATION_MIN) / (DURATION_MAX - DURATION_MIN)) * 100}%`,
                                background: "linear-gradient(90deg, rgba(255,255,255,0.85), #ededed)",
                              }}
                            />
                            <div
                              className="absolute top-1/2 w-[14px] h-[14px] rounded-full bg-white"
                              style={{
                                left: `${((dur - DURATION_MIN) / (DURATION_MAX - DURATION_MIN)) * 100}%`,
                                transform: "translate(-50%, -50%)",
                                border: "1px solid rgba(0,0,0,0.3)",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <div>
                        <h2 className="text-[13px] font-medium text-[#ededed] m-0 mb-1 tracking-[-0.005em]">How should this video be made?</h2>
                        <p className="text-[12px] text-zinc-500 m-0 leading-[1.5]">Pick one. We build exactly what you pick.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(
                          [
                            { id: "slideshow" as const, title: "Slideshow", body: "Images + voiceover. Reliable for any topic." },
                            { id: "talking_cartoon" as const, title: "Talking - cartoon", body: "Character speaks on camera. Works for most prompts." },
                            { id: "talking_real" as const, title: "Talking - realistic", body: "Real-looking speaker. Use neutral wording for best results." },
                          ] as const
                        ).map(({ id, title, body }) => {
                          const selected = videoKind === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setVideoKind(id)}
                              className="rounded-[10px] cursor-pointer text-left transition-all hover:-translate-y-px px-[15px] py-3.5 flex flex-col gap-1.5"
                              style={
                                selected
                                  ? {
                                      background: "#1c1c1c",
                                      border: "1px solid rgba(255,255,255,0.22)",
                                      boxShadow: "0 0 0 1px rgba(255,255,255,0.09), 0 1px 0 rgba(255,255,255,0.04) inset",
                                    }
                                  : {
                                      background: "#161616",
                                      border: "1px solid rgba(255,255,255,0.09)",
                                    }
                              }
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[13px] font-medium tracking-[-0.005em] text-[#ededed]">{title}</span>
                                <span
                                  className="relative inline-flex items-center justify-center w-[14px] h-[14px] rounded-full transition-all shrink-0"
                                  style={
                                    selected
                                      ? { border: "1.5px solid #ededed", background: "#ededed" }
                                      : { border: "1.5px solid rgba(255,255,255,0.3)" }
                                  }
                                  aria-hidden
                                >
                                  {selected && <span className="absolute w-[5px] h-[5px] rounded-full" style={{ background: "#111111" }} />}
                                </span>
                              </div>
                              <p className="text-[11.5px] m-0 leading-[1.45] text-zinc-500">{body}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {videoKind === "talking_real" && (
                      <div
                        className="relative rounded-[10px] px-5 py-[18px] flex flex-col gap-4 overflow-hidden"
                        style={{
                          background: "linear-gradient(180deg, rgba(255,255,255,0.012), transparent 40%), #161616",
                          border: "1px solid rgba(255,255,255,0.09)",
                        }}
                      >
                        <span
                          className="pointer-events-none absolute top-0 left-[20%] right-[20%] h-px"
                          aria-hidden
                          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }}
                        />
                        <div className="flex items-center gap-3 pb-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <div
                            className="shrink-0 w-8 h-8 rounded-[8px] flex items-center justify-center text-zinc-300"
                            style={{
                              background: "#232323",
                              border: "1px solid rgba(255,255,255,0.09)",
                              boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
                            }}
                          >
                            <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h10l2 3h2v12H3V7z M12 17a4 4 0 100-8 4 4 0 000 8z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] tracking-[0.14em] uppercase text-zinc-500 mb-[3px] font-medium">Realistic speaker</div>
                            <div className="text-[13px] font-medium text-[#ededed] tracking-[-0.005em] mb-0.5">Look &amp; setting</div>
                            <div className="text-[11.5px] text-zinc-500 leading-[1.45]">Pick a controlled studio frame, or a moving environment-driven take.</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(
                            [
                              { id: "studio" as const, title: "Studio framing", body: "Talking-head with calm backdrop. Avatars apply." },
                              { id: "scenario" as const, title: "Cinematic scenes", body: "On-location motion tied to topic." },
                            ] as const
                          ).map(({ id, title, body }) => {
                            const selected = talkingRealMode === id;
                            const locked = id === "scenario" && !isPro;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => {
                                  if (locked) { router.push("/pricing"); return; }
                                  setTalkingRealMode(id);
                                }}
                                className="rounded-[9px] cursor-pointer text-left transition-all hover:-translate-y-px px-[13px] py-[11px] flex items-center gap-3"
                                style={
                                  selected
                                    ? {
                                        background: "#232323",
                                        border: "1px solid rgba(255,255,255,0.22)",
                                        boxShadow: "0 0 0 1px rgba(255,255,255,0.09), 0 1px 0 rgba(255,255,255,0.04) inset",
                                      }
                                    : {
                                        background: "#1c1c1c",
                                        border: "1px solid rgba(255,255,255,0.06)",
                                      }
                                }
                              >
                                <div
                                  className="relative w-[42px] h-[42px] rounded-[7px] shrink-0 overflow-hidden"
                                  style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                                  aria-hidden
                                >
                                  {id === "studio" ? (
                                    <>
                                      <div
                                        className="absolute inset-0"
                                        style={{ background: "radial-gradient(ellipse at 50% 38%, #2c2c34, #14141a 60%, #0a0a0e)" }}
                                      />
                                      <div
                                        className="absolute inset-0"
                                        style={{
                                          background:
                                            "radial-gradient(ellipse at 50% 30%, rgba(255,218,180,0.13), transparent 55%)",
                                        }}
                                      />
                                      <span className="absolute top-[3px] left-[3px] w-[5px] h-px bg-white/55" />
                                      <span className="absolute top-[3px] left-[3px] h-[5px] w-px bg-white/55" />
                                      <span className="absolute top-[3px] right-[3px] w-[5px] h-px bg-white/55" />
                                      <span className="absolute top-[3px] right-[3px] h-[5px] w-px bg-white/55" />
                                      <span className="absolute bottom-[3px] left-[3px] w-[5px] h-px bg-white/55" />
                                      <span className="absolute bottom-[3px] left-[3px] h-[5px] w-px bg-white/55" />
                                      <span className="absolute bottom-[3px] right-[3px] w-[5px] h-px bg-white/55" />
                                      <span className="absolute bottom-[3px] right-[3px] h-[5px] w-px bg-white/55" />
                                      <motion.svg
                                        className="absolute"
                                        style={{ left: "50%", top: "52%", x: "-50%", y: "-50%" }}
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        animate={{ scale: [1, 1.04, 1] }}
                                        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                                      >
                                        <defs>
                                          <linearGradient id="studio-head" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0" stopColor="#f0d2b0" />
                                            <stop offset="1" stopColor="#b08868" />
                                          </linearGradient>
                                        </defs>
                                        <circle cx="12" cy="9" r="3.6" fill="url(#studio-head)" />
                                        <path
                                          d="M4.6 23 Q 4.6 14.3 12 14.3 Q 19.4 14.3 19.4 23 Z"
                                          fill="url(#studio-head)"
                                        />
                                      </motion.svg>
                                      <span className="absolute top-[4px] right-[4px] inline-flex w-[5px] h-[5px]">
                                        <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400/80 animate-ping" />
                                        <span className="relative inline-flex w-[5px] h-[5px] rounded-full bg-emerald-400" />
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <div
                                        className="absolute inset-0"
                                        style={{
                                          background:
                                            "linear-gradient(180deg, #1a120a 0%, #100a06 55%, #050402 100%)",
                                        }}
                                      />
                                      <div
                                        className="absolute inset-0"
                                        style={{
                                          background:
                                            "radial-gradient(ellipse at 22% 35%, rgba(245,180,110,0.32), transparent 55%)",
                                        }}
                                      />
                                      <span className="absolute top-[3px] left-[2px] right-[2px] h-px bg-white/12" />
                                      <span className="absolute bottom-[3px] left-[2px] right-[2px] h-px bg-white/12" />
                                      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[18px] overflow-hidden">
                                        <motion.div
                                          className="flex gap-[2px] h-full"
                                          style={{ width: "max-content" }}
                                          animate={{ x: ["0%", "-50%"] }}
                                          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                                        >
                                          {Array.from({ length: 14 }).map((_, i) => {
                                            const palette = [
                                              "linear-gradient(135deg, #9a6a3a 0%, #4a2f18 70%)",
                                              "linear-gradient(160deg, #7a5028 0%, #2c1c0e 70%)",
                                              "linear-gradient(120deg, #c08850 0%, #5a3818 65%)",
                                              "linear-gradient(150deg, #6a4222 0%, #1c1208 75%)",
                                            ];
                                            return (
                                              <span
                                                key={i}
                                                className="block h-full w-[10px] shrink-0 rounded-[1.5px]"
                                                style={{
                                                  background: palette[i % palette.length],
                                                  boxShadow:
                                                    "inset 0 0 0 0.5px rgba(255,255,255,0.05)",
                                                }}
                                              />
                                            );
                                          })}
                                        </motion.div>
                                      </div>
                                      <span
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1.5px] h-[22px] rounded-full"
                                        style={{
                                          background:
                                            "linear-gradient(180deg, transparent, rgba(255,255,255,0.9), transparent)",
                                          boxShadow: "0 0 6px rgba(255,255,255,0.5)",
                                        }}
                                      />
                                    </>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-[3px]">
                                    <span className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[12.5px] font-medium tracking-[-0.005em] text-[#ededed]">{title}</span>
                                      {id === "scenario" && <ProBadge plan={userPlan} />}
                                    </span>
                                    <span
                                      className="relative inline-flex items-center justify-center w-[13px] h-[13px] rounded-full transition-all shrink-0"
                                      style={
                                        selected
                                          ? { border: "1.5px solid #ededed", background: "#ededed" }
                                          : { border: "1.5px solid rgba(255,255,255,0.3)" }
                                      }
                                      aria-hidden
                                    >
                                      {selected && <span className="absolute w-[4.5px] h-[4.5px] rounded-full" style={{ background: "#111111" }} />}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-zinc-500 leading-[1.4]">{body}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {(() => {
                          const avatarDisabled = talkingRealMode === "scenario";
                          return (
                        <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                            <div
                              className="inline-flex items-center gap-2 text-[12.5px] font-medium tracking-[-0.005em] transition-colors"
                              style={{ color: avatarDisabled ? "rgba(255,255,255,0.4)" : "#ededed" }}
                            >
                              <CircleUserRound
                                className="w-3.5 h-3.5"
                                strokeWidth={1.8}
                                style={{ color: avatarDisabled ? "rgba(255,255,255,0.25)" : "rgb(113,113,122)" }}
                              />
                              <span>Avatar</span>
                              {avatarDisabled && (
                                <span
                                  className="ml-1 text-[9.5px] font-mono tracking-[0.18em] uppercase px-[7px] py-[2px] rounded-full"
                                  style={{
                                    color: "rgba(255,255,255,0.45)",
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                  }}
                                >
                                  Not used in cinematic
                                </span>
                              )}
                            </div>
                            <div
                              className="inline-flex items-center gap-0.5 p-[2px] rounded-[7px] transition-opacity"
                              style={{
                                background: "rgba(0,0,0,0.35)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                opacity: avatarDisabled ? 0.4 : 1,
                                pointerEvents: avatarDisabled ? "none" : "auto",
                              }}
                              aria-disabled={avatarDisabled}
                            >
                              {([
                                { tab: "default" as const, label: "Default" },
                                { tab: "preset" as const, label: "Preset" },
                                { tab: "upload" as const, label: "Upload" },
                              ]).map(({ tab, label }) => {
                                const active = avatarMode === tab;
                                const locked = PRO_AVATAR_MODES.includes(tab) && !isPro;
                                return (
                                  <button
                                    key={tab}
                                    type="button"
                                    onClick={() => {
                                      if (locked) { router.push("/pricing"); return; }
                                      setAvatarMode(tab);
                                    }}
                                    disabled={avatarDisabled}
                                    className={`inline-flex items-center gap-1 px-3 py-[4px] rounded-[5px] text-[11.5px] tracking-[-0.003em] transition-colors ${active ? "text-[#ededed]" : "text-zinc-500 hover:text-[#ededed]"}`}
                                    style={active ? { background: "#232323", fontWeight: 500, boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset" } : undefined}
                                  >
                                    {label}
                                    {PRO_AVATAR_MODES.includes(tab) && <ProBadge plan={userPlan} size="xs" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div
                            className="transition-opacity"
                            style={{
                              opacity: avatarDisabled ? 0.35 : 1,
                              pointerEvents: avatarDisabled ? "none" : "auto",
                              filter: avatarDisabled ? "saturate(0.55)" : "none",
                            }}
                            aria-disabled={avatarDisabled}
                          >

                          {avatarMode === "default" && (
                            <div
                              className="rounded-[9px] p-[13px_14px] flex items-center gap-3"
                              style={{
                                background: "#1c1c1c",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              <div className="relative shrink-0 w-[46px] h-[46px]" aria-hidden>
                                <motion.span
                                  className="absolute inset-0 rounded-full border border-emerald-400/40 pointer-events-none"
                                  animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
                                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                                />
                                <motion.span
                                  className="absolute inset-0 rounded-full border border-emerald-400/30 pointer-events-none"
                                  animate={{ scale: [1, 1.45], opacity: [0.45, 0] }}
                                  transition={{
                                    duration: 2.2,
                                    repeat: Infinity,
                                    ease: "easeOut",
                                    delay: 1.1,
                                  }}
                                />

                                <div
                                  className="relative w-full h-full rounded-full overflow-hidden"
                                  style={{
                                    background:
                                      "radial-gradient(circle at 32% 26%, #f0d4b4 25%, #d2ad8a 55%, #6a4c38 95%)",
                                    border: "1px solid rgba(255,255,255,0.09)",
                                    boxShadow:
                                      "inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 6px rgba(0,0,0,0.3)",
                                  }}
                                >
                                  <svg
                                    className="absolute inset-0 m-auto"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle cx="12" cy="9" r="3.6" fill="rgba(60,40,28,0.5)" />
                                    <path
                                      d="M4.4 24 Q 4.4 14.4 12 14.4 Q 19.6 14.4 19.6 24 Z"
                                      fill="rgba(60,40,28,0.5)"
                                    />
                                  </svg>
                                </div>

                                <span
                                  className="absolute bottom-0 right-0 w-[10px] h-[10px] rounded-full bg-emerald-400"
                                  style={{
                                    boxShadow:
                                      "0 0 0 2px #1c1c1c, 0 0 6px rgba(52,211,153,0.55)",
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12.5px] font-medium text-[#ededed] mb-[3px] flex items-center gap-[7px] tracking-[-0.005em]">
                                  Default presenter
                                  <span
                                    className="text-[9.5px] tracking-[0.04em] uppercase font-medium px-[7px] py-[1px] rounded-full"
                                    style={{
                                      background: "rgba(78,201,160,0.1)",
                                      color: "#4ec9a0",
                                      border: "1px solid rgba(78,201,160,0.18)",
                                    }}
                                  >
                                    Recommended
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-500 leading-[1.4]">Neutral, professional look. Best when you want focus on the message.</div>
                              </div>
                            </div>
                          )}

                          {avatarMode === "preset" && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {AVATAR_PRESETS.map((preset) => {
                                const selected = avatarPresetId === preset.id;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => setAvatarPresetId(preset.id)}
                                    className="relative rounded-[9px] cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5"
                                    style={{
                                      aspectRatio: "3/4",
                                      background: "#1c1c1c",
                                      border: selected ? "1.5px solid #ededed" : "1.5px solid rgba(255,255,255,0.06)",
                                      boxShadow: selected ? "0 0 0 2px rgba(255,255,255,0.08)" : undefined,
                                    }}
                                  >
                                    <div
                                      className="w-full h-full transition-transform duration-300"
                                      style={{
                                        backgroundImage: `linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.94)), url('${preset.imageSrc}')`,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center 25%",
                                      }}
                                    />
                                    <div className="absolute bottom-[7px] left-[9px] right-[9px]">
                                      <div className="text-[11px] font-medium text-white tracking-[-0.003em]">{preset.label}</div>
                                      <div className="text-[9.5px] font-mono uppercase tracking-[0.02em] text-white/65 mt-[2px]">{preset.hint}</div>
                                    </div>
                                    {selected && (
                                      <div
                                        className="absolute top-[7px] right-[7px] w-[18px] h-[18px] rounded-full flex items-center justify-center"
                                        style={{ background: "#ededed", color: "#111111", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}
                                      >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {avatarMode === "upload" && (
                            <div
                              onClick={() => avatarFileRef.current?.click()}
                              className="rounded-[9px] cursor-pointer text-center px-4 py-[26px] transition-all"
                              style={{
                                background: "#1c1c1c",
                                border: "1px dashed rgba(255,255,255,0.14)",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; e.currentTarget.style.background = "#232323"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; e.currentTarget.style.background = "#1c1c1c"; }}
                            >
                              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
                              <div
                                className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] mx-auto mb-[11px] text-zinc-300"
                                style={{
                                  background: "#232323",
                                  border: "1px solid rgba(255,255,255,0.09)",
                                  boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 16l-4-4-4 4m4-4v9m9-7v3a4 4 0 01-4 4H7a4 4 0 01-4-4v-3m0-4l9-9 9 9" />
                                </svg>
                              </div>
                              <div className="text-[12.5px] font-medium text-[#ededed] mb-[3px] tracking-[-0.005em]">{avatarFile ? avatarFile.name : "Upload avatar image"}</div>
                              <div className="text-[11px] text-zinc-500 leading-[1.5]">
                                Use a clear face photo for best results.
                                <br />
                                JPG or PNG · up to 8 MB
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                          );
                        })()}
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                      <div>
                        <h2 className="text-[13px] font-medium text-[#ededed] m-0 mb-1 tracking-[-0.005em]">Captions</h2>
                        <p className="text-[12px] text-zinc-500 m-0 leading-[1.5]">Auto-synced burn-in. Editable after generation.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(
                          [
                            { value: true, title: "With captions", desc: "Burned-in, auto-synced to voiceover", iconPath: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z M7 9h10 M7 13h6" },
                            { value: false, title: "No captions", desc: "Clean output, voice only", iconPath: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z M8 9l8 6 M16 9l-8 6" },
                          ] as const
                        ).map(({ value, title, desc, iconPath }) => {
                          const selected = cc === value;
                          return (
                            <button
                              key={String(value)}
                              type="button"
                              onClick={() => setCc(value)}
                              className="rounded-[10px] cursor-pointer flex items-center gap-3 px-[15px] py-[13px] transition-all hover:-translate-y-px text-left"
                              style={
                                selected
                                  ? {
                                      background: "#1c1c1c",
                                      border: "1px solid rgba(255,255,255,0.22)",
                                      boxShadow: "0 0 0 1px rgba(255,255,255,0.09), 0 1px 0 rgba(255,255,255,0.04) inset",
                                    }
                                  : {
                                      background: "#161616",
                                      border: "1px solid rgba(255,255,255,0.09)",
                                    }
                              }
                            >
                              <span
                                className="shrink-0 w-[34px] h-[34px] rounded-[8px] flex items-center justify-center"
                                style={
                                  selected
                                    ? {
                                        background: "#111111",
                                        border: "1px solid rgba(255,255,255,0.14)",
                                        color: "#ededed",
                                      }
                                    : {
                                        background: "#232323",
                                        border: "1px solid rgba(255,255,255,0.09)",
                                        color: "rgba(255,255,255,0.72)",
                                      }
                                }
                              >
                                <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                                </svg>
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-[2px]">
                                  <span className="text-[12.5px] font-medium text-[#ededed] tracking-[-0.005em]">{title}</span>
                                  <span
                                    className="relative inline-flex items-center justify-center w-[13px] h-[13px] rounded-full transition-all shrink-0"
                                    style={
                                      selected
                                        ? { border: "1.5px solid #ededed", background: "#ededed" }
                                        : { border: "1.5px solid rgba(255,255,255,0.3)" }
                                    }
                                    aria-hidden
                                  >
                                    {selected && <span className="absolute w-[4.5px] h-[4.5px] rounded-full" style={{ background: "#111111" }} />}
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-500 leading-[1.4]">{desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  <div
                    className="flex flex-wrap items-center justify-between gap-3 px-7 py-4"
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.012))",
                    }}
                  >
                    <div className="flex items-center gap-3.5 text-[11.5px] text-zinc-500">
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-[13px] h-[13px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.72)" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <strong className="font-mono font-medium text-[#ededed] text-[11px] tabular-nums">~{Math.max(60, Math.round(dur * 1.5))}s</strong> render
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
                      <span className="inline-flex items-center gap-1.5"><strong className="font-mono font-medium text-[#ededed] text-[11px] tabular-nums">4K</strong> UHD</span>
                      <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
                      <span
                        className="px-[9px] py-[2px] rounded-full font-medium tracking-[0.04em] uppercase"
                        style={{
                          fontSize: "10px",
                          background: "rgba(78,201,160,0.1)",
                          color: "#4ec9a0",
                          border: "1px solid rgba(78,201,160,0.18)",
                        }}
                      >
                        Free
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={!prompt.trim() || prompt.trim().length < 5 || submitting || !canGenerateByPlan}
                      className="inline-flex items-center gap-2.5 px-[18px] py-[10px] rounded-[9px] text-[13px] font-medium tracking-[-0.005em] transition-all hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      style={{
                        background: "linear-gradient(180deg, #ffffff, #d4d4d4)",
                        color: "#0a0a0a",
                        boxShadow: "0 1px 0 rgba(255,255,255,0.5) inset, 0 -1px 0 rgba(0,0,0,0.1) inset, 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.1)",
                      }}
                    >
                      {submitting ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Starting render
                        </>
                      ) : (
                        <>
                          Generate video
                          <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                          <span
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] font-medium ml-[2px]"
                            style={{
                              background: "rgba(10,10,10,0.1)",
                              border: "1px solid rgba(10,10,10,0.08)",
                              color: "rgba(10,10,10,0.7)",
                            }}
                          >
                            ⌘↵
                          </span>
                        </>
                      )}
                    </button>
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
