"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FEATURE_TABS, FEATURE_TAB_DATA, FEATURE_TAB_PREVIEWS } from "@/constants/landing";

export function Features() {
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);

  return (
          <section id="features" className="relative pt-44 pb-44 px-4 sm:px-6 xl:px-10 2xl:px-14 overflow-hidden">
            <div
              className="absolute inset-0 -z-10 pointer-events-none"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(99,102,241,0.06), transparent 65%)",
              }}
            />
            <div className="max-w-[min(1680px,96vw)] mx-auto">
              <div className="flex justify-center mb-7">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm text-[11px] font-semibold tracking-[0.18em] text-gray-600 uppercase shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Built-in features
                </div>
              </div>

              <h2
                className="text-center text-[2rem] sm:text-[2.75rem] md:text-[3.25rem] font-normal text-gray-900 leading-[1.08] max-w-3xl mx-auto mb-5 tracking-[-0.025em]"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", ui-serif, serif',
                }}
              >
                An entire stack of tools that turn your{" "}
                <span className="italic">ideas</span> into{" "}
                <span className="italic relative whitespace-nowrap">
                  videos
                  <svg
                    className="absolute left-0 -bottom-2 w-full h-2"
                    viewBox="0 0 120 8"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id="features-underline" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#a78bfa" />
                        <stop offset="1" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 2 5 Q 60 1 118 5"
                      stroke="url(#features-underline)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </span>
                .
              </h2>
              <p className="text-center text-[15px] text-gray-500 max-w-xl mx-auto mb-12 leading-relaxed">
                Pick your role: every stage of the pipeline tunes itself for what you actually ship.
              </p>

              <div className="flex justify-center mb-14">
                <div className="inline-flex flex-wrap items-center justify-center gap-1 p-1 rounded-full bg-gray-100/80 border border-gray-200/70 backdrop-blur-sm">
                  {FEATURE_TABS.map((tab, i) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFeatureTab(i)}
                      className="relative px-4 py-2 rounded-full text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    >
                      {activeFeatureTab === i && (
                        <motion.span
                          layoutId="feature-tab-pill"
                          className="absolute inset-0 bg-gray-900 rounded-full shadow-[0_2px_10px_rgba(15,23,42,0.18)]"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span
                        className={`relative z-10 transition-colors ${activeFeatureTab === i ? "text-white" : "text-gray-600 hover:text-gray-900"}`}
                      >
                        {tab}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const d = FEATURE_TAB_DATA[activeFeatureTab];
                const p = FEATURE_TAB_PREVIEWS[activeFeatureTab];
                const cardBase =
                  "group relative rounded-3xl border border-gray-200/80 bg-white p-6 flex flex-col transition-all duration-300 hover:border-gray-300 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.18)] hover:-translate-y-0.5";
                const toneClasses: Record<typeof p.card1.status.tone, { bg: string; border: string; text: string; dot: string }> = {
                  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
                  sky: { bg: "bg-sky-50", border: "border-sky-100", text: "text-sky-700", dot: "bg-sky-500" },
                  rose: { bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
                  violet: { bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
                  amber: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
                };
                const settingIcon: Record<"resolution" | "format" | "captions" | "fps", string> = {
                  resolution: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15",
                  format: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25M5.25 21h13.5A2.25 2.25 0 0021 18.75V8.625a2.25 2.25 0 00-.659-1.591L14.41 1.859A2.25 2.25 0 0012.659 1.5H5.25A2.25 2.25 0 003 3.75v15A2.25 2.25 0 005.25 21z",
                  captions: "M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
                  fps: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
                };
                const card1Tone = toneClasses[p.card1.status.tone];
                const card2Tone = toneClasses[p.card2.status.tone];
                const card3Tone = toneClasses[p.card3.status.tone];
                return (
                  <div
                    key={activeFeatureTab}
                    className="grid md:grid-cols-3 gap-5 animate-fade-in"
                  >
                    {/* Card 1: Script */}
                    <div className={cardBase}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-[3px] w-10 h-10 rounded-[9px] bg-white border border-gray-200 shadow-[0_2px_6px_-1px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] p-2">
                            <div className="flex items-center gap-[2px]">
                              <span className="w-[3px] h-[3px] rounded-full bg-red-300" />
                              <span className="w-[3px] h-[3px] rounded-full bg-amber-300" />
                              <span className="w-[3px] h-[3px] rounded-full bg-emerald-300" />
                            </div>
                            <div className="flex-1 flex flex-col justify-center gap-[2.5px]">
                              <span className="h-[1.5px] rounded-full bg-gray-200 w-full" />
                              <span className="h-[1.5px] rounded-full bg-violet-500 w-[70%]" />
                              <span className="h-[1.5px] rounded-full bg-gray-200 w-[85%]" />
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Stage 01</div>
                            <h3 className="text-[1.0625rem] font-semibold text-gray-900 leading-tight tracking-[-0.01em] mt-0.5">
                              {d.card1.title}
                            </h3>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${card1Tone.bg} border ${card1Tone.border} text-[10px] font-bold ${card1Tone.text}`}>
                          <span className={`w-1 h-1 rounded-full ${card1Tone.dot}`} />
                          {p.card1.status.label}
                        </span>
                      </div>

                      <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
                        {d.card1.desc}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {p.card1.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-[10.5px] font-medium text-gray-600"
                          >
                            <span className="w-1 h-1 rounded-full bg-violet-400" />
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="relative flex-1 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50/60 overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
                        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200/70 bg-white/60">
                          <span className="w-2 h-2 rounded-full bg-red-300/70" />
                          <span className="w-2 h-2 rounded-full bg-amber-300/70" />
                          <span className="w-2 h-2 rounded-full bg-emerald-300/70" />
                          <div className="ml-2.5 flex items-center gap-0.5">
                            <span className="px-1.5 text-[10px] font-bold text-gray-500 rounded">B</span>
                            <span className="px-1.5 text-[10px] italic text-gray-500 rounded">I</span>
                            <span className="px-1.5 text-[10px] font-medium text-gray-500 rounded underline">U</span>
                          </div>
                          <span className="ml-auto text-[10px] font-mono text-gray-400 truncate max-w-[55%]">{p.card1.filename}</span>
                        </div>

                        <div className="px-3.5 py-3 space-y-1.5">
                          {p.card1.lines.map((line, i) => (
                            <div key={i} className="flex items-baseline gap-2.5">
                              <span className="text-[9.5px] tabular-nums text-gray-300 w-3 shrink-0 text-right">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span
                                className={
                                  line.emphasis
                                    ? "text-[11px] leading-snug text-violet-700 italic"
                                    : "text-[11px] leading-snug text-gray-700"
                                }
                              >
                                {line.text}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="px-3.5 py-2 border-t border-gray-200/70 bg-white/60 flex items-center gap-2 text-[10px]">
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            <span className="font-semibold text-gray-900 tabular-nums">{d.card1.mainValue}</span>
                          </div>
                          <span className="text-gray-200">·</span>
                          <span className="text-gray-500 tabular-nums">{p.card1.readTime}</span>
                          <span className="ml-auto inline-flex items-center gap-1 text-emerald-600 font-semibold tabular-nums">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3l7.5 7.5M12 3v18" /></svg>
                            {p.card1.stat.value}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-2.5 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <svg className="w-3 h-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.814a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
                          <span className="text-[10px] font-semibold text-violet-700">{p.card1.aiHint.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-700 leading-snug">{p.card1.aiHint.body}</p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
                          </svg>
                          <span>
                            <span className="text-gray-900 font-semibold tabular-nums">{p.card1.variations}</span> variations
                          </span>
                        </div>
                        <div className="inline-flex items-baseline gap-1 shrink-0">
                          <span className="text-[13px] font-bold text-emerald-600 tabular-nums">{p.card1.stat.value}</span>
                          <span className="text-[11px] text-gray-500">{p.card1.stat.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Visuals */}
                    <div className={cardBase}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10">
                            <span className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300 ring-1 ring-white shadow-[0_1px_3px_rgba(15,23,42,0.12)] origin-bottom-left -rotate-[10deg] translate-x-[2px] translate-y-[1px]" />
                            <span className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-violet-300 via-indigo-300 to-purple-400 ring-1 ring-white shadow-[0_1px_3px_rgba(15,23,42,0.12)] origin-bottom-left -rotate-[3deg]" />
                            <span className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-emerald-200 via-teal-300 to-cyan-400 ring-1 ring-white shadow-[0_2px_6px_-1px_rgba(15,23,42,0.18)] rotate-[5deg] -translate-x-[1px]" />
                            <span className="absolute inset-0 rounded-[8px] bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.55),transparent_55%)] rotate-[5deg] -translate-x-[1px]" />
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Stage 02</div>
                            <h3 className="text-[1.0625rem] font-semibold text-gray-900 leading-tight tracking-[-0.01em] mt-0.5">
                              {d.card2.title.replace("\n", " ")}
                            </h3>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${card2Tone.bg} border ${card2Tone.border} text-[10px] font-bold ${card2Tone.text} tabular-nums`}>
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 4a1 1 0 011 1v3.59l2.3 2.3a1 1 0 11-1.4 1.42l-2.6-2.6A1 1 0 019 11V7a1 1 0 011-1z"/></svg>
                          {p.card2.perf}
                        </span>
                      </div>

                      <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
                        {d.card2.desc}
                      </p>

                      <div className="grid grid-cols-4 gap-1.5 mb-3">
                        {p.card2.tiles.map((tile, i) => (
                          <div
                            key={i}
                            className={`relative aspect-[4/3] rounded-lg overflow-hidden ring-1 ${tile.active ? "ring-2 ring-sky-500 ring-offset-1 ring-offset-white" : "ring-gray-200/70"}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={tile.image}
                              alt={tile.label}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                            <span className="absolute bottom-1 left-1.5 right-1.5 text-[8.5px] font-semibold text-white truncate drop-shadow">
                              {tile.label}
                            </span>
                            {tile.meta && (
                              <span className="absolute top-1 left-1 text-[8.5px] font-bold tabular-nums text-white px-1 py-px rounded bg-black/55 backdrop-blur-sm">
                                {tile.meta}
                              </span>
                            )}
                            {tile.active && (
                              <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-sky-500 flex items-center justify-center shadow ring-1 ring-white/40">
                                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {p.card2.palette ? (
                        <div className="mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                          <span className="text-[10.5px] font-medium text-gray-500">{p.card2.summary.label}</span>
                          <div className="flex items-center gap-1.5">
                            {p.card2.palette.map((hex) => (
                              <div key={hex} className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full ring-1 ring-gray-200" style={{ background: hex }} />
                                <span className="text-[9.5px] font-mono text-gray-600 tabular-nums">{hex}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                          <span className="text-[10.5px] font-medium text-gray-500">{p.card2.summary.label}</span>
                          <span className="text-[11px] font-semibold text-gray-900 tabular-nums">{p.card2.summary.value}</span>
                        </div>
                      )}

                      <div className="flex-1 rounded-2xl border border-gray-200/80 bg-white overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        {(() => {
                          const total = d.card2.list.reduce((sum, item) => sum + (parseInt(item.count, 10) || 0), 0);
                          const rowIcons = [
                            "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
                            "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
                            "M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776",
                          ];
                          return d.card2.list.map((item, li) => {
                            const count = parseInt(item.count, 10) || 0;
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            const isLast = li === d.card2.list.length - 1;
                            return (
                              <div
                                key={li}
                                className={`relative flex items-center gap-3 px-3.5 py-3 ${!isLast ? "border-b border-gray-100" : ""} ${item.active ? "bg-gradient-to-r from-emerald-50/50 via-white to-white" : ""}`}
                              >
                                {item.active && (
                                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" aria-hidden />
                                )}
                                <div
                                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.active
                                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_2px_8px_-2px_rgba(16,185,129,0.45)]"
                                    : "bg-gray-100 text-gray-400 border border-gray-200/80"
                                    }`}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={rowIcons[li]} />
                                  </svg>
                                  {item.active && (
                                    <span
                                      className="absolute -top-0.5 -right-0.5 inline-flex h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-white"
                                      aria-hidden
                                    />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[13px] truncate ${item.active ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                                    {item.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] font-medium tracking-[0.02em]">
                                    {item.active ? (
                                      <>
                                        <span className="text-emerald-700 font-semibold uppercase tracking-[0.14em]">Active</span>
                                        <span className="text-gray-300">·</span>
                                        <span className="text-gray-500 tabular-nums">{pct}% of selection</span>
                                      </>
                                    ) : item.count ? (
                                      <span className="text-gray-400 tabular-nums">{pct}% of selection</span>
                                    ) : (
                                      <span className="text-gray-400">No matches</span>
                                    )}
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <div
                                    className={`text-[18px] font-bold tabular-nums leading-none ${item.active
                                      ? "text-gray-900"
                                      : item.count
                                        ? "text-gray-700"
                                        : "text-gray-300"
                                      }`}
                                  >
                                    {item.count || "—"}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      <div className="mt-3 flex items-center gap-2.5 p-2.5 rounded-2xl border border-gray-200 bg-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.2)]">
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 ring-1 ring-gray-200/60">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={(p.card2.tiles.find((t) => t.active) ?? p.card2.tiles[0]).image}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                          <svg className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-semibold text-gray-900 truncate">{p.card2.scene.name}</div>
                          <div className="text-[10.5px] text-gray-500 truncate mt-0.5">{p.card2.scene.detail}</div>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-900 text-white text-[10px] font-bold uppercase tracking-[0.08em]">
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                          {p.card2.scene.badge}
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Studio */}
                    <div className={cardBase}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="relative flex flex-col w-10 h-10 rounded-[9px] bg-gradient-to-b from-gray-900 to-gray-950 shadow-[0_2px_6px_-1px_rgba(15,23,42,0.25),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.06),transparent_60%)]" />
                            <div className="flex-1 flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full bg-white/95 flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                                <svg className="w-2 h-2 text-gray-900 translate-x-[0.5px]" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                            <div className="px-1.5 pb-1.5">
                              <div className="h-[2px] rounded-full bg-white/15 overflow-hidden">
                                <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-emerald-400 to-teal-300" />
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Stage 03</div>
                            <h3 className="text-[1.0625rem] font-semibold text-gray-900 leading-tight tracking-[-0.01em] mt-0.5">
                              {d.card3.title}
                            </h3>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${card3Tone.bg} border ${card3Tone.border} text-[10px] font-bold ${card3Tone.text}`}>
                          <span className={`w-1 h-1 rounded-full ${card3Tone.dot}`} />
                          {p.card3.status.label}
                        </span>
                      </div>

                      <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
                        {d.card3.desc}
                      </p>

                      <div className="grid grid-cols-4 gap-1 mb-4 p-1 rounded-[10px] bg-gray-100/80 border border-gray-200/70">
                        {p.card3.presets.map((preset) => (
                          <span
                            key={preset.label}
                            className={`text-center px-2 py-1.5 rounded-md text-[11px] font-semibold tabular-nums transition-colors ${preset.active ? "bg-white text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-gray-900/5" : "text-gray-500"}`}
                          >
                            {preset.label}
                          </span>
                        ))}
                      </div>

                      <div className="flex-1 rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] divide-y divide-gray-100">
                        {p.card3.settings.map((row) => (
                          <div key={row.label} className="flex items-center justify-between px-3.5 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={settingIcon[row.icon]} />
                              </svg>
                              <span className="text-[11.5px] text-gray-500">{row.label}</span>
                            </div>
                            <span className="text-[12px] font-semibold text-gray-900 tabular-nums">{row.value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[11.5px] font-semibold text-gray-900">{d.card3.infoTitle}</span>
                          </div>
                          <span className="text-[10.5px] font-semibold text-gray-500 tabular-nums">
                            <span className="text-gray-900">{p.card3.progress}%</span> · {p.card3.eta}
                          </span>
                        </div>
                        <div className="h-[5px] rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${p.card3.progress}%` }}
                          />
                        </div>

                        <div className="mt-3 flex items-center">
                          {p.card3.pipeline.map((step, i) => {
                            const isLast = i === p.card3.pipeline.length - 1;
                            const next = p.card3.pipeline[i + 1];
                            const connectorDone = !isLast && next && next.status !== "pending";
                            return (
                              <div key={step.label} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                  <div
                                    className={
                                      step.status === "done"
                                        ? "w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
                                        : step.status === "active"
                                          ? "w-4 h-4 rounded-full bg-white ring-2 ring-emerald-500 flex items-center justify-center"
                                          : "w-4 h-4 rounded-full bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center"
                                    }
                                  >
                                    {step.status === "done" ? (
                                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    ) : step.status === "active" ? (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    ) : (
                                      <span className="text-[8px] font-bold text-gray-400 tabular-nums">{i + 1}</span>
                                    )}
                                  </div>
                                  <span
                                    className={
                                      step.status === "done"
                                        ? "text-[9.5px] font-semibold text-gray-700"
                                        : step.status === "active"
                                          ? "text-[9.5px] font-semibold text-emerald-600"
                                          : "text-[9.5px] font-medium text-gray-400"
                                    }
                                  >
                                    {step.label}
                                  </span>
                                </div>
                                {!isLast && (
                                  <div className={`flex-1 h-px mx-1.5 -mt-3 ${connectorDone ? "bg-emerald-500" : "bg-gray-200"}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        tabIndex={-1}
                        aria-hidden
                        className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black rounded-xl px-4 py-3 text-[13px] text-white font-semibold shadow-[0_8px_20px_-8px_rgba(15,23,42,0.4)] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        {p.card3.ctaLabel}
                        <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/10 text-[9.5px] font-mono text-white/70 tracking-wider">{p.card3.shortcut}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>
  );
}
