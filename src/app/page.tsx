"use client";

import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getUserFriendlyErrorMessage } from "@/lib/utils/error";

type JobStatus = "pending" | "processing" | "completed" | "failed";

const POLL_INTERVAL_MS = 2500;

const TEXT_MODEL_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: "", label: "Default (from env)", desc: "Uses the model configured on the server" },
  { value: "google/gemini-2.0-flash-exp", label: "Gemini 2 Flash Exp", desc: "Experimental: ~500 req/day" },
  { value: "google/gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash", desc: "Latest: ~10K req/day" },
  { value: "google/gemini-2.5-flash-image", label: "Nano Banana / 2.5 Flash Image", desc: "Vision model: ~2K req/day" },
  { value: "google/gemini-2.0-flash-lite-001", label: "Gemini 2 Flash Lite", desc: "Lightweight & fast" },
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
  {
    icon: null,
    title: "1080p HD Export",
    desc: "Download your finished video in full HD quality, ready for any platform.",
  },
  {
    icon: null,
    title: "No Watermarks",
    desc: "Your videos are yours. No branding, no watermarks, no strings attached.",
  },
];

const FEATURE_TABS = [
  "Content Creators",
  "Marketers",
  "Educators",
  "E\u2011commerce",
  "Social Media",
  "Agencies",
];

const FEATURE_TAB_DATA = [

  {
    card1: { title: "AI Script Engine", desc: "A fast, intelligent script engine built for content speed\u00a0\u2014 auto-generate narratives, structure, and pacing with zero friction.", statValue: "30%", statLabel: "vs Last Week", mainLabel: "Script Length", mainValue: "247 words" },
    card2: { title: "Visual\nIntelligence", desc: "Smart image sourcing from the web, AI generation, or your uploads\u00a0\u2014 matched to each scene automatically.", list: [{ name: "Web Search", count: "12", active: true }, { name: "AI Generated", count: "5", active: false }, { name: "Uploads", count: "", active: false }], product: { name: "Mountain Scene", detail: "Matched to your narrative, sourced in HD quality.", badge: "HD 1080p" } },
    card3: { title: "Video Studio", desc: "Full control from resolution to captions\u00a0\u2014 preview, export, and download your HD video instantly.", dd1: "1080p Resolution", dd2: "MP4 Format", infoTitle: "Render Time", infoDesc: "Track your render speed across all videos\u00a0\u2014 average 60\u00a0seconds for a complete HD export.", btn: "Export MP4" },
  },

  {
    card1: { title: "Campaign Script", desc: "Generate ad copy, landing page scripts, and marketing narratives tuned for conversion\u00a0\u2014 on brand, on message.", statValue: "45%", statLabel: "vs Last Month", mainLabel: "Ad Copy", mainValue: "180 words" },
    card2: { title: "Brand\nVisuals", desc: "Pull from your brand kit, stock libraries, or let AI generate on-brand imagery for every campaign touchpoint.", list: [{ name: "Stock Library", count: "24", active: true }, { name: "AI Enhanced", count: "8", active: false }, { name: "Brand Assets", count: "", active: false }], product: { name: "Product Shot", detail: "On-brand hero image, color-matched to your palette.", badge: "4K Ready" } },
    card3: { title: "Multi-Format", desc: "Export for every channel\u00a0\u2014 Instagram, YouTube, LinkedIn, TikTok\u00a0\u2014 in one click.", dd1: "4K Resolution", dd2: "All Platforms", infoTitle: "Campaign ROI", infoDesc: "Track engagement and conversion across every video asset you publish.", btn: "Export All" },
  },

  {
    card1: { title: "Lesson Builder", desc: "Turn lesson plans into engaging video lectures with clear structure, pacing, and visual cues\u00a0\u2014 automatically.", statValue: "52%", statLabel: "Engagement Up", mainLabel: "Lesson Plan", mainValue: "320 words" },
    card2: { title: "Visual\nAids", desc: "Auto-generate diagrams, illustrations, and slide visuals that reinforce key concepts in every lesson.", list: [{ name: "Diagrams", count: "15", active: true }, { name: "Illustrations", count: "7", active: false }, { name: "Slides", count: "", active: false }], product: { name: "Concept Map", detail: "Visual breakdown of complex topics for better retention.", badge: "HD 1080p" } },
    card3: { title: "Course Studio", desc: "Optimized exports for LMS platforms, YouTube, and classroom presentations\u00a0\u2014 captioned and accessible.", dd1: "720p Optimized", dd2: "WebM Format", infoTitle: "Student Retention", infoDesc: "Average 3x higher completion rate with video-first lesson delivery.", btn: "Export Lesson" },
  },

  {
    card1: { title: "Product Script", desc: "Auto-generate product demos, unboxing scripts, and feature highlights that sell\u00a0\u2014 no copywriter needed.", statValue: "38%", statLabel: "Conv. Boost", mainLabel: "Product Copy", mainValue: "156 words" },
    card2: { title: "Product\nImagery", desc: "Source lifestyle shots, catalog images, and AI-enhanced product visuals matched to your store\u2019s look.", list: [{ name: "Catalog", count: "18", active: true }, { name: "Lifestyle", count: "6", active: false }, { name: "User Photos", count: "", active: false }], product: { name: "Hero Banner", detail: "High-converting product imagery for storefronts and ads.", badge: "4K Ready" } },
    card3: { title: "Store Export", desc: "Sized and formatted for Shopify, Amazon, Instagram Shopping, and every major storefront.", dd1: "Square 1:1", dd2: "Shopify Format", infoTitle: "Ad Spend ROAS", infoDesc: "Track return on ad spend with video vs static across every channel.", btn: "Export Listing" },
  },

  {
    card1: { title: "Viral Script", desc: "Craft scroll-stopping hooks, punchy narratives, and platform-native scripts optimized for shares and saves.", statValue: "62%", statLabel: "Share Rate", mainLabel: "Caption", mainValue: "89 words" },
    card2: { title: "Trend\nVisuals", desc: "Auto-source trending templates, effects, and visual styles that match what\u2019s performing right now.", list: [{ name: "Trending", count: "20", active: true }, { name: "Templates", count: "9", active: false }, { name: "Custom", count: "", active: false }], product: { name: "Reel Cover", detail: "Thumb-stopping cover frames optimized for the feed.", badge: "HD 1080p" } },
    card3: { title: "Platform Export", desc: "One-click export sized for Reels, TikTok, Shorts, and Stories\u00a0\u2014 no manual cropping.", dd1: "9:16 Portrait", dd2: "Reel Format", infoTitle: "Reach Analytics", infoDesc: "Average 4.2x more reach with AI-generated Reels vs static posts.", btn: "Export Reel" },
  },

  {
    card1: { title: "Client Scripts", desc: "Turn client briefs into polished video scripts at scale\u00a0\u2014 consistent tone, fast turnaround, zero rewrites.", statValue: "28%", statLabel: "Faster Delivery", mainLabel: "Brief", mainValue: "412 words" },
    card2: { title: "Asset\nLibrary", desc: "Centralize client assets, licensed footage, and AI-generated visuals in one searchable workspace.", list: [{ name: "Client Assets", count: "32", active: true }, { name: "Licensed", count: "14", active: false }, { name: "Generated", count: "", active: false }], product: { name: "Brand Intro", detail: "White-label intro sequences ready for any client.", badge: "4K Master" } },
    card3: { title: "Batch Export", desc: "Deliver multiple formats and resolutions in a single run\u00a0\u2014 built for agency-scale output.", dd1: "4K Master", dd2: "Multi-Format", infoTitle: "Delivery Time", infoDesc: "Cut average project delivery from 5 days to under 2 hours.", btn: "Export Batch" },
  },
];

