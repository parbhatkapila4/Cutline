"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactElement,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DashboardVideoDetail } from "@/app/api/dashboard/videos/[jobId]/route";
import { getUserFriendlyErrorMessage } from "@/lib/utils/error";
import { isEnterprisePlan, isPlanId, type PlanId } from "@/lib/plans";
import {
  EDIT_QUICK_PROMPTS,
  isQuickEditPrompt,
  type EditQuickPromptCategory,
} from "@/lib/dashboard/editQuickPrompts";

type ChatMessage = { role: "user" | "assistant"; text: string };

const POLL_INTERVAL_MS = 2500;
const DONE_MSG = "Done. Here is your updated video.";
const EDIT_FAILED_MSG = "Could not start the edit. Please try again.";
const RATE_LIMIT_MSG = "Too many requests. Try again in a minute.";

const CATEGORY_META: Record<
  EditQuickPromptCategory,
  { label: string; ring: string; chip: string; icon: ReactElement }
> = {
  tone: {
    label: "Tone",
    ring: "border-amber-400/25 hover:border-amber-300/50 hover:bg-amber-500/8",
    chip: "bg-amber-500/12 text-amber-200 border-amber-400/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 2v2M12 20v2" />
      </svg>
    ),
  },
  length: {
    label: "Length",
    ring: "border-teal-400/25 hover:border-teal-300/50 hover:bg-teal-500/8",
    chip: "bg-teal-500/12 text-teal-200 border-teal-400/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h10" />
      </svg>
    ),
  },
  structure: {
    label: "Structure",
    ring: "border-emerald-400/25 hover:border-emerald-300/50 hover:bg-emerald-500/8",
    chip: "bg-emerald-500/12 text-emerald-200 border-emerald-400/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h12M3 18h6" />
      </svg>
    ),
  },
  angle: {
    label: "Angle",
    ring: "border-sky-400/25 hover:border-sky-300/50 hover:bg-sky-500/8",
    chip: "bg-sky-500/12 text-sky-200 border-sky-400/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 8v4l2.5 1.5" />
      </svg>
    ),
  },
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
  const canUseCustomEdits = usagePlan !== null && usagePlan !== "free";
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
      if (!canUseCustomEdits && !isQuickEditPrompt(trimmed)) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Custom edits are included on paid plans. Use a quick edit above, or see Pricing to upgrade.",
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
                        <a
                          href="#edit-section"
                          className="inline-flex md:hidden items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 font-semibold text-sm hover:bg-amber-500/15 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit with AI
                        </a>
                      </div>
                    </div>
                  </article>
                </div>

                <section
                  id="edit-section"
                  className="md:order-2 min-w-0 mt-6 md:mt-0 rounded-2xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-2xl shadow-black/40 flex flex-col min-h-[460px] lg:min-h-[calc(100vh-9rem)] scroll-mt-24 relative"
                >
                  <div
                    className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-amber-500/8 blur-3xl"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-teal-500/8 blur-3xl"
                    aria-hidden
                  />

                  <div className="relative px-5 py-4 border-b border-white/10 bg-linear-to-r from-amber-500/10 via-transparent to-teal-500/10">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-xl bg-amber-400/20 blur-md" aria-hidden />
                        <div className="relative w-10 h-10 rounded-xl bg-linear-to-br from-amber-500/25 to-orange-500/15 border border-amber-400/30 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-amber-200"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-white text-base leading-tight">Edit with AI</h2>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide bg-emerald-500/12 text-emerald-300 border border-emerald-500/25">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          Describe a change. We re-render and replace the video right here.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex flex-col flex-1 min-h-0">
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
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              {
                                k: "describe",
                                title: "Describe",
                                desc: "Say what to change",
                                icon: (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h7M7 16h4M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
                                ),
                                tint: "text-amber-300",
                              },
                              {
                                k: "rerender",
                                title: "Re-render",
                                desc: "We make a fresh cut",
                                icon: (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 00-14.95-3M4 15a8 8 0 0014.95 3" />
                                ),
                                tint: "text-teal-300",
                              },
                              {
                                k: "replace",
                                title: "Replace",
                                desc: "Swaps in right here",
                                icon: (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                ),
                                tint: "text-emerald-300",
                              },
                            ].map((s, i) => (
                              <div
                                key={s.k}
                                className="group relative rounded-xl border border-white/8 bg-white/3 px-2.5 py-2 flex items-center gap-2 min-w-0"
                              >
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-black/40 border border-white/8 shrink-0">
                                  <svg className={`w-3.5 h-3.5 ${s.tint}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
                                    {s.icon}
                                  </svg>
                                </span>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-semibold text-zinc-100 leading-tight truncate">
                                    <span className="text-zinc-500 tabular-nums mr-1">{i + 1}.</span>
                                    {s.title}
                                  </p>
                                  <p className="text-[10.5px] text-zinc-500 leading-tight truncate">{s.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-semibold">Quick edits</p>
                              <span className="text-[10px] text-zinc-600 font-medium normal-case tracking-normal">· one click to apply</span>
                              <div className="flex-1 h-px bg-linear-to-r from-white/10 to-transparent" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {EDIT_QUICK_PROMPTS.map((prompt, i) => {
                                const meta = CATEGORY_META[prompt.category];
                                const outcome = EDIT_OUTCOMES[prompt.text];
                                return (
                                  <motion.button
                                    key={i}
                                    type="button"
                                    onClick={() => sendEditMessage(prompt.text)}
                                    disabled={editInProgress}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: 0.02 * i, ease: [0.22, 1, 0.36, 1] }}
                                    className={`group relative text-left p-3 rounded-xl border bg-zinc-950/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-18px_rgba(0,0,0,0.9)] ${meta.ring}`}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <span
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${meta.chip}`}
                                      >
                                        {meta.icon}
                                        {meta.label}
                                      </span>
                                      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-zinc-600 group-hover:text-zinc-200 transition-colors">
                                        <span className="hidden sm:inline">Apply</span>
                                        <svg
                                          className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                          strokeWidth={2}
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                      </span>
                                    </div>
                                    <p className="text-[13px] text-zinc-200 group-hover:text-white transition-colors leading-snug">
                                      {prompt.text}
                                    </p>
                                    {outcome ? (
                                      <p className="mt-1 text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors leading-snug">
                                        {outcome}
                                      </p>
                                    ) : null}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>

                          {canUseCustomEdits ? (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-semibold">Power prompts</p>
                                <span className="text-[10px] text-zinc-600 font-medium normal-case tracking-normal">· tap to customize, then send</span>
                                <div className="flex-1 h-px bg-linear-to-r from-white/10 to-transparent" />
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {POWER_PROMPTS.map((text, i) => (
                                  <motion.button
                                    key={text}
                                    type="button"
                                    onClick={() => prefillInput(text)}
                                    disabled={editInProgress}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.22, delay: 0.03 * i, ease: [0.22, 1, 0.36, 1] }}
                                    className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/10 bg-white/3 text-[11.5px] text-zinc-300 hover:text-white hover:border-amber-400/35 hover:bg-amber-500/6 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <svg className="w-3 h-3 text-zinc-600 group-hover:text-amber-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span className="truncate max-w-[240px]">{text}</span>
                                  </motion.button>
                                ))}
                              </div>
                              <p className="text-[10.5px] text-zinc-600 leading-snug pt-0.5">
                                Each edit re-renders from your original script; nothing is destructive.
                              </p>
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
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                className="flex justify-start"
                              >
                                <div className="relative w-full max-w-[96%] overflow-hidden rounded-2xl rounded-bl-md border border-amber-500/25 bg-linear-to-br from-amber-500/10 via-zinc-950/60 to-orange-500/10">
                                  <div
                                    className="pointer-events-none absolute -top-16 -right-10 h-36 w-36 rounded-full bg-amber-400/15 blur-3xl"
                                    aria-hidden
                                  />
                                  <div
                                    className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl"
                                    aria-hidden
                                  />
                                  <div
                                    className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-amber-400/60 to-transparent"
                                    aria-hidden
                                  />

                                  <div className="relative p-4 sm:p-4.5">
                                    <div className="flex items-start gap-3">
                                      <div className="relative shrink-0">
                                        <motion.div
                                          className="absolute inset-0 rounded-xl bg-amber-400/30 blur-md"
                                          animate={{ opacity: [0.35, 0.75, 0.35] }}
                                          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                                          aria-hidden
                                        />
                                        <div className="relative w-9 h-9 rounded-xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-900/30">
                                          <motion.svg
                                            className="w-[18px] h-[18px] text-zinc-950"
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
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-[13.5px] font-semibold text-amber-100 leading-tight truncate">
                                              {EDIT_STAGES[editStage]?.label ?? "Regenerating your video"}
                                            </p>
                                            <p className="text-[11.5px] text-amber-200/60 mt-0.5 leading-snug truncate">
                                              {EDIT_STAGES[editStage]?.hint}
                                            </p>
                                          </div>
                                          <div className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-500/25 bg-black/30 text-[10.5px] font-medium text-amber-200/90">
                                            <svg className="w-3 h-3 text-amber-300/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 1.5M12 22a10 10 0 110-20 10 10 0 010 20z" />
                                            </svg>
                                            <span className="tabular-nums">{formatElapsed(editElapsedSec)}</span>
                                          </div>
                                        </div>

                                        <div className="relative mt-3 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                                          <motion.div
                                            className="absolute inset-y-0 w-1/3 rounded-full bg-linear-to-r from-transparent via-amber-400/80 to-transparent"
                                            animate={{ x: ["-40%", "140%"] }}
                                            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                          />
                                        </div>

                                        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                          {EDIT_STAGES.map((stage, idx) => {
                                            const isDone = idx < editStage;
                                            const isActive = idx === editStage;
                                            return (
                                              <li
                                                key={stage.label}
                                                className="flex items-center gap-2 text-[11.5px] leading-snug"
                                              >
                                                <span
                                                  className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0 border ${isDone
                                                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                                                    : isActive
                                                      ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                                                      : "bg-white/5 border-white/10 text-zinc-600"
                                                    }`}
                                                  aria-hidden
                                                >
                                                  {isDone ? (
                                                    <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}>
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                  ) : isActive ? (
                                                    <motion.span
                                                      className="w-1.5 h-1.5 rounded-full bg-amber-300"
                                                      animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
                                                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                                                    />
                                                  ) : (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                                  )}
                                                </span>
                                                <span
                                                  className={`truncate ${isDone
                                                    ? "text-emerald-200/80"
                                                    : isActive
                                                      ? "text-amber-100"
                                                      : "text-zinc-500"
                                                    }`}
                                                >
                                                  {stage.label}
                                                </span>
                                              </li>
                                            );
                                          })}
                                        </ul>

                                        <p className="mt-2.5 text-[10.5px] text-amber-200/55 leading-snug">
                                          Usually 1-5 mins. You can leave this tab open; we&apos;ll update it the moment it&apos;s ready.
                                        </p>
                                      </div>
                                    </div>
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
                        className="p-3.5 sm:p-4 border-t border-white/10 bg-black/50 backdrop-blur-sm shrink-0"
                      >
                        <div
                          className={`group rounded-2xl border bg-zinc-950 transition-all duration-200 overflow-hidden ${editInProgress
                            ? "border-amber-500/30"
                            : inputValue.trim()
                              ? "border-amber-400/40 shadow-[0_0_0_3px_rgba(251,191,36,0.08)]"
                              : "border-white/10 hover:border-white/20 focus-within:border-amber-400/40 focus-within:shadow-[0_0_0_3px_rgba(251,191,36,0.08)]"
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
                            rows={2}
                            placeholder="e.g. Make the intro punchier and add a CTA at the end..."
                            disabled={editInProgress}
                            className="block w-full resize-none bg-transparent border-0 px-3.5 pt-3 pb-1.5 text-white placeholder:text-zinc-500 text-sm leading-relaxed focus:outline-none focus:ring-0 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 pl-1.5">
                              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-medium text-zinc-400">
                                ↵ Enter
                              </kbd>
                              <span className="hidden sm:inline">to send</span>
                              <span
                                className={`tabular-nums ml-auto sm:ml-2 transition-colors ${inputValue.length >= MAX_EDIT_CHARS - 30
                                  ? "text-amber-300"
                                  : "text-zinc-600"
                                  }`}
                              >
                                {inputValue.length}/{MAX_EDIT_CHARS}
                              </span>
                            </div>
                            <button
                              type="submit"
                              disabled={!inputValue.trim() || editInProgress}
                              className={`shrink-0 px-3.5 py-2 rounded-xl font-semibold text-sm transition-all inline-flex items-center justify-center gap-1.5 shadow-lg shadow-black/30 disabled:cursor-not-allowed ${editInProgress
                                ? "bg-amber-500/15 border border-amber-500/30 text-amber-200"
                                : "bg-linear-to-br from-white to-zinc-200 text-black hover:from-white hover:to-white disabled:opacity-40"
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
                      <div className="p-3.5 sm:p-4 border-t border-white/10 bg-black/50 backdrop-blur-sm shrink-0">
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-zinc-950 via-zinc-950 to-zinc-900">
                          <div
                            className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-amber-400/14 blur-3xl"
                            aria-hidden
                          />
                          <div
                            className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl"
                            aria-hidden
                          />
                          <div
                            className="pointer-events-none absolute inset-0 opacity-[0.06]"
                            aria-hidden
                            style={{
                              backgroundImage:
                                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                              backgroundSize: "22px 22px",
                            }}
                          />
                          <div
                            className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-amber-400/45 to-transparent"
                            aria-hidden
                          />

                          <div className="relative p-4 sm:p-5">
                            <div className="flex items-start gap-3.5">
                              <div className="relative shrink-0">
                                <div className="absolute inset-0 rounded-xl bg-amber-400/25 blur-md" aria-hidden />
                                <div className="relative w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
                                  <svg
                                    className="w-[18px] h-[18px] text-zinc-950"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.2}
                                    aria-hidden
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M16 11V8a4 4 0 10-8 0v3M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z"
                                    />
                                  </svg>
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-[15px] font-semibold text-white leading-tight">
                                    Write your own edits
                                  </h3>
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-400/15 text-amber-200 border border-amber-400/30">
                                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                      <path d="M12 2l2.39 7.36H22l-6.19 4.5L18.2 21 12 16.5 5.8 21l2.39-7.14L2 9.36h7.61z" />
                                    </svg>
                                    Pro
                                  </span>
                                </div>
                                <p className="text-[12.5px] text-zinc-400 mt-1 leading-relaxed">
                                  Describe any change in your own words. Quick edits stay free.
                                </p>
                              </div>
                            </div>

                            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {[
                                { label: "Custom prompts", color: "amber" as const },
                                { label: "Unlimited rewrites", color: "teal" as const },
                                { label: "Higher monthly cap", color: "emerald" as const },
                              ].map((item) => (
                                <li
                                  key={item.label}
                                  className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/3 px-2.5 py-1.5"
                                >
                                  <span
                                    className={`shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full ${item.color === "amber"
                                      ? "bg-amber-400/15 text-amber-300"
                                      : item.color === "teal"
                                        ? "bg-teal-400/15 text-teal-300"
                                        : "bg-emerald-400/15 text-emerald-300"
                                      }`}
                                  >
                                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} aria-hidden>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </span>
                                  <span className="text-[11.5px] font-medium text-zinc-300 truncate">
                                    {item.label}
                                  </span>
                                </li>
                              ))}
                            </ul>

                            {!isEnterprisePlan(usagePlan) ? (
                              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2.5">
                                <Link
                                  href="/pricing"
                                  className="group/btn relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-950 bg-linear-to-br from-amber-300 via-amber-400 to-amber-500 shadow-lg shadow-amber-900/30 hover:shadow-amber-700/40 hover:-translate-y-0.5 transition-all overflow-hidden"
                                >
                                  <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-linear-to-r from-transparent via-white/35 to-transparent" />
                                  <span className="relative">Upgrade to unlock</span>
                                  <svg
                                    className="relative w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform"
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
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[12.5px] font-medium text-zinc-400 hover:text-white transition-colors"
                                >
                                  See what is included
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                </Link>
                              </div>
                            ) : null}
                          </div>
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
