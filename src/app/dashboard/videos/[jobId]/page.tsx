"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import type { DashboardVideoDetail } from "@/app/api/dashboard/videos/[jobId]/route";
import { getUserFriendlyErrorMessage } from "@/lib/utils/error";

type ChatMessage = { role: "user" | "assistant"; text: string };

const POLL_INTERVAL_MS = 2500;
const DONE_MSG = "Done. Here's your updated video.";
const EDIT_FAILED_MSG = "Couldn't start edit. Please try again.";
const RATE_LIMIT_MSG = "Too many requests; try again later.";

const SUGGESTED_PROMPTS = [
  "Make the tone more casual and friendly",
  "Add more detail about the main topic",
  "Make it shorter and punchier",
  "Change to a more professional tone",
  "Regenerate with a different angle",
  "Add a clear call to action at the end",
];

export default function DashboardVideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = typeof params?.jobId === "string" ? params.jobId : "";
  const [video, setVideo] = useState<DashboardVideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [editInProgress, setEditInProgress] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
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

  const sendEditMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || editInProgress) return;
      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setInputValue("");
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
    [jobId, editInProgress, pollNewJob]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendEditMessage(inputValue);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      <div className="fixed inset-0 bg-linear-to-br from-zinc-950 via-zinc-950 to-zinc-900/80 pointer-events-none" aria-hidden="true" />
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/80">
        <div className="w-full h-14 px-6 lg:px-10 flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="font-semibold text-white tracking-tight text-lg">
            cutline
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link href="/#features" className="text-zinc-400 hover:text-white transition-colors">Features</Link>
            <Link href="/#how" className="text-zinc-400 hover:text-white transition-colors">How it works</Link>
            <Link href="/#faq" className="text-zinc-400 hover:text-white transition-colors">FAQ</Link>
            <Link href="/dashboard" className="text-white font-medium">Dashboard</Link>
          </nav>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Back to my videos
          </Link>
        </div>
      </header>

      <main className="relative pt-14 pb-20 px-6 lg:px-10 max-w-7xl mx-auto">
        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-20 text-center shadow-2xl shadow-black/30">
            <div className="w-14 h-14 mx-auto rounded-full border-2 border-zinc-600 border-t-white animate-spin mb-6" />
            <p className="text-zinc-300 font-medium text-lg">Loading video...</p>
            <p className="text-sm text-zinc-500 mt-2">Fetching your video details</p>
          </div>
        ) : notFound || !video ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-20 text-center shadow-2xl shadow-black/30">
            <div className="w-20 h-20 mx-auto rounded-full bg-zinc-800 flex items-center justify-center mb-6 ring-4 ring-zinc-700/50">
              <svg className="w-10 h-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Video not found</h2>
            <p className="text-sm text-zinc-500 mb-8 max-w-sm mx-auto">This job may have been removed or the link is invalid.</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to my videos
            </Link>
          </div>
        ) : (
          <div className="md:grid md:grid-cols-[1fr,380px] lg:grid-cols-[1fr,420px] md:gap-6 lg:gap-8 md:items-start min-w-0">

            <section id="edit-section" className="md:order-2 min-w-0 rounded-2xl border-2 border-emerald-500/40 bg-zinc-900/90 overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-emerald-500/20 flex flex-col min-h-[380px] lg:min-h-[calc(100vh-8rem)] scroll-mt-24 z-10">
              <div className="px-5 py-4 border-b border-zinc-800 bg-linear-to-r from-zinc-800/60 to-zinc-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-white text-lg">Edit with AI</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Ask for changes — we’ll regenerate the video.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[220px]">
                  {messages.length === 0 ? (
                    <div className="space-y-5">
                      <p className="text-sm text-zinc-400 font-medium">Try asking for a change:</p>
                      <div className="grid gap-2">
                        {SUGGESTED_PROMPTS.map((prompt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => sendEditMessage(prompt)}
                            disabled={editInProgress}
                            className="text-left w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-300 text-sm hover:border-zinc-600 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500 pt-2">Or type your own request below.</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                ? "bg-white text-zinc-900 rounded-br-md shadow-lg"
                                : "bg-zinc-800 text-zinc-200 border border-zinc-700/50 rounded-bl-md"
                              }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {editInProgress && (
                        <div className="flex justify-start">
                          <div className="inline-flex items-center gap-3 rounded-2xl rounded-bl-md px-4 py-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-sm">
                            <svg className="w-5 h-5 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Regenerating your video…</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {editInProgress && (
                  <div className="px-4 sm:px-5 py-3 border-t border-amber-500/30 bg-amber-500/10 flex items-center gap-3 shrink-0">
                    <svg className="w-5 h-5 shrink-0 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm text-amber-200/90">Regenerating video… You can send another message when this finishes.</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-800/30 shrink-0">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="e.g. “Change the tone” or “Add a section about…”"
                      disabled={editInProgress}
                      className="flex-1 min-w-0 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-500 text-sm focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || editInProgress}
                      className="shrink-0 px-5 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
                    >
                      {editInProgress ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sending
                        </>
                      ) : (
                        <>
                          Send
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </section>


            <div className="md:order-1 min-w-0 overflow-hidden mt-6 md:mt-0">
              <nav className="pt-0 md:pt-6 pb-4" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm flex-wrap">
                  <li>
                    <Link href="/dashboard" className="text-zinc-500 hover:text-white transition-colors">
                      Dashboard
                    </Link>
                  </li>
                  <li className="text-zinc-600" aria-hidden="true">/</li>
                  <li className="text-white font-medium max-w-[min(100%,320px)] truncate sm:max-w-none sm:line-clamp-2" title={video.title}>
                    {video.title || "Video"}
                  </li>
                </ol>
              </nav>
              <article className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden shadow-xl shadow-black/20 ring-1 ring-white/5">
                <div className="relative aspect-video bg-black">
                  <video
                    key={currentVideoUrl ?? video.videoUrl}
                    src={currentVideoUrl ?? video.videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-black/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {video.status}
                    </span>
                  </div>
                </div>
                <div className="p-5 sm:p-6 border-t border-zinc-800">
                  <h1 className="text-xl font-semibold text-white leading-snug line-clamp-2" title={video.title}>
                    {video.title || "Untitled video"}
                  </h1>
                  <p className="mt-2 text-sm text-zinc-400 line-clamp-2" title={video.prompt}>
                    {video.prompt}
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-400 text-xs font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {video.date}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-400 text-xs font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {video.duration}
                      </span>
                    </div>
                    <a
                      href={currentVideoUrl ?? video.videoUrl}
                      download={`cutline-${jobId}.mp4`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors shadow-lg shadow-black/20 w-full sm:w-auto sm:ml-auto shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download MP4
                    </a>
                  </div>
                </div>
              </article>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