const PRICING = [
  {
    name: "Beginner",
    monthlyPrice: "$29",
    yearlyPrice: "$19",
    description: "Perfect for solo creators and hobbyists looking to explore AI video generation.",
    features: ["Up to 10 videos per month", "1080p HD output", "Standard AI voiceover", "Auto captions & subtitles", "Basic template library", "Email support"],
    cta: "Get Started",
    href: "#create",
    highlighted: false,
    icon: "beginner",
  },
  {
    name: "Professional",
    monthlyPrice: "$59",
    yearlyPrice: "$39",
    description: "Ideal for growing creators who need more advanced tools to enhance productivity.",
    features: ["Unlimited video generation", "4K Ultra HD output", "Premium AI voices", "Advanced motion & pacing", "Priority render queue", "Priority email support"],
    cta: "Get Started",
    href: "#create",
    highlighted: true,
    icon: "professional",
  },
  {
    name: "Enterprise",
    monthlyPrice: "$89",
    yearlyPrice: "$59",
    description: "Designed for teams and agencies requiring comprehensive AI video solutions.",
    features: ["Everything in Professional", "Custom branding & logos", "API access & integrations", "Batch video generation", "Dedicated account manager", "24/7 dedicated support"],
    cta: "Get Started",
    href: "#create",
    highlighted: false,
    icon: "enterprise",
  },
];

