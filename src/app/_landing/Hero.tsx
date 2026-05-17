"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative min-h-screen w-full bg-[#0a0a0a] text-white overflow-hidden flex flex-col">
      <div className="absolute top-0 inset-x-0 h-28 lg:h-36 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #c084fc 0%, #d946ef 18%, #f472b6 32%, #fb923c 50%, #f87171 68%, #60a5fa 100%)",
            backgroundSize: "180% 100%",
            animation: "heroGradientShift 14s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.55) 55%, #0a0a0a 100%)",
          }}
        />
      </div>

      <div
        className="absolute bottom-0 left-0 w-[600px] h-[500px] pointer-events-none opacity-30 z-0"
        style={{
          background:
            "radial-gradient(ellipse at bottom left, rgba(168,85,247,0.35), transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[400px] pointer-events-none opacity-25 z-0"
        style={{
          background:
            "radial-gradient(ellipse at bottom right, rgba(34,211,238,0.3), transparent 65%)",
        }}
      />

      <div className="relative flex-1 flex flex-col pt-32 lg:pt-40 pb-10 px-4 sm:px-6 lg:px-12 z-10">
        <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col">
          <div className="grid lg:grid-cols-[1fr_320px] gap-8 lg:gap-12 items-start">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 mb-3 text-[14px] text-white/55 tracking-[-0.005em]"
              >
                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-70 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                I&rsquo;m directing
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.1 }}
                className="w-full max-w-[840px] h-40 sm:h-52 lg:h-60 mb-8"
              >
                <Waveform />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.28 }}
                className="text-[28px] sm:text-[38px] lg:text-[44px] font-normal text-white max-w-[820px] leading-[1.28] tracking-[-0.015em] self-start lg:self-center text-left"
              >
                Make me a{" "}
                <span className="text-white/45">30-second explainer about</span>{" "}
                Redis pub/sub{" "}
                <span className="text-white/45">for backend engineers</span>…
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.42 }}
                className="mt-10 flex items-center gap-4"
              >
                <a
                  href="#how"
                  aria-label="Examples"
                  className="w-11 h-11 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z" />
                  </svg>
                </a>

                <Link
                  href={isLoggedIn ? "/generate" : "/auth/sign-in"}
                  aria-label="Create video"
                  className="group relative w-16 h-16 rounded-full bg-white text-[#0a0a0a] flex items-center justify-center shadow-[0_10px_40px_-8px_rgba(255,255,255,0.35)] hover:scale-[1.04] transition-transform"
                >
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 2l2.2 6.8H21l-5.6 4.1 2.2 6.8L12 15.6l-5.6 4.1 2.2-6.8L3 8.8h6.8z" />
                  </svg>
                </Link>

                <a
                  href="#how"
                  aria-label="See it work"
                  className="w-11 h-11 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 transition-colors"
                >
                  <svg
                    className="w-4 h-4 translate-x-px"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                className="mt-3 flex items-center gap-2.5 font-mono text-[11px] tabular-nums text-white/35"
              >
                <span>
                  <span className="text-white/65">00:12</span> elapsed
                </span>
                <span className="text-white/15">/</span>
                <span>
                  <span className="text-white/65">00:48</span> remaining
                </span>
              </motion.div>
            </div>

            <motion.aside
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.32 }}
              className="space-y-3 w-full"
            >
              <div className="p-6 rounded-[20px] bg-[#141414] border border-white/[0.06]">
                <div className="text-[11px] tracking-[0.22em] text-white/40 mb-4 font-medium">
                  WHAT&rsquo;S NEW
                </div>
                <p className="text-[15px] leading-[1.55] text-white/75">
                  <span className="text-white font-medium">CUTLINE v1</span>{" "}
                  ships with{" "}
                  <span className="text-white font-medium">live render</span>,
                  expanded access to a{" "}
                  <span className="text-white font-medium">
                    12-stage pipeline
                  </span>{" "}
                  that delivers finished videos in a single pass.
                </p>
              </div>

              <div className="p-6 rounded-[20px] bg-[#141414] border border-white/[0.06]">
                <div className="text-[11px] tracking-[0.22em] text-white/40 mb-4 font-medium">
                  OUTPUT
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-400/50">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-500" />
                    <span className="text-white font-semibold text-[14px]">
                      ~60s
                    </span>
                  </div>
                  <div className="text-white/55 text-[14px] font-normal px-2">
                    1080p MP4
                  </div>
                </div>
                <p className="text-white/45 text-[13px] mt-3 leading-[1.5]">
                  Single-pass render. No templates, no storyboards, no config.
                </p>
              </div>

              <div className="p-6 rounded-[20px] bg-[#141414] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] tracking-[0.22em] text-white/40 font-medium">
                    RENDER QUEUE
                  </div>
                  <div className="text-[10.5px] font-mono text-white/30 tabular-nums">
                    3 active
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-1.5 relative flex h-1.5 w-1.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-70 animate-ping" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-white/85 truncate">
                        Redis pub/sub explainer
                      </div>
                      <div className="text-[11px] text-cyan-400/70 font-mono mt-0.5 tabular-nums">
                        rendering · 06/12
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/25 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-white/55 truncate">
                        SaaS pitch · 45s
                      </div>
                      <div className="text-[11px] text-white/35 font-mono mt-0.5 tabular-nums">
                        queued · 02:14
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/25 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-white/55 truncate">
                        CRISPR for teens · 60s
                      </div>
                      <div className="text-[11px] text-white/35 font-mono mt-0.5 tabular-nums">
                        queued · 05:08
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-[20px] bg-[#141414] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] tracking-[0.22em] text-white/40 font-medium">
                    STAGE LOG
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[10.5px] text-emerald-400/85 font-mono">
                    <span className="relative flex h-1 w-1" aria-hidden>
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                      <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-400" />
                    </span>
                    streaming
                  </div>
                </div>
                <div className="font-mono text-[11px] leading-[1.7] space-y-0.5 text-white/55">
                  <div>
                    <span className="text-white/30">14:23:08</span>{" "}
                    <span className="text-cyan-300">intent</span> parsed ·
                    educational
                  </div>
                  <div>
                    <span className="text-white/30">14:23:09</span>{" "}
                    <span className="text-cyan-300">narrative</span> 4-beat arc
                  </div>
                  <div>
                    <span className="text-white/30">14:23:11</span>{" "}
                    <span className="text-cyan-300">shots</span> 8 shots · 4s
                    avg
                  </div>
                  <div>
                    <span className="text-white/30">14:23:14</span>{" "}
                    <span className="text-cyan-300">script</span> 280 words
                  </div>
                  <div>
                    <span className="text-white/30">14:23:17</span>{" "}
                    <span className="text-cyan-300">subtitles</span> aligned
                  </div>
                  <div>
                    <span className="text-white/30">14:23:20</span>{" "}
                    <span className="text-pink-300">voice</span>{" "}
                    <span className="text-pink-400/80">rendering…</span>
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>

          <div className="mt-auto pt-10 lg:pt-14">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="w-full max-w-[1100px] mx-auto"
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.18em] uppercase">
                  <span className="text-white/40">Pipeline</span>
                  <span className="text-white/15" aria-hidden>
                    ·
                  </span>
                  <span className="text-white/75">06 / 12</span>
                  <span className="text-white/15" aria-hidden>
                    ·
                  </span>
                  <span className="text-emerald-400/85 inline-flex items-center gap-1.5">
                    <span className="relative flex h-1 w-1">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                      <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-400" />
                    </span>
                    live
                  </span>
                </div>
                <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-white/40 inline-flex items-center gap-2">
                  <span className="text-pink-400/85">Voice</span>
                  <span className="text-white/20" aria-hidden>
                    →
                  </span>
                  <span className="text-white/35">Sync</span>
                </div>
              </div>

              <div className="relative h-[3px] bg-white/[0.07] rounded-full">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: "46%",
                    background:
                      "linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)",
                    boxShadow: "0 0 12px rgba(168, 85, 247, 0.5)",
                  }}
                />
                {Array.from({ length: 12 }).map((_, i) => {
                  const pos = (i / 11) * 100;
                  const isDone = i < 5;
                  const isCurrent = i === 5;
                  return (
                    <div
                      key={i}
                      className="absolute top-1/2"
                      style={{
                        left: `${pos}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isDone
                            ? "bg-cyan-300"
                            : isCurrent
                              ? "bg-pink-400 ring-[3px] ring-pink-400/25 animate-pulse"
                              : "bg-white/25"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-12 gap-1 font-mono text-[9.5px] uppercase tracking-[0.08em]">
                {[
                  "intent",
                  "narr",
                  "shots",
                  "script",
                  "subs",
                  "voice",
                  "sync",
                  "motion",
                  "assets",
                  "vis",
                  "imgs",
                  "render",
                ].map((label, i) => {
                  const isDone = i < 5;
                  const isCurrent = i === 5;
                  return (
                    <div
                      key={label}
                      className={`text-center truncate ${
                        isCurrent
                          ? "text-pink-400/85"
                          : isDone
                            ? "text-white/55"
                            : "text-white/25"
                      }`}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="mt-10 lg:mt-12 max-w-[1100px] mx-auto"
            >
              <div className="flex items-center gap-3 mb-3 font-mono text-[10.5px] tracking-[0.18em] uppercase">
                <span className="text-white/40">Try</span>
                <span className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-white/30">04 examples</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Pitch my SaaS in 45 seconds",
                  "Explain transformers to a high schooler",
                  "30s YouTube short on Kubernetes basics",
                  "Onboarding video for my new design tool",
                ].map((p) => (
                  <button
                    key={p}
                    className="px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12.5px] text-white/65 hover:bg-white/[0.08] hover:text-white/90 hover:border-white/[0.14] transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.85 }}
              className="mt-10 lg:mt-12 pt-5 border-t border-white/[0.05] max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.18em] uppercase">
                <span className="text-white font-bold tracking-[0.22em]">
                  CUTLINE
                </span>
                <span className="text-white/15" aria-hidden>
                  ·
                </span>
                <span className="text-white/40">v1.0 · 2026.05</span>
                <span className="text-white/15" aria-hidden>
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400/85">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  ready
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2 font-mono text-[10.5px] tracking-[0.18em] uppercase text-white/40">
                <kbd className="px-1.5 py-0.5 rounded border border-white/15 text-[9.5px] tracking-normal text-white/60">
                  Space
                </kbd>
                <span>to play</span>
                <span className="text-white/15 mx-1" aria-hidden>
                  ·
                </span>
                <kbd className="px-1.5 py-0.5 rounded border border-white/15 text-[9.5px] tracking-normal text-white/60">
                  ⌘K
                </kbd>
                <span>for prompt</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes heroGradientShift {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </section>
  );
}

function Waveform() {
  return (
    <div className="relative w-full h-full">
      <div
        className="absolute inset-0 blur-3xl opacity-70 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 50% 50%, rgba(168,85,247,0.65), rgba(34,211,238,0.4) 50%, transparent 75%)",
        }}
      />

      <svg
        className="relative w-full h-full"
        viewBox="0 0 800 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="waveA" x1="0%" x2="100%" y1="50%" y2="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="12%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="38%" stopColor="#a855f7" stopOpacity="1" />
            <stop offset="62%" stopColor="#ec4899" stopOpacity="1" />
            <stop offset="88%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="waveB" x1="0%" x2="100%" y1="50%" y2="50%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0" />
            <stop offset="15%" stopColor="#ec4899" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="85%" stopColor="#a855f7" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>

          <filter id="waveGlow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        <g filter="url(#waveGlow)" opacity="0.75">
          <path
            stroke="url(#waveA)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          >
            <animate
              attributeName="d"
              values="M-50,100 C100,40 200,160 350,100 C500,40 650,160 850,100;M-50,100 C100,150 200,50 350,100 C500,150 650,50 850,100;M-50,100 C100,60 200,140 350,100 C500,60 650,140 850,100;M-50,100 C100,40 200,160 350,100 C500,40 650,160 850,100"
              dur="9s"
              repeatCount="indefinite"
            />
          </path>
        </g>

        <path
          stroke="url(#waveA)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            values="M-50,100 C100,40 200,160 350,100 C500,40 650,160 850,100;M-50,100 C100,150 200,50 350,100 C500,150 650,50 850,100;M-50,100 C100,60 200,140 350,100 C500,60 650,140 850,100;M-50,100 C100,40 200,160 350,100 C500,40 650,160 850,100"
            dur="9s"
            repeatCount="indefinite"
          />
        </path>

        <path
          stroke="url(#waveB)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.75"
        >
          <animate
            attributeName="d"
            values="M-50,100 C100,150 200,50 350,100 C500,150 650,50 850,100;M-50,100 C100,40 200,160 350,100 C500,40 650,160 850,100;M-50,100 C100,140 200,60 350,100 C500,140 650,60 850,100;M-50,100 C100,150 200,50 350,100 C500,150 650,50 850,100"
            dur="7.5s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  );
}
