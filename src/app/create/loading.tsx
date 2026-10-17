import { Skeleton, SkeletonInline } from "@/components/ui/skeleton";
import { ASPECT_RATIOS } from "@/lib/validation/aspectRatio";
import { DURATION_MAX, DURATION_MIN } from "@/lib/validation/duration";

const CARD_STYLE = {
  background: "#111111",
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 24px 60px -20px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.3)",
};
const FIELD_STYLE = { background: "#161616", border: "1px solid rgba(255,255,255,0.09)" };
const RULE = "1px solid rgba(255,255,255,0.06)";
const RADIO_STYLE = { border: "1.5px solid rgba(255,255,255,0.12)" };
const DOT_STYLE = { color: "rgba(255,255,255,0.18)" };

const PROMPT_CHIPS = ["Product launch", "Founder story", "Customer story", "How it works", "LinkedIn post", "Reel / Short hook"];
const PLATFORMS = ["General", "Shorts", "X", "LinkedIn"];
const MODES = [
  { title: "Slideshow", body: "Images + voiceover. Reliable for any topic." },
  { title: "Talking - cartoon", body: "Character speaks on camera. Works for most prompts." },
  { title: "Talking - realistic", body: "Real-looking speaker. Use neutral wording for best results." },
];
const CAPTIONS = [
  { title: "With captions", desc: "Burned-in, auto-synced to voiceover" },
  { title: "No captions", desc: "Clean output, voice only" },
];

