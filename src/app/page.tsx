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
  FEATURE_TAB_PREVIEWS,
  PRICING,
} from "@/constants/landing";
import { DURATION_MIN, DURATION_MAX } from "@/lib/validation/duration";
import { isEnterprisePlan, isPlanId, type PlanId } from "@/lib/plans";
import { HERO_IMAGES } from "@/components/ui/scroll-morph-hero";
import { motion } from "framer-motion";
import Image from "next/image";
import { ImagePlayer } from "@/components/image-player";
import TestimonialV2 from "@/components/ui/testimonial-v2";
import { authClient, useCachedSession } from "@/lib/auth-client";
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
  const { data: sessionData, isPending: sessionPending } = useCachedSession();
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
  const [defaultScriptModel, setDefaultScriptModel] = useState<string | null>(
    null,
  );
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [heroScrollComplete] = useState(true);

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
      <header className="fixed top-0 left-0 right-0 z-50 font-sans">
        <div className="bg-[#0a0a0a] text-white">
          <div className="max-w-[1440px] mx-auto h-9 px-5 sm:px-8 flex items-center justify-center gap-2 text-[11.5px] tracking-[0.02em]">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="font-semibold uppercase tracking-[0.16em]">Live</span>
            </span>
            <span className="text-white/30" aria-hidden>·</span>
            <span className="text-white/85 hidden sm:inline">Public beta — generate your first video free</span>
            <span className="text-white/85 sm:hidden">Public beta — free during launch</span>
            <Link href="/generate" className="ml-1 inline-flex items-center gap-1 text-white hover:text-emerald-300 transition-colors">
              <span className="font-semibold">Try it</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>

        <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200/70">
          <div className="max-w-[1440px] mx-auto flex items-center px-5 sm:px-8 h-[60px]">
            <Link href="/" className="flex items-center gap-2 shrink-0 mr-7 sm:mr-9 group">
              <span className="relative inline-flex w-8 h-8 rounded-[8px] overflow-hidden bg-[#0a0a0a] ring-1 ring-black/5">
                <Image
                  src="/cutline-logo.png"
                  alt=""
                  width={1280}
                  height={720}
                  priority
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: "78% 50%" }}
                />
              </span>
              <span className="text-[15.5px] font-semibold tracking-[-0.02em] text-[#0a0a0a]">Cutline</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link href="/#features" className="px-3 py-1.5 text-[13.5px] font-medium text-[#3f3f46] hover:text-[#0a0a0a] transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="px-3 py-1.5 text-[13.5px] font-medium text-[#3f3f46] hover:text-[#0a0a0a] transition-colors">
                Pricing
              </Link>
              <Link href="/#how" className="px-3 py-1.5 text-[13.5px] font-medium text-[#3f3f46] hover:text-[#0a0a0a] transition-colors">
                How it works
              </Link>
              {isLoggedIn && sessionUser ? (
                <Link href="/dashboard" className="px-3 py-1.5 text-[13.5px] font-medium text-[#3f3f46] hover:text-[#0a0a0a] transition-colors">
                  Dashboard
                </Link>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <a href="https://github.com/parbhatkapila4/cutline" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-md text-[#71717a] hover:text-[#0a0a0a] hover:bg-gray-100/70 transition-colors">
                <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="currentColor" aria-hidden>
                  <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.438 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12.5c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
              <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" aria-label="Discord" className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-md text-[#71717a] hover:text-[#0a0a0a] hover:bg-gray-100/70 transition-colors">
                <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="currentColor" aria-hidden>
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0188 1.3332-.946 2.4189-2.1569 2.4189zm7.9748 0c-1.1826 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                </svg>
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X" className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-md text-[#71717a] hover:text-[#0a0a0a] hover:bg-gray-100/70 transition-colors">
                <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-md text-[#71717a] hover:text-[#0a0a0a] hover:bg-gray-100/70 transition-colors">
                <svg viewBox="0 0 24 24" className="w-[14px] h-[14px]" fill="currentColor" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-md text-[#71717a] hover:text-[#0a0a0a] hover:bg-gray-100/70 transition-colors">
                <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="currentColor" aria-hidden>
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>

              <span className="hidden sm:block w-px h-5 bg-gray-200/80 mx-2" aria-hidden />

              {sessionPending ? (
                <div className="h-8 w-[180px] bg-gray-100 rounded-full animate-pulse" aria-hidden />
              ) : isLoggedIn && sessionUser ? (
                <div ref={accountMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((v) => !v)}
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                  >
                    {typeof sessionUser.image === "string" && sessionUser.image.trim() ? (
                      <img src={sessionUser.image} alt="" width={24} height={24} className="w-6 h-6 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10.5px] font-semibold text-gray-600 shrink-0">
                        {(sessionUser.name?.trim()?.[0] ?? sessionUser.email?.trim()?.[0] ?? "?").toUpperCase()}
                      </span>
                    )}
                    <span className="text-[13px] font-medium text-[#0a0a0a] max-w-[120px] truncate">
                      {sessionUser.name?.trim() || sessionUser.email?.trim() || "Account"}
                    </span>
                  </button>
                  {accountMenuOpen ? (
                    <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-40 min-w-[180px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-[0_16px_32px_-20px_rgba(0,0,0,0.55)]">
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
                <>
                  <Link
                    href="/signin"
                    className="hidden sm:inline-flex items-center px-4 py-2 rounded-full border border-gray-300 hover:border-gray-400 bg-white text-[12px] font-bold tracking-[0.06em] uppercase text-[#0a0a0a] transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/generate"
                    className="inline-flex items-center px-4 py-2 rounded-full bg-[#0a0a0a] hover:bg-black text-white text-[12px] font-bold tracking-[0.06em] uppercase shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] transition-colors"
                  >
                    Try for free
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative min-h-screen flex items-center w-full pt-32 pb-16 px-4 sm:px-6 lg:px-12 overflow-hidden">
          <div
            className="absolute inset-0 -z-10 pointer-events-none"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(15,23,42,0.04), transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0 -z-10 pointer-events-none opacity-[0.025]"
            aria-hidden
            style={{
              backgroundImage:
                "linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            }}
          />

          <div className="max-w-[min(1680px,96vw)] mx-auto w-full font-sans">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
              <div className="relative">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200/80 bg-white/70 backdrop-blur-sm text-[11px] font-medium tracking-[0.14em] text-[#52525b] uppercase shadow-[0_1px_2px_rgba(15,23,42,0.04)] mb-8"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  AI Video Director
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.05 }}
                  className="text-balance leading-[0.94] text-[clamp(3.25rem,8.4vw,7.5rem)] text-[#0a0a0a]"
                >
                  <span
                    className="block italic font-normal tracking-[-0.025em]"
                    style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                  >
                    One sentence in.
                  </span>
                  <span className="block font-semibold tracking-[-0.055em]">
                    One video out.
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.18 }}
                  className="mt-8 text-[17.5px] sm:text-[19px] text-[#52525b] max-w-[46ch] leading-[1.55] tracking-[-0.008em]"
                >
                  A finished 30-60 second MP4: script, voice, captions, b-roll, and score, rendered in a single pass.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.32 }}
                  className="mt-10 flex flex-wrap items-center gap-2"
                >
                  <a
                    href="/generate"
                    className="group relative inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#0a0a0a] text-white text-[14.5px] font-semibold tracking-[-0.005em] shadow-[0_10px_30px_-10px_rgba(15,23,42,0.6)] hover:bg-black transition-all hover:shadow-[0_16px_36px_-12px_rgba(15,23,42,0.6)] hover:-translate-y-0.5"
                  >
                    Create your first video
                    <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </a>
                  <a
                    href="#how"
                    className="group inline-flex items-center gap-2 px-5 py-3.5 rounded-full text-[#3f3f46] text-[14.5px] font-semibold tracking-[-0.005em] hover:text-[#0a0a0a] transition-colors"
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 bg-white group-hover:border-gray-400 transition-colors">
                      <svg className="w-2.5 h-2.5 text-[#0a0a0a] translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    See it work
                  </a>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="mt-12 flex items-center gap-3"
                >
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <div className="font-mono text-[11px] tracking-[0.04em] text-[#71717a] flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span><span className="text-[#0a0a0a] font-semibold">~60s</span> render</span>
                    <span className="text-gray-300" aria-hidden>/</span>
                    <span><span className="text-[#0a0a0a] font-semibold">1080p</span> HD</span>
                    <span className="text-gray-300" aria-hidden>/</span>
                    <span><span className="text-[#0a0a0a] font-semibold">30+</span> languages</span>
                    <span className="text-gray-300" aria-hidden>/</span>
                    <span><span className="text-[#0a0a0a] font-semibold">MP4</span> · 4K-ready</span>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative w-full max-w-[640px] aspect-square mx-auto"
              >

                <div className="absolute inset-0 animate-[spin_70s_linear_infinite]">
                  {HERO_IMAGES.map((src, i) => {
                    const total = HERO_IMAGES.length;
                    const angle = (i / total) * 360 - 90;
                    const radius = 44;
                    const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
                    const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
                    const tilt = ((i * 53) % 18) - 9;
                    return (
                      <div
                        key={i}
                        className="absolute"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: "13%",
                          aspectRatio: "3 / 4",
                          transform: `translate(-50%, -50%) rotate(${tilt}deg)`,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover rounded-xl shadow-[0_10px_28px_-12px_rgba(15,23,42,0.3),0_4px_12px_-4px_rgba(15,23,42,0.15)] ring-1 ring-black/5"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="absolute inset-0 pointer-events-none">
                  {["Script", "Voice", "Scenes", "B-roll", "Captions", "Music", "Final"].map((stage, i) => {
                    const angle = (i / 7) * 360 - 90;
                    const radius = 28;
                    const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
                    const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
                    return (
                      <span
                        key={stage}
                        className="absolute text-[9.5px] font-semibold tracking-[0.2em] uppercase text-[#71717a] whitespace-nowrap"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {stage}
                      </span>
                    );
                  })}
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-12 font-sans">
                  <div
                    className="absolute inset-[27%] rounded-full bg-white ring-1 ring-gray-200/70"
                    aria-hidden
                  />
                  <div className="relative z-10">
                    <p className="text-[clamp(1rem,1.7vw,1.35rem)] font-semibold text-[#0a0a0a] tracking-[-0.025em] leading-tight">
                      Brief. Assembly. Master.
                    </p>
                    <p className="mt-2.5 text-[10px] font-medium tracking-[0.28em] uppercase text-[#a1a1aa]">
                      Cutline pipeline
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
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

          <section id="features" className="relative pt-32 pb-32 px-4 sm:px-6 xl:px-10 2xl:px-14 overflow-hidden">
            <div
              className="absolute inset-0 -z-10 pointer-events-none"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(99,102,241,0.06), transparent 65%)",
              }}
            />
            <div className="max-w-[min(1680px,96vw)] mx-auto">
              <div className="flex justify-center mb-7">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm text-[11px] font-semibold tracking-[0.18em] text-gray-600 uppercase shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                  </span>
                  Built-in features
                </div>
              </div>

              <h2
                className="text-center text-[2rem] sm:text-[2.75rem] md:text-[3.25rem] font-normal text-gray-900 leading-[1.08] max-w-3xl mx-auto mb-5 tracking-[-0.025em]"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", ui-serif, serif',
                }}
              >
                An entire stack of tools that turn your{" "}
                <span className="italic">ideas</span> into{" "}
                <span className="italic relative whitespace-nowrap">
                  videos
                  <svg
                    className="absolute left-0 -bottom-2 w-full h-2"
                    viewBox="0 0 120 8"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id="features-underline" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#a78bfa" />
                        <stop offset="1" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 2 5 Q 60 1 118 5"
                      stroke="url(#features-underline)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </span>
                .
              </h2>
              <p className="text-center text-[15px] text-gray-500 max-w-xl mx-auto mb-12 leading-relaxed">
                Pick your role: every stage of the pipeline tunes itself for what you actually ship.
              </p>

              <div className="flex justify-center mb-14">
                <div className="inline-flex flex-wrap items-center justify-center gap-1 p-1 rounded-full bg-gray-100/80 border border-gray-200/70 backdrop-blur-sm">
                  {FEATURE_TABS.map((tab, i) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFeatureTab(i)}
                      className="relative px-4 py-2 rounded-full text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    >
                      {activeFeatureTab === i && (
                        <motion.span
                          layoutId="feature-tab-pill"
                          className="absolute inset-0 bg-gray-900 rounded-full shadow-[0_2px_10px_rgba(15,23,42,0.18)]"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span
                        className={`relative z-10 transition-colors ${activeFeatureTab === i ? "text-white" : "text-gray-600 hover:text-gray-900"}`}
                      >
                        {tab}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const d = FEATURE_TAB_DATA[activeFeatureTab];
                const p = FEATURE_TAB_PREVIEWS[activeFeatureTab];
                const cardBase =
                  "group relative rounded-3xl border border-gray-200/80 bg-white p-6 flex flex-col transition-all duration-300 hover:border-gray-300 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.18)] hover:-translate-y-0.5";
                const toneClasses: Record<typeof p.card1.status.tone, { bg: string; border: string; text: string; dot: string }> = {
                  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
                  sky: { bg: "bg-sky-50", border: "border-sky-100", text: "text-sky-700", dot: "bg-sky-500" },
                  rose: { bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
                  violet: { bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
                  amber: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
                };
                const settingIcon: Record<"resolution" | "format" | "captions" | "fps", string> = {
                  resolution: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15",
                  format: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25M5.25 21h13.5A2.25 2.25 0 0021 18.75V8.625a2.25 2.25 0 00-.659-1.591L14.41 1.859A2.25 2.25 0 0012.659 1.5H5.25A2.25 2.25 0 003 3.75v15A2.25 2.25 0 005.25 21z",
                  captions: "M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
                  fps: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
                };
                const variationGradients = [
                  "from-violet-300 to-indigo-400",
                  "from-pink-300 to-rose-400",
                  "from-amber-300 to-orange-400",
                  "from-emerald-300 to-teal-400",
                  "from-sky-300 to-blue-400",
                  "from-fuchsia-300 to-purple-400",
                ];
                const card1Tone = toneClasses[p.card1.status.tone];
                const card2Tone = toneClasses[p.card2.status.tone];
                const card3Tone = toneClasses[p.card3.status.tone];
                return (
                  <div
                    key={activeFeatureTab}
                    className="grid md:grid-cols-3 gap-5 animate-fade-in"
                  >
                    {/* Card 1: Script */}
                    <div className={cardBase}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-[3px] w-10 h-10 rounded-[9px] bg-white border border-gray-200 shadow-[0_2px_6px_-1px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] p-2">
                            <div className="flex items-center gap-[2px]">
                              <span className="w-[3px] h-[3px] rounded-full bg-red-300" />
                              <span className="w-[3px] h-[3px] rounded-full bg-amber-300" />
                              <span className="w-[3px] h-[3px] rounded-full bg-emerald-300" />
                            </div>
                            <div className="flex-1 flex flex-col justify-center gap-[2.5px]">
                              <span className="h-[1.5px] rounded-full bg-gray-200 w-full" />
                              <span className="h-[1.5px] rounded-full bg-violet-500 w-[70%]" />
                              <span className="h-[1.5px] rounded-full bg-gray-200 w-[85%]" />
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Stage 01</div>
                            <h3 className="text-[1.0625rem] font-semibold text-gray-900 leading-tight tracking-[-0.01em] mt-0.5">
                              {d.card1.title}
                            </h3>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${card1Tone.bg} border ${card1Tone.border} text-[10px] font-bold ${card1Tone.text}`}>
                          <span className={`w-1 h-1 rounded-full ${card1Tone.dot} animate-pulse`} />
                          {p.card1.status.label}
                        </span>
                      </div>

                      <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
                        {d.card1.desc}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {p.card1.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-[10.5px] font-medium text-gray-600"
                          >
                            <span className="w-1 h-1 rounded-full bg-violet-400" />
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="relative flex-1 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50/60 overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
                        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200/70 bg-white/60">
                          <span className="w-2 h-2 rounded-full bg-red-300/70" />
                          <span className="w-2 h-2 rounded-full bg-amber-300/70" />
                          <span className="w-2 h-2 rounded-full bg-emerald-300/70" />
                          <div className="ml-2.5 flex items-center gap-0.5">
                            <span className="px-1.5 text-[10px] font-bold text-gray-500 rounded">B</span>
                            <span className="px-1.5 text-[10px] italic text-gray-500 rounded">I</span>
                            <span className="px-1.5 text-[10px] font-medium text-gray-500 rounded underline">U</span>
                          </div>
                          <span className="ml-auto text-[10px] font-mono text-gray-400 truncate max-w-[55%]">{p.card1.filename}</span>
                        </div>

                        <div className="px-3.5 py-3 space-y-1.5">
                          {p.card1.lines.map((line, i) => (
                            <div key={i} className="flex items-baseline gap-2.5">
                              <span className="text-[9.5px] tabular-nums text-gray-300 w-3 shrink-0 text-right">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span
                                className={
                                  line.emphasis
                                    ? "text-[11px] leading-snug text-violet-700 italic"
                                    : "text-[11px] leading-snug text-gray-700"
                                }
                              >
                                {line.text}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="px-3.5 py-2 border-t border-gray-200/70 bg-white/60 flex items-center gap-2 text-[10px]">
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            <span className="font-semibold text-gray-900 tabular-nums">{d.card1.mainValue}</span>
                          </div>
                          <span className="text-gray-200">·</span>
                          <span className="text-gray-500 tabular-nums">{p.card1.readTime}</span>
                          <span className="ml-auto inline-flex items-center gap-1 text-emerald-600 font-semibold tabular-nums">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3l7.5 7.5M12 3v18" /></svg>
                            {p.card1.stat.value}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-2.5 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <svg className="w-3 h-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.814a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
                          <span className="text-[10px] font-semibold text-violet-700">{p.card1.aiHint.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-700 leading-snug">{p.card1.aiHint.body}</p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {variationGradients.slice(0, Math.min(p.card1.variations, 3)).map((g, i) => (
                              <div key={i} className={`w-5 h-5 rounded-full ring-2 ring-white bg-gradient-to-br ${g}`} />
                            ))}
                          </div>
                          <span className="text-[11px] text-gray-500 tabular-nums">{p.card1.variations} variations</span>
                        </div>
                        <span className="text-[11px] font-medium text-gray-500 tabular-nums">{p.card1.stat.label}</span>
                      </div>
                    </div>

                    {/* Card 2: Visuals */}
                    <div className={cardBase}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10">
                            <span className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300 ring-1 ring-white shadow-[0_1px_3px_rgba(15,23,42,0.12)] origin-bottom-left -rotate-[10deg] translate-x-[2px] translate-y-[1px]" />
                            <span className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-violet-300 via-indigo-300 to-purple-400 ring-1 ring-white shadow-[0_1px_3px_rgba(15,23,42,0.12)] origin-bottom-left -rotate-[3deg]" />
                            <span className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-emerald-200 via-teal-300 to-cyan-400 ring-1 ring-white shadow-[0_2px_6px_-1px_rgba(15,23,42,0.18)] rotate-[5deg] -translate-x-[1px]" />
                            <span className="absolute inset-0 rounded-[8px] bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.55),transparent_55%)] rotate-[5deg] -translate-x-[1px]" />
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Stage 02</div>
                            <h3 className="text-[1.0625rem] font-semibold text-gray-900 leading-tight tracking-[-0.01em] mt-0.5">
                              {d.card2.title.replace("\n", " ")}
                            </h3>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${card2Tone.bg} border ${card2Tone.border} text-[10px] font-bold ${card2Tone.text} tabular-nums`}>
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 4a1 1 0 011 1v3.59l2.3 2.3a1 1 0 11-1.4 1.42l-2.6-2.6A1 1 0 019 11V7a1 1 0 011-1z"/></svg>
                          {p.card2.perf}
                        </span>
                      </div>

                      <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
                        {d.card2.desc}
                      </p>

                      <div className="grid grid-cols-4 gap-1.5 mb-3">
                        {p.card2.tiles.map((tile, i) => (
                          <div
                            key={i}
                            className={`relative aspect-[4/3] rounded-lg overflow-hidden ring-1 ${tile.active ? "ring-2 ring-sky-500 ring-offset-1 ring-offset-white" : "ring-gray-200/70"}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={tile.image}
                              alt={tile.label}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                            <span className="absolute bottom-1 left-1.5 right-1.5 text-[8.5px] font-semibold text-white truncate drop-shadow">
                              {tile.label}
                            </span>
                            {tile.meta && (
                              <span className="absolute top-1 left-1 text-[8.5px] font-bold tabular-nums text-white px-1 py-px rounded bg-black/55 backdrop-blur-sm">
                                {tile.meta}
                              </span>
                            )}
                            {tile.active && (
                              <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-sky-500 flex items-center justify-center shadow ring-1 ring-white/40">
                                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {p.card2.palette ? (
                        <div className="mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                          <span className="text-[10.5px] font-medium text-gray-500">{p.card2.summary.label}</span>
                          <div className="flex items-center gap-1.5">
                            {p.card2.palette.map((hex) => (
                              <div key={hex} className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full ring-1 ring-gray-200" style={{ background: hex }} />
                                <span className="text-[9.5px] font-mono text-gray-600 tabular-nums">{hex}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                          <span className="text-[10.5px] font-medium text-gray-500">{p.card2.summary.label}</span>
                          <span className="text-[11px] font-semibold text-gray-900 tabular-nums">{p.card2.summary.value}</span>
                        </div>
                      )}

                      <div className="flex-1 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-1.5 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
                        {d.card2.list.map((item, li) => (
                          <div
                            key={li}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl ${item.active ? "bg-white border border-gray-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" : ""}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${item.active ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" : "bg-gray-300"}`} />
                              <span className={`text-[12.5px] ${item.active ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                                {item.name}
                              </span>
                              {item.active && (
                                <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-600 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100">
                                  {p.card2.sourceTag}
                                </span>
                              )}
                            </div>
                            {item.count ? (
                              <span className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full ${item.active ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-gray-100 text-gray-500"}`}>
                                {item.count}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">·</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center gap-2.5 p-2.5 rounded-2xl border border-gray-200 bg-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.2)]">
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 ring-1 ring-gray-200/60">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={(p.card2.tiles.find((t) => t.active) ?? p.card2.tiles[0]).image}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                          <svg className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-semibold text-gray-900 truncate">{p.card2.scene.name}</div>
                          <div className="text-[10.5px] text-gray-500 truncate mt-0.5">{p.card2.scene.detail}</div>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-900 text-white text-[10px] font-bold uppercase tracking-[0.08em]">
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                          {p.card2.scene.badge}
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Studio */}
                    <div className={cardBase}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="relative flex flex-col w-10 h-10 rounded-[9px] bg-gradient-to-b from-gray-900 to-gray-950 shadow-[0_2px_6px_-1px_rgba(15,23,42,0.25),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.06),transparent_60%)]" />
                            <div className="flex-1 flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full bg-white/95 flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                                <svg className="w-2 h-2 text-gray-900 translate-x-[0.5px]" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                            <div className="px-1.5 pb-1.5">
                              <div className="h-[2px] rounded-full bg-white/15 overflow-hidden">
                                <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-emerald-400 to-teal-300" />
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Stage 03</div>
                            <h3 className="text-[1.0625rem] font-semibold text-gray-900 leading-tight tracking-[-0.01em] mt-0.5">
                              {d.card3.title}
                            </h3>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${card3Tone.bg} border ${card3Tone.border} text-[10px] font-bold ${card3Tone.text}`}>
                          <span className={`w-1 h-1 rounded-full ${card3Tone.dot} animate-pulse`} />
                          {p.card3.status.label}
                        </span>
                      </div>

                      <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
                        {d.card3.desc}
                      </p>

                      <div className="grid grid-cols-4 gap-1 mb-4 p-1 rounded-[10px] bg-gray-100/80 border border-gray-200/70">
                        {p.card3.presets.map((preset) => (
                          <span
                            key={preset.label}
                            className={`text-center px-2 py-1.5 rounded-md text-[11px] font-semibold tabular-nums transition-colors ${preset.active ? "bg-white text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-gray-900/5" : "text-gray-500"}`}
                          >
                            {preset.label}
                          </span>
                        ))}
                      </div>

                      <div className="flex-1 rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] divide-y divide-gray-100">
                        {p.card3.settings.map((row) => (
                          <div key={row.label} className="flex items-center justify-between px-3.5 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={settingIcon[row.icon]} />
                              </svg>
                              <span className="text-[11.5px] text-gray-500">{row.label}</span>
                            </div>
                            <span className="text-[12px] font-semibold text-gray-900 tabular-nums">{row.value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                            <span className="text-[11.5px] font-semibold text-gray-900">{d.card3.infoTitle}</span>
                          </div>
                          <span className="text-[10.5px] font-semibold text-gray-500 tabular-nums">
                            <span className="text-gray-900">{p.card3.progress}%</span> · {p.card3.eta}
                          </span>
                        </div>
                        <div className="h-[5px] rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${p.card3.progress}%` }}
                          />
                        </div>

                        <div className="mt-3 flex items-center">
                          {p.card3.pipeline.map((step, i) => {
                            const isLast = i === p.card3.pipeline.length - 1;
                            const next = p.card3.pipeline[i + 1];
                            const connectorDone = !isLast && next && next.status !== "pending";
                            return (
                              <div key={step.label} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                  <div
                                    className={
                                      step.status === "done"
                                        ? "w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
                                        : step.status === "active"
                                          ? "w-4 h-4 rounded-full bg-white ring-2 ring-emerald-500 flex items-center justify-center"
                                          : "w-4 h-4 rounded-full bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center"
                                    }
                                  >
                                    {step.status === "done" ? (
                                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    ) : step.status === "active" ? (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    ) : (
                                      <span className="text-[8px] font-bold text-gray-400 tabular-nums">{i + 1}</span>
                                    )}
                                  </div>
                                  <span
                                    className={
                                      step.status === "done"
                                        ? "text-[9.5px] font-semibold text-gray-700"
                                        : step.status === "active"
                                          ? "text-[9.5px] font-semibold text-emerald-600"
                                          : "text-[9.5px] font-medium text-gray-400"
                                    }
                                  >
                                    {step.label}
                                  </span>
                                </div>
                                {!isLast && (
                                  <div className={`flex-1 h-px mx-1.5 -mt-3 ${connectorDone ? "bg-emerald-500" : "bg-gray-200"}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        tabIndex={-1}
                        aria-hidden
                        className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black rounded-xl px-4 py-3 text-[13px] text-white font-semibold shadow-[0_8px_20px_-8px_rgba(15,23,42,0.4)] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        {p.card3.ctaLabel}
                        <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/10 text-[9.5px] font-mono text-white/70 tracking-wider">{p.card3.shortcut}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          <section
            ref={howSectionRef}
            id="how"
            className="pt-32 pb-32 px-4 sm:px-6 xl:px-10 2xl:px-14 bg-[#F9FAFB]"
          >
            <div className="max-w-[min(1680px,96vw)] mx-auto text-center">
              <div className="mb-14">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm text-[10.5px] font-semibold tracking-[0.18em] text-gray-600 uppercase shadow-[0_1px_2px_rgba(15,23,42,0.04)] mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                  How it works
                </div>
                <h2
                  className="text-[2.25rem] sm:text-[3rem] md:text-[3.5rem] font-normal text-gray-900 leading-[1.04] tracking-[-0.03em] max-w-[24ch] mx-auto"
                  style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                >
                  From idea to <span className="italic">video</span> in minutes.
                </h2>
                <p className="text-[15px] text-gray-500 max-w-[44ch] mx-auto mt-6 leading-relaxed">
                  One sentence in. A directed, captioned, music-cut MP4 out, every shot sourced, scripted, and rendered in a single pass.
                </p>
              </div>

              <div className="relative max-w-6xl mx-auto">
                <div
                  className="absolute -inset-x-12 -inset-y-8 -z-10 rounded-[3rem] opacity-60 pointer-events-none"
                  aria-hidden
                  style={{
                    background:
                      "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.12), transparent 70%)",
                  }}
                />
                <div className="aspect-video rounded-[28px] border border-gray-200 bg-white overflow-hidden shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35),0_18px_40px_-24px_rgba(15,23,42,0.18)] ring-1 ring-black/5">
                  <ImagePlayer
                    images={HOW_IT_WORKS_IMAGES}
                    interval={200}
                    renderImage={(src) => (
                      <Image
                        src={src}
                        width={1600}
                        height={900}
                        className="w-full h-full object-cover block"
                        alt="How Cutline works"
                        priority
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </section>

          <section
            id="pricing"
            className="pt-32 pb-32 px-4 sm:px-6 xl:px-10 2xl:px-14 relative overflow-hidden"
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

          <section className="pt-32 pb-32 px-4 sm:px-6">
            <div className="max-w-[64rem] mx-auto">
              <div className="text-center mb-14">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-100 bg-rose-50/70 text-[10.5px] font-semibold tracking-[0.18em] text-rose-700 uppercase mb-6">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </span>
                  The pain point
                </div>
                <h2
                  className="text-[2.25rem] sm:text-[3rem] md:text-[3.5rem] font-normal text-gray-900 leading-[1.04] tracking-[-0.03em] max-w-[28ch] mx-auto"
                  style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                >
                  Video creation is{" "}
                  <span className="italic relative whitespace-nowrap">
                    slower
                    <svg className="absolute left-0 -bottom-2 w-full h-2" viewBox="0 0 120 8" preserveAspectRatio="none" aria-hidden>
                      <defs>
                        <linearGradient id="painpoint-underline" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0" stopColor="#fb7185" />
                          <stop offset="1" stopColor="#e11d48" />
                        </linearGradient>
                      </defs>
                      <path d="M 2 5 Q 60 1 118 5" stroke="url(#painpoint-underline)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </svg>
                  </span>
                  {" "}than it should be.
                </h2>
                <p className="text-[15px] text-gray-500 max-w-[44ch] mx-auto mt-6 leading-relaxed">
                  A single brief routes through five tools and four people. We collapse the whole pipeline into one prompt.
                </p>
              </div>

              <div className="relative grid grid-cols-2 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] mb-4">
                <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-gray-100 pointer-events-none" aria-hidden />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200 shadow-[0_2px_8px_rgba(15,23,42,0.08)]" aria-hidden>
                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>

                <div className="p-7 sm:p-9">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold tracking-[0.16em] text-rose-700/80 uppercase mb-7">
                    <span className="w-1 h-1 rounded-full bg-rose-400" />
                    The old way
                  </div>
                  <div className="space-y-5">
                    {[
                      { label: "Total time", value: "4 days", sub: "five sequential stages" },
                      { label: "Headcount", value: "5 people", sub: "brief, copy, voice, visuals, edit" },
                      { label: "Cost / video", value: "$3,400+", sub: "freelance, tools, overhead" },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="text-[10.5px] font-medium tracking-[0.14em] text-gray-400 uppercase">{row.label}</div>
                        <div
                          className="text-[1.875rem] sm:text-[2.125rem] font-normal text-gray-900 leading-none mt-1.5 tabular-nums"
                          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                        >
                          {row.value}
                        </div>
                        <div className="text-[11.5px] text-gray-500 mt-1.5">{row.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-7 sm:p-9 bg-gradient-to-br from-emerald-50/30 via-white to-white">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold tracking-[0.16em] text-emerald-700 uppercase mb-7">
                    <span className="relative flex h-1 w-1">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                      <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-500" />
                    </span>
                    With Cutline
                  </div>
                  <div className="space-y-5">
                    {[
                      { label: "Total time", value: "60 seconds", sub: "end to end, in one render" },
                      { label: "Headcount", value: "1 prompt", sub: "you, typing one sentence" },
                      { label: "Cost / video", value: "$0.24", sub: "all-in, on the standard plan" },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="text-[10.5px] font-medium tracking-[0.14em] text-gray-400 uppercase">{row.label}</div>
                        <div
                          className="text-[1.875rem] sm:text-[2.125rem] font-normal leading-none mt-1.5 tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-teal-600"
                          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                        >
                          {row.value}
                        </div>
                        <div className="text-[11.5px] text-gray-500 mt-1.5">{row.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-center text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase mb-10 tabular-nums">
                <span className="text-emerald-600">5,760×</span> faster · <span className="text-emerald-600">14,000×</span> cheaper
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* Pain 01: Linear-style timeline */}
                <div className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:border-gray-300 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.22)] hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Pain 01 · Time</span>
                    <span className="text-[10px] font-mono text-gray-300">⌥1</span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] mb-5 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/60">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="text-[10.5px] font-semibold text-gray-700">CUT-204 · Product demo</span>
                      </div>
                      <span className="text-[9.5px] font-mono text-gray-400 tabular-nums">5 issues</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {[
                        { stage: "Brief & alignment", who: "PM", whoColor: "from-violet-300 to-indigo-400", time: "18h", status: "done" },
                        { stage: "Script writing", who: "SH", whoColor: "from-pink-300 to-rose-400", time: "22h", status: "done" },
                        { stage: "Voiceover record", who: "BC", whoColor: "from-amber-300 to-orange-400", time: "16h", status: "active" },
                        { stage: "Visual sourcing", who: "MV", whoColor: "from-emerald-300 to-teal-400", time: "24h", status: "blocked" },
                        { stage: "Edit & compose", who: "JT", whoColor: "from-sky-300 to-blue-400", time: "20h", status: "blocked" },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                          <span
                            className={
                              row.status === "done"
                                ? "w-2.5 h-2.5 rounded-full border border-emerald-500 bg-emerald-500 flex items-center justify-center shrink-0"
                                : row.status === "active"
                                  ? "w-2.5 h-2.5 rounded-full border-[1.5px] border-amber-500 flex items-center justify-center shrink-0"
                                  : "w-2.5 h-2.5 rounded-full border border-gray-300 flex items-center justify-center shrink-0"
                            }
                          >
                            {row.status === "done" && (
                              <svg className="w-1.5 h-1.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                            {row.status === "active" && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                          </span>
                          <span className="text-[10.5px] text-gray-700 flex-1 truncate">{row.stage}</span>
                          <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${row.whoColor} ring-1 ring-white text-[7.5px] font-bold text-white/95 flex items-center justify-center shrink-0`}>
                            {row.who[0]}
                          </span>
                          <span className="text-[9.5px] font-mono text-gray-500 tabular-nums w-7 text-right shrink-0">{row.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/60">
                      <span className="text-[9.5px] font-semibold tracking-wider uppercase text-gray-400">Total</span>
                      <span className="text-[10.5px] font-mono font-semibold text-gray-900 tabular-nums">4d · 100h</span>
                    </div>
                  </div>

                  <h3
                    className="text-[17px] font-normal text-gray-900 leading-tight tracking-[-0.015em] mb-2"
                    style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                  >
                    Manual editing eats your week.
                  </h3>
                  <p className="text-[12.5px] text-gray-500 leading-relaxed mb-5 flex-1">
                    The brief sits on someone&rsquo;s desk while five owners wait their turn. One stage blocks the next.
                  </p>

                  <div className="pt-3 border-t border-gray-100 flex items-baseline justify-between gap-2">
                    <span className="text-[9.5px] font-semibold tracking-[0.16em] text-gray-400 uppercase">Cutline ships in</span>
                    <span
                      className="text-[20px] font-normal tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-teal-600 leading-none"
                      style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                    >
                      60 seconds
                    </span>
                  </div>
                </div>

                {/* Pain 02: Premiere-style export queue */}
                <div className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:border-gray-300 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.22)] hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Pain 02 · Formats</span>
                    <span className="text-[10px] font-mono text-gray-300">⌥2</span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] mb-5 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/60">
                      <div className="flex items-center gap-2">
                        <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        <span className="text-[10.5px] font-semibold text-gray-700">Export Queue</span>
                      </div>
                      <span className="text-[9.5px] font-mono text-gray-400 tabular-nums">5 jobs</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {[
                        { ratio: "9:16", platform: "Reels", res: "1080×1920", size: "12.4 MB" },
                        { ratio: "1:1", platform: "Square", res: "1080×1080", size: "8.2 MB" },
                        { ratio: "16:9", platform: "YouTube", res: "1920×1080", size: "18.6 MB" },
                        { ratio: "9:16", platform: "Stories", res: "1080×1920", size: "9.8 MB" },
                        { ratio: "4:5", platform: "Meta Ads", res: "1080×1350", size: "11.2 MB" },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                          <span className="w-9 px-1 py-0.5 rounded text-[8.5px] font-bold tabular-nums text-center bg-gray-100 text-gray-700 shrink-0">
                            {row.ratio}
                          </span>
                          <span className="text-[10.5px] text-gray-700 flex-1 truncate">{row.platform}</span>
                          <span className="text-[9.5px] font-mono text-gray-400 tabular-nums shrink-0">{row.res}</span>
                          <span className="text-[9.5px] font-mono text-gray-500 tabular-nums w-12 text-right shrink-0">{row.size}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/60">
                      <span className="text-[9.5px] font-semibold tracking-wider uppercase text-gray-400">Re-render</span>
                      <span className="text-[10.5px] font-mono font-semibold text-gray-900 tabular-nums">~ 2h 14m</span>
                    </div>
                  </div>

                  <h3
                    className="text-[17px] font-normal text-gray-900 leading-tight tracking-[-0.015em] mb-2"
                    style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                  >
                    Multi-format export is a maze.
                  </h3>
                  <p className="text-[12.5px] text-gray-500 leading-relaxed mb-5 flex-1">
                    Each platform is its own crop, its own re-render, its own QA pass. Five jobs for the same idea.
                  </p>

                  <div className="pt-3 border-t border-gray-100 flex items-baseline justify-between gap-2">
                    <span className="text-[9.5px] font-semibold tracking-[0.16em] text-gray-400 uppercase">Cutline ships in</span>
                    <span
                      className="text-[20px] font-normal tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-teal-600 leading-none"
                      style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                    >
                      One render
                    </span>
                  </div>
                </div>

                {/* Pain 03: Stripe-style invoice */}
                <div className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:border-gray-300 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.22)] hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Pain 03 · Cost</span>
                    <span className="text-[10px] font-mono text-gray-300">⌥3</span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] mb-5 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/60">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400">Inv-2403</span>
                        <span className="text-[10.5px] font-semibold text-gray-700">Per video</span>
                      </div>
                      <span className="text-[9.5px] font-mono text-gray-400 tabular-nums">5 lines</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {[
                        { role: "Copywriter", hours: "8h", rate: "$120", line: "$960" },
                        { role: "Voice talent", hours: "4h", rate: "$200", line: "$800" },
                        { role: "Researcher", hours: "6h", rate: "$80", line: "$480" },
                        { role: "Editor", hours: "6h", rate: "$150", line: "$900" },
                        { role: "Producer", hours: "1.5h", rate: "$180", line: "$270" },
                      ].map((row) => (
                        <div key={row.role} className="flex items-center gap-2 px-3 py-1.5">
                          <span className="text-[10.5px] text-gray-700 flex-1 truncate">{row.role}</span>
                          <span className="text-[9.5px] font-mono text-gray-400 tabular-nums w-8 text-right shrink-0">{row.hours}</span>
                          <span className="text-[9.5px] font-mono text-gray-400 tabular-nums w-10 text-right shrink-0">{row.rate}</span>
                          <span className="text-[10.5px] font-mono font-semibold text-gray-900 tabular-nums w-12 text-right shrink-0">{row.line}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/60">
                      <span className="text-[9.5px] font-semibold tracking-wider uppercase text-gray-400">Total</span>
                      <span className="text-[12px] font-mono font-bold text-gray-900 tabular-nums">$3,410.00</span>
                    </div>
                  </div>

                  <h3
                    className="text-[17px] font-normal text-gray-900 leading-tight tracking-[-0.015em] mb-2"
                    style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                  >
                    Scaling means hiring more humans.
                  </h3>
                  <p className="text-[12.5px] text-gray-500 leading-relaxed mb-5 flex-1">
                    More videos used to mean more editors, more voice talent, more producers. The unit economics fall apart.
                  </p>

                  <div className="pt-3 border-t border-gray-100 flex items-baseline justify-between gap-2">
                    <span className="text-[9.5px] font-semibold tracking-[0.16em] text-gray-400 uppercase">Cutline ships at</span>
                    <span
                      className="text-[20px] font-normal tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-teal-600 leading-none"
                      style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                    >
                      $0.24
                    </span>
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
