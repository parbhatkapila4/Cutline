"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DashboardVideoDetail } from "@/app/api/dashboard/videos/[jobId]/route";
import { getUserFriendlyErrorMessage } from "@/lib/utils/error";
import { isEnterprisePlan, isPlanId, isProPlan, type PlanId } from "@/lib/plans";
import { ProBadge } from "@/components/ui/pro-badge";
import {
  EDIT_QUICK_PROMPTS,
  type EditQuickPromptCategory,
} from "@/lib/dashboard/editQuickPrompts";

type ChatMessage = { role: "user" | "assistant"; text: string };

const POLL_INTERVAL_MS = 2500;
const DONE_MSG = "Done. Here is your updated video.";
const EDIT_FAILED_MSG = "Could not start the edit. Please try again.";
const RATE_LIMIT_MSG = "Too many requests. Try again in a minute.";

const CATEGORY_META: Record<
  EditQuickPromptCategory,
  { label: string; bar: string; text: string }
> = {
  tone: { label: "Tone", bar: "bg-amber-400", text: "text-amber-300" },
  length: { label: "Length", bar: "bg-teal-400", text: "text-teal-300" },
  structure: { label: "Structure", bar: "bg-emerald-400", text: "text-emerald-300" },
  angle: { label: "Angle", bar: "bg-sky-400", text: "text-sky-300" },
};

const MAX_EDIT_CHARS = 280;

const EDIT_STAGES: { label: string; hint: string }[] = [
  { label: "Understanding your change", hint: "Parsing intent and identifying what to tweak" },
  { label: "Rewriting the script", hint: "Applying your direction to the narration" },
  { label: "Re-rendering the video", hint: "Composing frames with the new script" },
  { label: "Finalizing", hint: "Muxing audio and polishing the output" },
];
const STAGE_TICK_MS = 14000;

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const EDIT_OUTCOMES: Record<string, string> = {
  "Make the tone more casual and friendly": "Warmer voice, contractions, lighter phrasing",
  "Change to a more professional tone": "Crisper, authoritative, B2B-friendly",
  "Make it shorter and punchier": "≈ 20% shorter with a stronger hook",
  "Add more detail about the main topic": "Deeper context and a concrete example",
  "Add a clear call to action at the end": "One-line CTA aimed at next step",
  "Regenerate with a different angle": "Fresh hook and a new narrative frame",
};

const POWER_PROMPTS: readonly string[] = [
  "Cut the intro in half and start with a pattern interrupt",
  "Swap the example for a customer win story",
  "Punch up the CTA with a sense of urgency",
  "Reframe the whole thing for a founder audience",
  "Add a surprising stat in the first 5 seconds",
  "End on a question that invites a reply",
];

