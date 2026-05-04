"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getUserFriendlyErrorMessage } from "@/lib/utils/error";
import {
  POLL_INTERVAL_MS,
  TEXT_MODEL_OPTIONS,
  STAGES,
  FEATURES,
  FEATURE_TABS,
  FEATURE_TAB_DATA,
  PRICING,
} from "@/constants/landing";
import { DURATION_MIN, DURATION_MAX } from "@/lib/validation/duration";
import { isEnterprisePlan, isPlanId, type PlanId } from "@/lib/plans";
import IntroAnimation, { HERO_IMAGES } from "@/components/ui/scroll-morph-hero";
import { motion } from "framer-motion";
import Image from "next/image";
import { ImagePlayer } from "@/components/image-player";
import TestimonialV2 from "@/components/ui/testimonial-v2";
import { authClient } from "@/lib/auth-client";
import { HomeFooter } from "@/app/_landing/HomeFooter";
import { SUBMIT_TIMEOUT_MS } from "@/components/generate/constants";

const HOW_IT_WORKS_IMAGES = [
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1494&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1617869763329-8e8160d32adb?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1705675742522-b0bdc228f2ed?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1705615791178-d32cc2cdcd9c?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
];

type JobStatus = "pending" | "processing" | "completed" | "failed";

function HomeContent() {
  const searchParams = useSearchParams();
  const { data: sessionData, isPending: sessionPending } = authClient.useSession();
  const sessionUser = sessionData?.user;
  const isLoggedIn = !sessionPending && !!sessionData;
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [mode, setMode] = useState<"slideshow" | "talking_object">("slideshow");
  const [talkingObjectStyle, setTalkingObjectStyle] = useState<
    "cartoon" | "real"
  >("cartoon");
  const [captions, setCaptions] = useState<"on" | "off">("on");
  const [durationSeconds, setDurationSeconds] = useState(30);

  useEffect(() => {
    const captionsParam = searchParams.get("captions");
    if (captionsParam === "off" || captionsParam === "on") {
      setCaptions(captionsParam);
    }
  }, [searchParams]);
  const [textModel, setTextModel] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [canGenerateByPlan, setCanGenerateByPlan] = useState(true);
  const [planLimitMessage, setPlanLimitMessage] = useState<string | null>(null);
  const [usagePlan, setUsagePlan] = useState<PlanId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  const [activePainPoint, setActivePainPoint] = useState(0);
  const [defaultScriptModel, setDefaultScriptModel] = useState<string | null>(
    null,
  );
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [heroScrollComplete, setHeroScrollComplete] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef(prompt);
  promptRef.current = prompt;
  const promptFromSuggestionRef = useRef(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const howSectionRef = useRef<HTMLElement | null>(null);
  const [howInView, setHowInView] = useState(false);

  useEffect(() => {
    const el = howSectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setHowInView(e.isIntersecting),
      { threshold: 0.2, rootMargin: "0px 0px -80px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onDocPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (accountMenuRef.current?.contains(target)) return;
      setAccountMenuOpen(false);
    };
    const onDocKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setImageUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data) =>
          data?.defaultScriptModel &&
          setDefaultScriptModel(data.defaultScriptModel),
      )
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetch("/api/dashboard/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.plan && typeof d.plan === "string" && isPlanId(d.plan)) {
          setUsagePlan(d.plan);
        } else {
          setUsagePlan(null);
        }
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
            : null,
        );
      })
      .catch(() => { });
  }, [isLoggedIn]);

  useEffect(() => {
    if (!modelDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target as Node)
      ) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modelDropdownOpen]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (stageRef.current) clearInterval(stageRef.current);
    pollRef.current = null;
    stageRef.current = null;
  }, []);

  const poll = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/generate/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(
            getUserFriendlyErrorMessage(data.error || "Something went wrong"),
          );
          setStatus("failed");
          stopPolling();
          return;
        }
        setStatus(data.status);
        if (data.status === "completed" && data.videoUrl) {
          setVideoUrl(data.videoUrl);
          setCompletionMessage(data.message ?? null);
          stopPolling();
        }
        if (data.status === "failed") {
          setError(
            getUserFriendlyErrorMessage(data.error || "Generation failed"),
          );
          stopPolling();
        }
      } catch {
        setError("Connection lost");
        setStatus("failed");
        stopPolling();
      }
    },
    [stopPolling],
  );

  useEffect(() => {
    if (!jobId) return;
    poll(jobId);
    pollRef.current = setInterval(() => poll(jobId), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, poll]);

  useEffect(() => {
    if (jobId && (status === "pending" || status === "processing")) {
      setStage(0);
      stageRef.current = setInterval(() => {
        setStage((s) => Math.min(s + 1, STAGES.length - 1));
      }, 18000);
      return () => {
        if (stageRef.current) clearInterval(stageRef.current);
      };
    }
  }, [jobId, status]);

  const handleSubmit = async () => {
    if (!prompt.trim() || prompt.trim().length < 5 || submitting) return;
    if (!canGenerateByPlan) {
      setError(planLimitMessage ?? "Your plan limit has been reached. Please upgrade to continue.");
      return;
    }

    setError(null);
    setVideoUrl(null);
    setStatus(null);
    setJobId(null);
    setSubmitting(true);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      let assetIds: string[] = [];
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((img) => formData.append("productPhotos", img));
        const uploadRes = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.assetIds) {
          assetIds = uploadData.assetIds;
        }
      }

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: prompt.trim(),
          mode: mode,
          durationSeconds: Math.min(DURATION_MAX, Math.max(DURATION_MIN, durationSeconds)),
          captions: captions,
          ...(textModel.trim() ? { textModel: textModel.trim() } : {}),
          ...(assetIds.length > 0 ? { assetIds } : {}),
          ...(mode === "talking_object" ? { talkingObjectStyle } : {}),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) {
        let msg = getUserFriendlyErrorMessage(data.error || "Failed to start generation");
        if (res.status === 402) {
          const parts: string[] = [];
          if (data.tokensRemaining != null && data.tokensRequired != null) {
            parts.push(`You have ${data.tokensRemaining} credits, need ${data.tokensRequired} per video.`);
          }
          if (data.videosUsed != null && data.videosLimit != null) {
            parts.push(`You've used ${data.videosUsed} of ${data.videosLimit} videos this month.`);
          }
          if (parts.length > 0) {
            msg = msg + " " + parts.join(" ");
          }
          if (data.videosUsed != null && data.videosLimit != null) {
            setCanGenerateByPlan(false);
            setPlanLimitMessage(
              `You've used ${data.videosUsed} of ${data.videosLimit} videos this month. Upgrade to continue.`,
            );
          }
        }
        setError(msg);
        return;
      }
      setJobId(data.jobId);
      setStatus("pending");
    } catch (err) {
      if (timeoutId != null) clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. The server may be starting or Redis may be unavailable. Try again in a moment.");
      } else {
        setError("Connection failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    stopPolling();
    setJobId(null);
    setStatus(null);
    setVideoUrl(null);
    setCompletionMessage(null);
    setError(null);
    setPrompt("");
    setImages([]);
    setMode("slideshow");
    setTalkingObjectStyle("cartoon");
    setCaptions("on");
    setDurationSeconds(30);
    setTextModel("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    setImages((prev) => [...prev, ...files].slice(0, 5));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files].slice(0, 5));
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const isGenerating =
    submitting ||
    (jobId != null && (status === "pending" || status === "processing"));

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 relative overflow-x-clip">
      <header className="fixed top-4 sm:top-5 left-0 right-0 z-50 flex justify-center px-3 sm:px-6 pointer-events-none">
        <div className="relative pointer-events-auto">
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[90%] h-24 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 100% at center top, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 30%, transparent 60%, transparent 100%)",
              filter: "blur(16px)",
            }}
          />
          <nav
            className="relative z-10 flex items-center gap-1.5 sm:gap-3 md:gap-6 bg-white/90 backdrop-blur-2xl border border-gray-200 rounded-[18px] sm:rounded-[22px] px-2.5 sm:px-4 md:px-8 py-2 sm:py-3 w-full max-w-[96vw] sm:max-w-[90vw] sm:min-w-[560px] shadow-lg shadow-gray-200/50"
            style={{
              boxShadow:
                "0 8px 40px -8px rgba(0,0,0,0.08), 0 1px 0 rgba(0,0,0,0.04) inset",
            }}
          >
            <Link
              href="/features"
              className="hidden md:flex min-w-0 sm:min-w-[170px] items-center justify-center gap-2 sm:gap-3 px-2.5 sm:px-6 py-2 sm:py-2.5 rounded-[12px] sm:rounded-[16px] text-[13px] sm:text-[15px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <svg
                className="w-5 h-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="nav-ic-cube-top"
                    x1="6"
                    y1="3"
                    x2="18"
                    y2="10"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#a1a1aa" />
                    <stop offset="1" stopColor="#71717a" />
                  </linearGradient>
                  <linearGradient
                    id="nav-ic-cube-left"
                    x1="3"
                    y1="9"
                    x2="12"
                    y2="22"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#71717a" />
                    <stop offset="1" stopColor="#3f3f46" />
                  </linearGradient>
                  <linearGradient
                    id="nav-ic-cube-right"
                    x1="12"
                    y1="9"
                    x2="21"
                    y2="22"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#52525b" />
                    <stop offset="1" stopColor="#27272a" />
                  </linearGradient>
                </defs>

                <path
                  d="M12 3L4.5 7.5 12 12l7.5-4.5L12 3z"
                  fill="url(#nav-ic-cube-top)"
                />

                <path
                  d="M4.5 7.5L12 12v9l-7.5-4.5V7.5z"
                  fill="url(#nav-ic-cube-left)"
                />

                <path
                  d="M19.5 7.5L12 12v9l7.5-4.5V7.5z"
                  fill="url(#nav-ic-cube-right)"
                />

                <path
                  d="M12 3L4.5 7.5 12 12l7.5-4.5L12 3z"
                  stroke="#a1a1aa"
                  strokeWidth="0.3"
                  opacity="0.5"
                />
                <path
                  d="M12 12v9"
                  stroke="#71717a"
                  strokeWidth="0.4"
                  opacity="0.4"
                />
              </svg>
              Features
            </Link>
            <Link
              href="/pricing"
              className="hidden md:flex min-w-0 sm:min-w-[170px] items-center justify-center gap-2 sm:gap-3 px-2.5 sm:px-6 py-2 sm:py-2.5 rounded-[12px] sm:rounded-[16px] text-[13px] sm:text-[15px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <svg
                className="w-5 h-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="nav-ic-price-card" x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a1a1aa" />
                    <stop offset="1" stopColor="#52525b" />
                  </linearGradient>
                </defs>
                <rect x="3.5" y="6" width="17" height="12" rx="2.5" stroke="url(#nav-ic-price-card)" strokeWidth="1.4" />
                <path d="M3.5 10h17" stroke="url(#nav-ic-price-card)" strokeWidth="1.2" strokeLinecap="round" />
                <rect x="6.5" y="13" width="4.5" height="2" rx="1" fill="#a1a1aa" opacity="0.8" />
              </svg>
              Pricing
            </Link>
            <Link
              href="/how"
              className="hidden md:flex min-w-0 sm:min-w-[170px] items-center justify-center gap-2 sm:gap-3 px-2.5 sm:px-6 py-2 sm:py-2.5 rounded-[12px] sm:rounded-[16px] text-[13px] sm:text-[15px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <svg
                className="w-5 h-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="nav-ic-shield-l"
                    x1="4"
                    y1="3"
                    x2="12"
                    y2="22"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#a1a1aa" />
                    <stop offset="1" stopColor="#52525b" />
                  </linearGradient>
                  <linearGradient
                    id="nav-ic-shield-r"
                    x1="12"
                    y1="3"
                    x2="20"
                    y2="22"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#71717a" />
                    <stop offset="1" stopColor="#3f3f46" />
                  </linearGradient>
                </defs>

                <path
                  d="M12 3L4 7v5c0 4.5 3.5 8.5 8 10V3z"
                  fill="url(#nav-ic-shield-l)"
                />

                <path
                  d="M12 3l8 4v5c0 4.5-3.5 8.5-8 10V3z"
                  fill="url(#nav-ic-shield-r)"
                />

                <path
                  d="M12 3L4 7v5c0 4.5 3.5 8.5 8 10 4.5-1.5 8-5.5 8-10V7l-8-4z"
                  stroke="#a1a1aa"
                  strokeWidth="0.4"
                  opacity="0.35"
                />
              </svg>
              How it works
            </Link>
            {sessionPending ? (
              <div
                className="flex items-center gap-3 px-8 py-2.5 rounded-[16px] min-h-[42px]"
                aria-hidden
              >
                <span className="h-5 w-28 bg-gray-100 rounded-md animate-pulse" />
              </div>
            ) : isLoggedIn && sessionUser ? (
              <div
                ref={accountMenuRef}
                className="relative flex items-center gap-1.5 pl-2 pr-2 py-1.5 rounded-[16px] border border-gray-200 bg-white/90 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset]"
              >
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-3 py-1.5 rounded-[12px] text-[15px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                >
                  <svg
                    className="w-5 h-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient
                        id="nav-ic-dash1"
                        x1="3"
                        y1="3"
                        x2="11"
                        y2="11"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#a1a1aa" />
                        <stop offset="1" stopColor="#52525b" />
                      </linearGradient>
                      <linearGradient
                        id="nav-ic-dash2"
                        x1="13"
                        y1="3"
                        x2="21"
                        y2="11"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#71717a" />
                        <stop offset="1" stopColor="#3f3f46" />
                      </linearGradient>
                      <linearGradient
                        id="nav-ic-dash3"
                        x1="3"
                        y1="13"
                        x2="11"
                        y2="21"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#71717a" />
                        <stop offset="1" stopColor="#3f3f46" />
                      </linearGradient>
                      <linearGradient
                        id="nav-ic-dash4"
                        x1="13"
                        y1="13"
                        x2="21"
                        y2="21"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#a1a1aa" />
                        <stop offset="1" stopColor="#52525b" />
                      </linearGradient>
                    </defs>
                    <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" fill="url(#nav-ic-dash1)" />
                    <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" fill="url(#nav-ic-dash2)" />
                    <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" fill="url(#nav-ic-dash3)" />
                    <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" fill="url(#nav-ic-dash4)" />
                  </svg>
                  <span className="shrink-0">Dashboard</span>
                </Link>

                <span className="h-6 w-px bg-gray-200" aria-hidden />

                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 min-w-0 rounded-[12px] px-2.5 py-1.5 text-[13px] sm:text-[14px] text-gray-800 hover:bg-gray-100 transition-colors max-w-[min(220px,36vw)] sm:max-w-[min(180px,28vw)]"
                >
                  {typeof sessionUser.image === "string" && sessionUser.image.trim() ? (
                    <img
                      src={sessionUser.image}
                      alt=""
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-gray-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                      {(sessionUser.name?.trim()?.[0] ?? sessionUser.email?.trim()?.[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                  <span className="truncate">
                    {sessionUser.name?.trim() || sessionUser.email?.trim() || "Account"}
                  </span>
                </button>

                {accountMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-40 min-w-[180px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-[0_16px_32px_-20px_rgba(0,0,0,0.55)]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        setAccountMenuOpen(false);
                        try {
                          await authClient.signOut({ fetchOptions: { onSuccess: () => { } } });
                        } finally {
                          window.location.href = "/";
                        }
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                href="/signin"
                className="flex min-w-0 sm:min-w-[170px] items-center justify-center gap-2 sm:gap-3 px-2.5 sm:px-6 py-2 sm:py-2.5 rounded-[12px] sm:rounded-[16px] text-[13px] sm:text-[15px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
              >
                <svg
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient
                      id="nav-ic-grid1"
                      x1="3"
                      y1="3"
                      x2="11"
                      y2="11"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#a1a1aa" />
                      <stop offset="1" stopColor="#52525b" />
                    </linearGradient>
                    <linearGradient
                      id="nav-ic-grid2"
                      x1="13"
                      y1="3"
                      x2="21"
                      y2="11"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#71717a" />
                      <stop offset="1" stopColor="#3f3f46" />
                    </linearGradient>
                    <linearGradient
                      id="nav-ic-grid3"
                      x1="3"
                      y1="13"
                      x2="11"
                      y2="21"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#71717a" />
                      <stop offset="1" stopColor="#3f3f46" />
                    </linearGradient>
                    <linearGradient
                      id="nav-ic-grid4"
                      x1="13"
                      y1="13"
                      x2="21"
                      y2="21"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#a1a1aa" />
                      <stop offset="1" stopColor="#52525b" />
                    </linearGradient>
                  </defs>
                  <rect
                    x="3.5"
                    y="3.5"
                    width="7"
                    height="7"
                    rx="1.8"
                    fill="url(#nav-ic-grid1)"
                  />
                  <rect
                    x="13.5"
                    y="3.5"
                    width="7"
                    height="7"
                    rx="1.8"
                    fill="url(#nav-ic-grid2)"
                  />
                  <rect
                    x="3.5"
                    y="13.5"
                    width="7"
                    height="7"
                    rx="1.8"
                    fill="url(#nav-ic-grid3)"
                  />
                  <rect
                    x="13.5"
                    y="13.5"
                    width="7"
                    height="7"
                    rx="1.8"
                    fill="url(#nav-ic-grid4)"
                  />

                  <rect
                    x="3.5"
                    y="3.5"
                    width="7"
                    height="7"
                    rx="1.8"
                    stroke="#a1a1aa"
                    strokeWidth="0.3"
                    opacity="0.3"
                  />
                  <rect
                    x="13.5"
                    y="3.5"
                    width="7"
                    height="7"
                    rx="1.8"
                    stroke="#a1a1aa"
                    strokeWidth="0.3"
                    opacity="0.3"
                  />
                  <rect
                    x="3.5"
                    y="13.5"
                    width="7"
                    height="7"
                    rx="1.8"
                    stroke="#a1a1aa"
                    strokeWidth="0.3"
                    opacity="0.3"
                  />
                  <rect
                    x="13.5"
                    y="13.5"
                    width="7"
                    height="7"
                    rx="1.8"
                    stroke="#a1a1aa"
                    strokeWidth="0.3"
                    opacity="0.3"
                  />
                </svg>
                Generate
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="h-screen w-full min-h-[600px] pt-20">
          <IntroAnimation onScrollComplete={() => setHeroScrollComplete(true)} />
        </section>
        <motion.div
          initial={false}
          animate={{
            opacity: heroScrollComplete ? 1 : 0,
            pointerEvents: heroScrollComplete ? "auto" : "none",
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="min-h-screen"
        >
          <div id="create" />
          <section id="create" className="pt-28 pb-40 px-4 sm:px-6 xl:px-10 2xl:px-14 relative hidden">
            <div className="max-w-[min(1680px,96vw)] mx-auto relative z-10">
              {status === "completed" && videoUrl ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-emerald-500/10">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Your video is ready!
                      </p>
                      <p className="text-sm text-gray-500">1080p HD • MP4</p>
                    </div>
                  </div>
                  {completionMessage ? (
                    <div className="px-6 py-3 bg-amber-500/10 border-b border-white/5">
                      <p className="text-sm text-amber-200">
                        {completionMessage}
                      </p>
                    </div>
                  ) : null}
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full aspect-video bg-black object-cover"
                  />
                  <div className="p-6 flex flex-wrap gap-3 border-t border-white/5">
                    <a
                      href={videoUrl}
                      download
                      className="inline-flex items-center gap-2 bg-white text-black font-medium px-5 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors text-sm"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download
                    </a>
                    <button
                      onClick={reset}
                      className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-5 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-sm"
                    >
                      Create another
                    </button>
                  </div>
                </div>
              ) : jobId && (status === "pending" || status === "processing") ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-950 p-10 sm:p-16">
                  <div className="max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Step {stage + 1} of {STAGES.length}
                      </span>
                      <span className="text-xs font-mono text-gray-600">
                        {Math.round(((stage + 1) / STAGES.length) * 100)}%
                      </span>
                    </div>

                    <h3
                      key={stage}
                      className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 animate-fade-in"
                    >
                      {STAGES[stage]}
                    </h3>

                    <p className="text-gray-500 mb-10">
                      {stage === 0 &&
                        "Analyzing your prompt to understand the story you want to tell."}
                      {stage === 1 &&
                        "Creating a compelling script with the right pacing and tone."}
                      {stage === 2 &&
                        "Selecting the perfect images and footage for each scene."}
                      {stage === 3 &&
                        "Generating natural voiceover that matches your content."}
                      {stage === 4 &&
                        "Rendering your final video in high quality."}
                    </p>

                    <div className="relative h-1 bg-zinc-800 rounded-full overflow-hidden mb-10">
                      <div
                        className="absolute inset-y-0 left-0 progress-wave rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${((stage + 1) / STAGES.length) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="space-y-3 mb-8">
                      {STAGES.map((stageName, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 transition-all duration-300 ${i < stage
                            ? "opacity-50"
                            : i === stage
                              ? "opacity-100"
                              : "opacity-30"
                            }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${i < stage
                              ? "bg-white border-white"
                              : i === stage
                                ? "border-white"
                                : "border-zinc-700"
                              }`}
                          >
                            {i < stage && (
                              <svg
                                className="w-3 h-3 text-black"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                            {i === stage && (
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            )}
                          </div>
                          <span
                            className={`text-sm ${i === stage ? "text-gray-900 font-medium" : "text-gray-500"}`}
                          >
                            {stageName}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="relative flex items-center justify-center">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                        <div className="absolute w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                      </div>
                      <p className="text-sm text-emerald-400">
                        Chunking in progress: Please wait, this may take a moment.
                      </p>
                    </div>
                  </div>
                </div>
              ) : status === "failed" && error ? (
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-red-500/60 via-orange-500/40 to-red-500/60 animate-[shimmer_3s_ease-in-out_infinite]" />

                  <div className="relative rounded-2xl bg-zinc-950 p-8 md:p-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-red-500/10 blur-3xl rounded-full pointer-events-none" />

                    <div className="relative flex flex-col items-center text-center">
                      <div className="relative mb-6">
                        <div
                          className="absolute inset-0 w-16 h-16 rounded-full bg-red-500/20 animate-ping"
                          style={{ animationDuration: "2s" }}
                        />
                        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-500/30 to-orange-500/20 border border-red-500/30 flex items-center justify-center backdrop-blur-sm">
                          <svg
                            className="w-7 h-7 text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                            />
                          </svg>
                        </div>
                      </div>

                      <h3 className="text-xl font-semibold bg-gradient-to-r from-red-300 via-orange-200 to-red-300 bg-clip-text text-transparent mb-2">
                        Generation Failed
                      </h3>

                      <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
                        {error
                          ? getUserFriendlyErrorMessage(error)
                          : "Something went wrong."}
                      </p>

                      <div className="w-16 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-6" />

                      <button
                        onClick={reset}
                        className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 hover:border-red-500/40 text-sm font-medium text-red-600 hover:text-white transition-all duration-300 hover:shadow-[0_0_24px_rgba(239,68,68,0.15)]"
                      >
                        <svg
                          className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-45"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                          />
                        </svg>
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden">
                  <div className="grid md:grid-cols-[280px_1fr]">
                    <div className="p-6 md:p-7 border-b md:border-b-0 md:border-r border-white/5 bg-zinc-900/50">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-gray-900">
                          Your images (optional)
                        </p>
                        <p className="text-xs text-gray-500">{images.length}/5</p>
                      </div>

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragActive(true);
                        }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragActive
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-zinc-800 hover:border-zinc-700"
                          }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <svg
                          className="w-8 h-8 mx-auto mb-3 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15"
                          />
                        </svg>
                        <p className="text-sm text-gray-500">
                          Drop images or click
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Optional • Max 5
                        </p>
                      </div>

                      {images.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {images.map((_, i) => (
                            <div
                              key={i}
                              className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800"
                            >
                              <img
                                src={imageUrls[i]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => removeImage(i)}
                                className="absolute top-1 right-1 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                        No images? We&apos;ll find visuals from the web based on
                        your description. Or add your own we&apos;ll use them
                        first.
                      </p>

                      <div className="mt-8 pt-6 border-t border-white/5">
                        <label className="block text-sm font-medium text-gray-900 mb-3">
                          Script model
                        </label>
                        <div className="relative" ref={modelDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setModelDropdownOpen((o) => !o)}
                            className="w-full min-h-[44px] bg-white border border-gray-200 rounded-xl px-3 py-3 text-left text-sm text-gray-900 flex items-center justify-between gap-2 hover:border-gray-300 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all cursor-pointer"
                          >
                            <span className="truncate">
                              {(() => {
                                const selected = TEXT_MODEL_OPTIONS.find(
                                  (o) => o.value === textModel,
                                );
                                if (!selected) return "Select model";
                                if (selected.value === "" && defaultScriptModel) {
                                  return (
                                    TEXT_MODEL_OPTIONS.find(
                                      (o) => o.value === defaultScriptModel,
                                    )?.label ?? defaultScriptModel
                                  );
                                }
                                return selected.label;
                              })()}
                            </span>
                            <svg
                              className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${modelDropdownOpen ? "rotate-180" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>

                          {modelDropdownOpen && (
                            <div className="absolute z-50 mt-2 w-full rounded-xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in">
                              <div className="py-1.5 max-h-[260px] overflow-y-auto">
                                {TEXT_MODEL_OPTIONS.map((opt) => {
                                  const isActive = textModel === opt.value;
                                  const isDefault =
                                    opt.value === "" && defaultScriptModel;
                                  const displayLabel =
                                    opt.value === "" && defaultScriptModel
                                      ? (TEXT_MODEL_OPTIONS.find(
                                        (o) => o.value === defaultScriptModel,
                                      )?.label ?? defaultScriptModel)
                                      : opt.label;
                                  return (
                                    <button
                                      key={opt.value || "default"}
                                      type="button"
                                      onClick={() => {
                                        setTextModel(opt.value);
                                        setModelDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors ${isActive
                                        ? "bg-white/[0.07]"
                                        : "hover:bg-white/[0.04]"
                                        }`}
                                    >
                                      <div
                                        className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isActive
                                          ? "border-blue-400 bg-blue-500/20"
                                          : "border-zinc-600"
                                          }`}
                                      >
                                        {isActive && (
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`text-sm truncate ${isActive ? "text-gray-900 font-medium" : "text-gray-600"}`}
                                          >
                                            {displayLabel}
                                          </span>
                                          {isDefault && (
                                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                              env
                                            </span>
                                          )}
                                        </div>
                                        <p
                                          className={`text-xs mt-0.5 ${isActive ? "text-gray-600" : "text-gray-500"}`}
                                        >
                                          {opt.desc}
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2.5 leading-relaxed">
                          Uses this model for intent, script, and planning.
                        </p>
                      </div>

                      <div className="mt-2 flex justify-center">
                        <svg
                          width="150"
                          height="210"
                          viewBox="0 0 150 210"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="drop-shadow-xl mt-8"
                        >
                          <style>
                            {`
                            @keyframes heavyBounce {
                              0% { transform: translateY(0) scaleY(1); }
                              15% { transform: translateY(-18px) scaleY(1.04); }
                              30% { transform: translateY(0) scaleY(0.96); }
                              45% { transform: translateY(-12px) scaleY(1.02); }
                              60% { transform: translateY(0) scaleY(0.98); }
                              75% { transform: translateY(-20px) scaleY(1.05); }
                              100% { transform: translateY(0) scaleY(1); }
                            }
                            @keyframes headGroove {
                              0% { transform: rotate(0deg) translateX(0); }
                              20% { transform: rotate(-6deg) translateX(-4px); }
                              40% { transform: rotate(6deg) translateX(4px); }
                              60% { transform: rotate(-4deg) translateX(-2px); }
                              80% { transform: rotate(8deg) translateX(6px); }
                              100% { transform: rotate(0deg) translateX(0); }
                            }
                            @keyframes leftArmPump {
                              0% { transform: rotate(0deg); }
                              20% { transform: rotate(-50deg); }
                              40% { transform: rotate(25deg); }
                              60% { transform: rotate(-40deg); }
                              80% { transform: rotate(35deg); }
                              100% { transform: rotate(0deg); }
                            }
                            @keyframes rightArmPump {
                              0% { transform: rotate(0deg); }
                              20% { transform: rotate(40deg); }
                              40% { transform: rotate(-25deg); }
                              60% { transform: rotate(50deg); }
                              80% { transform: rotate(-35deg); }
                              100% { transform: rotate(0deg); }
                            }
                            @keyframes leftLegKick {
                              0% { transform: rotate(0deg); }
                              25% { transform: rotate(-20deg); }
                              50% { transform: rotate(12deg); }
                              75% { transform: rotate(-15deg); }
                              100% { transform: rotate(0deg); }
                            }
                            @keyframes rightLegKick {
                              0% { transform: rotate(0deg); }
                              25% { transform: rotate(15deg); }
                              50% { transform: rotate(-12deg); }
                              75% { transform: rotate(20deg); }
                              100% { transform: rotate(0deg); }
                            }
                            @keyframes sparkleFloat {
                              0%, 100% { transform: translateY(0) scale(1); opacity: 1; }
                              50% { transform: translateY(-8px) scale(1.3); opacity: 0.6; }
                            }
                            @keyframes heartPop {
                              0%, 100% { transform: scale(0); opacity: 0; }
                              50% { transform: scale(1); opacity: 1; }
                            }
                            .dance-body { animation: heavyBounce 1s ease-in-out infinite; transform-origin: 75px 125px; }
                            .head-move { animation: headGroove 1s ease-in-out infinite; transform-origin: 75px 55px; }
                            .left-arm { animation: leftArmPump 1s ease-in-out infinite; transform-origin: 45px 100px; }
                            .right-arm { animation: rightArmPump 1s ease-in-out infinite; transform-origin: 105px 100px; }
                            .left-leg { animation: leftLegKick 1s ease-in-out infinite; transform-origin: 62px 155px; }
                            .right-leg { animation: rightLegKick 1s ease-in-out infinite; transform-origin: 88px 155px; }
                            .sparkle { animation: sparkleFloat 1.5s ease-in-out infinite; }
                            .sp1 { animation-delay: 0s; }
                            .sp2 { animation-delay: 0.3s; }
                            .sp3 { animation-delay: 0.6s; }
                            .heart1 { animation: heartPop 2s ease-in-out infinite; }
                            .heart2 { animation: heartPop 2s ease-in-out infinite 0.5s; }
                            .heart3 { animation: heartPop 2s ease-in-out infinite 1s; }
                          `}
                          </style>

                          <circle
                            className="sparkle sp1"
                            cx="20"
                            cy="40"
                            r="4"
                            fill="#FFD700"
                          />
                          <circle
                            className="sparkle sp2"
                            cx="130"
                            cy="35"
                            r="3"
                            fill="#FFD700"
                          />
                          <circle
                            className="sparkle sp3"
                            cx="25"
                            cy="110"
                            r="3.5"
                            fill="#FFD700"
                          />

                          <path
                            className="heart1"
                            d="M135 70 C135 66, 131 63, 128 63 C125 63, 122 66, 122 70 C122 76, 128 82, 128 82 C128 82, 135 76, 135 70Z"
                            fill="#FF6B9D"
                          />
                          <path
                            className="heart2"
                            d="M18 65 C18 62, 15 60, 13 60 C11 60, 8 62, 8 65 C8 69, 13 73, 13 73 C13 73, 18 69, 18 65Z"
                            fill="#FF6B9D"
                          />
                          <path
                            className="heart3"
                            d="M140 120 C140 117, 137 115, 135 115 C133 115, 130 117, 130 120 C130 124, 135 128, 135 128 C135 128, 140 124, 140 120Z"
                            fill="#FF6B9D"
                          />

                          <g className="dance-body">
                            <ellipse
                              cx="75"
                              cy="200"
                              rx="30"
                              ry="6"
                              fill="#000"
                              opacity="0.15"
                            />

                            <g className="left-leg">
                              <ellipse
                                cx="62"
                                cy="172"
                                rx="11"
                                ry="24"
                                fill="#FDBF9C"
                              />
                              <ellipse
                                cx="62"
                                cy="195"
                                rx="13"
                                ry="9"
                                fill="#5D9CEC"
                              />
                              <ellipse
                                cx="62"
                                cy="193"
                                rx="11"
                                ry="5"
                                fill="#4A89DC"
                              />
                            </g>

                            <g className="right-leg">
                              <ellipse
                                cx="88"
                                cy="172"
                                rx="11"
                                ry="24"
                                fill="#FDBF9C"
                              />
                              <ellipse
                                cx="88"
                                cy="195"
                                rx="13"
                                ry="9"
                                fill="#5D9CEC"
                              />
                              <ellipse
                                cx="88"
                                cy="193"
                                rx="11"
                                ry="5"
                                fill="#4A89DC"
                              />
                            </g>

                            <ellipse
                              cx="75"
                              cy="130"
                              rx="32"
                              ry="38"
                              fill="#5D9CEC"
                            />
                            <ellipse
                              cx="75"
                              cy="125"
                              rx="28"
                              ry="30"
                              fill="#4A89DC"
                            />

                            <rect
                              x="55"
                              y="135"
                              width="40"
                              height="18"
                              rx="8"
                              fill="#4A89DC"
                              stroke="#5D9CEC"
                              strokeWidth="2"
                            />

                            <line
                              x1="68"
                              y1="100"
                              x2="68"
                              y2="118"
                              stroke="#fff"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <line
                              x1="82"
                              y1="100"
                              x2="82"
                              y2="118"
                              stroke="#fff"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <circle cx="68" cy="118" r="3" fill="#fff" />
                            <circle cx="82" cy="118" r="3" fill="#fff" />

                            <g className="left-arm">
                              <ellipse
                                cx="40"
                                cy="115"
                                rx="12"
                                ry="28"
                                fill="#5D9CEC"
                              />
                              <ellipse
                                cx="36"
                                cy="140"
                                rx="10"
                                ry="16"
                                fill="#FDBF9C"
                              />
                              <circle cx="34" cy="155" r="9" fill="#FDBF9C" />
                            </g>

                            <g className="right-arm">
                              <ellipse
                                cx="110"
                                cy="115"
                                rx="12"
                                ry="28"
                                fill="#5D9CEC"
                              />
                              <ellipse
                                cx="114"
                                cy="140"
                                rx="10"
                                ry="16"
                                fill="#FDBF9C"
                              />
                              <circle cx="116" cy="155" r="9" fill="#FDBF9C" />
                            </g>

                            <g className="head-move">
                              <ellipse
                                cx="75"
                                cy="52"
                                rx="34"
                                ry="35"
                                fill="#8B5A2B"
                              />
                              <ellipse
                                cx="48"
                                cy="60"
                                rx="12"
                                ry="18"
                                fill="#8B5A2B"
                              />
                              <ellipse
                                cx="102"
                                cy="60"
                                rx="12"
                                ry="18"
                                fill="#8B5A2B"
                              />

                              <ellipse
                                cx="45"
                                cy="55"
                                rx="8"
                                ry="12"
                                fill="#6B4423"
                              />
                              <ellipse
                                cx="105"
                                cy="55"
                                rx="8"
                                ry="12"
                                fill="#6B4423"
                              />

                              <ellipse
                                cx="75"
                                cy="58"
                                rx="28"
                                ry="26"
                                fill="#FDBF9C"
                              />

                              <ellipse
                                cx="55"
                                cy="65"
                                rx="7"
                                ry="4"
                                fill="#FFB6C1"
                                opacity="0.7"
                              />
                              <ellipse
                                cx="95"
                                cy="65"
                                rx="7"
                                ry="4"
                                fill="#FFB6C1"
                                opacity="0.7"
                              />

                              <path
                                d="M62 52 C62 48, 58 45, 55 45 C52 45, 49 48, 49 52 C49 57, 55 62, 55 62 C55 62, 62 57, 62 52Z"
                                fill="#1a1a1a"
                              />
                              <path
                                d="M101 52 C101 48, 97 45, 94 45 C91 45, 88 48, 88 52 C88 57, 94 62, 94 62 C94 62, 101 57, 101 52Z"
                                fill="#1a1a1a"
                              />

                              <circle cx="53" cy="50" r="2.5" fill="#fff" />
                              <circle cx="92" cy="50" r="2.5" fill="#fff" />

                              <path
                                d="M65 72 Q75 82, 85 72"
                                stroke="#1a1a1a"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                fill="none"
                              />

                              <ellipse
                                cx="75"
                                cy="35"
                                rx="28"
                                ry="14"
                                fill="#8B5A2B"
                              />
                              <ellipse
                                cx="60"
                                cy="35"
                                rx="12"
                                ry="10"
                                fill="#7D4E2A"
                              />
                              <ellipse
                                cx="90"
                                cy="35"
                                rx="12"
                                ry="10"
                                fill="#7D4E2A"
                              />
                              <ellipse
                                cx="75"
                                cy="30"
                                rx="8"
                                ry="8"
                                fill="#6B4423"
                              />

                              <ellipse
                                cx="75"
                                cy="28"
                                rx="34"
                                ry="16"
                                fill="#F5B800"
                              />
                              <rect
                                x="41"
                                y="18"
                                width="68"
                                height="14"
                                rx="5"
                                fill="#F5B800"
                              />
                              <ellipse
                                cx="75"
                                cy="18"
                                rx="28"
                                ry="11"
                                fill="#FFD700"
                              />

                              <ellipse
                                cx="75"
                                cy="32"
                                rx="36"
                                ry="8"
                                fill="#E5A800"
                              />

                              <ellipse
                                cx="62"
                                cy="16"
                                rx="14"
                                ry="5"
                                fill="#FFE44D"
                                opacity="0.5"
                              />

                              <circle cx="75" cy="10" r="5" fill="#E5A800" />
                              <circle cx="75" cy="10" r="3" fill="#FFD700" />
                            </g>
                          </g>
                        </svg>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-900 mb-3">
                          Describe your video
                        </label>
                        <textarea
                          value={prompt}
                          onChange={(e) => {
                            promptFromSuggestionRef.current = false;
                            setPrompt(e.target.value);
                          }}
                          placeholder="e.g. Create a 30-second explainer about how solar panels work, professional tone with upbeat background music"
                          rows={5}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none resize-none"
                        />
                        {(() => {
                          const wordCount = prompt
                            .trim()
                            .split(/\s+/)
                            .filter(Boolean).length;
                          const canSuggest = wordCount > 10;
                          return (
                            <div className="flex items-start justify-between mt-2 text-xs text-gray-600 gap-4">
                              <span>
                                Be specific: topic, tone, style, audience
                              </span>
                              <div className="flex flex-col items-end shrink-0">
                                <span>{prompt.length}/500</span>
                                {!canSuggest && prompt.trim().length > 0 && (
                                  <span className="text-amber-400/90 mt-1 text-right max-w-[200px]">
                                    Not enough words
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const currentPrompt = promptRef.current;
                                    const words = currentPrompt
                                      .trim()
                                      .split(/\s+/)
                                      .filter(Boolean);
                                    if (words.length <= 10) {
                                      setError("Not enough words");
                                      return;
                                    }
                                    setSuggesting(true);
                                    setError(null);
                                    try {
                                      const isRefine =
                                        promptFromSuggestionRef.current;
                                      const res = await fetch(
                                        "/api/suggest-prompt",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            prompt: currentPrompt,
                                            refine: isRefine,
                                            durationSeconds: durationSeconds,
                                          }),
                                        },
                                      );
                                      const data = await res.json();
                                      if (!res.ok)
                                        throw new Error(
                                          data.error || "Suggestion failed",
                                        );
                                      if (typeof data.suggestion === "string") {
                                        setPrompt(data.suggestion);
                                        promptFromSuggestionRef.current = true;
                                      }
                                    } catch (err) {
                                      setError(
                                        err instanceof Error
                                          ? err.message
                                          : "Could not get suggestion",
                                      );
                                    } finally {
                                      setSuggesting(false);
                                    }
                                  }}
                                  disabled={suggesting || !canSuggest}
                                  className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
                                >
                                  {suggesting ? (
                                    <>
                                      <svg
                                        className="w-3.5 h-3.5 animate-spin"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        aria-hidden
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="3"
                                        />
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        />
                                      </svg>
                                      Suggesting...
                                    </>
                                  ) : (
                                    <>
                                      <svg
                                        className="w-3.5 h-3.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        aria-hidden
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                        />
                                      </svg>
                                      Suggest prompt
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="flex flex-wrap gap-2 mt-4">
                          {[
                            {
                              label: "Product demo",
                              prompt:
                                "Create a 30-second product demo video highlighting key features and benefits, professional and confident tone, upbeat background music.",
                            },
                            {
                              label: "Promo / ad",
                              prompt:
                                "Create a 30-second promo video for a fitness app launch, energetic and motivational tone, punchy visuals and strong call-to-action.",
                            },
                            {
                              label: "Company intro",
                              prompt:
                                "Create a 30-second company introduction video, who we are and what we do, professional and trustworthy tone.",
                            },
                            {
                              label: "Social proof",
                              prompt:
                                "Create a 30-second customer success story or testimonial style video, authentic and inspiring tone.",
                            },
                            {
                              label: "Event recap",
                              prompt:
                                "Create a 30-second event recap video, key moments and highlights, dynamic and celebratory tone.",
                            },
                            {
                              label: "Quick tip",
                              prompt:
                                "Create a 30-second quick tip video on improving productivity, concise and actionable, friendly expert tone.",
                            },
                          ].map(({ label, prompt: p }) => (
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
                          <label className="block text-sm font-medium text-gray-900 mb-3">
                            Video length (seconds)
                          </label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min={DURATION_MIN}
                              max={DURATION_MAX}
                              value={durationSeconds}
                              onChange={(e) =>
                                setDurationSeconds(Number(e.target.value))
                              }
                              className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <input
                              type="number"
                              min={DURATION_MIN}
                              max={DURATION_MAX}
                              value={durationSeconds}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isNaN(v))
                                  setDurationSeconds(
                                    Math.min(DURATION_MAX, Math.max(DURATION_MIN, v)),
                                  );
                              }}
                              className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-sm text-gray-500">sec</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {DURATION_MIN}-{DURATION_MAX} seconds. Talking object videos over 8s use
                            multiple clips.
                          </p>
                        </div>

                        <div className="mt-6">
                          <label className="block text-sm font-medium text-gray-900 mb-3">
                            Video style
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setMode("slideshow")}
                              className={`p-4 rounded-xl border text-left transition-all ${mode === "slideshow"
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-zinc-800 hover:border-zinc-700"
                                }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === "slideshow"
                                    ? "border-blue-500"
                                    : "border-zinc-700"
                                    }`}
                                >
                                  {mode === "slideshow" && (
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  )}
                                </div>
                                <span className="text-sm font-medium text-white">
                                  Slideshow
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed">
                                Ken Burns slideshow with images and voiceover
                              </p>
                            </button>
                            <button
                              onClick={() => setMode("talking_object")}
                              className={`p-4 rounded-xl border text-left transition-all ${mode === "talking_object"
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-zinc-800 hover:border-zinc-700"
                                }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === "talking_object"
                                    ? "border-blue-500"
                                    : "border-zinc-700"
                                    }`}
                                >
                                  {mode === "talking_object" && (
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  )}
                                </div>
                                <span className="text-sm font-medium text-white">
                                  Talking object
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed">
                                Object with a face that speaks and lip-syncs
                              </p>
                            </button>
                          </div>

                          {mode === "talking_object" && (
                            <div className="mt-3 pl-1">
                              <p className="text-xs font-medium text-gray-500 mb-2">
                                Talking style
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setTalkingObjectStyle("cartoon")}
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${talkingObjectStyle === "cartoon"
                                    ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                                    : "border-zinc-700 text-gray-500 hover:border-zinc-600 hover:text-gray-600"
                                    }`}
                                >
                                  {talkingObjectStyle === "cartoon" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  )}
                                  Cartoon
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTalkingObjectStyle("real")}
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${talkingObjectStyle === "real"
                                    ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                                    : "border-zinc-700 text-gray-500 hover:border-zinc-600 hover:text-gray-600"
                                    }`}
                                >
                                  {talkingObjectStyle === "real" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  )}
                                  Real person
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1.5">
                                Choose cartoon character or realistic human for
                                the talking avatar.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-white mb-2">
                            Captions
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setCaptions("on")}
                              className={`p-3 rounded-xl border text-left transition-all ${captions === "on"
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-zinc-800 hover:border-zinc-700"
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${captions === "on" ? "border-blue-500" : "border-zinc-700"}`}
                                >
                                  {captions === "on" && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  )}
                                </div>
                                <span className="text-sm font-medium text-white">
                                  With captions
                                </span>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setCaptions("off")}
                              className={`p-3 rounded-xl border text-left transition-all ${captions === "off"
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-zinc-800 hover:border-zinc-700"
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${captions === "off" ? "border-blue-500" : "border-zinc-700"}`}
                                >
                                  {captions === "off" && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  )}
                                </div>
                                <span className="text-sm font-medium text-white">
                                  No captions
                                </span>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="inline-flex items-center gap-1.5">
                            <svg
                              className="w-4 h-4 shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
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
                          onClick={handleSubmit}
                          disabled={
                            !prompt.trim() ||
                            prompt.trim().length < 5 ||
                            submitting ||
                            !canGenerateByPlan
                          }
                          className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {submitting ? (
                            <>
                              <svg
                                className="w-4 h-4 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              Starting...
                            </>
                          ) : (
                            <>
                              Generate
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
                              </svg>
                            </>
                          )}
                        </button>
                        {!canGenerateByPlan && (
                          <div className="basis-full text-right">
                            <p className="text-xs text-amber-300">
                              {planLimitMessage ?? "Plan limit reached."}
                              {!isEnterprisePlan(usagePlan) ? (
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
                </div>
              )}

              {!isGenerating && (
                <div className="max-w-4xl mx-auto mt-12 flex flex-wrap justify-center gap-8 sm:gap-16 text-center relative z-10">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      No credit card
                    </div>
                    <div className="text-sm text-gray-500">To get started</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      Up to 60 sec
                    </div>
                    <div className="text-sm text-gray-500">Per video</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      No watermarks
                    </div>
                    <div className="text-sm text-gray-500">Use anywhere</div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section id="features" className="pt-32 pb-32 px-4 sm:px-6 xl:px-10 2xl:px-14">
            <div className="max-w-[min(1680px,96vw)] mx-auto">
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-gray-200 bg-white text-[13px] font-semibold tracking-wider text-gray-700 uppercase">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Built In Features
                </div>
              </div>

              <h2
                className="text-center text-3xl sm:text-4xl md:text-[46px] italic font-normal text-gray-900 leading-tight max-w-3xl mx-auto mb-12"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", ui-serif, serif',
                }}
              >
                An entire stack of tools that turn your{" "}
                <span className="not-italic inline-flex items-center justify-center p-2 rounded-lg border border-purple-400/30 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.4),0_0_30px_rgba(168,85,247,0.15)] align-middle mx-1">
                  🎬
                </span>{" "}
                ideas into videos
              </h2>

              <div className="flex flex-wrap justify-center gap-2 mb-14">
                {FEATURE_TABS.map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveFeatureTab(i)}
                    className={`px-5 py-2.5 rounded-full text-sm transition-all duration-200 ${activeFeatureTab === i
                      ? "bg-gray-900 text-white font-semibold"
                      : "text-gray-500 hover:text-gray-900"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {(() => {
                const d = FEATURE_TAB_DATA[activeFeatureTab];
                return (
                  <div
                    key={activeFeatureTab}
                    className="grid md:grid-cols-3 gap-5 animate-fade-in"
                  >
                    <div className="rounded-3xl border border-gray-200 bg-white p-8 pb-6 flex flex-col min-h-[540px]">
                      <span className="text-[40px] font-extralight leading-none text-gray-400 mb-5">
                        1
                      </span>
                      <h3 className="text-[22px] font-bold text-gray-900 mb-3 leading-snug">
                        {d.card1.title}
                      </h3>
                      <p className="text-[14px] text-gray-500 leading-relaxed">
                        {d.card1.desc}
                      </p>

                      <div className="mt-auto pt-10 relative h-[260px]">
                        <div className="absolute left-0 bottom-0 w-[82%] min-h-[140px] bg-gray-100 border border-gray-200 rounded-2xl p-5 shadow-lg flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                            <svg
                              className="w-6 h-6 text-gray-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-500">
                              {d.card1.mainLabel}
                            </p>
                            <p className="text-[22px] font-bold text-gray-900 tracking-tight leading-none mt-0.5">
                              {d.card1.mainValue}
                            </p>
                          </div>
                        </div>

                        <div className="absolute right-2 bottom-[100px] z-10 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <svg
                              className="w-4 h-4 text-emerald-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[17px] font-bold text-gray-900 leading-none">
                              {d.card1.statValue}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {d.card1.statLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-gray-200 bg-white p-8 pb-6 flex flex-col min-h-[540px]">
                      <span className="text-[40px] font-extralight leading-none text-gray-400 mb-5">
                        2
                      </span>
                      <h3 className="text-[22px] font-bold text-gray-900 mb-3 leading-snug whitespace-pre-line">
                        {d.card2.title}
                      </h3>
                      <p className="text-[14px] text-gray-500 leading-relaxed">
                        {d.card2.desc}
                      </p>

                      <div className="mt-auto pt-10 relative h-[200px]">
                        <div className="absolute left-0 top-0 w-[62%] bg-gray-100 border border-gray-200 rounded-2xl overflow-hidden shadow-lg z-10">
                          {d.card2.list.map((item, li) => (
                            <div
                              key={li}
                              className={`flex items-center justify-between px-4 py-2.5 ${li < d.card2.list.length - 1 ? "border-b border-gray-200" : ""}`}
                            >
                              <span
                                className={`text-[13px] ${li === 0 ? "font-medium text-gray-900" : item.count ? "text-gray-500" : "text-gray-500"}`}
                              >
                                {item.name}
                              </span>
                              {item.count && (
                                <span
                                  className={`w-[22px] h-[22px] rounded-full text-[10px] font-bold flex items-center justify-center ${item.active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-gray-600"}`}
                                >
                                  {item.count}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="absolute right-0 bottom-0 w-[72%] bg-white border border-gray-200 rounded-2xl p-3.5 shadow-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                              <svg
                                className="w-5 h-5 text-blue-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"
                                />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                                {d.card2.product.name}
                              </p>
                              <p className="text-[11px] text-gray-500 leading-snug mt-1">
                                {d.card2.product.detail}
                              </p>
                              <p className="text-[14px] font-bold text-gray-900 mt-2">
                                {d.card2.product.badge}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-gray-200 bg-white p-8 pb-6 flex flex-col min-h-[540px]">
                      <span className="text-[40px] font-extralight leading-none text-gray-400 mb-5">
                        3
                      </span>
                      <h3 className="text-[22px] font-bold text-gray-900 mb-3 leading-snug">
                        {d.card3.title}
                      </h3>
                      <p className="text-[14px] text-gray-500 leading-relaxed">
                        {d.card3.desc}
                      </p>

                      <div className="mt-auto pt-10 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                          <span className="text-[13px] text-gray-900">
                            {d.card3.dd1}
                          </span>
                          <svg
                            className="w-4 h-4 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                          <span className="text-[13px] text-gray-900">
                            {d.card3.dd2}
                          </span>
                          <svg
                            className="w-4 h-4 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>

                        <div className="mt-1">
                          <p className="text-[15px] font-bold text-gray-900 mb-1">
                            {d.card3.infoTitle}
                          </p>
                          <p className="text-[12px] text-gray-500 leading-relaxed">
                            {d.card3.infoDesc}
                          </p>
                        </div>

                        <div className="flex justify-end mt-1">
                          <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-[13px] text-white font-medium shadow-md">
                            <svg
                              className="w-3.5 h-3.5 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                              />
                            </svg>
                            {d.card3.btn}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          <section
            ref={howSectionRef}
            id="how"
            className="pt-32 pb-36 px-4 sm:px-6 xl:px-10 2xl:px-14 bg-[#F9FAFB]"
          >
            <div className="max-w-[min(1680px,96vw)] mx-auto text-center">
              <div className="mb-8">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                  How it works
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  From idea to video in minutes
                </h2>
              </div>

              <div className="w-full max-w-2xl aspect-video rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-md flex items-center justify-center mx-auto">
                <ImagePlayer
                  images={HOW_IT_WORKS_IMAGES}
                  interval={200}
                  renderImage={(src) => (
                    <Image
                      src={src}
                      width={400}
                      height={300}
                      className="size-full h-auto max-h-full max-w-full object-cover inline-block align-middle"
                      alt="How Cutline works"
                    />
                  )}
                />
              </div>
            </div>
          </section>

          <section
            id="pricing"
            className="pt-36 pb-32 px-4 sm:px-6 xl:px-10 2xl:px-14 relative overflow-hidden"
          >
            <div
              className="absolute inset-0 flex items-start justify-center pointer-events-none select-none"
              aria-hidden
            >
              <span
                className="text-[12rem] sm:text-[16rem] md:text-[20rem] font-black uppercase tracking-wider text-gray-200 leading-none mt-8"
                style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
              >
                PRICING
              </span>
            </div>

            <div className="max-w-[min(1680px,96vw)] mx-auto relative z-10">
              <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-start mb-16">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                    Our pricing plans
                  </h2>
                </div>

                <div className="hidden lg:block" />

                <div className="flex items-end lg:items-center lg:pt-8">
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                    Here are three different plans tailored to Beginner,
                    Professional, and Enterprise levels for your AI video
                    solution:
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {PRICING.map((plan) => {
                  const price = plan.monthlyPrice;
                  return (
                    <div
                      key={plan.name}
                      className={`relative rounded-2xl border p-6 flex flex-col ${plan.highlighted
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-gray-200 bg-white"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div
                          className={`w-11 h-11 rounded-xl border flex items-center justify-center ${plan.highlighted ? "border-amber-400 bg-amber-100" : "border-gray-200 bg-gray-100"}`}
                        >
                          {plan.icon === "beginner" && (
                            <svg
                              className="w-5 h-5 text-gray-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342"
                              />
                            </svg>
                          )}
                          {plan.icon === "professional" && (
                            <svg
                              className="w-5 h-5 text-gray-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.04 6.04 0 01-4.27 1.772 6.04 6.04 0 01-4.27-1.772"
                              />
                            </svg>
                          )}
                          {plan.icon === "enterprise" && (
                            <svg
                              className="w-5 h-5 text-gray-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-gray-900">
                            {price}
                          </span>
                          <span className="text-sm text-gray-500">/ Per Month</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-1.5">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed mb-6">
                        {plan.description}
                      </p>

                      <div
                        className={`rounded-xl border p-5 mt-auto ${plan.highlighted ? "border-amber-200 bg-amber-50/30" : "border-gray-200 bg-gray-50/50"}`}
                      >
                        <a
                          href={plan.href}
                          className={`flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-all text-sm mb-5 ${plan.highlighted
                            ? "bg-gray-900 text-white hover:bg-gray-800"
                            : "border border-gray-300 text-gray-900 hover:bg-gray-100"
                            }`}
                        >
                          {plan.cta}
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                        </a>

                        <div className="border-t border-gray-200 pt-5">
                          <p className="text-sm font-bold text-gray-900 mb-4">
                            Features:
                          </p>
                          <ul className="space-y-3">
                            {plan.features.map((feature, fi) => (
                              <li
                                key={fi}
                                className="flex items-center gap-3 text-sm text-gray-600"
                              >
                                <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center shrink-0">
                                  <svg
                                    className="w-3 h-3 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="pt-32 pb-32 px-4 sm:px-6 xl:px-10 2xl:px-14">
            <div className="max-w-[min(1680px,96vw)] mx-auto">
              <div className="rounded-3xl bg-white border border-gray-200 overflow-hidden px-6 sm:px-12 lg:px-20 py-16 sm:py-20 shadow-sm">
                <div className="text-center mb-14">
                  <div className="inline-flex items-center gap-2 text-teal-600 text-sm font-semibold tracking-wider uppercase mb-5">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    PAIN POINT
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-[42px] font-bold text-gray-900 leading-tight">
                    Video Creation Is Slower
                    <br />
                    Than It Should Be
                  </h2>
                </div>

                <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
                  <div className="relative">
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background:
                          "linear-gradient(135deg, #0d9488 0%, #14b8a6 30%, #2dd4bf 60%, #5eead4 100%)",
                      }}
                    >
                      <div className="p-6 pt-5 pb-0 relative">
                        <div className="flex justify-center mb-5">
                          <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm text-gray-900 text-xs font-semibold px-4 py-2 rounded-full shadow-sm">
                            <span className="text-base">🎬</span>
                            Speed up workflow
                          </div>
                        </div>

                        <div className="bg-white rounded-t-xl shadow-2xl shadow-black/30 mx-auto max-w-sm">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">✦</span>
                              <span className="text-sm font-bold text-zinc-900">
                                AI Director
                              </span>
                            </div>
                            <button className="text-gray-500 hover:text-gray-600 text-lg leading-none">
                              &times;
                            </button>
                          </div>

                          <div className="px-4 py-4 space-y-4">
                            <p className="text-xs font-semibold text-gray-500">
                              You
                            </p>

                            <div className="flex items-start gap-2 justify-end">
                              <div className="bg-zinc-100 rounded-xl rounded-tr-sm px-3.5 py-2.5 max-w-[220px]">
                                <p className="text-sm text-zinc-800 leading-snug">
                                  Create a product demo for our new SaaS platform.
                                </p>
                              </div>
                              <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0 text-xs">
                                🎥
                              </div>
                            </div>

                            <p className="text-xs font-semibold text-gray-500">
                              AI Director
                            </p>

                            <div className="flex items-start gap-2">
                              <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                                <span className="text-gray-700 text-xs">✦</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div className="h-1.5 bg-teal-200 rounded-full w-16"></div>
                                  <div className="h-1.5 bg-teal-100 rounded-full w-10"></div>
                                  <span className="text-xs text-teal-600 italic">
                                    writing...
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-gray-500 pt-1 pb-2">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                                />
                              </svg>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 001.302-4.665c0-1.194-.232-2.333-.654-3.375z"
                                />
                              </svg>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    {[
                      {
                        icon: "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z",
                        iconBg: "bg-orange-500/20 text-orange-400",
                        title: "Manual video editing eats up hours",
                        desc: "Writing scripts, sourcing visuals, and editing timelines is time-consuming. Our AI generates polished, ready-to-share videos instantly from a single prompt.",
                      },
                      {
                        icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z",
                        iconBg: "bg-gray-200 text-gray-700",
                        title: "Multi-format output is confusing",
                        desc: "Different platforms need different sizes, lengths, and formats. Cutline auto-exports for every channel in one click - no manual cropping needed.",
                      },
                      {
                        icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
                        iconBg: "bg-gray-200 text-gray-700",
                        title: "Scaling content requires extra resources",
                        desc: "Hiring editors, voiceover artists, and motion designers is expensive. Cutline replaces the entire production team with a single AI pipeline.",
                      },
                    ].map((point, i) => (
                      <button
                        key={i}
                        onClick={() => setActivePainPoint(i)}
                        className={`w-full text-left rounded-xl border transition-all duration-300 ${activePainPoint === i
                          ? "border-gray-200 bg-gray-100 p-5"
                          : "border-transparent bg-transparent px-5 py-4 hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activePainPoint === i ? point.iconBg : "bg-gray-200 text-gray-500"}`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d={point.icon}
                              />
                            </svg>
                          </div>
                          <span
                            className={`font-semibold text-[15px] ${activePainPoint === i ? "text-gray-900" : "text-gray-500"}`}
                          >
                            {point.title}
                          </span>
                        </div>
                        {activePainPoint === i && (
                          <p className="text-sm text-gray-500 leading-relaxed mt-3 ml-11 animate-fade-in">
                            {point.desc}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </motion.div>
      </main>

      <motion.div
        initial={false}
        animate={{
          opacity: heroScrollComplete ? 1 : 0,
          pointerEvents: heroScrollComplete ? "auto" : "none",
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <TestimonialV2 />
        <HomeFooter />
      </motion.div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
