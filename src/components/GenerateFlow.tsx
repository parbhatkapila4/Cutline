"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DURATION_MIN, DURATION_MAX } from "@/lib/validation/duration";
import type { Platform } from "@/lib/platform/types";
import { CopyLinkButton } from "@/components/generate/CopyLinkButton";

type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";
const POLL_INITIAL_DELAY_MS = 2000;
const POLL_BACKOFF_FACTOR = 2;
const POLL_MAX_DELAY_MS = 15000;
const POLL_MAX_TOTAL_MS = 30 * 60 * 1000;
const SUBMIT_TIMEOUT_MS = 25_000;
const MIN_INPUT_LENGTH = 5;
const DURATION_DEFAULT = 30;

const EXAMPLES = [
  { label: "Explainer", prompt: "Explain why we dream in 30 seconds, friendly tone" },
  { label: "Product", prompt: "Promote a meditation app with calming visuals" },
  { label: "Educational", prompt: "How photosynthesis works for middle schoolers" },
  { label: "Marketing", prompt: "Announce a coffee shop grand opening, warm vibes" },
];

function getSubmitErrorMessage(status: number): string {
  if (status === 400) return "Please check your input.";
  if (status === 429) return "Too many requests. Please try again in a moment.";
  if (status >= 500) return "Something went wrong. Please try again.";
  return "Something went wrong. Please try again.";
}

const FIELD_LABELS: Record<string, string> = {
  input: "Topic",
  durationSeconds: "Duration",
  platform: "Platform",
  variationCount: "Number of variants",
  mode: "Video style",
  brandColors: "Brand colors",
};

const STAGES = [
  { label: "Analyzing your prompt", icon: "🎯" },
  { label: "Writing the script", icon: "✍️" },
  { label: "Sourcing visuals", icon: "🖼️" },
  { label: "Generating voiceover", icon: "🎙️" },
  { label: "Rendering video", icon: "🎬" },
];

const STAGE_INTERVAL_MS = 18_000;

type Props = { embedded?: boolean };

