"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const PLACEHOLDERS = [
  "Explain Redis pub/sub for backend engineers",
  "Pitch my SaaS app in 45 seconds",
  "Onboarding video for a new design tool",
  "How transformers work, for high schoolers",
  "Quarterly product update for Q3 2026",
];

const EXAMPLE_CHIPS = [
  "Pitch my SaaS in 45s",
  "Explain Kubernetes",
  "Onboarding flow",
  "Series A pitch",
];

const UNSPLASH = (id: string, w = 1600, h = 900) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&crop=entropy&q=90&auto=format`;

const PREVIEW_PROMPT = "How transformers work, for high schoolers";

const SCENES = [
  {
    image: UNSPLASH("1620712943543-bcc4688e7485"),
    subtitle: "Transformers are the architecture",
  },
  {
    image: UNSPLASH("1677442136019-21780ecad995"),
    subtitle: "behind tools like ChatGPT and Claude.",
  },
  {
    image: UNSPLASH("1518770660439-4636190af475"),
    subtitle: "They work by paying attention",
  },
  {
    image: UNSPLASH("1555066931-4365d14bab8c"),
    subtitle: "to which words matter most.",
  },
  {
    image: UNSPLASH("1551434678-e076c223a692"),
    subtitle: "Self-attention, in plain English.",
  },
];

const SCENE_MS = 2800;

type PhaseColor = "violet" | "cyan" | "amber" | "emerald";
type PhaseViz = "understand" | "narrate" | "visualize" | "render";

const PHASES: {
  num: string;
  name: string;
  color: PhaseColor;
  viz: PhaseViz;
  summary: string;
  stages: string[];
  tech: string;
}[] = [
  {
    num: "01",
    name: "Understand",
    color: "violet",
    viz: "understand",
    summary:
      "Parse the sentence into audience, goal, tone, beats, shots, and script.",
    stages: ["intent", "narrative", "shots", "script"],
    tech: "Audience-aware narrative arc",
  },
  {
    num: "02",
    name: "Narrate",
    color: "cyan",
    viz: "narrate",
    summary:
      "Render the spoken track, aligned word-by-word to the timeline.",
    stages: ["subtitles", "voice (TTS)", "word-level sync"],
    tech: "Word-level audio ↔ caption sync",
  },
  {
    num: "03",
    name: "Visualize",
    color: "amber",
    viz: "visualize",
    summary:
      "Plan motion, analyze brand assets, source an image for every shot.",
    stages: ["motion", "assets", "visuals", "image sourcing"],
    tech: "4-tier sourcing · zero-failure fallback",
  },
  {
    num: "04",
    name: "Render",
    color: "emerald",
    viz: "render",
    summary:
      "Compose every layer and stitch a finished MP4 in a single pass.",
    stages: ["composition", "headless render"],
    tech: "Single-pass · frame-perfect MP4",
  },
];

const COLORS: Record<
  PhaseColor,
  {
    accent: string;
    softBg: string;
    softBorder: string;
    dot: string;
  }
> = {
  violet: {
    accent: "text-violet-600",
    softBg: "bg-violet-50/60",
    softBorder: "border-violet-100",
    dot: "bg-violet-500",
  },
  cyan: {
    accent: "text-cyan-600",
    softBg: "bg-cyan-50/60",
    softBorder: "border-cyan-100",
    dot: "bg-cyan-500",
  },
  amber: {
    accent: "text-amber-600",
    softBg: "bg-amber-50/60",
    softBorder: "border-amber-100",
    dot: "bg-amber-500",
  },
  emerald: {
    accent: "text-emerald-600",
    softBg: "bg-emerald-50/60",
    softBorder: "border-emerald-100",
    dot: "bg-emerald-500",
  },
};

function useTypewriter(
  phrases: string[],
  opts: { typeSpeed?: number; deleteSpeed?: number; pauseTime?: number } = {}
) {
  const { typeSpeed = 42, deleteSpeed = 22, pauseTime = 1800 } = opts;
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[idx];
    if (!deleting && text === phrase) {
      const t = window.setTimeout(() => setDeleting(true), pauseTime);
      return () => window.clearTimeout(t);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setIdx((i) => (i + 1) % phrases.length);
      return;
    }
    const speed = deleting ? deleteSpeed : typeSpeed;
    const t = window.setTimeout(() => {
      setText((prev) =>
        deleting
          ? phrase.substring(0, prev.length - 1)
          : phrase.substring(0, prev.length + 1)
      );
    }, speed);
    return () => window.clearTimeout(t);
  }, [text, deleting, idx, phrases, typeSpeed, deleteSpeed, pauseTime]);

  return text;
}

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const typed = useTypewriter(PLACEHOLDERS);
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const showTypewriter = inputValue.length === 0 && !inputFocused;

  return (
    <section className="relative min-h-screen w-full bg-[#fafaf9] overflow-hidden">
      <div
        className="absolute -top-32 left-1/4 w-[900px] h-[500px] pointer-events-none -z-10 will-change-transform"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(251,207,232,0.5), transparent 60%)",
          animation: "meshFloat1 16s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-40 -left-32 w-[700px] h-[600px] pointer-events-none -z-10 will-change-transform"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(196,181,253,0.4), transparent 65%)",
          animation: "meshFloat2 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-40 -right-32 w-[700px] h-[600px] pointer-events-none -z-10 will-change-transform"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(186,230,253,0.4), transparent 65%)",
          animation: "meshFloat3 18s ease-in-out infinite",
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] -z-10"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(15,23,42,0.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 90%)",
        }}
      />

      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-12 pt-28 lg:pt-32 pb-16">
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full border border-zinc-200 bg-white/70 backdrop-blur-sm text-[10.5px] font-medium tracking-[0.2em] text-zinc-600 uppercase shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-zinc-900 font-bold tracking-[0.22em]">
              CUTLINE
            </span>
            <span className="text-zinc-300" aria-hidden>
              /
            </span>
            <span className="text-zinc-500">12-stage AI video director</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="text-balance leading-[0.92] text-center text-[clamp(3.25rem,9vw,7.75rem)] text-[#0a0a0a]"
        >
          <span
            className="block italic font-normal tracking-[-0.025em]"
            style={{
              fontFamily: 'Georgia, "Times New Roman", ui-serif, serif',
            }}
          >
            One sentence in.
          </span>
          <span className="block font-semibold tracking-[-0.06em]">
            One video out.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mt-7 text-center text-[17.5px] sm:text-[19px] text-zinc-600 max-w-[58ch] mx-auto leading-[1.5] tracking-[-0.008em]"
        >
          Type a sentence. A 12-stage AI director plans, writes, narrates, and
          renders a finished 30–60 second MP4 — in a single pass.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-11 mx-auto max-w-[640px]"
        >
          <form
            onSubmit={(e) => e.preventDefault()}
            className="group relative flex items-center gap-2 p-2 pl-5 rounded-2xl bg-white border border-zinc-200/80 shadow-[0_2px_4px_rgba(15,23,42,0.025),0_24px_60px_-20px_rgba(15,23,42,0.12)] focus-within:border-zinc-300 focus-within:shadow-[0_2px_4px_rgba(15,23,42,0.03),0_30px_80px_-18px_rgba(15,23,42,0.2)] transition-all"
          >
            <span className="text-zinc-400 shrink-0" aria-hidden>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.2 6.8H21l-5.6 4.1 2.2 6.8L12 15.6l-5.6 4.1 2.2-6.8L3 8.8h6.8z" />
              </svg>
            </span>

            <div className="relative flex-1 min-w-0 h-10 flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                aria-label="Describe your video"
                className="relative w-full bg-transparent text-zinc-900 text-[15.5px] outline-none placeholder:text-transparent caret-zinc-900"
                placeholder=" "
              />
              {showTypewriter && (
                <div className="absolute inset-0 flex items-center pointer-events-none text-zinc-400 text-[15.5px]">
                  <span className="truncate">{typed}</span>
                  <span
                    className="inline-block w-[1.5px] h-[1.15em] bg-zinc-500 ml-[1px] align-middle shrink-0"
                    style={{
                      animation: "typingCursor 1s steps(2, end) infinite",
                    }}
                    aria-hidden
                  />
                </div>
              )}
            </div>

            <Link
              href={isLoggedIn ? "/generate" : "/auth/sign-in"}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0a0a0a] text-white text-[13.5px] font-semibold tracking-[-0.005em] hover:bg-black transition-colors shadow-[0_4px_12px_-2px_rgba(15,23,42,0.4)]"
            >
              Generate
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h14m0 0l-6-6m6 6l-6 6"
                />
              </svg>
            </Link>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.42 }}
          className="mt-5 flex flex-wrap justify-center gap-2"
        >
          <span className="self-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-400 mr-1">
            try
          </span>
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setInputValue(chip)}
              className="px-3.5 py-1.5 rounded-full bg-white/60 border border-zinc-200 text-[12.5px] font-medium text-zinc-600 hover:bg-white hover:text-zinc-900 hover:border-zinc-300 hover:-translate-y-px transition-all"
            >
              {chip}
            </button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-20 lg:mt-24"
        >
          <div className="flex items-center gap-3 mb-5 font-mono text-[10.5px] tracking-[0.18em] uppercase">
            <span className="text-zinc-500">Example output</span>
            <span className="h-px flex-1 bg-zinc-200" />
            <span className="text-zinc-500">generated by CUTLINE</span>
          </div>

          <VideoPreview />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.65 }}
          className="mt-20 lg:mt-24"
        >
          <div className="flex items-center gap-3 mb-5 font-mono text-[10.5px] tracking-[0.18em] uppercase">
            <span className="text-zinc-500">The pipeline</span>
            <span className="h-px flex-1 bg-zinc-200" />
            <span className="text-zinc-400 tabular-nums">
              <span className="text-zinc-900 font-semibold">12</span> stages
            </span>
            <span className="text-zinc-300" aria-hidden>
              ·
            </span>
            <span className="text-zinc-400 tabular-nums">
              <span className="text-zinc-900 font-semibold">4</span> phases
            </span>
            <span className="text-zinc-300" aria-hidden>
              ·
            </span>
            <span className="text-zinc-500">sentence → MP4</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {PHASES.map((phase, i) => (
              <PhaseCard key={i} {...phase} index={i} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="mt-16 pt-6 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.16em] uppercase text-zinc-500 tabular-nums">
            <span>
              <span className="text-zinc-900 font-semibold">30–60s</span> output
            </span>
            <span className="text-zinc-300" aria-hidden>
              /
            </span>
            <span>
              <span className="text-zinc-900 font-semibold">1080p</span> MP4
            </span>
            <span className="text-zinc-300 hidden sm:inline" aria-hidden>
              /
            </span>
            <span className="hidden sm:inline">
              <span className="text-zinc-900 font-semibold">single-pass</span>{" "}
              render
            </span>
            <span className="text-zinc-300 hidden md:inline" aria-hidden>
              /
            </span>
            <span className="hidden md:inline">
              <span className="text-zinc-900 font-semibold">no</span> templates
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] uppercase text-zinc-500">
            <span className="text-zinc-400">Engineered for</span>
            <span className="text-zinc-900 font-semibold">cinematic pacing</span>
            <span className="text-zinc-300" aria-hidden>
              ·
            </span>
            <span className="text-zinc-900 font-semibold">word-perfect captions</span>
            <span className="text-zinc-300" aria-hidden>
              ·
            </span>
            <span className="text-zinc-900 font-semibold">zero-touch render</span>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes meshFloat1 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(40px, -20px) scale(1.06);
          }
        }
        @keyframes meshFloat2 {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(60px, -30px);
          }
        }
        @keyframes meshFloat3 {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-50px, -20px);
          }
        }
        @keyframes typingCursor {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}

function VideoPreview() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setIdx((i) => (i + 1) % SCENES.length),
      SCENE_MS
    );
    return () => window.clearInterval(id);
  }, []);

  const elapsedSec = (idx + 1) * 6;

  return (
    <div className="relative max-w-[1040px] mx-auto">
      <div className="relative rounded-2xl overflow-hidden aspect-video bg-zinc-900 ring-1 ring-black/[0.08] shadow-[0_10px_24px_-12px_rgba(15,23,42,0.18),0_50px_120px_-30px_rgba(15,23,42,0.4)]">
        <AnimatePresence mode="sync">
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1.08 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{
              opacity: { duration: 0.7 },
              scale: { duration: SCENE_MS / 1000, ease: "linear" },
            }}
            className="absolute inset-0"
            style={{ willChange: "transform, opacity" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SCENES[idx].image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 22%, transparent 50%, rgba(0,0,0,0.5) 82%, rgba(0,0,0,0.8) 100%)",
          }}
        />

        <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-md text-[10px] text-white/95 font-mono uppercase tracking-[0.14em]">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-70 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
          </span>
          Playing
        </div>

        <div className="absolute top-4 right-4 inline-flex items-center px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-md text-[10px] text-white/95 font-mono tabular-nums">
          0:{String(Math.min(elapsedSec, 30)).padStart(2, "0")} / 0:30
        </div>

        <div className="absolute inset-x-0 bottom-10 flex justify-center px-8 pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="px-4 py-2 rounded-lg bg-black/65 backdrop-blur-md text-white text-[15px] sm:text-[17px] lg:text-[19px] font-semibold tracking-[-0.01em] max-w-[80%] text-center"
            >
              {SCENES[idx].subtitle}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute bottom-3 left-4 flex items-end gap-[2px] h-3.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={i}
              className="w-[2px] bg-white/70 rounded-full"
              animate={{
                height: ["20%", "90%", "40%", "75%", "30%"],
              }}
              transition={{
                duration: 0.9 + (i % 3) * 0.15,
                repeat: Infinity,
                ease: "easeInOut",
                delay: (i % 5) * 0.07,
              }}
              style={{ height: "30%" }}
            />
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
          <motion.div
            key={`progress-${idx}`}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: SCENE_MS / 1000, ease: "linear" }}
            className="h-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <span className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-zinc-400">
          From
        </span>
        <span
          className="text-zinc-700 italic text-[15px]"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          &ldquo;{PREVIEW_PROMPT}&rdquo;
        </span>
      </div>
    </div>
  );
}

function PhaseCard({
  num,
  name,
  color,
  viz,
  summary,
  stages,
  tech,
  index,
}: {
  num: string;
  name: string;
  color: PhaseColor;
  viz: PhaseViz;
  summary: string;
  stages: string[];
  tech: string;
  index: number;
}) {
  const c = COLORS[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 + index * 0.08 }}
      className="group relative rounded-2xl bg-white border border-zinc-200 overflow-hidden shadow-[0_2px_4px_rgba(15,23,42,0.025),0_12px_36px_-20px_rgba(15,23,42,0.1)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.04),0_20px_50px_-20px_rgba(15,23,42,0.2)] hover:-translate-y-1 hover:border-zinc-300 transition-all duration-300 flex flex-col h-full"
    >
      <div
        className={`relative h-[90px] ${c.softBg} border-b ${c.softBorder} flex items-center justify-center px-6 overflow-hidden`}
      >
        {viz === "understand" && <UnderstandViz />}
        {viz === "narrate" && <NarrateViz />}
        {viz === "visualize" && <VisualizeViz />}
        {viz === "render" && <RenderViz />}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <span
            className={`font-mono text-[10.5px] tracking-[0.2em] ${c.accent} uppercase font-semibold`}
          >
            Phase {num}
          </span>
          <span className="h-px flex-1 bg-zinc-200" />
        </div>

        <div className="text-[20px] font-semibold text-zinc-900 tracking-[-0.015em] mb-2">
          {name}
        </div>

        <p className="text-[13.5px] text-zinc-600 leading-[1.5] mb-5 min-h-[60px]">
          {summary}
        </p>

        <div className="space-y-1.5 mb-5">
          {stages.map((stage, i) => (
            <div
              key={stage}
              className="flex items-center gap-2.5 text-[12px] font-mono"
            >
              <span className={`tabular-nums ${c.accent} opacity-50`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-zinc-700">{stage}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-zinc-100">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <div className="inline-flex items-center gap-1.5 shrink-0">
              <span className="relative flex h-1 w-1" aria-hidden>
                <span
                  className={`absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-70 animate-ping`}
                />
                <span
                  className={`relative inline-flex h-1 w-1 rounded-full ${c.dot}`}
                />
              </span>
              <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-400">
                Signature
              </div>
            </div>
            <div className="text-[12.5px] font-medium text-zinc-800 leading-tight">
              {tech}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function UnderstandViz() {
  const rows = [
    [
      { w: 22, d: 0 },
      { w: 36, d: 0.15 },
      { w: 16, d: 0.3 },
    ],
    [
      { w: 45, d: 0.45 },
      { w: 22, d: 0.6 },
    ],
    [
      { w: 30, d: 0.75 },
      { w: 18, d: 0.9 },
      { w: 12, d: 1.05 },
    ],
  ];
  return (
    <div className="w-full flex flex-col gap-1.5">
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-1.5 w-full">
          {row.map((seg, ci) => (
            <motion.div
              key={ci}
              className="h-1.5 rounded-full"
              style={{ width: `${seg.w}%` }}
              animate={{
                backgroundColor: ["#ede9fe", "#a78bfa", "#ede9fe"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: seg.d,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function NarrateViz() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {Array.from({ length: 22 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[2.5px] rounded-full bg-cyan-500"
          animate={{
            height: ["20%", "85%", "45%", "70%", "30%", "65%"],
          }}
          transition={{
            duration: 1.4 + (i % 4) * 0.18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: (i % 6) * 0.07,
          }}
          style={{ height: "40%" }}
        />
      ))}
    </div>
  );
}

function VisualizeViz() {
  return (
    <div className="grid grid-cols-7 gap-1.5 w-full">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.div
          key={i}
          className="aspect-square rounded-sm"
          animate={{
            backgroundColor: ["#fef3c7", "#f59e0b", "#fed7aa", "#fef3c7"],
            opacity: [0.55, 1, 0.7, 0.55],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: (i % 7) * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function RenderViz() {
  return (
    <div className="flex gap-[2px] h-10 rounded overflow-hidden w-full">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 bg-emerald-100"
          animate={{
            backgroundColor: ["#d1fae5", "#10b981", "#d1fae5"],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            delay: i * 0.11,
            ease: "easeInOut",
            times: [0, 0.5, 1],
          }}
        />
      ))}
    </div>
  );
}