export default function Home() {
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [mode, setMode] = useState<"slideshow" | "talking_object">("slideshow");
  const [talkingObjectStyle, setTalkingObjectStyle] = useState<"cartoon" | "real">("cartoon");
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
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  const [pricingPeriod, setPricingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [activePainPoint, setActivePainPoint] = useState(0);
  const [defaultScriptModel, setDefaultScriptModel] = useState<string | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef(prompt);
  promptRef.current = prompt;
  const promptFromSuggestionRef = useRef(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const howSectionRef = useRef<HTMLElement | null>(null);
  const [howInView, setHowInView] = useState(false);

  useEffect(() => {
    const el = howSectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setHowInView(e.isIntersecting),
      { threshold: 0.2, rootMargin: "0px 0px -80px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setImageUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.defaultScriptModel && setDefaultScriptModel(data.defaultScriptModel))
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!modelDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
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
          setError(getUserFriendlyErrorMessage(data.error || "Something went wrong"));
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
          setError(getUserFriendlyErrorMessage(data.error || "Generation failed"));
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
          captions: captions,
          ...(textModel.trim() ? { textModel: textModel.trim() } : {}),
          ...(assetIds.length > 0 ? { assetIds } : {}),
          ...(mode === "talking_object" ? { talkingObjectStyle } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(getUserFriendlyErrorMessage(data.error || "Failed to start generation"));
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
    setTalkingObjectStyle("cartoon");
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

  const isGenerating = submitting || (jobId != null && (status === "pending" || status === "processing"));

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-clip">


      <div className="absolute inset-x-0 top-0 h-[1000px] pointer-events-none select-none overflow-hidden z-0" aria-hidden="true">





        <div
          className="absolute w-[600px] h-[900px] -left-[120px] -top-[80px] rounded-full opacity-40 animate-[ribbonDriftLeft_14s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(ellipse at 60% 50%, #9f1239 0%, #500724 40%, transparent 70%)', filter: 'blur(80px)' }}
        />


        <div
          className="absolute w-[140px] h-[1300px] -left-[20px] -top-[200px] rounded-[60px] animate-[ribbonWaveLeft_8s_ease-in-out_infinite]"
          style={{
            background: 'linear-gradient(180deg, #450a0a 0%, #7f1d1d 18%, #991b1b 35%, #b91c1c 50%, #e11d48 70%, #f43f5e 85%, #fb7185 100%)',
            transform: 'rotate(-22deg)',
            transformOrigin: 'top center',
          }}
        />


        <div
          className="absolute w-[90px] h-[1200px] left-[60px] -top-[150px] rounded-[50px] opacity-70 animate-[ribbonFlowLeft_10s_ease-in-out_infinite]"
          style={{
            background: 'linear-gradient(180deg, #881337 0%, #be123c 28%, #e11d48 52%, #f43f5e 75%, #fda4af 100%)',
            transform: 'rotate(-18deg)',
            transformOrigin: 'top center',
          }}
        />


        <div
          className="absolute w-[30px] h-[1100px] left-[160px] -top-[100px] rounded-full opacity-40 animate-[ribbonWaveLeft_7s_ease-in-out_infinite]"
          style={{
            background: 'linear-gradient(180deg, #fecdd3 0%, #fda4af 35%, #fb7185 65%, #f43f5e 100%)',
            transform: 'rotate(-15deg)',
            transformOrigin: 'top center',
          }}
        />






        <div
          className="absolute w-[600px] h-[900px] -right-[120px] -top-[80px] rounded-full opacity-40 animate-[ribbonDriftRight_14s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(ellipse at 40% 50%, #7c3aed 0%, #4f46e5 40%, transparent 70%)', filter: 'blur(80px)' }}
        />


        <div
          className="absolute w-[140px] h-[1300px] -right-[20px] -top-[200px] rounded-[60px] animate-[ribbonWaveRight_8s_ease-in-out_infinite]"
          style={{
            background: 'linear-gradient(180deg, #6366f1 0%, #7c3aed 20%, #a855f7 40%, #c026d3 60%, #ec4899 80%, #f472b6 100%)',
            transform: 'rotate(22deg)',
            transformOrigin: 'top center',
          }}
        />


        <div
          className="absolute w-[90px] h-[1200px] right-[60px] -top-[150px] rounded-[50px] opacity-70 animate-[ribbonFlowRight_10s_ease-in-out_infinite]"
          style={{
            background: 'linear-gradient(180deg, #818cf8 0%, #a78bfa 30%, #c084fc 55%, #e879f9 80%, #f0abfc 100%)',
            transform: 'rotate(18deg)',
            transformOrigin: 'top center',
          }}
        />


        <div
          className="absolute w-[30px] h-[1100px] right-[160px] -top-[100px] rounded-full opacity-40 animate-[ribbonWaveRight_7s_ease-in-out_infinite]"
          style={{
            background: 'linear-gradient(180deg, #c7d2fe 0%, #e9d5ff 40%, #f5d0fe 70%, #fecdd3 100%)',
            transform: 'rotate(15deg)',
            transformOrigin: 'top center',
          }}
        />

      </div>

      <header className="fixed top-5 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
        <div className="relative pointer-events-auto">

          <div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[90%] h-24 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 100% at center top, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.02) 60%, transparent 100%)',
              filter: 'blur(16px)',
            }}
          />

          <nav
            className="relative z-10 flex items-center gap-6 bg-[#0c0c0c]/90 backdrop-blur-2xl border border-white/[0.07] rounded-[22px] px-8 py-3 min-w-[560px] max-w-[90vw]"
            style={{ boxShadow: '0 8px 40px -8px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.04) inset, 0 25px 60px -15px rgba(0,0,0,0.7)' }}
          >
            <Link
              href="/"
              className="flex items-center gap-3 px-8 py-2.5 rounded-[16px] text-[15px] font-medium text-white/85 hover:text-white hover:bg-white/6 transition-all duration-200"
            >

              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="nav-ic-home" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a1a1aa" /><stop offset="1" stopColor="#52525b" />
                  </linearGradient>
                </defs>
                <path d="M3.5 20.5l11-11m0 0l1.5-1.5 3 3-1.5 1.5m-3-3l3 3" stroke="url(#nav-ic-home)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.5 2.5v2m0-2l1 1m-1-1l-1 1m5.5 1.5l1.5 1m-1.5-1l.75-.75m-.75.75l-.75-.75M5 7.5l1.5 1M5 7.5l.75-.75M5 7.5l-.75-.75" stroke="url(#nav-ic-home)" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="9.5" cy="3.5" r="0.6" fill="#d4d4d8" />
                <circle cx="15" cy="5" r="0.5" fill="#d4d4d8" />
                <circle cx="5" cy="8.5" r="0.5" fill="#d4d4d8" />
              </svg>
              Home
            </Link>
            <a
              href="#features"
              className="flex items-center gap-3 px-8 py-2.5 rounded-[16px] text-[15px] font-medium text-white/85 hover:text-white hover:bg-white/6 transition-all duration-200"
            >

              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="nav-ic-cube-top" x1="6" y1="3" x2="18" y2="10" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a1a1aa" /><stop offset="1" stopColor="#71717a" />
                  </linearGradient>
                  <linearGradient id="nav-ic-cube-left" x1="3" y1="9" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#71717a" /><stop offset="1" stopColor="#3f3f46" />
                  </linearGradient>
                  <linearGradient id="nav-ic-cube-right" x1="12" y1="9" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#52525b" /><stop offset="1" stopColor="#27272a" />
                  </linearGradient>
                </defs>

                <path d="M12 3L4.5 7.5 12 12l7.5-4.5L12 3z" fill="url(#nav-ic-cube-top)" />

                <path d="M4.5 7.5L12 12v9l-7.5-4.5V7.5z" fill="url(#nav-ic-cube-left)" />

                <path d="M19.5 7.5L12 12v9l7.5-4.5V7.5z" fill="url(#nav-ic-cube-right)" />

                <path d="M12 3L4.5 7.5 12 12l7.5-4.5L12 3z" stroke="#a1a1aa" strokeWidth="0.3" opacity="0.5" />
                <path d="M12 12v9" stroke="#71717a" strokeWidth="0.4" opacity="0.4" />
              </svg>
              Features
            </a>
            <Link
              href="/how"
              className="flex items-center gap-3 px-8 py-2.5 rounded-[16px] text-[15px] font-medium text-white/85 hover:text-white hover:bg-white/6 transition-all duration-200"
            >

              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="nav-ic-shield-l" x1="4" y1="3" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a1a1aa" /><stop offset="1" stopColor="#52525b" />
                  </linearGradient>
                  <linearGradient id="nav-ic-shield-r" x1="12" y1="3" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#71717a" /><stop offset="1" stopColor="#3f3f46" />
                  </linearGradient>
                </defs>

                <path d="M12 3L4 7v5c0 4.5 3.5 8.5 8 10V3z" fill="url(#nav-ic-shield-l)" />

                <path d="M12 3l8 4v5c0 4.5-3.5 8.5-8 10V3z" fill="url(#nav-ic-shield-r)" />

                <path d="M12 3L4 7v5c0 4.5 3.5 8.5 8 10 4.5-1.5 8-5.5 8-10V7l-8-4z" stroke="#a1a1aa" strokeWidth="0.4" opacity="0.35" />
              </svg>
              How it works
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-8 py-2.5 rounded-[16px] text-[15px] font-medium text-white/85 hover:text-white hover:bg-white/6 transition-all duration-200"
            >


              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="nav-ic-grid1" x1="3" y1="3" x2="11" y2="11" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a1a1aa" /><stop offset="1" stopColor="#52525b" />
                  </linearGradient>
                  <linearGradient id="nav-ic-grid2" x1="13" y1="3" x2="21" y2="11" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#71717a" /><stop offset="1" stopColor="#3f3f46" />
                  </linearGradient>
                  <linearGradient id="nav-ic-grid3" x1="3" y1="13" x2="11" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#71717a" /><stop offset="1" stopColor="#3f3f46" />
                  </linearGradient>
                  <linearGradient id="nav-ic-grid4" x1="13" y1="13" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a1a1aa" /><stop offset="1" stopColor="#52525b" />
                  </linearGradient>
                </defs>
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" fill="url(#nav-ic-grid1)" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" fill="url(#nav-ic-grid2)" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" fill="url(#nav-ic-grid3)" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" fill="url(#nav-ic-grid4)" />

                <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" stroke="#a1a1aa" strokeWidth="0.3" opacity="0.3" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" stroke="#a1a1aa" strokeWidth="0.3" opacity="0.3" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" stroke="#a1a1aa" strokeWidth="0.3" opacity="0.3" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" stroke="#a1a1aa" strokeWidth="0.3" opacity="0.3" />
              </svg>
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="pt-28 pb-40 px-6 relative">

          <div className="max-w-4xl mx-auto text-center mb-12 relative z-10">
            <div className="group relative inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-sm font-medium mb-6 overflow-hidden bg-white/4 border border-white/10 text-zinc-200 backdrop-blur-sm hover:border-white/20 transition-all duration-300">
              <span className="absolute inset-0 rounded-full bg-linear-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="relative tracking-wide">AI Video Generation</span>
              <svg className="relative w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              Create videos from
              <br />
              <span className="text-zinc-500">a single sentence</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Describe what you want: add images (optional) and we&apos;ll make a video.
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
              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-10 sm:p-16">
                <div className="max-w-lg mx-auto">

                  <div className="flex items-center justify-between mb-8">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Step {stage + 1} of {STAGES.length}
                    </span>
                    <span className="text-xs font-mono text-zinc-600">
                      {Math.round(((stage + 1) / STAGES.length) * 100)}%
                    </span>
                  </div>


                  <h3 key={stage} className="text-2xl sm:text-3xl font-semibold text-white mb-3 animate-fade-in">
                    {STAGES[stage]}
                  </h3>


                  <p className="text-zinc-500 mb-10">
                    {stage === 0 && "Analyzing your prompt to understand the story you want to tell."}
                    {stage === 1 && "Creating a compelling script with the right pacing and tone."}
                    {stage === 2 && "Selecting the perfect images and footage for each scene."}
                    {stage === 3 && "Generating natural voiceover that matches your content."}
                    {stage === 4 && "Rendering your final video in high quality."}
                  </p>


                  <div className="relative h-1 bg-zinc-800 rounded-full overflow-hidden mb-10">
                    <div
                      className="absolute inset-y-0 left-0 progress-wave rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
                    />
                  </div>


                  <div className="space-y-3 mb-8">
                    {STAGES.map((stageName, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 transition-all duration-300 ${i < stage ? "opacity-50" :
                          i === stage ? "opacity-100" :
                            "opacity-30"
                          }`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${i < stage ? "bg-white border-white" :
                          i === stage ? "border-white" :
                            "border-zinc-700"
                          }`}>
                          {i < stage && (
                            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {i === stage && (
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          )}
                        </div>
                        <span className={`text-sm ${i === stage ? "text-white font-medium" : "text-zinc-500"}`}>
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
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white mb-1">Generation failed</p>
                    <p className="text-sm text-zinc-400 mb-4">{error ? getUserFriendlyErrorMessage(error) : "Something went wrong."}</p>
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
                      No images? We&apos;ll find visuals from the web based on your description. Or add your own we&apos;ll use them first.
                    </p>

                    <div className="mt-8 pt-6 border-t border-white/5">
                      <label className="block text-sm font-medium text-white mb-3">
                        Script model
                      </label>
                      <div className="relative" ref={modelDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setModelDropdownOpen((o) => !o)}
                          className="w-full min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-left text-sm text-white flex items-center justify-between gap-2 hover:border-zinc-700 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all cursor-pointer"
                        >
                          <span className="truncate">
                            {(() => {
                              const selected = TEXT_MODEL_OPTIONS.find((o) => o.value === textModel);
                              if (!selected) return "Select model";
                              if (selected.value === "" && defaultScriptModel) {
                                return TEXT_MODEL_OPTIONS.find((o) => o.value === defaultScriptModel)?.label ?? defaultScriptModel;
                              }
                              return selected.label;
                            })()}
                          </span>
                          <svg
                            className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${modelDropdownOpen ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {modelDropdownOpen && (
                          <div className="absolute z-50 mt-2 w-full rounded-xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in">
                            <div className="py-1.5 max-h-[260px] overflow-y-auto">
                              {TEXT_MODEL_OPTIONS.map((opt) => {
                                const isActive = textModel === opt.value;
                                const isDefault = opt.value === "" && defaultScriptModel;
                                const displayLabel = opt.value === "" && defaultScriptModel
                                  ? (TEXT_MODEL_OPTIONS.find((o) => o.value === defaultScriptModel)?.label ?? defaultScriptModel)
                                  : opt.label;
                                return (
                                  <button
                                    key={opt.value || "default"}
                                    type="button"
                                    onClick={() => { setTextModel(opt.value); setModelDropdownOpen(false); }}
                                    className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors ${isActive
                                      ? "bg-white/[0.07]"
                                      : "hover:bg-white/[0.04]"
                                      }`}
                                  >
                                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isActive ? "border-blue-400 bg-blue-500/20" : "border-zinc-600"
                                      }`}>
                                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm truncate ${isActive ? "text-white font-medium" : "text-zinc-300"}`}>
                                          {displayLabel}
                                        </span>
                                        {isDefault && (
                                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                            env
                                          </span>
                                        )}
                                      </div>
                                      <p className={`text-xs mt-0.5 ${isActive ? "text-zinc-400" : "text-zinc-500"}`}>
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

                        {mode === "talking_object" && (
                          <div className="mt-3 pl-1">
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
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
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
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                )}
                                Real person
                              </button>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1.5">Choose cartoon character or realistic human for the talking avatar.</p>
                          </div>
                        )}
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
                        type="button"
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

            {!isGenerating && (
              <div className="max-w-4xl mx-auto mt-12 flex flex-wrap justify-center gap-8 sm:gap-16 text-center relative z-10">
                <div>
                  <div className="text-2xl font-bold text-white">No credit card</div>
                  <div className="text-sm text-zinc-500">To get started</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">Up to 60 sec</div>
                  <div className="text-sm text-zinc-500">Per video</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">No watermarks</div>
                  <div className="text-sm text-zinc-500">Use anywhere</div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="features" className="pt-32 pb-32 px-6">
          <div className="max-w-6xl mx-auto">


            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-white/10 bg-zinc-900/80 text-[13px] font-semibold tracking-wider text-zinc-300 uppercase">
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Built In Features
              </div>
            </div>


            <h2
              className="text-center text-3xl sm:text-4xl md:text-[46px] italic font-normal text-white leading-tight max-w-3xl mx-auto mb-12"
              style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
            >
              An entire stack of tools that turn{" "}
              your <span className="not-italic inline-flex items-center justify-center p-2 rounded-lg border border-purple-400/30 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.4),0_0_30px_rgba(168,85,247,0.15)] align-middle mx-1">🎬</span> ideas into videos
            </h2>


            <div className="flex flex-wrap justify-center gap-2 mb-14">
              {FEATURE_TABS.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveFeatureTab(i)}
                  className={`px-5 py-2.5 rounded-full text-sm transition-all duration-200 ${activeFeatureTab === i
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {(() => {
              const d = FEATURE_TAB_DATA[activeFeatureTab];
              return (
                <div key={activeFeatureTab} className="grid md:grid-cols-3 gap-5 animate-fade-in">

                  <div className="rounded-3xl border border-white/8 bg-zinc-900/40 p-8 pb-6 flex flex-col min-h-[540px]">
                    <span className="text-[40px] font-extralight leading-none text-zinc-600 mb-5">1</span>
                    <h3 className="text-[22px] font-bold text-white mb-3 leading-snug">{d.card1.title}</h3>
                    <p className="text-[14px] text-zinc-400 leading-relaxed">{d.card1.desc}</p>

                    <div className="mt-auto pt-10 relative h-[260px]">
                      <div className="absolute left-0 bottom-0 w-[82%] min-h-[140px] bg-zinc-800 border border-white/6 rounded-2xl p-5 shadow-2xl shadow-black/50 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-zinc-700/80 flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[11px] text-zinc-500">{d.card1.mainLabel}</p>
                          <p className="text-[22px] font-bold text-white tracking-tight leading-none mt-0.5">{d.card1.mainValue}</p>
                        </div>
                      </div>


                      <div className="absolute right-2 bottom-[100px] z-10 bg-zinc-800 border border-white/6 rounded-2xl px-4 py-3 shadow-2xl shadow-black/50 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[17px] font-bold text-white leading-none">{d.card1.statValue}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{d.card1.statLabel}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/8 bg-zinc-900/40 p-8 pb-6 flex flex-col min-h-[540px]">
                    <span className="text-[40px] font-extralight leading-none text-zinc-600 mb-5">2</span>
                    <h3 className="text-[22px] font-bold text-white mb-3 leading-snug whitespace-pre-line">{d.card2.title}</h3>
                    <p className="text-[14px] text-zinc-400 leading-relaxed">{d.card2.desc}</p>

                    <div className="mt-auto pt-10 relative h-[200px]">
                      <div className="absolute left-0 top-0 w-[62%] bg-zinc-800 border border-white/6 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 z-10">
                        {d.card2.list.map((item, li) => (
                          <div key={li} className={`flex items-center justify-between px-4 py-2.5 ${li < d.card2.list.length - 1 ? "border-b border-white/5" : ""}`}>
                            <span className={`text-[13px] ${li === 0 ? "font-medium text-white" : item.count ? "text-zinc-400" : "text-zinc-500"}`}>{item.name}</span>
                            {item.count && (
                              <span className={`w-[22px] h-[22px] rounded-full text-[10px] font-bold flex items-center justify-center ${item.active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-300"}`}>
                                {item.count}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="absolute right-0 bottom-0 w-[72%] bg-zinc-800 border border-white/6 rounded-2xl p-3.5 shadow-2xl shadow-black/50">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-linear-to-br from-blue-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-white leading-tight">{d.card2.product.name}</p>
                            <p className="text-[11px] text-zinc-500 leading-snug mt-1">{d.card2.product.detail}</p>
                            <p className="text-[14px] font-bold text-white mt-2">{d.card2.product.badge}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/8 bg-zinc-900/40 p-8 pb-6 flex flex-col min-h-[540px]">
                    <span className="text-[40px] font-extralight leading-none text-zinc-600 mb-5">3</span>
                    <h3 className="text-[22px] font-bold text-white mb-3 leading-snug">{d.card3.title}</h3>
                    <p className="text-[14px] text-zinc-400 leading-relaxed">{d.card3.desc}</p>

                    <div className="mt-auto pt-10 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between bg-zinc-800 border border-white/6 rounded-xl px-4 py-2.5 shadow-lg shadow-black/30">
                        <span className="text-[13px] text-white">{d.card3.dd1}</span>
                        <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div className="flex items-center justify-between bg-zinc-800 border border-white/6 rounded-xl px-4 py-2.5 shadow-lg shadow-black/30">
                        <span className="text-[13px] text-white">{d.card3.dd2}</span>
                        <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      <div className="mt-1">
                        <p className="text-[15px] font-bold text-white mb-1">{d.card3.infoTitle}</p>
                        <p className="text-[12px] text-zinc-500 leading-relaxed">{d.card3.infoDesc}</p>
                      </div>

                      <div className="flex justify-end mt-1">
                        <div className="inline-flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-xl px-4 py-2 text-[13px] text-white font-medium shadow-xl shadow-black/40">
                          <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
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

        <section ref={howSectionRef} id="how" className="pt-48 pb-48 px-6 bg-black">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
              Three steps. Two minutes.
            </h2>
            <p className="text-zinc-500 text-lg mb-16">
              No learning curve. Just describe and download.
            </p>


            <div className="relative">
              <div className="absolute left-[11px] top-0 bottom-0 w-px overflow-hidden" aria-hidden="true">
                <div
                  className={`h-full w-px bg-gradient-to-b from-teal-500/80 via-zinc-600 to-orange-500/80 origin-top transition-transform duration-700 ease-out ${howInView ? "scale-y-100" : "scale-y-0"}`}
                />
              </div>
              {[
                {
                  num: 1,
                  title: "Upload & describe",
                  desc: "Add your images (optional) and write a sentence describing your video idea.",
                },
                {
                  num: 2,
                  title: "AI generates",
                  desc: "Our pipeline writes the script, sources visuals, generates voiceover, and edits everything.",
                },
                {
                  num: 3,
                  title: "Download & share",
                  desc: "Get your finished video in 1080p HD. Ready for social media or presentations.",
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="relative flex gap-8 pb-14 last:pb-0 transition-all duration-500 ease-out"
                  style={{
                    opacity: howInView ? 1 : 0,
                    transform: howInView ? "translateY(0)" : "translateY(16px)",
                    transitionDelay: howInView ? `${280 + i * 140}ms` : "0ms",
                  }}
                >
                  <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black ring-4 ring-teal-500/50 text-sm font-bold text-teal-400">
                    {step.num}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="text-lg font-semibold text-white mb-1.5">{step.title}</h3>
                    <p className="text-zinc-400 text-base leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="quality" className="pt-48 pb-48 px-6 bg-black">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-12">
              Quality, built in
            </h2>

            <div className="grid md:grid-cols-3 gap-6">

              <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 pt-8 flex flex-col">
                <div className="w-full h-48 flex items-center justify-center mb-8">
                  <div className="inline-flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="203" height="202" fill="none" viewBox="0 0 203 202" className="w-48 h-48">
                      <path stroke="white" strokeWidth=".75" d="M162.301 5.375c3.19 0 6.327 2.464 9.254 7.167 2.913 4.683 5.552 11.485 7.772 19.923 4.44 16.871 7.19 40.2 7.19 65.981 0 25.782-2.75 49.11-7.19 65.981-2.22 8.438-4.858 15.24-7.772 19.924-2.927 4.703-6.064 7.166-9.254 7.166-3.19-.001-6.327-2.463-9.253-7.166-2.914-4.684-5.552-11.486-7.773-19.924-4.439-16.871-7.19-40.199-7.19-65.981 0-25.782 2.751-49.11 7.19-65.982 2.221-8.438 4.859-15.24 7.773-19.923 2.926-4.703 6.063-7.167 9.253-7.167ZM91.479 154.022 149.022 21.23M91.479 154.022l67.379 36.394M47.707 62.426c-1.981 0-3.81 1.46-5.617 4.346-1.796 2.866-3.427 7.04-4.802 12.23-2.748 10.373-4.453 24.725-4.453 40.593s1.704 30.219 4.453 40.593c1.375 5.19 3.006 9.363 4.802 12.229 1.808 2.886 3.636 4.346 5.617 4.346 1.981 0 3.809-1.46 5.616-4.346 1.796-2.866 3.427-7.039 4.802-12.229 2.749-10.374 4.453-24.726 4.453-40.593s-1.704-30.22-4.453-40.593c-1.375-5.19-3.006-9.364-4.802-12.23-1.807-2.885-3.635-4.346-5.616-4.346ZM91.479 154.022l-35.903-82.626M91.479 154.022l-41.805 22.131" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Consistency</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  One pipeline, every time: AI script, shot planning, visuals, and voiceover tuned to the same high bar.
                </p>
              </div>


              <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 pt-8 flex flex-col">
                <div className="w-full h-48 flex items-center justify-center mb-8 [perspective:320px]">
                  <div className="diagram-3d-tumble inline-flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="202" height="202" fill="none" viewBox="0 0 202 202" className="w-48 h-48" style={{ backfaceVisibility: "hidden" }}>
                      <path stroke="white" strokeLinejoin="bevel" strokeWidth=".75" d="M5.919 43.791h143.957v143.957H5.919zM51.266 15h143.957l-45.347 28.791H5.919z" />
                      <path stroke="white" strokeLinejoin="bevel" strokeWidth=".75" d="M51.266 86.979h143.957l-45.347 28.791H5.919zM51.266 158.957h143.957l-45.347 28.791H5.919z" />
                      <path stroke="white" strokeLinejoin="bevel" strokeWidth=".75" d="M149.876 43.791L195.222 15v143.957l-45.346 28.791zM5.92 43.791L51.265 15v143.957L5.919 187.748zM77.178 43.791L122.525 15v143.957l-45.347 28.791z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Transparency</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  See each stage: Intent, script, shots, and voiceover. So you stay in control from prompt to download.
                </p>
              </div>


              <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 pt-8 flex flex-col">
                <div className="w-full h-48 flex items-center justify-center mb-8">
                  <div className="diagram-rotate-reverse inline-flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="202" height="202" viewBox="0 0 202 202" fill="none" className="w-48 h-48">
                      <circle cx="71.4829" cy="101.5" r="70.0092" stroke="white" strokeWidth="0.75" />
                      <circle cx="63.7054" cy="101.127" r="62.2317" stroke="white" strokeWidth="0.75" />
                      <circle cx="56.2522" cy="101.154" r="54.7786" stroke="white" strokeWidth="0.75" />
                      <circle cx="79.0783" cy="101.5" r="77.6046" stroke="white" strokeWidth="0.75" />
                      <circle cx="86.4205" cy="101.5" r="84.9469" stroke="white" strokeWidth="0.75" />
                      <circle cx="93.5096" cy="101.5" r="92.0359" stroke="white" strokeWidth="0.75" />
                      <circle cx="100.599" cy="101.5" r="99.5" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeDasharray="0.01 4.01" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Ownership</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Your prompt, your video. Download 1080p with no lock-in use it anywhere, no watermarks.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="pt-32 pb-32 px-6 relative overflow-hidden">


          <div className="absolute inset-0 flex items-start justify-center pointer-events-none select-none" aria-hidden>
            <span
              className="text-[12rem] sm:text-[16rem] md:text-[20rem] font-black uppercase tracking-wider text-white/15 leading-none mt-8"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              PRICING
            </span>
          </div>

          <div className="max-w-6xl mx-auto relative z-10">


            <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-start mb-16">


              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                  Our pricing plans
                </h2>
              </div>

              <div className="flex items-end lg:items-center lg:pt-8">
                <div className="inline-flex rounded-full border border-white/10 bg-zinc-900/80 p-1">
                  <button
                    onClick={() => setPricingPeriod("monthly")}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${pricingPeriod === "monthly" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setPricingPeriod("yearly")}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${pricingPeriod === "yearly" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                  >
                    Yearly
                  </button>
                </div>
              </div>


              <div className="flex items-end lg:items-center lg:pt-8">
                <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
                  Here are three different plans tailored to Beginner, Professional, and Enterprise levels for your AI video solution:
                </p>
              </div>
            </div>


            <div className="grid md:grid-cols-3 gap-5">
              {PRICING.map((plan) => {
                const price = pricingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
                return (
                  <div
                    key={plan.name}
                    className={`relative rounded-2xl border p-6 flex flex-col ${plan.highlighted
                      ? "border-white/15 bg-zinc-900/60"
                      : "border-white/8 bg-zinc-950/80"
                      }`}
                  >

                    <div className="flex items-center justify-between mb-5">
                      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${plan.highlighted ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-zinc-900"}`}>
                        {plan.icon === "beginner" && (
                          <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                          </svg>
                        )}
                        {plan.icon === "professional" && (
                          <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.04 6.04 0 01-4.27 1.772 6.04 6.04 0 01-4.27-1.772" />
                          </svg>
                        )}
                        {plan.icon === "enterprise" && (
                          <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-white">{price}</span>
                        <span className="text-sm text-zinc-500">/ Per {pricingPeriod === "monthly" ? "Month" : "Year"}</span>
                      </div>
                    </div>


                    <h3 className="text-lg font-bold text-white mb-1.5">{plan.name}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed mb-6">{plan.description}</p>


                    <div className={`rounded-xl border p-5 mt-auto ${plan.highlighted ? "border-amber-500/40 bg-white/3" : "border-white/8 bg-white/2"}`}>
                      <a
                        href={plan.href}
                        className={`flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-all text-sm mb-5 ${plan.highlighted
                          ? "bg-white text-black hover:bg-zinc-200"
                          : "border border-white/15 text-white hover:bg-white/5"
                          }`}
                      >
                        {plan.cta}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </a>

                      <div className="border-t border-white/8 pt-5">
                        <p className="text-sm font-bold text-white mb-4">Features:</p>
                        <ul className="space-y-3">
                          {plan.features.map((feature, fi) => (
                            <li key={fi} className="flex items-center gap-3 text-sm text-zinc-300">
                              <div className="w-5 h-5 rounded-full border border-white/15 flex items-center justify-center shrink-0">
                                <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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


        <section className="pt-32 pb-32 px-6">
          <div className="max-w-6xl mx-auto">


            <div className="rounded-3xl bg-zinc-950 border border-white/5 overflow-hidden px-6 sm:px-12 lg:px-20 py-16 sm:py-20">


              <div className="text-center mb-14">
                <div className="inline-flex items-center gap-2 text-teal-400 text-sm font-semibold tracking-wider uppercase mb-5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  PAIN POINT
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-[42px] font-bold text-white leading-tight">
                  Video Creation Is Slower<br />Than It Should Be
                </h2>
              </div>

              <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">


                <div className="relative">
                  <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 30%, #2dd4bf 60%, #5eead4 100%)" }}>
                    <div className="p-6 pt-5 pb-0 relative">


                      <div className="flex justify-center mb-5">
                        <div className="inline-flex items-center gap-2 bg-zinc-900/90 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full">
                          <span className="text-base">🎬</span>
                          Speed up workflow
                        </div>
                      </div>


                      <div className="bg-white rounded-t-xl shadow-2xl shadow-black/30 mx-auto max-w-sm">

                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">✦</span>
                            <span className="text-sm font-bold text-zinc-900">AI Director</span>
                          </div>
                          <button className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">&times;</button>
                        </div>


                        <div className="px-4 py-4 space-y-4">

                          <p className="text-xs font-semibold text-zinc-500">You</p>

                          <div className="flex items-start gap-2 justify-end">
                            <div className="bg-zinc-100 rounded-xl rounded-tr-sm px-3.5 py-2.5 max-w-[220px]">
                              <p className="text-sm text-zinc-800 leading-snug">Create a product demo for our new SaaS platform.</p>
                            </div>
                            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0 text-xs">🎥</div>
                          </div>


                          <p className="text-xs font-semibold text-zinc-500">AI Director</p>

                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                              <span className="text-white text-xs">✦</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="h-1.5 bg-teal-200 rounded-full w-16"></div>
                                <div className="h-1.5 bg-teal-100 rounded-full w-10"></div>
                                <span className="text-xs text-teal-600 italic">writing...</span>
                              </div>
                            </div>
                          </div>


                          <div className="flex items-center gap-3 text-zinc-400 pt-1 pb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" /></svg>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 001.302-4.665c0-1.194-.232-2.333-.654-3.375z" /></svg>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
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
                      iconBg: "bg-zinc-700/50 text-zinc-400",
                      title: "Multi-format output is confusing",
                      desc: "Different platforms need different sizes, lengths, and formats. Cutline auto-exports for every channel in one click — no manual cropping needed.",
                    },
                    {
                      icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
                      iconBg: "bg-zinc-700/50 text-zinc-400",
                      title: "Scaling content requires extra resources",
                      desc: "Hiring editors, voiceover artists, and motion designers is expensive. Cutline replaces the entire production team with a single AI pipeline.",
                    },
                  ].map((point, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePainPoint(i)}
                      className={`w-full text-left rounded-xl border transition-all duration-300 ${activePainPoint === i
                        ? "border-white/10 bg-zinc-900/80 p-5"
                        : "border-transparent bg-transparent px-5 py-4 hover:bg-zinc-900/30"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activePainPoint === i ? point.iconBg : "bg-zinc-800/50 text-zinc-500"}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={point.icon} />
                          </svg>
                        </div>
                        <span className={`font-semibold text-[15px] ${activePainPoint === i ? "text-white" : "text-zinc-400"}`}>
                          {point.title}
                        </span>
                      </div>
                      {activePainPoint === i && (
                        <p className="text-sm text-zinc-400 leading-relaxed mt-3 ml-11 animate-fade-in">
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
      </main>

      <footer className="relative pt-16 pb-12 overflow-hidden">

        <div className="absolute bottom-0 left-0 right-0 h-80 pointer-events-none">
          <div className="absolute bottom-0 left-0 w-80 h-64 bg-purple-700/25 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-1/4 w-96 h-72 bg-purple-600/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-56 bg-pink-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-72 bg-rose-500/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-80 h-64 bg-indigo-600/20 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6">

          <nav className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 text-sm font-medium text-white/90 mb-20">
            <Link href="/how" className="hover:text-white transition-colors">How It Works</Link>
            <Link href="/benefits" className="hover:text-white transition-colors">Benefits</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/suggestions" className="hover:text-white transition-colors">Suggestion</Link>
          </nav>

          <div className="flex items-center justify-center mb-20">
            <Link
              href="/"
              className="text-6xl sm:text-8xl lg:text-[9rem] font-bold text-white tracking-tighter hover:opacity-90 transition-opacity leading-none"
            >
              cutline
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
            <p>© {new Date().getFullYear()} cutline. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="https://www.linkedin.com/in/parbhat-kapila-a14264202/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
              <a href="https://github.com/parbhatkapila4" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
              <a href="https://x.com/Parbhat03" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
              <a href="mailto:parbhat@parbhat.dev" className="hover:text-white transition-colors">Mail</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
