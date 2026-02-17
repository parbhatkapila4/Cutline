"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DURATION_MIN, DURATION_MAX } from "@/lib/validation/duration";

type JobStatus = "pending" | "processing" | "completed" | "failed";

const POLL_INTERVAL_MS = 2500;
const MIN_INPUT_LENGTH = 5;
const DURATION_DEFAULT = 30;

const EXAMPLES = [
  { label: "Explainer", prompt: "Explain why we dream in 30 seconds, friendly tone" },
  { label: "Product", prompt: "Promote a meditation app with calming visuals" },
  { label: "Educational", prompt: "How photosynthesis works for middle schoolers" },
  { label: "Marketing", prompt: "Announce a coffee shop grand opening, warm vibes" },
];

const STAGES = [
  { label: "Analyzing your prompt", icon: "🎯" },
  { label: "Writing the script", icon: "✍️" },
  { label: "Sourcing visuals", icon: "🖼️" },
  { label: "Generating voiceover", icon: "🎙️" },
  { label: "Rendering video", icon: "🎬" },
];

type Props = { embedded?: boolean };

export function GenerateFlow({ embedded = false }: Props) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"slideshow" | "talking_object">("slideshow");
  const [talkingObjectStyle, setTalkingObjectStyle] = useState<"cartoon" | "real">("cartoon");
  const [durationSeconds, setDurationSeconds] = useState(DURATION_DEFAULT);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLElement | null>(null);

  const valid = input.trim().length >= MIN_INPUT_LENGTH;

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
          setError(data.error || "Something went wrong");
          setStatus("failed");
          stopPolling();
          return;
        }
        setStatus(data.status);
        if (data.status === "completed" && data.videoUrl) {
          setVideoUrl(data.videoUrl);
          stopPolling();
        }
        if (data.status === "failed") {
          setError(data.error || "Generation failed");
          stopPolling();
        }
      } catch {
        setError("Connection lost");
        setStatus("failed");
        stopPolling();
      }
    },
    [stopPolling]
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

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!valid || submitting) return;

      setSubmitError(null);
      setError(null);
      setVideoUrl(null);
      setStatus(null);
      setJobId(null);
      setSubmitting(true);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: input.trim(),
            mode,
            durationSeconds: Math.min(DURATION_MAX, Math.max(DURATION_MIN, durationSeconds)),
            ...(mode === "talking_object" ? { talkingObjectStyle } : {}),
          }),
        });
        const data = (await res.json()) as {
          jobId?: string;
          error?: string;
          tokensRemaining?: number;
          tokensRequired?: number;
          videosUsed?: number;
          videosLimit?: number;
        };
        if (!res.ok) {
          let msg = data.error || "Failed to start generation";
          if (res.status === 402 && data.tokensRemaining != null && data.tokensRequired != null) {
            msg += ` You have ${data.tokensRemaining} credits, need ${data.tokensRequired} per video.`;
          }
          if (res.status === 402 && data.videosUsed != null && data.videosLimit != null) {
            msg += ` You've used ${data.videosUsed} of ${data.videosLimit} videos this month.`;
          }
          setSubmitError(msg);
          return;
        }
        setJobId(data.jobId ?? null);
        setStatus("pending");
      } catch {
        setSubmitError("Connection failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [input, mode, durationSeconds, valid, submitting]
  );

  const reset = useCallback(() => {
    stopPolling();
    setJobId(null);
    setStatus(null);
    setVideoUrl(null);
    setError(null);
    setInput("");
    setMode("slideshow");
    setDurationSeconds(DURATION_DEFAULT);
  }, [stopPolling]);

  useEffect(() => {
    if (status === "completed" && videoUrl && videoRef.current) {
      videoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [status, videoUrl]);

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
              <p className="font-medium text-white">Your video is ready!</p>
              <p className="text-sm text-zinc-500">1080p HD • MP4 format</p>
            </div>
          </div>

          <video src={videoUrl} controls playsInline className="w-full aspect-video bg-black" />

          <div className="p-5 flex flex-wrap gap-3 border-t border-zinc-800">
            <a
              href={videoUrl}
              download
              className="inline-flex items-center gap-2 bg-white text-zinc-900 font-medium px-5 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download MP4
            </a>
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

          <p className="text-center text-sm text-zinc-500">
            This usually takes about 60 seconds. Please don&apos;t close this page.
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed" && error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
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
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none resize-none transition-colors"
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
            className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-sm text-zinc-500">sec</span>
        </div>
        <p className="text-xs text-zinc-600 mt-1">{DURATION_MIN}–{DURATION_MAX} seconds. Talking object over 8s uses multiple clips.</p>
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

      {submitError && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{submitError}</p>
        </div>
      )}

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
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );

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
      </main>
    </div>
  );
}
