export function PainPoint() {
  return (
          <section className="pt-44 pb-44 px-4 sm:px-6">
            <div className="max-w-[64rem] mx-auto">
              <div className="text-center mb-14">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-100 bg-rose-50/70 text-[10.5px] font-semibold tracking-[0.18em] text-rose-700 uppercase mb-6">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </span>
                  The pain point
                </div>
                <h2
                  className="text-[2.25rem] sm:text-[3rem] md:text-[3.5rem] font-normal text-gray-900 leading-[1.04] tracking-[-0.03em] max-w-[28ch] mx-auto"
                  style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                >
                  Video creation is{" "}
                  <span className="italic relative whitespace-nowrap">
                    slower
                    <svg className="absolute left-0 -bottom-2 w-full h-2" viewBox="0 0 120 8" preserveAspectRatio="none" aria-hidden>
                      <defs>
                        <linearGradient id="painpoint-underline" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0" stopColor="#fb7185" />
                          <stop offset="1" stopColor="#e11d48" />
                        </linearGradient>
                      </defs>
                      <path d="M 2 5 Q 60 1 118 5" stroke="url(#painpoint-underline)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </svg>
                  </span>
                  {" "}than it should be.
                </h2>
                <p className="text-[15px] text-gray-500 max-w-[44ch] mx-auto mt-6 leading-relaxed">
                  A single brief routes through five tools and four people. We collapse the whole pipeline into one prompt.
                </p>
              </div>

              <div className="relative grid grid-cols-2 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] mb-4">
                <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-gray-100 pointer-events-none" aria-hidden />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200 shadow-[0_2px_8px_rgba(15,23,42,0.08)]" aria-hidden>
                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>

                <div className="p-7 sm:p-9">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold tracking-[0.16em] text-rose-700/80 uppercase mb-7">
                    <span className="w-1 h-1 rounded-full bg-rose-400" />
                    The old way
                  </div>
                  <div className="space-y-5">
                    {[
                      { label: "Total time", value: "4 days", sub: "five sequential stages" },
                      { label: "Headcount", value: "5 people", sub: "brief, copy, voice, visuals, edit" },
                      { label: "Cost / video", value: "$3,400+", sub: "freelance, tools, overhead" },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="text-[10.5px] font-medium tracking-[0.14em] text-gray-400 uppercase">{row.label}</div>
                        <div
                          className="text-[1.875rem] sm:text-[2.125rem] font-normal text-gray-900 leading-none mt-1.5 tabular-nums"
                          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                        >
                          {row.value}
                        </div>
                        <div className="text-[11.5px] text-gray-500 mt-1.5">{row.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-7 sm:p-9 bg-gradient-to-br from-emerald-50/30 via-white to-white">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold tracking-[0.16em] text-emerald-700 uppercase mb-7">
                    <span className="relative flex h-1 w-1">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                      <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-500" />
                    </span>
                    With Cutline
                  </div>
                  <div className="space-y-5">
                    {[
                      { label: "Total time", value: "60 seconds", sub: "end to end, in one render" },
                      { label: "Headcount", value: "1 prompt", sub: "you, typing one sentence" },
                      { label: "Cost / video", value: "$0.24", sub: "all-in, on the standard plan" },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="text-[10.5px] font-medium tracking-[0.14em] text-gray-400 uppercase">{row.label}</div>
                        <div
                          className="text-[1.875rem] sm:text-[2.125rem] font-normal leading-none mt-1.5 tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-teal-600"
                          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                        >
                          {row.value}
                        </div>
                        <div className="text-[11.5px] text-gray-500 mt-1.5">{row.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-center text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase mb-10 tabular-nums">
                <span className="text-emerald-600">5,760×</span> faster · <span className="text-emerald-600">14,000×</span> cheaper
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* Pain 01: Linear-style timeline */}
                <div className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:border-gray-300 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.22)] hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Pain 01 · Time</span>
                    <span className="text-[10px] font-mono text-gray-300">⌥1</span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] mb-5 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/60">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="text-[10.5px] font-semibold text-gray-700">CUT-204 · Product demo</span>
                      </div>
                      <span className="text-[9.5px] font-mono text-gray-400 tabular-nums">5 issues</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {[
                        { stage: "Brief & alignment", who: "PM", whoColor: "from-violet-300 to-indigo-400", time: "18h", status: "done" },
                        { stage: "Script writing", who: "SH", whoColor: "from-pink-300 to-rose-400", time: "22h", status: "done" },
                        { stage: "Voiceover record", who: "BC", whoColor: "from-amber-300 to-orange-400", time: "16h", status: "active" },
                        { stage: "Visual sourcing", who: "MV", whoColor: "from-emerald-300 to-teal-400", time: "24h", status: "blocked" },
                        { stage: "Edit & compose", who: "JT", whoColor: "from-sky-300 to-blue-400", time: "20h", status: "blocked" },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                          <span
                            className={
                              row.status === "done"
                                ? "w-2.5 h-2.5 rounded-full border border-emerald-500 bg-emerald-500 flex items-center justify-center shrink-0"
                                : row.status === "active"
                                  ? "w-2.5 h-2.5 rounded-full border-[1.5px] border-amber-500 flex items-center justify-center shrink-0"
                                  : "w-2.5 h-2.5 rounded-full border border-gray-300 flex items-center justify-center shrink-0"
                            }
                          >
                            {row.status === "done" && (
                              <svg className="w-1.5 h-1.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                            {row.status === "active" && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                          </span>
                          <span className="text-[10.5px] text-gray-700 flex-1 truncate">{row.stage}</span>
                          <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${row.whoColor} ring-1 ring-white text-[7.5px] font-bold text-white/95 flex items-center justify-center shrink-0`}>
                            {row.who[0]}
                          </span>
                          <span className="text-[9.5px] font-mono text-gray-500 tabular-nums w-7 text-right shrink-0">{row.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/60">
                      <span className="text-[9.5px] font-semibold tracking-wider uppercase text-gray-400">Total</span>
                      <span className="text-[10.5px] font-mono font-semibold text-gray-900 tabular-nums">4d · 100h</span>
                    </div>
                  </div>

                  <h3
                    className="text-[17px] font-normal text-gray-900 leading-tight tracking-[-0.015em] mb-2"
                    style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                  >
                    Manual editing eats your week.
                  </h3>
                  <p className="text-[12.5px] text-gray-500 leading-relaxed mb-5 flex-1">
                    The brief sits on someone&rsquo;s desk while five owners wait their turn. One stage blocks the next.
                  </p>

                  <div className="pt-3 border-t border-gray-100 flex items-baseline justify-between gap-2">
                    <span className="text-[9.5px] font-semibold tracking-[0.16em] text-gray-400 uppercase">Cutline ships in</span>
                    <span
                      className="text-[20px] font-normal tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-teal-600 leading-none"
                      style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                    >
                      60 seconds
                    </span>
                  </div>
                </div>

                {/* Pain 02: Premiere-style export queue */}
                <div className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:border-gray-300 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.22)] hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Pain 02 · Formats</span>
                    <span className="text-[10px] font-mono text-gray-300">⌥2</span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] mb-5 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/60">
                      <div className="flex items-center gap-2">
                        <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        <span className="text-[10.5px] font-semibold text-gray-700">Export Queue</span>
                      </div>
                      <span className="text-[9.5px] font-mono text-gray-400 tabular-nums">5 jobs</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {[
                        { ratio: "9:16", platform: "Reels", res: "1080×1920", size: "12.4 MB" },
                        { ratio: "1:1", platform: "Square", res: "1080×1080", size: "8.2 MB" },
                        { ratio: "16:9", platform: "YouTube", res: "1920×1080", size: "18.6 MB" },
                        { ratio: "9:16", platform: "Stories", res: "1080×1920", size: "9.8 MB" },
                        { ratio: "4:5", platform: "Meta Ads", res: "1080×1350", size: "11.2 MB" },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                          <span className="w-9 px-1 py-0.5 rounded text-[8.5px] font-bold tabular-nums text-center bg-gray-100 text-gray-700 shrink-0">
                            {row.ratio}
                          </span>
                          <span className="text-[10.5px] text-gray-700 flex-1 truncate">{row.platform}</span>
                          <span className="text-[9.5px] font-mono text-gray-400 tabular-nums shrink-0">{row.res}</span>
                          <span className="text-[9.5px] font-mono text-gray-500 tabular-nums w-12 text-right shrink-0">{row.size}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/60">
                      <span className="text-[9.5px] font-semibold tracking-wider uppercase text-gray-400">Re-render</span>
                      <span className="text-[10.5px] font-mono font-semibold text-gray-900 tabular-nums">~ 2h 14m</span>
                    </div>
                  </div>

                  <h3
                    className="text-[17px] font-normal text-gray-900 leading-tight tracking-[-0.015em] mb-2"
                    style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                  >
                    Multi-format export is a maze.
                  </h3>
                  <p className="text-[12.5px] text-gray-500 leading-relaxed mb-5 flex-1">
                    Each platform is its own crop, its own re-render, its own QA pass. Five jobs for the same idea.
                  </p>

                  <div className="pt-3 border-t border-gray-100 flex items-baseline justify-between gap-2">
                    <span className="text-[9.5px] font-semibold tracking-[0.16em] text-gray-400 uppercase">Cutline ships in</span>
                    <span
                      className="text-[20px] font-normal tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-teal-600 leading-none"
                      style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                    >
                      One render
                    </span>
                  </div>
                </div>

                {/* Pain 03: Stripe-style invoice */}
                <div className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:border-gray-300 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.22)] hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase tabular-nums">Pain 03 · Cost</span>
                    <span className="text-[10px] font-mono text-gray-300">⌥3</span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] mb-5 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/60">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400">Inv-2403</span>
                        <span className="text-[10.5px] font-semibold text-gray-700">Per video</span>
                      </div>
                      <span className="text-[9.5px] font-mono text-gray-400 tabular-nums">5 lines</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {[
                        { role: "Copywriter", hours: "8h", rate: "$120", line: "$960" },
                        { role: "Voice talent", hours: "4h", rate: "$200", line: "$800" },
                        { role: "Researcher", hours: "6h", rate: "$80", line: "$480" },
                        { role: "Editor", hours: "6h", rate: "$150", line: "$900" },
                        { role: "Producer", hours: "1.5h", rate: "$180", line: "$270" },
                      ].map((row) => (
                        <div key={row.role} className="flex items-center gap-2 px-3 py-1.5">
                          <span className="text-[10.5px] text-gray-700 flex-1 truncate">{row.role}</span>
                          <span className="text-[9.5px] font-mono text-gray-400 tabular-nums w-8 text-right shrink-0">{row.hours}</span>
                          <span className="text-[9.5px] font-mono text-gray-400 tabular-nums w-10 text-right shrink-0">{row.rate}</span>
                          <span className="text-[10.5px] font-mono font-semibold text-gray-900 tabular-nums w-12 text-right shrink-0">{row.line}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/60">
                      <span className="text-[9.5px] font-semibold tracking-wider uppercase text-gray-400">Total</span>
                      <span className="text-[12px] font-mono font-bold text-gray-900 tabular-nums">$3,410.00</span>
                    </div>
                  </div>

                  <h3
                    className="text-[17px] font-normal text-gray-900 leading-tight tracking-[-0.015em] mb-2"
                    style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                  >
                    Scaling means hiring more humans.
                  </h3>
                  <p className="text-[12.5px] text-gray-500 leading-relaxed mb-5 flex-1">
                    More videos used to mean more editors, more voice talent, more producers. The unit economics fall apart.
                  </p>

                  <div className="pt-3 border-t border-gray-100 flex items-baseline justify-between gap-2">
                    <span className="text-[9.5px] font-semibold tracking-[0.16em] text-gray-400 uppercase">Cutline ships at</span>
                    <span
                      className="text-[20px] font-normal tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-teal-600 leading-none"
                      style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
                    >
                      $0.24
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
  );
}
