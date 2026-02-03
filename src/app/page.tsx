"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";

type JobStatus = "pending" | "processing" | "completed" | "failed";

const POLL_INTERVAL_MS = 2500;

const TEXT_MODEL_OPTIONS = [
  { value: "", label: "Default (from env)" },
  { value: "google/gemini-2.0-flash-exp", label: "Gemini 2 Flash Exp (~500/day)" },
  { value: "google/gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash (~10K/day)" },
  { value: "google/gemini-2.5-flash-image", label: "Nano Banana / 2.5 Flash Image (~2K/day)" },
  { value: "google/gemini-2.0-flash-lite-001", label: "Gemini 2 Flash Lite (default)" },
];

const STAGES = [
  "Analyzing prompt",
  "Writing script",
  "Sourcing visuals",
  "Generating voice",
  "Rendering video",
];

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: "AI Script Generation",
    desc: "Transforms your one-liner into a complete script with proper pacing and narrative structure.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
      </svg>
    ),
    title: "Smart Visual Selection",
    desc: "Images optional. We use your uploads or fetch from stock photos and AI based on your description.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    title: "Natural Voiceover",
    desc: "Multiple AI voices that sound human, automatically matched to your content's tone.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5" />
      </svg>
    ),
    title: "Professional Editing",
    desc: "Automatic cuts, transitions, and pacing that feel hand-crafted by an expert editor.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      </svg>
    ),
    title: "Background Music",
    desc: "Royalty-free music matched to your video's mood and synced to the pacing.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    title: "Auto Captions",
    desc: "Perfectly synced subtitles styled to match your video's aesthetic.",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Get started with AI video generation at no cost.",
    features: ["Up to 3 videos per week", "1080p HD output", "60 sec max length", "Auto captions"],
    cta: "Get started",
    href: "#create",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$30",
    period: "/month",
    description: "For creators who need more output.",
    features: ["Unlimited videos", "1080p HD output", "60 sec max length", "Priority processing", "Commercial use"],
    cta: "Go Pro",
    href: "#create",
    highlighted: true,
  },
  {
    name: "Pro+",
    price: "$70",
    period: "/month",
    description: "Maximum capacity for teams and power users.",
    features: ["Everything in Pro", "Extended clip length", "API access", "Dedicated support", "Custom branding"],
    cta: "Get Pro+",
    href: "#create",
    highlighted: false,
  },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [mode, setMode] = useState<"slideshow" | "talking_object">("slideshow");
  const [captions, setCaptions] = useState<"on" | "off">("on");
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [textModel, setTextModel] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef(prompt);
  promptRef.current = prompt;
  const promptFromSuggestionRef = useRef(false);

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setImageUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

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
          setCompletionMessage(data.message ?? null);
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

  const handleSubmit = async () => {
    if (!prompt.trim() || prompt.trim().length < 5 || submitting) return;

    setError(null);
    setVideoUrl(null);
    setStatus(null);
    setJobId(null);
    setSubmitting(true);

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

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: prompt.trim(),
          mode: mode,
          durationSeconds: Math.min(60, Math.max(10, durationSeconds)),
          ...(textModel.trim() ? { textModel: textModel.trim() } : {}),
          ...(assetIds.length > 0 ? { assetIds } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start generation");
        return;
      }
      setJobId(data.jobId);
      setStatus("pending");
    } catch {
      setError("Connection failed. Please try again.");
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
    setCaptions("on");
    setDurationSeconds(30);
    setTextModel("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
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

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto h-14 px-6 flex items-center justify-between">
          <Link href="/" className="font-semibold text-white tracking-tight text-lg">
            cutline
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="#how" className="text-zinc-400 hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</a>
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>
          <a
            href="#create"
            className="text-sm font-medium text-black bg-white hover:bg-zinc-200 px-4 py-2 rounded-lg transition-colors"
          >
            Try free
          </a>
        </div>
      </header>

      <main>
        <section className="pt-28 pb-16 px-6 relative overflow-hidden">

          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
            <svg
              className="absolute w-[1200px] h-[1000px] left-[-200px] top-[100px] md:left-[-150px] animate-[ribbonWaveLeft_8s_ease-in-out_infinite]"
              viewBox="0 0 1000 800"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <linearGradient id="ribbon-grad-left" gradientUnits="userSpaceOnUse" x1="280" y1="50" x2="420" y2="750">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="18%" stopColor="#8b5cf6" />
                  <stop offset="36%" stopColor="#c026d3" />
                  <stop offset="52%" stopColor="#ec4899" />
                  <stop offset="68%" stopColor="#f472b6" />
                  <stop offset="80%" stopColor="#fb923c" />
                  <stop offset="92%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#fde047" />
                </linearGradient>
              </defs>

              <path
                d="M 50 -80
                   C 150 100, 250 250, 320 400
                   C 400 580, 520 700, 700 850
                   L 820 850
                   C 620 680, 500 550, 420 380
                   C 330 200, 220 50, 100 -80
                   Z"
                fill="url(#ribbon-grad-left)"
              />
            </svg>
          </div>


          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
            <svg
              className="absolute w-[1200px] h-[1000px] right-[-200px] top-[50px] md:right-[-100px] animate-[ribbonWaveRight_8s_ease-in-out_infinite]"
              viewBox="0 0 1000 800"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <linearGradient id="ribbon-grad-right" gradientUnits="userSpaceOnUse" x1="580" y1="50" x2="720" y2="750">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="18%" stopColor="#8b5cf6" />
                  <stop offset="36%" stopColor="#c026d3" />
                  <stop offset="52%" stopColor="#ec4899" />
                  <stop offset="68%" stopColor="#f472b6" />
                  <stop offset="80%" stopColor="#fb923c" />
                  <stop offset="92%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#fde047" />
                </linearGradient>
              </defs>

              <path
                d="M 950 -80
                   C 850 100, 750 250, 680 400
                   C 600 580, 480 700, 300 850
                   L 180 850
                   C 380 680, 500 550, 580 380
                   C 670 200, 780 50, 900 -80
                   Z"
                fill="url(#ribbon-grad-right)"
              />
            </svg>
          </div>

          <div className="max-w-4xl mx-auto text-center mb-12 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              AI Video Generation
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              Create videos from
              <br />
              <span className="text-zinc-500">a single sentence</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Describe what you want—add images (optional) and we&apos;ll make a video.
              No images? We&apos;ll find visuals from the web based on your description.
            </p>
          </div>

          <div id="create" className="max-w-5xl mx-auto relative z-10">
            {status === "completed" && videoUrl ? (
              <div className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-emerald-500/10">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Your video is ready!</p>
                    <p className="text-sm text-zinc-500">1080p HD • MP4</p>
                  </div>
                </div>
                {completionMessage ? (
                  <div className="px-6 py-3 bg-amber-500/10 border-b border-white/5">
                    <p className="text-sm text-amber-200">{completionMessage}</p>
                  </div>
                ) : null}
                <video src={videoUrl} controls playsInline className="w-full aspect-video bg-black" />
                <div className="p-6 flex flex-wrap gap-3 border-t border-white/5">
                  <a
                    href={videoUrl}
                    download
                    className="inline-flex items-center gap-2 bg-white text-black font-medium px-5 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white font-medium px-5 py-2.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-sm"
                  >
                    Create another
                  </button>
                </div>
              </div>
            ) : jobId && (status === "pending" || status === "processing") ? (
              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-12">
                <div className="max-w-sm mx-auto text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin"></div>
                    <span className="text-2xl">🎬</span>
                  </div>
                  <p className="text-lg font-medium text-white mb-2">{STAGES[stage]}</p>
                  <div className="flex justify-center gap-1 mb-4">
                    {STAGES.map((_, i) => (
                      <div key={i} className={`h-1 w-10 rounded-full ${i <= stage ? "bg-blue-500" : "bg-zinc-800"}`} />
                    ))}
                  </div>
                  <p className="text-sm text-zinc-500">This takes about 60 seconds</p>
                </div>
              </div>
            ) : status === "failed" && error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white mb-1">Generation failed</p>
                    <p className="text-sm text-zinc-400 mb-4">{error}</p>
                    <button onClick={reset} className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                      Try again →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden">
                <div className="grid md:grid-cols-[280px_1fr]">
                  <div className="p-6 md:p-7 border-b md:border-b-0 md:border-r border-white/5 bg-zinc-900/50">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-white">Your images (optional)</p>
                      <p className="text-xs text-zinc-500">{images.length}/5</p>
                    </div>

                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragActive ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 hover:border-zinc-700"
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
                      <svg className="w-8 h-8 mx-auto mb-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <p className="text-sm text-zinc-500">Drop images or click</p>
                      <p className="text-xs text-zinc-600 mt-1">Optional • Max 5</p>
                    </div>

                    {images.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {images.map((_, i) => (
                          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                            <img src={imageUrls[i]} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => removeImage(i)}
                              className="absolute top-1 right-1 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-zinc-600 mt-4 leading-relaxed">
                      No images? We&apos;ll find visuals from the web based on your description. Or add your own—we&apos;ll use them first.
                    </p>

                    <div className="mt-8 pt-6 border-t border-white/5">
                      <label className="block text-sm font-medium text-white mb-3">
                        Script model
                      </label>
                      <div className="relative">
                        <select
                          value={textModel}
                          onChange={(e) => setTextModel(e.target.value)}
                          className="w-full min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-12 py-3 text-white text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-shadow cursor-pointer appearance-none bg-no-repeat bg-position-[right_1rem_center] bg-size-[1.25rem_1.25rem]"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                          }}
                        >
                          {TEXT_MODEL_OPTIONS.map((opt) => (
                            <option key={opt.value || "default"} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2.5 leading-relaxed">Uses this model for intent, script, and planning.</p>
                    </div>


                    <div className="mt-2 flex justify-center">
                      <svg width="150" height="210" viewBox="0 0 150 210" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl mt-8">
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


                        <circle className="sparkle sp1" cx="20" cy="40" r="4" fill="#FFD700" />
                        <circle className="sparkle sp2" cx="130" cy="35" r="3" fill="#FFD700" />
                        <circle className="sparkle sp3" cx="25" cy="110" r="3.5" fill="#FFD700" />


                        <path className="heart1" d="M135 70 C135 66, 131 63, 128 63 C125 63, 122 66, 122 70 C122 76, 128 82, 128 82 C128 82, 135 76, 135 70Z" fill="#FF6B9D" />
                        <path className="heart2" d="M18 65 C18 62, 15 60, 13 60 C11 60, 8 62, 8 65 C8 69, 13 73, 13 73 C13 73, 18 69, 18 65Z" fill="#FF6B9D" />
                        <path className="heart3" d="M140 120 C140 117, 137 115, 135 115 C133 115, 130 117, 130 120 C130 124, 135 128, 135 128 C135 128, 140 124, 140 120Z" fill="#FF6B9D" />

                        <g className="dance-body">

                          <ellipse cx="75" cy="200" rx="30" ry="6" fill="#000" opacity="0.15" />


                          <g className="left-leg">
                            <ellipse cx="62" cy="172" rx="11" ry="24" fill="#FDBF9C" />
                            <ellipse cx="62" cy="195" rx="13" ry="9" fill="#5D9CEC" />
                            <ellipse cx="62" cy="193" rx="11" ry="5" fill="#4A89DC" />
                          </g>


                          <g className="right-leg">
                            <ellipse cx="88" cy="172" rx="11" ry="24" fill="#FDBF9C" />
                            <ellipse cx="88" cy="195" rx="13" ry="9" fill="#5D9CEC" />
                            <ellipse cx="88" cy="193" rx="11" ry="5" fill="#4A89DC" />
                          </g>


                          <ellipse cx="75" cy="130" rx="32" ry="38" fill="#5D9CEC" />
                          <ellipse cx="75" cy="125" rx="28" ry="30" fill="#4A89DC" />


                          <rect x="55" y="135" width="40" height="18" rx="8" fill="#4A89DC" stroke="#5D9CEC" strokeWidth="2" />


                          <line x1="68" y1="100" x2="68" y2="118" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                          <line x1="82" y1="100" x2="82" y2="118" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="68" cy="118" r="3" fill="#fff" />
                          <circle cx="82" cy="118" r="3" fill="#fff" />


                          <g className="left-arm">
                            <ellipse cx="40" cy="115" rx="12" ry="28" fill="#5D9CEC" />
                            <ellipse cx="36" cy="140" rx="10" ry="16" fill="#FDBF9C" />
                            <circle cx="34" cy="155" r="9" fill="#FDBF9C" />
                          </g>


                          <g className="right-arm">
                            <ellipse cx="110" cy="115" rx="12" ry="28" fill="#5D9CEC" />
                            <ellipse cx="114" cy="140" rx="10" ry="16" fill="#FDBF9C" />
                            <circle cx="116" cy="155" r="9" fill="#FDBF9C" />
                          </g>

                          <g className="head-move">

                            <ellipse cx="75" cy="52" rx="34" ry="35" fill="#8B5A2B" />
                            <ellipse cx="48" cy="60" rx="12" ry="18" fill="#8B5A2B" />
                            <ellipse cx="102" cy="60" rx="12" ry="18" fill="#8B5A2B" />


                            <ellipse cx="45" cy="55" rx="8" ry="12" fill="#6B4423" />
                            <ellipse cx="105" cy="55" rx="8" ry="12" fill="#6B4423" />


                            <ellipse cx="75" cy="58" rx="28" ry="26" fill="#FDBF9C" />


                            <ellipse cx="55" cy="65" rx="7" ry="4" fill="#FFB6C1" opacity="0.7" />
                            <ellipse cx="95" cy="65" rx="7" ry="4" fill="#FFB6C1" opacity="0.7" />


                            <path d="M62 52 C62 48, 58 45, 55 45 C52 45, 49 48, 49 52 C49 57, 55 62, 55 62 C55 62, 62 57, 62 52Z" fill="#1a1a1a" />
                            <path d="M101 52 C101 48, 97 45, 94 45 C91 45, 88 48, 88 52 C88 57, 94 62, 94 62 C94 62, 101 57, 101 52Z" fill="#1a1a1a" />


                            <circle cx="53" cy="50" r="2.5" fill="#fff" />
                            <circle cx="92" cy="50" r="2.5" fill="#fff" />

                            <path d="M65 72 Q75 82, 85 72" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />


                            <ellipse cx="75" cy="35" rx="28" ry="14" fill="#8B5A2B" />
                            <ellipse cx="60" cy="35" rx="12" ry="10" fill="#7D4E2A" />
                            <ellipse cx="90" cy="35" rx="12" ry="10" fill="#7D4E2A" />
                            <ellipse cx="75" cy="30" rx="8" ry="8" fill="#6B4423" />


                            <ellipse cx="75" cy="28" rx="34" ry="16" fill="#F5B800" />
                            <rect x="41" y="18" width="68" height="14" rx="5" fill="#F5B800" />
                            <ellipse cx="75" cy="18" rx="28" ry="11" fill="#FFD700" />


                            <ellipse cx="75" cy="32" rx="36" ry="8" fill="#E5A800" />


                            <ellipse cx="62" cy="16" rx="14" ry="5" fill="#FFE44D" opacity="0.5" />


                            <circle cx="75" cy="10" r="5" fill="#E5A800" />
                            <circle cx="75" cy="10" r="3" fill="#FFD700" />
                          </g>
                        </g>
                      </svg>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-white mb-3">
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
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none resize-none"
                      />
                      {(() => {
                        const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
                        const canSuggest = wordCount > 10;
                        return (
                          <div className="flex items-start justify-between mt-2 text-xs text-zinc-600 gap-4">
                            <span>Be specific: topic, tone, style, audience</span>
                            <div className="flex flex-col items-end shrink-0">
                              <span>{prompt.length}/500</span>
                              {!canSuggest && prompt.trim().length > 0 && (
                                <span className="text-amber-400/90 mt-1 text-right max-w-[200px]">Not enough words</span>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  const currentPrompt = promptRef.current;
                                  const words = currentPrompt.trim().split(/\s+/).filter(Boolean);
                                  if (words.length <= 10) {
                                    setError("Not enough words");
                                    return;
                                  }
                                  setSuggesting(true);
                                  setError(null);
                                  try {
                                    const isRefine = promptFromSuggestionRef.current;
                                    const res = await fetch("/api/suggest-prompt", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ prompt: currentPrompt, refine: isRefine }),
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.error || "Suggestion failed");
                                    if (typeof data.suggestion === "string") {
                                      setPrompt(data.suggestion);
                                      promptFromSuggestionRef.current = true;
                                    }
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : "Could not get suggestion");
                                  } finally {
                                    setSuggesting(false);
                                  }
                                }}
                                disabled={suggesting || !canSuggest}
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
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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
                          { label: "Product demo", prompt: "Create a 30-second product demo video highlighting key features and benefits, professional and confident tone, upbeat background music." },
                          { label: "Promo / ad", prompt: "Create a 30-second promo video for a fitness app launch, energetic and motivational tone, punchy visuals and strong call-to-action." },
                          { label: "Company intro", prompt: "Create a 30-second company introduction video, who we are and what we do, professional and trustworthy tone." },
                          { label: "Social proof", prompt: "Create a 30-second customer success story or testimonial style video, authentic and inspiring tone." },
                          { label: "Event recap", prompt: "Create a 30-second event recap video, key moments and highlights, dynamic and celebratory tone." },
                          { label: "Quick tip", prompt: "Create a 30-second quick tip video on improving productivity, concise and actionable, friendly expert tone." },
                        ].map(({ label, prompt: p }) => (
                          <button
                            key={label}
                            onClick={() => setPrompt(p)}
                            className="text-xs text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-white mb-3">
                          Video length (seconds)
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min={10}
                            max={60}
                            value={durationSeconds}
                            onChange={(e) => setDurationSeconds(Number(e.target.value))}
                            className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <input
                            type="number"
                            min={10}
                            max={60}
                            value={durationSeconds}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (!Number.isNaN(v)) setDurationSeconds(Math.min(60, Math.max(10, v)));
                            }}
                            className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-sm text-zinc-500">sec</span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-1">10–60 seconds. Talking object videos over 8s use multiple clips.</p>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-white mb-3">
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
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === "slideshow" ? "border-blue-500" : "border-zinc-700"
                                }`}>
                                {mode === "slideshow" && (
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                )}
                              </div>
                              <span className="text-sm font-medium text-white">Slideshow</span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">
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
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === "talking_object" ? "border-blue-500" : "border-zinc-700"
                                }`}>
                                {mode === "talking_object" && (
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                )}
                              </div>
                              <span className="text-sm font-medium text-white">Talking object</span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                              Object with a face that speaks and lip-syncs
                            </p>
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-white mb-2">Captions</label>
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
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${captions === "on" ? "border-blue-500" : "border-zinc-700"}`}>
                                {captions === "on" && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                              </div>
                              <span className="text-sm font-medium text-white">With captions</span>
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
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${captions === "off" ? "border-blue-500" : "border-zinc-700"}`}>
                                {captions === "off" && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                              </div>
                              <span className="text-sm font-medium text-white">No captions</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
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
                        onClick={handleSubmit}
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
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-4xl mx-auto mt-12 flex flex-wrap justify-center gap-8 sm:gap-16 text-center relative z-10">
              <div>
                <div className="text-2xl font-bold text-white">2,400+</div>
                <div className="text-sm text-zinc-500">Videos this week</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">60 sec</div>
                <div className="text-sm text-zinc-500">Avg. render time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">1080p</div>
                <div className="text-sm text-zinc-500">HD output</div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature, i) => (
                <div
                  key={i}
                  className="group p-6 rounded-xl border border-white/5 bg-zinc-950 hover:bg-zinc-900 hover:border-white/10 transition-all"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 mb-4 group-hover:bg-blue-500/20 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="py-24 px-6 bg-black">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Three steps. Two minutes.
              </h2>
              <p className="text-zinc-400 text-lg">
                No learning curve. Just describe and download.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  num: "01",
                  title: "Upload & describe",
                  desc: "Add your images (optional) and write a sentence describing your video idea.",
                },
                {
                  num: "02",
                  title: "AI generates",
                  desc: "Our pipeline writes the script, sources visuals, generates voiceover, and edits everything.",
                },
                {
                  num: "03",
                  title: "Download & share",
                  desc: "Get your finished video in 1080p HD. Ready for social media or presentations.",
                },
              ].map((step, i) => (
                <div key={i}>
                  <div className="text-5xl font-bold text-zinc-800 mb-4">{step.num}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-zinc-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-24 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Pricing
              </h2>
              <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                Choose the plan that fits your needs. Start free, upgrade when you’re ready.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {PRICING.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl border p-6 flex flex-col ${plan.highlighted
                    ? "border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10"
                    : "border-white/10 bg-zinc-950"
                    }`}
                >
                  <p className="text-sm font-medium text-zinc-400 uppercase tracking-wider">{plan.name}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-zinc-500">{plan.period}</span>}
                  </div>
                  <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{plan.description}</p>
                  <ul className="mt-6 space-y-3 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                        <svg className="w-4 h-4 shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={plan.href}
                    className={`mt-6 block text-center font-semibold py-3 px-4 rounded-xl transition-colors ${plan.highlighted
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
                      }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 px-6 bg-black">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to create your first video?
            </h2>
            <p className="text-lg text-zinc-400 mb-10">
              No account needed. Just scroll up and start creating.
            </p>
            <a
              href="#create"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold px-8 py-4 rounded-xl hover:bg-zinc-200 transition-colors text-lg"
            >
              Start creating
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 px-6 bg-black">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <span className="font-medium text-white">cutline</span>
          <span>AI-powered video generation</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