function Heading({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h2 className="text-[13px] font-medium m-0 mb-1 tracking-[-0.005em]">
        <SkeletonInline>{title}</SkeletonInline>
      </h2>
      <p className="text-[12px] m-0 leading-[1.5]">
        <SkeletonInline>{hint}</SkeletonInline>
      </p>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col bg-black text-white font-sans relative" aria-hidden>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden contain-[paint]">
        <div className="absolute inset-0 bg-linear-to-br from-zinc-950 via-black to-zinc-950" />
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.72,
            background: [
              "radial-gradient(ellipse 120% 75% at 82% 8%, hsl(38 95% 58% / 0.22) 0%, transparent 58%)",
              "radial-gradient(ellipse 95% 65% at 12% 92%, hsl(172 70% 42% / 0.18) 0%, transparent 52%)",
              "radial-gradient(ellipse 80% 55% at 48% 55%, hsl(24 80% 22% / 0.2) 0%, transparent 62%)",
              "linear-gradient(128deg, hsl(20 60% 6% / 0.55) 0%, transparent 42%, hsl(172 70% 42% / 0.08) 100%)",
            ].join(", "),
          }}
        />
        <div className="absolute -top-28 -right-28 h-[min(100vw,520px)] w-[min(100vw,520px)] rounded-full bg-linear-to-br from-amber-500/22 via-orange-500/10 to-transparent blur-3xl opacity-90" />
        <div className="absolute -bottom-36 -left-28 h-[min(100vw,440px)] w-[min(100vw,440px)] rounded-full bg-linear-to-tr from-teal-500/18 via-emerald-600/8 to-transparent blur-3xl opacity-80" />
        <div
          className="absolute inset-0 z-2"
          style={{ background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.7) 100%)" }}
        />
      </div>

      <nav className="relative z-20 shrink-0 flex items-center justify-between px-6 lg:px-10 py-3.5">
        <span className="inline-flex items-center gap-2 px-2.5 py-1.5 -mx-2.5 text-[12.5px] font-medium">
          <Skeleton className="h-4 w-4 rounded-[4px]" />
          <SkeletonInline>Back to dashboard</SkeletonInline>
        </span>
      </nav>

      <div className="relative z-10 flex-1">
        <main className="relative min-h-[calc(100dvh-64px)] px-4 sm:px-6 py-5 sm:py-7">
          <div className="w-full max-w-[1240px] mx-auto">
            <div className="relative rounded-[16px] overflow-hidden" style={CARD_STYLE}>
              <div className="px-7 pt-7 pb-5" style={{ borderBottom: RULE }}>
                <h1 className="text-[19px] font-semibold tracking-[-0.015em] m-0 mb-1">
                  <SkeletonInline>Create a video</SkeletonInline>
                </h1>
                <p className="text-[13px] m-0 leading-[1.5]">
                  <SkeletonInline>Fill out the details below and we&rsquo;ll handle the rest - script, voice, visuals, edit.</SkeletonInline>
                </p>
              </div>

              <div className="px-7 py-7 flex flex-col gap-8">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <Heading title="Describe your video" hint="Be specific about topic, tone, style, and audience." />
                    <span className="shrink-0 inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[7px]" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                      <Skeleton className="h-3 w-3 rounded-[3px]" />
                      <SkeletonInline>Suggest prompt</SkeletonInline>
                    </span>
                  </div>
                  <div className="relative rounded-[10px] px-4 pt-3.5 pb-3" style={FIELD_STYLE}>
                    <p className="m-0 h-[76px] overflow-hidden text-[13.5px] leading-[1.55] tracking-[-0.005em]">
                      <SkeletonInline>e.g. Create a 30-second explainer about how solar panels work, professional tone with upbeat background music</SkeletonInline>
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-3 mt-2.5" style={{ borderTop: RULE }}>
                      <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
                        {PROMPT_CHIPS.map((label) => (
                          <SkeletonInline key={label} className="px-2.5 py-[3px] rounded-full text-[11.5px] tracking-[-0.003em] border border-white/[0.09]">
                            {label}
                          </SkeletonInline>
                        ))}
                      </div>
                      <SkeletonInline className="shrink-0 font-mono text-[11px] tabular-nums">0 / 500</SkeletonInline>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[13px] font-medium m-0 mb-1 tracking-[-0.005em] flex items-center gap-2">
                        <SkeletonInline>Your images</SkeletonInline>
                        <SkeletonInline className="text-[11px] font-normal px-1.5 py-px rounded-full border border-transparent">Optional</SkeletonInline>
                      </h2>
                      <p className="text-[12px] m-0 leading-[1.5]">
                        <SkeletonInline>We&apos;ll source visuals from the web. Upload your own images on Pro and above.</SkeletonInline>
                      </p>
                    </div>
                    <SkeletonInline className="shrink-0 font-mono text-[11px] tabular-nums">0 / 5</SkeletonInline>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <div className="w-16 h-16 rounded-[9px]" style={{ background: "#161616", border: "1px dashed rgba(255,255,255,0.14)" }} />
                    {Array.from({ length: 5 }, (_, i) => (
                      <div key={i} className="w-16 h-16 rounded-[9px] opacity-[0.35]" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }} />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
                  <div className="flex flex-col gap-2.5">
                    <Heading title="Platform" hint="Where this video will live." />
                    <div className="grid grid-cols-4 gap-1.5">
                      {PLATFORMS.map((label) => (
                        <div key={label} className="flex flex-col items-center justify-center gap-2 px-2 pt-3 pb-2.5 rounded-[8px] text-[12.5px] tracking-[-0.003em]" style={FIELD_STYLE}>
                          <Skeleton className="h-5 w-5 rounded-[5px]" />
                          <SkeletonInline>{label}</SkeletonInline>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <Heading title="Aspect ratio" hint="Frame size for the output." />
                    <div className="grid grid-cols-6 gap-1.5">
                      {ASPECT_RATIOS.map((r) => {
                        const [w, h] = r.split(":").map(Number);
                        const scale = Math.min(22 / w, 22 / h);
                        return (
                          <div key={r} className="flex flex-col items-center justify-center gap-2 px-1 pt-3 pb-2.5 rounded-[8px] font-mono text-[11px] tabular-nums" style={FIELD_STYLE}>
                            <span
                              className="block rounded-[1.5px]"
                              style={{
                                width: Math.max(8, Math.round(w * scale)),
                                height: Math.max(8, Math.round(h * scale)),
                                border: "1px solid rgba(255,255,255,0.12)",
                              }}
                            />
                            <SkeletonInline>{r}</SkeletonInline>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Heading title="Video length" hint={`${DURATION_MIN}-${DURATION_MAX} seconds. Talking videos over 8s use multiple clips.`} />
                  <div className="rounded-[10px] px-[18px] py-4 flex items-center gap-[18px]" style={FIELD_STYLE}>
                    <div className="flex items-baseline gap-1.5 min-w-[88px]">
                      <SkeletonInline className="font-medium tabular-nums leading-none text-[26px] tracking-[-1.2px]">30</SkeletonInline>
                      <SkeletonInline className="text-[12px]">sec</SkeletonInline>
                    </div>
                    <div className="relative flex-1">
                      <Skeleton className="h-1 w-full rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Heading title="How should this video be made?" hint="Pick one. We build exactly what you pick." />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {MODES.map(({ title, body }) => (
                      <div key={title} className="rounded-[10px] text-left px-[15px] py-3.5 flex flex-col gap-1.5" style={FIELD_STYLE}>
                        <div className="flex items-center justify-between gap-2">
                          <SkeletonInline className="text-[13px] font-medium tracking-[-0.005em]">{title}</SkeletonInline>
                          <span className="w-[14px] h-[14px] rounded-full shrink-0" style={RADIO_STYLE} />
                        </div>
                        <p className="text-[11.5px] m-0 leading-[1.45]">
                          <SkeletonInline>{body}</SkeletonInline>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Heading title="Captions" hint="Auto-synced burn-in. Editable after generation." />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CAPTIONS.map(({ title, desc }) => (
                      <div key={title} className="rounded-[10px] flex items-center gap-3 px-[15px] py-[13px] text-left" style={FIELD_STYLE}>
                        <Skeleton className="shrink-0 w-[34px] h-[34px] rounded-[8px]" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-[2px]">
                            <SkeletonInline className="text-[12.5px] font-medium tracking-[-0.005em]">{title}</SkeletonInline>
                            <span className="w-[13px] h-[13px] rounded-full shrink-0" style={RADIO_STYLE} />
                          </div>
                          <div className="text-[11px] leading-[1.4]">
                            <SkeletonInline>{desc}</SkeletonInline>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="flex flex-wrap items-center justify-between gap-3 px-7 py-4"
                style={{ borderTop: RULE, background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.012))" }}
              >
                <div className="flex items-center gap-3.5 text-[11.5px]">
                  <SkeletonInline>~60s render</SkeletonInline>
                  <span style={DOT_STYLE}>·</span>
                  <SkeletonInline>1080p Full HD</SkeletonInline>
                  <span style={DOT_STYLE}>·</span>
                  <SkeletonInline className="px-[9px] py-[2px] rounded-full border border-transparent font-medium tracking-[0.04em] uppercase text-[10px]">
                    Free
                  </SkeletonInline>
                </div>
                <Skeleton className="inline-flex items-center gap-2.5 px-[18px] py-[10px] rounded-[9px] text-[13px] font-medium tracking-[-0.005em]">
                  Generate video
                  <span className="w-[14px] h-[14px]" />
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] font-medium ml-[2px] border">⌘↵</span>
                </Skeleton>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
