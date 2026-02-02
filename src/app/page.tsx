"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";

type JobStatus = "pending" | "processing" | "completed" | "failed";

const POLL_INTERVAL_MS = 2500;

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

const FAQ = [
  {
    q: "How long does it take to generate a video?",
    a: "Most videos are ready in 60-90 seconds. Complex prompts may take up to 2 minutes.",
  },
  {
    q: "What video quality and length can I expect?",
    a: "Videos are 30-45 seconds long, rendered in 1080p HD. Perfect for social media or presentations.",
  },
  {
    q: "Can I use my own images?",
    a: "Yes! Upload product photos, logos, or any images. The AI will incorporate them into your video.",
  },
  {
    q: "Is the output royalty-free?",
    a: "Yes. All generated content is yours to use commercially without any licensing fees.",
  },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [mode, setMode] = useState<"slideshow" | "talking_object">("slideshow");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image previews
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
      // Upload images first if any
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
    setError(null);
    setPrompt("");
    setImages([]);
    setMode("slideshow");
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto h-14 px-6 flex items-center justify-between">
          <Link href="/" className="font-semibold text-white tracking-tight text-lg">
            cutline
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="#how" className="text-zinc-400 hover:text-white transition-colors">How it works</a>
            <a href="#faq" className="text-zinc-400 hover:text-white transition-colors">FAQ</a>
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
        {/* Hero */}
        <section className="pt-28 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center mb-12">
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

          {/* Main Generator Card */}
          <div id="create" className="max-w-5xl mx-auto">
            {status === "completed" && videoUrl ? (
              /* Video Result */
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
              /* Loading State */
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
                  <p className="text-sm text-zinc-500">This takes about 90 seconds</p>
                </div>
              </div>
            ) : status === "failed" && error ? (
              /* Error State */
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
              /* Input Form - Leonardo AI Style */
              <div className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden">
                <div className="grid md:grid-cols-[280px_1fr]">
                  {/* Left: Image Upload */}
                  <div className="p-6 border-b md:border-b-0 md:border-r border-white/5 bg-zinc-900/50">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-white">Your images (optional)</p>
                      <p className="text-xs text-zinc-500">{images.length}/5</p>
                    </div>
                    
                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                        dragActive ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 hover:border-zinc-700"
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

                    {/* Image previews */}
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

                    <p className="text-xs text-zinc-600 mt-4">
                      No images? We&apos;ll find visuals from the web based on your description. Or add your own—we&apos;ll use them first.
                    </p>
                  </div>

                  {/* Right: Prompt Input */}
                  <div className="p-6 flex flex-col">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-white mb-3">
                        Describe your video
                      </label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. Create a 30-second explainer about how solar panels work, professional tone with upbeat background music"
                        rows={5}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none resize-none"
                      />
                      <div className="flex items-center justify-between mt-2 text-xs text-zinc-600">
                        <span>Be specific: topic, tone, style, audience</span>
                        <span>{prompt.length}/500</span>
                      </div>

                      {/* Quick examples */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {["Explain AI", "Product demo", "How-to guide", "Promo video"].map((ex) => (
                          <button
                            key={ex}
                            onClick={() => setPrompt(`Create a 30-second ${ex.toLowerCase()} video with professional narration`)}
                            className="text-xs text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {ex}
                          </button>
                        ))}
                      </div>

                      {/* Mode selector */}
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-white mb-3">
                          Video style
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setMode("slideshow")}
                            className={`p-4 rounded-xl border text-left transition-all ${
                              mode === "slideshow"
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                mode === "slideshow" ? "border-blue-500" : "border-zinc-700"
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
                            className={`p-4 rounded-xl border text-left transition-all ${
                              mode === "talking_object"
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                mode === "talking_object" ? "border-blue-500" : "border-zinc-700"
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
                    </div>

                    {/* Generate button */}
                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="text-sm text-zinc-500">
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          ~90 sec
                        </span>
                        <span className="mx-2 text-zinc-700">•</span>
                        <span>1080p</span>
                        <span className="mx-2 text-zinc-700">•</span>
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
          </div>

          {/* Stats */}
          <div className="max-w-4xl mx-auto mt-12 flex flex-wrap justify-center gap-8 sm:gap-16 text-center">
            <div>
              <div className="text-2xl font-bold text-white">2,400+</div>
              <div className="text-sm text-zinc-500">Videos this week</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">90 sec</div>
              <div className="text-sm text-zinc-500">Avg. render time</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">1080p</div>
              <div className="text-sm text-zinc-500">HD output</div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Everything handled by AI
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                From script to final render, every step is automated. 
                No editing software needed.
              </p>
            </div>

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

        {/* How it works */}
        <section id="how" className="py-24 px-6 bg-zinc-950">
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

        {/* FAQ */}
        <section id="faq" className="py-24 px-6 border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Questions & Answers
              </h2>
            </div>

            <div className="space-y-4">
              {FAQ.map((item, i) => (
                <div key={i} className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-900 transition-colors"
                  >
                    <span className="font-medium text-white">{item.q}</span>
                    <svg
                      className={`w-5 h-5 text-zinc-500 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-zinc-400 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 px-6 bg-zinc-950">
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

      {/* Footer */}
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
