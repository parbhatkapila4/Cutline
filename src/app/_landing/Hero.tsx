"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HeroDemo } from "./HeroDemo";

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative min-h-screen flex items-center w-full pt-28 pb-20 px-4 sm:px-6 lg:px-12 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(15,23,42,0.05), transparent 65%), radial-gradient(ellipse 55% 55% at 88% 75%, rgba(56,189,248,0.04), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 -z-10 pointer-events-none opacity-[0.025]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="max-w-[min(1680px,96vw)] mx-auto w-full font-sans">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 mb-9 text-[10.5px] font-medium tracking-[0.22em] uppercase text-[#52525b]"
            >
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[#0a0a0a] font-bold">CUTLINE</span>
              <span className="text-gray-300" aria-hidden>
                /
              </span>
              <span>AI Video Director</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="text-balance leading-[0.92] text-[clamp(3.5rem,8.8vw,8rem)] text-[#0a0a0a]"
            >
              <span
                className="block italic font-normal tracking-[-0.025em]"
                style={{
                  fontFamily:
                    'Georgia, "Times New Roman", ui-serif, serif',
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
              className="mt-9 text-[18px] sm:text-[20px] text-[#52525b] max-w-[46ch] leading-[1.5] tracking-[-0.008em]"
            >
              A finished 30–60 second MP4: script, voice, captions, b-roll, and
              score, rendered in a single pass.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="mt-10 flex flex-wrap items-center gap-2"
            >
              {!isLoggedIn && (
                <Link
                  href="/auth/sign-in"
                  className="group relative inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#0a0a0a] text-white text-[14.5px] font-semibold tracking-[-0.005em] shadow-[0_10px_30px_-10px_rgba(15,23,42,0.6)] hover:bg-black transition-all hover:shadow-[0_16px_36px_-12px_rgba(15,23,42,0.6)] hover:-translate-y-0.5"
                >
                  Create your first video
                  <svg
                    className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
              )}
              <a
                href="#how"
                className="group inline-flex items-center gap-2 px-5 py-3.5 rounded-full text-[#3f3f46] text-[14.5px] font-semibold tracking-[-0.005em] hover:text-[#0a0a0a] transition-colors"
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 bg-white group-hover:border-gray-400 transition-colors">
                  <svg
                    className="w-2.5 h-2.5 text-[#0a0a0a] translate-x-px"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                See it work
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.1,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="relative w-full max-w-[680px] mx-auto"
          >
            <div
              className="absolute -inset-x-12 -inset-y-10 -z-10 rounded-[3rem] opacity-70 pointer-events-none"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(15,23,42,0.10), transparent 70%)",
              }}
            />

            <div
              className="relative rounded-[22px] overflow-hidden bg-[#0a0a0a]"
              style={{
                boxShadow: [
                  "0 0 0 1px rgba(15,23,42,0.08)",
                  "0 1px 0 0 rgba(255,255,255,0.55)",
                  "0 32px 70px -20px rgba(15,23,42,0.45)",
                  "0 14px 40px -18px rgba(15,23,42,0.25)",
                  "inset 0 1px 0 0 rgba(255,255,255,0.07)",
                ].join(", "),
              }}
            >
              <div className="relative aspect-video">
                <HeroDemo />
              </div>
              <div
                className="absolute inset-x-8 top-0 h-px pointer-events-none z-10"
                aria-hidden
                style={{
                  background:
                    "linear-gradient(to right, transparent, rgba(255,255,255,0.35), transparent)",
                }}
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 px-1">
              <div className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.1em] uppercase text-[#71717a] tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <span className="relative flex h-1 w-1">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                    <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-emerald-700 font-semibold">
                    Live render
                  </span>
                </span>
                <span className="text-gray-300" aria-hidden>
                  /
                </span>
                <span>
                  <span className="text-[#0a0a0a] font-semibold">~60s</span>
                </span>
                <span className="text-gray-300" aria-hidden>
                  /
                </span>
                <span>
                  <span className="text-[#0a0a0a] font-semibold">12</span> stages
                </span>
              </div>
              <div className="font-mono italic text-[10.5px] tracking-[-0.005em] text-gray-400 truncate hidden md:block">
                &ldquo;one sentence in.&rdquo;
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-14 lg:mt-20 pt-6 border-t border-[#0a0a0a]/8 flex items-center justify-between gap-4"
        >
          <div className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-[#71717a] tabular-nums flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span>
              <span className="text-[#0a0a0a] font-semibold">~60s</span> render
            </span>
            <span className="text-gray-300" aria-hidden>
              /
            </span>
            <span>
              <span className="text-[#0a0a0a] font-semibold">1080p</span> HD
            </span>
            <span className="text-gray-300 hidden sm:inline" aria-hidden>
              /
            </span>
            <span className="hidden sm:inline">
              <span className="text-[#0a0a0a] font-semibold">30+</span>{" "}
              languages
            </span>
            <span className="text-gray-300 hidden md:inline" aria-hidden>
              /
            </span>
            <span className="hidden md:inline">
              <span className="text-[#0a0a0a] font-semibold">MP4</span> · 4K
              ready
            </span>
          </div>

          <a
            href="#how"
            className="hidden md:inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-[#71717a] hover:text-[#0a0a0a] transition-colors"
          >
            <span>Scroll</span>
            <span aria-hidden>↓</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