export function GenerateFlow({ embedded = false }: Props) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"slideshow" | "talking_object">("slideshow");
  const [talkingObjectStyle, setTalkingObjectStyle] = useState<"cartoon" | "real">("cartoon");
  const [durationSeconds, setDurationSeconds] = useState(DURATION_DEFAULT);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [variations, setVariations] = useState<Array<{ videoUrl: string; cost?: { total: number } }> | null>(null);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [variationCount, setVariationCount] = useState(1);
  const [platform, setPlatform] = useState<Platform>("general");
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Array<{ field: string; message: string }> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(0);
  const [recentJobsOpen, setRecentJobsOpen] = useState(false);
  const [recentJobs, setRecentJobs] = useState<Array<{ jobId: string; status: string; createdAt: string; videoUrl?: string; topic?: string; error?: string }> | null>(null);
  const [recentJobsLoading, setRecentJobsLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLElement | null>(null);

  const valid = input.trim().length >= MIN_INPUT_LENGTH;
  const inputHasError = !!fieldErrors?.some((e) => e.field === "input");
  const durationHasError = !!fieldErrors?.some((e) => e.field === "durationSeconds");

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    if (stageRef.current) {
      clearInterval(stageRef.current);
      stageRef.current = null;
    }
  }, []);

  const poll = useCallback(
    async (id: string, delayMs: number, pollStartTime: number) => {
      try {
        const res = await fetch(`/api/generate/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong");
          setStatus("failed");
          stopPolling();
          return;
        }
        setStatus(data.status);
        if (data.status === "completed" && data.videoUrl) {
          setVideoUrl(data.videoUrl);
          setIsPreview(data.isPreview === true);
          setVariations(data.variations ?? null);
          stopPolling();
          return;
        }
        if (data.status === "failed") {
          setError(data.error || "Generation failed");
          stopPolling();
          return;
        }
        if (data.status === "cancelled") {
          stopPolling();
          return;
        }
        const elapsed = Date.now() - pollStartTime;
        if (elapsed >= POLL_MAX_TOTAL_MS) {
          setError("Taking longer than expected. You can refresh later.");
          setStatus("failed");
          stopPolling();
          return;
        }
        const nextDelay = Math.min(delayMs * POLL_BACKOFF_FACTOR, POLL_MAX_DELAY_MS);
        pollRef.current = setTimeout(() => {
          pollRef.current = null;
          poll(id, nextDelay, pollStartTime);
        }, nextDelay);
      } catch {
        const elapsed = Date.now() - pollStartTime;
        if (elapsed >= POLL_MAX_TOTAL_MS) {
          setError("Taking longer than expected. You can refresh later.");
          setStatus("failed");
          stopPolling();
          return;
        }
        const nextDelay = Math.min(delayMs * POLL_BACKOFF_FACTOR, POLL_MAX_DELAY_MS);
        pollRef.current = setTimeout(() => {
          pollRef.current = null;
          poll(id, nextDelay, pollStartTime);
        }, nextDelay);
      }
    },
    [stopPolling]
  );

  useEffect(() => {
    if (!jobId) return;
    const pollStartTime = Date.now();
    pollRef.current = setTimeout(() => {
      pollRef.current = null;
      poll(jobId, POLL_INITIAL_DELAY_MS, pollStartTime);
    }, POLL_INITIAL_DELAY_MS);
    return () => stopPolling();
  }, [jobId, poll, stopPolling]);

  useEffect(() => {
    if (!recentJobsOpen || recentJobs !== null || recentJobsLoading) return;
    setRecentJobsLoading(true);
    fetch("/api/generate/jobs?limit=20")
      .then((res) => res.json())
      .then((data: { jobs?: Array<{ jobId: string; status: string; createdAt: string; videoUrl?: string; topic?: string; error?: string }> }) => {
        setRecentJobs(Array.isArray(data.jobs) ? data.jobs : []);
      })
      .catch(() => setRecentJobs([]))
      .finally(() => setRecentJobsLoading(false));
  }, [recentJobsOpen, recentJobs, recentJobsLoading]);

  useEffect(() => {
    if (jobId && (status === "pending" || status === "processing")) {
      setStage(0);
      stageRef.current = setInterval(() => {
        setStage((s) => Math.min(s + 1, STAGES.length - 1));
      }, STAGE_INTERVAL_MS);
      return () => {
        if (stageRef.current) clearInterval(stageRef.current);
      };
    }
  }, [jobId, status]);

  const buildGenerateBody = useCallback(
    (opts: { renderMode?: "preview" | "final"; previewJobId?: string }) => ({
      input: input.trim(),
      mode,
      durationSeconds: Math.min(DURATION_MAX, Math.max(DURATION_MIN, durationSeconds)),
      ...(mode === "talking_object" ? { talkingObjectStyle } : {}),
      ...(opts.renderMode ? { renderMode: opts.renderMode } : {}),
      ...(opts.previewJobId ? { previewJobId: opts.previewJobId } : {}),
      ...(variationCount > 1 && opts.renderMode !== "preview" && !opts.previewJobId ? { variationCount } : {}),
      ...(platform !== "general" ? { platform } : {}),
    }),
    [input, mode, durationSeconds, talkingObjectStyle, variationCount, platform]
  );

  const doSubmit = useCallback(
    async (opts?: { renderMode?: "preview" | "final"; previewJobId?: string }) => {
      if (!valid || submitting) return;

      setSubmitError(null);
      setFieldErrors(null);
      setError(null);
      setVideoUrl(null);
      setVariations(null);
      setSelectedVariationIndex(0);
      setIsPreview(false);
      setStatus(null);
      setJobId(null);
      setSubmitting(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

      try {
        const body = buildGenerateBody(opts ?? {});
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = (await res.json().catch(() => ({}))) as {
          jobId?: string;
          error?: string;
          errors?: Array<{ field: string; message: string }>;
          tokensRemaining?: number;
          tokensRequired?: number;
          videosUsed?: number;
          videosLimit?: number;
        };
        if (!res.ok) {
          let msg = data.error || getSubmitErrorMessage(res.status);
          if (res.status === 402 && data.tokensRemaining != null && data.tokensRequired != null) {
            msg += ` You have ${data.tokensRemaining} credits, need ${data.tokensRequired} per video.`;
          } else if (res.status === 402 && data.videosUsed != null && data.videosLimit != null) {
            msg += ` You've used ${data.videosUsed} of ${data.videosLimit} videos this month.`;
          }
          setSubmitError(msg);
          setFieldErrors(
            Array.isArray(data.errors) && data.errors.every(
              (e): e is { field: string; message: string } =>
                typeof e === "object" && e != null && typeof e.field === "string" && typeof e.message === "string"
            )
              ? data.errors
              : null
          );
          return;
        }
        setJobId(data.jobId ?? null);
        setStatus("pending");
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError") {
          setSubmitError("Request timed out. The server may be starting or Redis may be unavailable. Try again in a moment.");
        } else {
          setSubmitError("Network error. Please check your connection and try again.");
        }
        setFieldErrors(null);
      } finally {
        setSubmitting(false);
      }
    },
    [valid, submitting, buildGenerateBody]
  );

  const submit = useCallback(
    (e: React.FormEvent, opts?: { renderMode?: "preview" | "final"; previewJobId?: string }) => {
      e.preventDefault();
      doSubmit(opts);
    },
    [doSubmit]
  );

  const submitRenderFinal = useCallback(async () => {
    if (!jobId) return;
    setSubmitError(null);
    setFieldErrors(null);
    setError(null);
    setVideoUrl(null);
    setIsPreview(false);
    setStatus(null);
    const prevJobId = jobId;
    setJobId(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildGenerateBody({ renderMode: "final", previewJobId: prevJobId })),
      });
      const data = (await res.json().catch(() => ({}))) as {
        jobId?: string;
        error?: string;
        errors?: Array<{ field: string; message: string }>;
      };
      if (!res.ok) {
        setSubmitError(data.error || getSubmitErrorMessage(res.status));
        setFieldErrors(
          Array.isArray(data.errors) &&
            data.errors.every(
              (e): e is { field: string; message: string } =>
                typeof e === "object" && e != null && typeof e.field === "string" && typeof e.message === "string"
            )
            ? data.errors
            : null
        );
        return;
      }
      setJobId(data.jobId ?? null);
      setStatus("pending");
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
      setFieldErrors(null);
    } finally {
      setSubmitting(false);
    }
  }, [jobId, buildGenerateBody]);

  const submitPreview = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      doSubmit({ renderMode: "preview" });
    },
    [doSubmit]
  );

  const reset = useCallback(() => {
    stopPolling();
    setJobId(null);
    setStatus(null);
    setVideoUrl(null);
    setVariations(null);
    setSelectedVariationIndex(0);
    setIsPreview(false);
    setError(null);
    setSubmitError(null);
    setFieldErrors(null);
    setInput("");
    setMode("slideshow");
    setDurationSeconds(DURATION_DEFAULT);
    setVariationCount(1);
    setPlatform("general");
  }, [stopPolling]);

  useEffect(() => {
    if (status === "completed" && videoUrl && videoRef.current) {
      videoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [status, videoUrl]);

  const hasMultipleVariations = (variations?.length ?? 0) > 1;
  const downloadFilename = useMemo(
    () =>
      jobId
        ? `cutline-${jobId}${isPreview ? "-preview" : ""}${hasMultipleVariations ? `-v${selectedVariationIndex + 1}` : ""}.mp4`
        : "cutline-video.mp4",
    [jobId, isPreview, hasMultipleVariations, selectedVariationIndex]
  );
  const downloadUrl = useMemo(
    () =>
      jobId
        ? `/api/generate/${encodeURIComponent(jobId)}/download${hasMultipleVariations ? `?variant=${selectedVariationIndex}` : ""}`
        : null,
    [jobId, hasMultipleVariations, selectedVariationIndex]
  );
  const activeVideoUrl = useMemo(
    () =>
      hasMultipleVariations && variations && variations[selectedVariationIndex]
        ? variations[selectedVariationIndex]!.videoUrl
        : videoUrl ?? null,
    [variations, selectedVariationIndex, videoUrl, hasMultipleVariations]
  );

  if (status === "completed" && videoUrl) {
    return (
      <section ref={videoRef} className="animate-in opacity-0">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 bg-emerald-500/10">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">
                {isPreview ? "Preview ready" : hasMultipleVariations ? "Your videos are ready!" : "Your video is ready!"}
              </p>
              <p className="text-sm text-zinc-500">
                {isPreview ? "720p preview • Stock images • No voiceover" : hasMultipleVariations ? `${variations!.length} variants • 1080p HD` : "1080p HD • MP4 format"}
              </p>
            </div>
          </div>

          {hasMultipleVariations ? (
            <div className="border-b border-zinc-800">
              <div className="flex gap-1 overflow-x-auto px-5 py-2">
                {variations!.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedVariationIndex(i)}
                    className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedVariationIndex === i ? "bg-blue-500/20 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                  >
                    Variant {i + 1}
                    {v.cost?.total != null && (
                      <span className="ml-1.5 text-xs opacity-75">${v.cost.total.toFixed(2)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <video src={activeVideoUrl ?? undefined} controls playsInline className="w-full aspect-video bg-black" />

          {submitError && isPreview && (
            <div className="px-5 py-2 border-t border-zinc-800 bg-red-500/10">
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}
          <div className="p-5 flex flex-wrap gap-3 border-t border-zinc-800">
            {isPreview ? (
              <>
                {downloadUrl && activeVideoUrl ? (
                  <a
                    href={downloadUrl}
                    download={downloadFilename}
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white font-medium px-5 py-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors text-sm"
                    aria-label="Download preview video"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download preview
                  </a>
                ) : null}
                <button
                  onClick={submitRenderFinal}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-white text-zinc-900 font-medium px-5 py-2.5 rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors text-sm"
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
                      Render Final Version
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
                      </svg>
                    </>
                  )}
                </button>
                {activeVideoUrl ? <CopyLinkButton videoUrl={activeVideoUrl} /> : null}
              </>
            ) : (
              <>
                {downloadUrl && activeVideoUrl ? (
                  <a
                    href={downloadUrl}
                    download={downloadFilename}
                    className="inline-flex items-center gap-2 bg-white text-zinc-900 font-medium px-5 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors text-sm"
                    aria-label="Download video"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download MP4
                  </a>
                ) : null}
                {activeVideoUrl ? <CopyLinkButton videoUrl={activeVideoUrl} /> : null}
              </>
            )}
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white font-medium px-5 py-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create another
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (jobId && (status === "pending" || status === "processing")) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 md:p-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="text-2xl">{STAGES[stage].icon}</span>
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin"></div>
            </div>
          </div>

          <div className="text-center mb-8">
            <p className="text-lg font-medium text-white mb-1">{STAGES[stage].label}</p>
            <p className="text-sm text-zinc-500">Step {stage + 1} of {STAGES.length}</p>
          </div>

          <div className="space-y-3 mb-8">
            {STAGES.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i < stage
                  ? "bg-blue-500 text-white"
                  : i === stage
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500"
                    : "bg-zinc-800 text-zinc-600"
                  }`}>
                  {i < stage ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-sm ${i <= stage ? "text-white" : "text-zinc-600"}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-zinc-500 mb-6">
            This usually takes about 60 seconds. Please don&apos;t close this page.
          </p>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={async () => {
                if (!jobId) return;
                try {
                  const res = await fetch(`/api/generate/${encodeURIComponent(jobId)}/cancel`, { method: "POST" });
                  const data = await res.json();
                  if (res.ok && data.cancelled) {
                    stopPolling();
                    setStatus("cancelled");
                  } else if (res.status === 409) {
                    stopPolling();
                    setError("Job already finished");
                  }
                } catch {
                  setError("Could not cancel");
                }
              }}
              className="text-sm text-zinc-400 hover:text-white font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-zinc-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-white mb-1">Generation cancelled</p>
            <p className="text-sm text-zinc-400 mb-4">The job was cancelled. Temp files were cleaned up.</p>
            <button
              onClick={reset}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              Start over →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "failed" && error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-white mb-1">Generation failed</p>
            <p className="text-sm text-zinc-400 mb-4">{error}</p>
            <button
              onClick={reset}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              Try again →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formContent = (
    <form onSubmit={submit}>
      {(submitError || (fieldErrors && fieldErrors.length > 0)) && (
        <div
          role="alert"
          className="mb-5 px-4 py-3 rounded-lg border border-red-500/40 bg-red-500/15"
          aria-live="polite"
        >
          {submitError && (
            <p className="text-sm font-medium text-red-200 flex items-start gap-2">
              <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {submitError}
            </p>
          )}
          {fieldErrors && fieldErrors.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-red-200/90 list-disc list-inside">
              {fieldErrors.map((e, i) => (
                <li key={i}>
                  {FIELD_LABELS[e.field] || e.field}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mb-5">
        <label htmlFor="prompt" className="block text-sm font-medium text-zinc-300 mb-2">
          Describe your video
        </label>
        <textarea
          id="prompt"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Explain how the stock market works in 30 seconds, professional tone"
          disabled={submitting}
          rows={4}
          aria-invalid={inputHasError}
          className={`w-full bg-zinc-900 border rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-blue-500/50 focus:outline-none resize-none transition-colors ${inputHasError ? "border-amber-500/50 focus:border-amber-500/50" : "border-zinc-800 focus:border-blue-500/50"
            }`}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-zinc-600">
            {input.length < MIN_INPUT_LENGTH && input.length > 0
              ? `${MIN_INPUT_LENGTH - input.length} more characters needed`
              : "Be specific about topic, tone, and audience"}
          </span>
          <span className="text-xs text-zinc-600">{input.length}/500</span>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-zinc-500 mb-2">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => setInput(ex.prompt)}
              className="text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Video length (seconds)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={DURATION_MIN}
            max={DURATION_MAX}
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
            aria-invalid={durationHasError}
            className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <input
            type="number"
            min={DURATION_MIN}
            max={DURATION_MAX}
            value={durationSeconds}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) setDurationSeconds(Math.min(DURATION_MAX, Math.max(DURATION_MIN, v)));
            }}
            aria-invalid={durationHasError}
            className={`w-16 bg-zinc-900 border rounded-lg px-2 py-1.5 text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${durationHasError ? "border-amber-500/50" : "border-zinc-800"
              }`}
          />
          <span className="text-sm text-zinc-500">sec</span>
        </div>
        <p className="text-xs text-zinc-600 mt-1">{DURATION_MIN}-{DURATION_MAX} seconds. Talking object over 8s uses multiple clips.</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Target platform
        </label>
        <div className="flex flex-wrap gap-2">
          {(["general", "linkedin", "twitter", "youtube_shorts"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${platform === p
                ? "border-blue-500/50 bg-blue-500/10 text-blue-200"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                }`}
            >
              {p === "general" && "General"}
              {p === "linkedin" && "LinkedIn"}
              {p === "twitter" && "Twitter"}
              {p === "youtube_shorts" && "YouTube Shorts"}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-1.5">Tone, length, and structure are tuned for the selected platform.</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Video style
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("slideshow")}
            className={`p-4 rounded-lg border text-left transition-all ${mode === "slideshow"
              ? "border-blue-500 bg-blue-500/10"
              : "border-zinc-800 hover:border-zinc-700"
              }`}
          >
            <span className="text-sm font-medium text-white">Slideshow</span>
            <p className="text-xs text-zinc-500 mt-1">Ken Burns slideshow with voiceover</p>
          </button>
          <button
            type="button"
            onClick={() => setMode("talking_object")}
            className={`p-4 rounded-lg border text-left transition-all ${mode === "talking_object"
              ? "border-blue-500 bg-blue-500/10"
              : "border-zinc-800 hover:border-zinc-700"
              }`}
          >
            <span className="text-sm font-medium text-white">Talking object</span>
            <p className="text-xs text-zinc-500 mt-1">Object with face that speaks and lip-syncs</p>
          </button>
        </div>

        {mode === "talking_object" && (
          <div className="mt-3">
            <p className="text-xs font-medium text-zinc-400 mb-2">Talking style</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTalkingObjectStyle("cartoon")}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${talkingObjectStyle === "cartoon"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
              >
                {talkingObjectStyle === "cartoon" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                )}
                Cartoon
              </button>
              <button
                type="button"
                onClick={() => setTalkingObjectStyle("real")}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${talkingObjectStyle === "real"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
              >
                {talkingObjectStyle === "real" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                )}
                Real person
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-1.5">Cartoon character or realistic human.</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Number of variants
        </label>
        <div className="flex flex-wrap gap-2">
          {[1, 3, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setVariationCount(n)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${variationCount === n
                ? "border-blue-500 bg-blue-500/10 text-blue-200"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                }`}
            >
              {n === 1 ? "1 variant" : `${n} variants`}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-1.5">Get multiple A/B-style variations (educational, high-energy, storytelling, etc.) per prompt. Preview uses 1 variant only.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="text-sm text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            ~60 seconds
          </span>
          <span className="mx-2">•</span>
          <span>1080p HD</span>
          <span className="mx-2">•</span>
          <span className="text-blue-400">Free</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={submitPreview}
            disabled={!valid || submitting}
            className="inline-flex items-center justify-center gap-2 bg-zinc-700 text-white font-medium px-5 py-3 rounded-lg hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
              "Generate Preview"
            )}
          </button>
          <button
            type="submit"
            disabled={!valid || submitting}
            className="inline-flex items-center justify-center gap-2 bg-white text-zinc-900 font-semibold px-6 py-3 rounded-lg hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                Generate video
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );

  const openJobFromList = useCallback((id: string) => {
    setJobId(id);
    setStatus("pending");
    setError(null);
    setVideoUrl(null);
    setVariations(null);
    setSubmitError(null);
    setFieldErrors(null);
  }, []);

  if (embedded) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 md:p-8">
        {formContent}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <header className="border-b border-zinc-800/50 bg-[#09090b]">
        <div className="max-w-3xl mx-auto h-14 px-6 flex items-center">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Create a video</h1>
        <p className="text-zinc-500 mb-8">Describe what you want in one sentence. We&apos;ll handle the rest.</p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 md:p-8">
          {formContent}
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setRecentJobsOpen((o) => !o)}
            className="w-full px-6 py-4 flex items-center justify-between text-left text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-colors"
            aria-expanded={recentJobsOpen}
          >
            <span>Recent generations</span>
            <svg
              className={`w-4 h-4 shrink-0 transition-transform ${recentJobsOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {recentJobsOpen && (
            <div className="border-t border-zinc-800 px-6 py-4">
              {recentJobsLoading ? (
                <p className="text-sm text-zinc-500">Loading...</p>
              ) : recentJobs && recentJobs.length === 0 ? (
                <p className="text-sm text-zinc-500">No recent jobs. Generate a video to see it here.</p>
              ) : recentJobs ? (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {recentJobs.map((j) => (
                    <li
                      key={j.jobId}
                      className="flex flex-wrap items-center gap-2 py-2 border-b border-zinc-800 last:border-0 last:pb-0 first:pt-0"
                    >
                      <code className="text-xs text-zinc-500 font-mono truncate max-w-32" title={j.jobId}>
                        {j.jobId.slice(0, 8)}…
                      </code>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${j.status === "completed"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : j.status === "failed" || j.status === "cancelled"
                            ? "bg-zinc-600/30 text-zinc-400"
                            : "bg-blue-500/20 text-blue-400"
                          }`}
                      >
                        {j.status}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {new Date(j.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </span>
                      {j.topic ? (
                        <span className="text-xs text-zinc-500 truncate max-w-48" title={j.topic}>
                          {j.topic}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openJobFromList(j.jobId)}
                        className="ml-auto text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        {j.status === "completed" && j.videoUrl ? "Watch" : "View"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