export default function DashboardVideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = typeof params?.jobId === "string" ? params.jobId : "";
  const missingJobId = !jobId;
  const [video, setVideo] = useState<DashboardVideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [editInProgress, setEditInProgress] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usagePlan, setUsagePlan] = useState<PlanId | null>(null);
  const [editStage, setEditStage] = useState(0);
  const [editElapsedSec, setEditElapsedSec] = useState(0);
  const [showPowerPrompts, setShowPowerPrompts] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const prefillInput = useCallback((text: string) => {
    if (editInProgress) return;
    setInputValue(text);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
  }, [editInProgress]);
  const isPro = isProPlan(usagePlan);
  // Editing (custom + quick) is a Pro+ feature; free/starter get the upgrade prompt.
  const canUseCustomEdits = isPro;
  const resolvedLoading = missingJobId ? false : loading;
  const resolvedNotFound = missingJobId ? true : notFound;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((d: { plan?: string } | null) => {
        if (cancelled || !d) return;
        const p = typeof d.plan === "string" && isPlanId(d.plan) ? d.plan : "free";
        setUsagePlan(p);
      })
      .catch(() => {
        if (!cancelled) setUsagePlan("free");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    fetch(`/api/dashboard/videos/${encodeURIComponent(jobId)}`)
      .then((res) => {
        if (!cancelled && !res.ok) setNotFound(true);
        return res.ok ? res.json() : null;
      })
      .then((data: DashboardVideoDetail | null) => {
        if (!cancelled && data) {
          setVideo(data);
          setCurrentVideoUrl(data.videoUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollNewJob = useCallback(
    (newJobId: string) => {
      const poll = async () => {
        try {
          const res = await fetch(`/api/generate/${encodeURIComponent(newJobId)}`);
          const data = await res.json();
          if (!res.ok) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", text: `Generation failed: ${getUserFriendlyErrorMessage(data.error || "Something went wrong")}` },
            ]);
            stopPolling();
            setEditInProgress(false);
            return;
          }
          if (data.status === "completed" && data.videoUrl) {
            setCurrentVideoUrl(data.videoUrl);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", text: DONE_MSG },
            ]);
            stopPolling();
            setEditInProgress(false);
            router.replace(`/dashboard/videos/${newJobId}`);
            const metaRes = await fetch(`/api/dashboard/videos/${encodeURIComponent(newJobId)}`);
            if (metaRes.ok) {
              const meta = (await metaRes.json()) as DashboardVideoDetail;
              setVideo(meta);
              setCurrentVideoUrl(meta.videoUrl);
            }
            return;
          }
          if (data.status === "failed") {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", text: `Generation failed: ${getUserFriendlyErrorMessage(data.error || "Generation failed")}` },
            ]);
            stopPolling();
            setEditInProgress(false);
          }
        } catch {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: "Connection lost. Check the dashboard for your video status." },
          ]);
          stopPolling();
          setEditInProgress(false);
        }
      };
      poll();
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    },
    [stopPolling, router]
  );

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  useEffect(() => {
    if (!editInProgress) return;
    const startedAt = Date.now();
    const elapsedId = setInterval(() => {
      setEditElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    const stageId = setInterval(() => {
      setEditStage((s) => Math.min(s + 1, EDIT_STAGES.length - 1));
    }, STAGE_TICK_MS);
    return () => {
      clearInterval(elapsedId);
      clearInterval(stageId);
    };
  }, [editInProgress]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, editInProgress, editStage]);

  const sendEditMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || editInProgress) return;
      if (!canUseCustomEdits) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Editing is available on Professional and Enterprise plans. See Pricing to upgrade.",
          },
        ]);
        return;
      }
      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setInputValue("");
      setEditStage(0);
      setEditElapsedSec(0);
      setEditInProgress(true);

      try {
        const res = await fetch(`/api/dashboard/videos/${encodeURIComponent(jobId)}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const chatMsg =
            res.status === 429
              ? RATE_LIMIT_MSG
              : res.status === 403 && data?.code === "CUSTOM_EDIT_REQUIRES_PLAN"
                ? "Custom edits are included on paid plans. Use a quick edit above, or see Pricing to upgrade."
                : typeof data?.error === "string"
                  ? `${EDIT_FAILED_MSG} ${getUserFriendlyErrorMessage(data.error)}`
                  : EDIT_FAILED_MSG;
          setMessages((prev) => [...prev, { role: "assistant", text: chatMsg }]);
          setEditInProgress(false);
          return;
        }

        const newJobId = data?.newJobId;
        if (typeof newJobId !== "string" || !newJobId) {
          setMessages((prev) => [...prev, { role: "assistant", text: EDIT_FAILED_MSG }]);
          setEditInProgress(false);
          return;
        }

        pollNewJob(newJobId);
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", text: EDIT_FAILED_MSG }]);
        setEditInProgress(false);
      }
    },
    [jobId, editInProgress, pollNewJob, canUseCustomEdits]
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendEditMessage(inputValue);
  };

  const handleCopyLink = useCallback(async () => {
    const url = currentVideoUrl ?? video?.videoUrl;
    if (!url) return;
    try {
      const absolute = url.startsWith("http") ? url : `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
    }
  }, [currentVideoUrl, video?.videoUrl]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-linear-to-br from-zinc-950 via-black to-zinc-950" />
        <div
          className="absolute -top-40 -right-32 h-[480px] w-[480px] rounded-full bg-amber-500/10 blur-3xl opacity-70"
        />
        <div
          className="absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full bg-teal-500/10 blur-3xl opacity-60"
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <main className="relative w-full pt-6 sm:pt-8 pb-20">
        <div className="w-full px-4 sm:px-6 lg:px-10 mb-5 sm:mb-6 flex justify-start">
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/5 backdrop-blur-md pl-2 pr-4 py-2 text-sm font-medium text-zinc-200 hover:text-white hover:border-amber-400/40 hover:bg-amber-500/8 transition-all duration-200 shadow-lg shadow-black/30"
            aria-label="Back to dashboard"
          >
            <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white text-black shadow-md shadow-black/40 transition-transform duration-200 group-hover:-translate-x-0.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            <span className="leading-none">Back to dashboard</span>
            <span
              className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-linear-to-r from-amber-400/0 via-amber-400/10 to-transparent"
              aria-hidden="true"
            />
          </Link>
        </div>
        <div className="px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
          {resolvedLoading ? (
            <div
              className="md:grid md:grid-cols-[1fr,400px] lg:grid-cols-[1fr,440px] md:gap-6 lg:gap-8 md:items-start min-w-0"
              role="status"
              aria-live="polite"
              aria-label="Loading your video"
            >
              <div className="md:order-1 min-w-0 overflow-hidden">
                <article className="rounded-2xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-2xl shadow-black/40">
                  <div className="relative aspect-video bg-zinc-900">
                    <div className="skeleton-block absolute inset-0 rounded-none" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative h-12 w-12 rounded-full border border-white/10 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <span className="absolute inset-0 rounded-full border border-amber-400/30 animate-ping" />
                        <svg
                          className="h-5 w-5 text-amber-300/90"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="absolute top-3 right-3 h-6 w-20 rounded-full skeleton-block" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full skeleton-block" />
                      <div className="h-3 w-10 rounded-md skeleton-block" />
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 border-t border-white/10 space-y-4">
                    <div className="space-y-2">
                      <div className="h-5 w-3/4 max-w-[420px] skeleton-block" />
                      <div className="h-3.5 w-11/12 max-w-[520px] skeleton-block" />
                      <div className="h-3.5 w-2/3 max-w-[360px] skeleton-block" />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="h-7 w-24 rounded-lg skeleton-block" />
                      <div className="h-7 w-16 rounded-lg skeleton-block" />
                      <div className="h-7 w-20 rounded-lg skeleton-block" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                      <div className="h-10 w-full sm:w-40 rounded-xl skeleton-block" />
                      <div className="h-10 w-full sm:w-32 rounded-xl skeleton-block" />
                    </div>
                  </div>
                </article>
              </div>

              <section className="md:order-2 min-w-0 mt-6 md:mt-0 rounded-2xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-2xl shadow-black/40 flex flex-col min-h-[420px] lg:min-h-[calc(100vh-9rem)]">
                <div className="px-5 py-4 border-b border-white/10 bg-linear-to-r from-amber-500/8 via-transparent to-teal-500/8">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl skeleton-block" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-32 skeleton-block" />
                      <div className="h-3 w-48 max-w-[60%] skeleton-block" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-hidden p-5 space-y-4">
                    <div className="h-3 w-32 skeleton-block" />
                    <div className="grid gap-2">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-10 rounded-xl skeleton-block"
                          style={{
                            width: `${88 - i * 6}%`,
                            opacity: 1 - i * 0.07,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 border-t border-white/10 bg-black/40 shrink-0">
                    <div className="flex gap-2.5">
                      <div className="h-11 flex-1 rounded-xl skeleton-block" />
                      <div className="h-11 w-20 rounded-xl skeleton-block" />
                    </div>
                  </div>
                </div>
              </section>
              <span className="sr-only">Loading your video and edit panel</span>
            </div>
          ) : resolvedNotFound || !video ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-12 sm:p-16 text-center shadow-2xl shadow-black/40">
              <div className="w-16 h-16 mx-auto rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-amber-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-1.5">Video not found</h2>
              <p className="text-sm text-zinc-500 mb-7 max-w-sm mx-auto leading-relaxed">
                This render may have expired, been removed, or belongs to a different account. Sign in with the account that created it, or head back to your library.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to my videos
                </Link>
                <Link
                  href="/create"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-white font-semibold text-sm hover:bg-white/5 transition-colors"
                >
                  Create a new video
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="md:grid md:grid-cols-[1fr,400px] lg:grid-cols-[1fr,440px] md:gap-6 lg:gap-8 md:items-start min-w-0">
                <div className="md:order-1 min-w-0 overflow-hidden">
                  <article className="rounded-2xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-2xl shadow-black/40">
                    <div className="relative aspect-video bg-black">
                      <video
                        key={currentVideoUrl ?? video.videoUrl}
                        src={currentVideoUrl ?? video.videoUrl}
                        controls
                        playsInline
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Ready
                        </span>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 border-t border-white/10">
                      <h1 className="text-lg sm:text-xl font-semibold text-white leading-snug line-clamp-2" title={video.title}>
                        {video.title || "Untitled video"}
                      </h1>
                      {video.prompt ? (
                        <p
                          className="mt-2 text-sm text-zinc-400 leading-relaxed line-clamp-3"
                          title={video.prompt}
                        >
                          {video.prompt}
                        </p>
                      ) : null}

                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-xs font-medium">
                          <svg className="w-3.5 h-3.5 text-amber-400/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {video.date}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-xs font-medium">
                          <svg className="w-3.5 h-3.5 text-teal-400/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {video.duration}
                        </span>
                        {video.mode ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-xs font-medium capitalize">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                            {video.mode === "talking_object" ? "Talking" : "Slideshow"}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                        {isPro ? (
                          <a
                            href={currentVideoUrl ?? video.videoUrl}
                            download={`cutline-${jobId}.mp4`}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors shadow-lg shadow-black/30"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download MP4
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => router.push("/pricing")}
                            title="Downloading is available on Professional & Enterprise plans"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-200 font-semibold text-sm hover:bg-amber-400/15 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5v-6a1.5 1.5 0 011.5-1.5z" />
                            </svg>
                            Download MP4
                            <ProBadge plan={usagePlan} />
                          </button>
                        )}
                        {isPro ? (
                          <button
                            type="button"
                            onClick={handleCopyLink}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-white font-semibold text-sm hover:bg-white/5 transition-colors"
                          >
                            {copied ? (
                              <>
                                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Link copied
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 015.656 5.656l-3 3a4 4 0 01-5.656-5.656m-1.656 3.656a4 4 0 01-5.656-5.656l3-3a4 4 0 015.656 5.656" />
                                </svg>
                                Copy link
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => router.push("/pricing")}
                            title="Sharing is available on Professional & Enterprise plans"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-400/25 text-amber-200/90 font-semibold text-sm hover:bg-amber-400/10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 015.656 5.656l-3 3a4 4 0 01-5.656-5.656m-1.656 3.656a4 4 0 01-5.656-5.656l3-3a4 4 0 015.656 5.656" />
                            </svg>
                            Copy link
                            <ProBadge plan={usagePlan} />
                          </button>
                        )}
                        <a
                          href="#edit-section"
                          className="inline-flex md:hidden items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 font-semibold text-sm hover:bg-amber-500/15 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit with AI
                          <ProBadge plan={usagePlan} />
                        </a>
                      </div>
                    </div>
                  </article>
                </div>

                <section
                  id="edit-section"
                  className="md:order-2 min-w-0 mt-6 md:mt-0 rounded-2xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-2xl shadow-black/40 flex flex-col min-h-[460px] lg:min-h-[calc(100vh-9rem)] scroll-mt-24"
                >
                  <div className="px-5 py-4 border-b border-white/8">
                    <div className="flex items-center gap-2.5">
                      <svg
                        className="w-4 h-4 text-amber-400 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                        />
                      </svg>
                      <h2 className="text-[14px] font-semibold text-white tracking-tight leading-none">
                        Edit with AI
                      </h2>
                      <ProBadge plan={usagePlan} className="ml-0.5" />
                    </div>
                    <p className="text-[12px] text-zinc-500 mt-1.5 ml-[26px] leading-relaxed">
                      Describe a change. We re-render and replace the video here.
                    </p>
                  </div>

                  <div className="flex flex-col flex-1 min-h-0">
                    <div
                      ref={messagesScrollRef}
                      className="flex-1 overflow-y-auto p-5 min-h-[220px]"
                    >
                      {messages.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="space-y-5"
                        >
                          <div>
                            <p className="text-[10.5px] uppercase tracking-[0.16em] text-zinc-500 font-semibold mb-2.5">
                              Quick edits
                            </p>
                            <ul className="space-y-1.5">
                              {EDIT_QUICK_PROMPTS.map((prompt, i) => {
                                const meta = CATEGORY_META[prompt.category];
                                const outcome = EDIT_OUTCOMES[prompt.text];
                                return (
                                  <li key={i}>
                                    <button
                                      type="button"
                                      onClick={() => sendEditMessage(prompt.text)}
                                      disabled={editInProgress}
                                      className="group w-full flex items-start gap-3 text-left px-3 py-2.5 rounded-lg border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <span
                                        className={`mt-0.5 w-0.5 self-stretch rounded-full ${meta.bar} opacity-50 group-hover:opacity-90 transition-opacity`}
                                        aria-hidden
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-2">
                                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${meta.text}`}>
                                            {meta.label}
                                          </span>
                                          <p className="text-[13px] text-zinc-100 leading-snug min-w-0 flex-1">
                                            {prompt.text}
                                          </p>
                                        </div>
                                        {outcome ? (
                                          <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                                            {outcome}
                                          </p>
                                        ) : null}
                                      </div>
                                      <svg
                                        className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-300 mt-1 shrink-0 transition-colors"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        aria-hidden
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>

                          {canUseCustomEdits ? (
                            <div>
                              <button
                                type="button"
                                onClick={() => setShowPowerPrompts((s) => !s)}
                                className="group inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-zinc-500 font-semibold hover:text-zinc-300 transition-colors"
                                aria-expanded={showPowerPrompts}
                              >
                                <svg
                                  className={`w-3 h-3 transition-transform ${showPowerPrompts ? "rotate-90" : ""}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  aria-hidden
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                                More ideas
                              </button>
                              <AnimatePresence initial={false}>
                                {showPowerPrompts && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                    className="overflow-hidden"
                                  >
                                    <div className="flex flex-wrap gap-1.5 pt-2.5">
                                      {POWER_PROMPTS.map((text) => (
                                        <button
                                          key={text}
                                          type="button"
                                          onClick={() => prefillInput(text)}
                                          disabled={editInProgress}
                                          className="inline-flex items-center px-2.5 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-[11.5px] text-zinc-300 hover:text-white hover:border-white/20 hover:bg-white/[0.05] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <span className="truncate max-w-[260px]">{text}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ) : null}
                        </motion.div>
                      ) : (
                        <div className="space-y-4">
                          <AnimatePresence initial={false}>
                            {messages.map((msg, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                                    ? "bg-white text-black rounded-br-md shadow-lg shadow-black/30"
                                    : "bg-white/5 text-zinc-200 border border-white/10 rounded-bl-md"
                                    }`}
                                >
                                  {msg.text}
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          <AnimatePresence>
                            {editInProgress && (
                              <motion.div
                                key="regen-card"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                                    <motion.svg
                                      className="w-4 h-4 text-amber-300"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2.2}
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                      aria-hidden
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 00-14.95-3M4 15a8 8 0 0014.95 3"
                                      />
                                    </motion.svg>
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-amber-100 leading-tight truncate">
                                          {EDIT_STAGES[editStage]?.label ?? "Regenerating your video"}
                                        </p>
                                        <p className="text-[11.5px] text-amber-200/55 mt-0.5 leading-snug truncate">
                                          {EDIT_STAGES[editStage]?.hint}
                                        </p>
                                      </div>
                                      <span className="shrink-0 text-[10.5px] tabular-nums font-medium text-amber-200/80 px-1.5 py-0.5 rounded-md border border-amber-500/25 bg-black/20">
                                        {formatElapsed(editElapsedSec)}
                                      </span>
                                    </div>

                                    <div className="relative mt-3 h-1 w-full rounded-full bg-white/5 overflow-hidden">
                                      <motion.div
                                        className="absolute inset-y-0 w-1/3 rounded-full bg-linear-to-r from-transparent via-amber-400/80 to-transparent"
                                        animate={{ x: ["-40%", "140%"] }}
                                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                      />
                                    </div>

                                    <ul className="mt-3 space-y-1">
                                      {EDIT_STAGES.map((stage, idx) => {
                                        const isDone = idx < editStage;
                                        const isActive = idx === editStage;
                                        return (
                                          <li
                                            key={stage.label}
                                            className="flex items-center gap-2 text-[11.5px] leading-snug"
                                          >
                                            <span
                                              className={`inline-flex items-center justify-center w-3 h-3 rounded-full shrink-0 ${isDone
                                                ? "bg-emerald-500/25 text-emerald-300"
                                                : isActive
                                                  ? "bg-amber-500/25 text-amber-300"
                                                  : "bg-white/5 text-zinc-600"
                                                }`}
                                              aria-hidden
                                            >
                                              {isDone ? (
                                                <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}>
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                              ) : isActive ? (
                                                <motion.span
                                                  className="w-1 h-1 rounded-full bg-amber-300"
                                                  animate={{ opacity: [0.5, 1, 0.5] }}
                                                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                                                />
                                              ) : (
                                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                              )}
                                            </span>
                                            <span
                                              className={
                                                isDone
                                                  ? "text-emerald-200/75"
                                                  : isActive
                                                    ? "text-amber-100"
                                                    : "text-zinc-500"
                                              }
                                            >
                                              {stage.label}
                                            </span>
                                          </li>
                                        );
                                      })}
                                    </ul>

                                    <p className="mt-3 text-[10.5px] text-amber-200/50 leading-snug">
                                      Usually 1-5 mins. We&apos;ll update this the moment it&apos;s ready.
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    {canUseCustomEdits ? (
                      <form
                        onSubmit={handleSubmit}
                        className="p-3.5 sm:p-4 border-t border-white/8 bg-zinc-950/60 backdrop-blur-sm shrink-0"
                      >
                        <div
                          className={`rounded-xl border bg-zinc-950 transition-colors overflow-hidden ${editInProgress
                            ? "border-amber-500/30"
                            : inputValue.trim()
                              ? "border-amber-400/40"
                              : "border-white/10 hover:border-white/15 focus-within:border-amber-400/40"
                            }`}
                        >
                          <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => {
                              if (e.target.value.length <= MAX_EDIT_CHARS) {
                                setInputValue(e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void sendEditMessage(inputValue);
                              }
                            }}
                            rows={3}
                            placeholder="Describe a change. e.g. Make the intro punchier and add a CTA at the end…"
                            disabled={editInProgress}
                            className="block w-full resize-none bg-transparent border-0 px-3.5 pt-3 pb-1 text-white placeholder:text-zinc-500 text-sm leading-relaxed focus:outline-none focus:ring-0 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                          <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1">
                            <span
                              className={`text-[11px] tabular-nums transition-colors ${inputValue.length >= MAX_EDIT_CHARS - 30
                                ? "text-amber-300"
                                : "text-zinc-600"
                                }`}
                            >
                              {inputValue.length}/{MAX_EDIT_CHARS}
                            </span>
                            <button
                              type="submit"
                              disabled={!inputValue.trim() || editInProgress}
                              className={`shrink-0 px-3.5 py-1.5 rounded-lg font-semibold text-[13px] transition-colors inline-flex items-center justify-center gap-1.5 disabled:cursor-not-allowed ${editInProgress
                                ? "bg-amber-500/15 border border-amber-500/30 text-amber-200"
                                : "bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-white"
                                }`}
                            >
                              {editInProgress ? (
                                <>
                                  <span className="relative inline-flex w-3.5 h-3.5">
                                    <span className="absolute inset-0 rounded-full border-2 border-amber-500/30" aria-hidden />
                                    <motion.span
                                      className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-300"
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                                      aria-hidden
                                    />
                                  </span>
                                  <span>Working</span>
                                </>
                              ) : (
                                <>
                                  <span>Send</span>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
                                  </svg>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="p-3.5 sm:p-4 border-t border-white/8 bg-zinc-950/60 backdrop-blur-sm shrink-0">
                        <div className="rounded-xl border border-amber-400/25 bg-amber-500/[0.04] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-[14px] font-semibold text-white leading-tight">
                                  Edit with AI
                                </h3>
                                <ProBadge plan={usagePlan} withLock />
                              </div>
                              <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">
                                Re-edit and re-render your video with AI on Professional and Enterprise plans.
                              </p>
                            </div>
                          </div>

                          {!isEnterprisePlan(usagePlan) ? (
                            <div className="mt-3 flex items-center gap-2">
                              <Link
                                href="/pricing"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 transition-colors"
                              >
                                Upgrade
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.4}
                                  aria-hidden
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
                                </svg>
                              </Link>
                              <Link
                                href="/pricing"
                                className="text-[12px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                              >
                                See plans
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
