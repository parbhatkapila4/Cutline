"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HeroDemo } from "./HeroDemo";

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
        <section className="relative min-h-screen flex items-center w-full pt-32 pb-16 px-4 sm:px-6 lg:px-12 overflow-hidden">
          <div
            className="absolute inset-0 -z-10 pointer-events-none"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(15,23,42,0.04), transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0 -z-10 pointer-events-none opacity-[0.025]"
            aria-hidden
            style={{
              backgroundImage:
                "linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            }}
          />

          <div className="max-w-[min(1680px,96vw)] mx-auto w-full font-sans">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
              <div className="relative">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200/80 bg-white/70 backdrop-blur-sm text-[11px] font-medium tracking-[0.14em] text-[#52525b] uppercase shadow-[0_1px_2px_rgba(15,23,42,0.04)] mb-8"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  AI Video Director
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.05 }}
                  className="text-balance leading-[0.94] text-[clamp(3.25rem,8.4vw,7.5rem)] text-[#0a0a0a]"
                >
                  <span
                    className="block italic font-normal tracking-[-0.025em]"
                    style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                  >
                    One sentence in.
                  </span>
                  <span className="block font-semibold tracking-[-0.055em]">
                    One video out.
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.18 }}
                  className="mt-8 text-[17.5px] sm:text-[19px] text-[#52525b] max-w-[46ch] leading-[1.55] tracking-[-0.008em]"
                >
                  A finished 30-60 second MP4: script, voice, captions, b-roll, and score, rendered in a single pass.
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
                      <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  )}
                  <a
                    href="#how"
                    className="group inline-flex items-center gap-2 px-5 py-3.5 rounded-full text-[#3f3f46] text-[14.5px] font-semibold tracking-[-0.005em] hover:text-[#0a0a0a] transition-colors"
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 bg-white group-hover:border-gray-400 transition-colors">
                      <svg className="w-2.5 h-2.5 text-[#0a0a0a] translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    See it work
                  </a>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="mt-12 flex items-center gap-3"
                >
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <div className="font-mono text-[11px] tracking-[0.04em] text-[#71717a] flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span><span className="text-[#0a0a0a] font-semibold">~60s</span> render</span>
                    <span className="text-gray-300" aria-hidden>/</span>
                    <span><span className="text-[#0a0a0a] font-semibold">1080p</span> HD</span>
                    <span className="text-gray-300" aria-hidden>/</span>
                    <span><span className="text-[#0a0a0a] font-semibold">30+</span> languages</span>
                    <span className="text-gray-300" aria-hidden>/</span>
                    <span><span className="text-[#0a0a0a] font-semibold">MP4</span> · 4K-ready</span>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative w-full max-w-[680px] mx-auto"
              >
                <div
                  className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[3rem] opacity-50 pointer-events-none"
                  aria-hidden
                  style={{
                    background:
                      "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(15,23,42,0.08), transparent 70%)",
                  }}
                />

                <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35),0_18px_40px_-24px_rgba(15,23,42,0.18)] ring-1 ring-black/5 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-gray-200 text-[10.5px] font-mono text-gray-500 tracking-[0.02em] truncate max-w-full">
                        <svg className="w-2.5 h-2.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M12 1l3 6 6 1-4.5 4 1 6L12 15l-5.5 3 1-6L3 8l6-1 3-6z" />
                        </svg>
                        cutline.cloud/demo
                      </div>
                    </div>
                    <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[9.5px] font-bold tracking-[0.12em] uppercase text-emerald-700">
                      <span className="relative flex h-1 w-1">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                        <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-500" />
                      </span>
                      Live render
                    </div>
                  </div>

                  <div className="relative aspect-video bg-[#0a0a0a]">
                    <HeroDemo />
                  </div>

                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
                    <div className="flex items-center gap-3 text-[10.5px] font-mono text-gray-500 tabular-nums min-w-0">
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <svg className="w-2.5 h-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span><span className="text-[#0a0a0a] font-semibold">~60s</span> render</span>
                      </span>
                      <span className="text-gray-300 shrink-0">·</span>
                      <span className="truncate">
                        <span className="text-[#0a0a0a] font-semibold">12</span> stages
                      </span>
                      <span className="text-gray-300 hidden sm:inline shrink-0">·</span>
                      <span className="hidden sm:inline shrink-0">
                        <span className="text-[#0a0a0a] font-semibold">1080p</span> MP4
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 tabular-nums shrink-0">
                      &ldquo;one sentence in&rdquo;
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
  );
}
