"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Container } from "./primitives";

const AUTOPLAY_MS = 12000;

const JOBS = [
  { name: "vlog-ep-12", status: "draft" },
  { name: "saas-pitch-45s", status: "ready" },
  { name: "redis-explainer", status: "render" },
  { name: "onboarding-flow", status: "queued" },
  { name: "q3-product-update", status: "ready" },
  { name: "kubernetes-101", status: "queued" },
] as const;

const STATUS_DOT: Record<string, string> = {
  ready: "bg-[#111]",
  render: "bg-[#ff5600]",
  queued: "border border-[#111]/30",
  draft: "bg-[#111]/30",
};

function RailGlyph({ d, active = false }: { d: string; active?: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-md ${
        active ? "bg-[#111]/8 text-[#111]" : "text-[#111]/35"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-[15px] w-[15px]"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </span>
  );
}

const RAIL = [
  { d: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10", active: false },
  { d: "M4 5h16v14H4zM4 9h16M8 5v14", active: true },
  { d: "M3 7h6l2 2h10v10H3z", active: false },
  { d: "M4 19V5m0 14h16M8 15v-4m4 4V8m4 7v-6", active: false },
  {
    d: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2m0 16v2m10-10h-2M4 12H2m15.5-7.5L16 6M8 18l-1.5 1.5M19.5 19.5L18 18M6 6L4.5 4.5",
    active: false,
  },
] as const;

function AppShell({
  activeJob,
  title,
  status,
  main,
  right,
  rightTitle,
}: {
  activeJob: string;
  title: string;
  status: string;
  main: ReactNode;
  right: ReactNode;
  rightTitle: string;
}) {
  return (
    <div className="relative z-10 flex h-[86%] w-[94%] max-w-[1140px] overflow-hidden rounded-xl bg-[#fbfaf8] text-left ring-1 ring-black/10 shadow-[0_30px_80px_-28px_rgba(0,0,0,0.4)]">
      <div className="hidden w-11 shrink-0 flex-col items-center gap-2.5 border-r border-[#111]/8 py-3 md:flex">
        <span className="mb-1 h-5 w-5 rounded-[5px] bg-[#111]" aria-hidden />
        {RAIL.map((glyph, i) => (
          <RailGlyph key={i} d={glyph.d} active={glyph.active} />
        ))}
      </div>
      <div className="hidden w-48 shrink-0 flex-col border-r border-[#111]/8 lg:flex">
        <div className="flex items-center justify-between px-3.5 pb-2 pt-3.5">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-[#111]/45">
            Projects
          </span>
          <span className="font-mono text-[12px] text-[#111]/35" aria-hidden>
            +
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-1.5">
          {JOBS.map((job) => {
            const active = job.name === activeJob;
            return (
              <div
                key={job.name}
                className={`flex items-center justify-between gap-2 rounded-md px-2 py-[7px] ${
                  active ? "bg-[#111]/6" : ""
                }`}
              >
                <span
                  className={`truncate font-mono text-[11px] ${
                    active ? "text-[#111]" : "text-[#111]/55"
                  }`}
                >
                  {job.name}
                </span>
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[job.status]}`}
                />
              </div>
            );
          })}
        </div>
        <div className="border-t border-[#111]/8 px-3.5 py-2.5 font-mono text-[10px] text-[#111]/40">
          6 videos · 4.2 GB
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[#111]/8 px-4 py-2.5">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="truncate font-mono text-[12px] text-[#111]">
              {title}
            </span>
            <span className="shrink-0 rounded-full border border-[#111]/15 px-2 py-px font-mono text-[9px] uppercase tracking-[0.12em] text-[#111]/60">
              {status}
            </span>
          </span>
          <span className="hidden shrink-0 items-center gap-2 sm:flex">
            <kbd className="rounded border border-[#111]/15 px-1.5 py-0.5 font-mono text-[9px] text-[#111]/45">
              ⌘ K
            </kbd>
            <span
              className="h-5 w-5 rounded-full bg-[#d9e2d4] ring-1 ring-[#111]/10"
              aria-hidden
            />
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-4">{main}</div>
      </div>

      <div className="hidden w-60 shrink-0 flex-col border-l border-[#111]/8 xl:flex">
        <div className="border-b border-[#111]/8 px-3.5 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-[#111]/45">
          {rightTitle}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-3.5">{right}</div>
      </div>
    </div>
  );
}

const SCRIPT_LINES = [
  {
    t: "0:00",
    text: "What if your next video only took one sentence?",
    active: true,
  },
  {
    t: "0:04",
    text: "Meet Cutline - type the idea, and a 12-stage director takes it from there.",
    active: false,
  },
  {
    t: "0:11",
    text: "It writes the script, sources every shot, and times the cut to the voice.",
    active: false,
  },
  {
    t: "0:18",
    text: "Captions, music, and pacing land in the same single pass.",
    active: false,
  },
  {
    t: "0:26",
    text: "No timeline, no templates - just a finished MP4.",
    active: false,
  },
] as const;

function ScriptMain() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-1.5">
        {["Hook", "Pacing", "Tone", "Structure"].map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[#111]/15 px-2 py-px font-mono text-[9px] text-[#111]/55"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-3 min-h-0 flex-1 space-y-[7px] overflow-hidden">
        {SCRIPT_LINES.map((line) => (
          <div
            key={line.t}
            className={`flex gap-3 rounded-md px-2.5 py-[7px] ${
              line.active ? "border-l-2 border-[#ff5600] bg-[#111]/4" : ""
            }`}
          >
            <span className="shrink-0 pt-px font-mono text-[10px] text-[#111]/40">
              {line.t}
            </span>
            <span className="font-sans text-[12.5px] leading-[1.45] text-[#111]/85">
              {line.text}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#111]/8 pt-2.5 font-mono text-[10px] text-[#111]/50">
        <span>247 words · 1m 12s read · 3 variations</span>
        <span className="hidden sm:inline">draft v3 · ready for voice</span>
      </div>
    </div>
  );
}

function ScriptRight() {
  const suggestions = [
    {
      label: "Hook",
      text: "Open with the question viewers are already asking.",
    },
    { label: "Recap", text: "Add a one-line recap before the CTA at 0:26." },
    { label: "Pacing", text: "Scene 3 runs long - split it across two shots." },
  ];
  return (
    <div className="flex h-full flex-col gap-2">
      {suggestions.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-[#111]/10 bg-white p-2.5"
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#ff5600]">
            {s.label}
          </p>
          <p className="mt-1 font-sans text-[11.5px] leading-[1.4] text-[#111]/75">
            {s.text}
          </p>
        </div>
      ))}
      <span className="mt-auto inline-flex items-center justify-center rounded-[5px] bg-[#111] px-3 py-1.5 font-sans text-[11px] font-medium text-[#f4f3ec]">
        Apply all
      </span>
    </div>
  );
}

const STAGES = [
  { n: "01", name: "intent", dur: "0.8s", state: "done" },
  { n: "02", name: "narrative", dur: "2.1s", state: "done" },
  { n: "03", name: "shots", dur: "1.4s", state: "done" },
  { n: "04", name: "script", dur: "3.2s", state: "done" },
  { n: "05", name: "visuals", dur: "6.8s", state: "done" },
  { n: "06", name: "motion", dur: "1.1s", state: "done" },
  { n: "07", name: "voice", dur: "4.6s", state: "active" },
  { n: "08", name: "subtitles", dur: "-", state: "queued" },
  { n: "09", name: "score", dur: "-", state: "queued" },
  { n: "10", name: "mix", dur: "-", state: "queued" },
  { n: "11", name: "render", dur: "-", state: "queued" },
  { n: "12", name: "quality gate", dur: "-", state: "queued" },
] as const;

function PipelineMain() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between font-mono text-[11px] text-[#111]">
        <span>12-stage pipeline</span>
        <span className="text-[#111]/55">00:27 / 00:45</span>
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-[#111]/10">
        <div className="h-full w-[60%] rounded-full bg-[#111]" />
      </div>
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 content-start gap-x-6 overflow-hidden sm:grid-cols-2">
        {STAGES.map((stage) => {
          const done = stage.state === "done";
          const activeStage = stage.state === "active";
          return (
            <div
              key={stage.n}
              className="flex items-center justify-between gap-2 border-b border-[#111]/6 py-[6.5px]"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    activeStage
                      ? "bg-[#ff5600]"
                      : done
                        ? "bg-[#111]"
                        : "border border-[#111]/30"
                  }`}
                />
                <span
                  className={`font-mono text-[11px] ${
                    stage.state === "queued" ? "text-[#111]/40" : "text-[#111]"
                  }`}
                >
                  {stage.n} {stage.name}
                </span>
              </span>
              <span
                className={`font-mono text-[10px] ${
                  activeStage ? "text-[#ff5600]" : "text-[#111]/45"
                }`}
              >
                {activeStage ? "running" : stage.dur}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineRight() {
  const log = [
    ["00:04", "intent parsed · 1 goal"],
    ["00:06", "outline · 5 scenes"],
    ["00:09", "shots locked · 12"],
    ["00:14", "visuals matched 12/12"],
    ["00:19", "motion pass · ok"],
    ["00:24", "voice · rendering"],
    ["00:27", "queue position · #1"],
  ] as const;
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-[7px]">
        {log.map(([t, msg]) => (
          <p key={t} className="flex gap-2 font-mono text-[10px] leading-[1.4]">
            <span className="shrink-0 text-[#111]/35">{t}</span>
            <span className="text-[#111]/70">{msg}</span>
          </p>
        ))}
      </div>
      <div className="mt-auto rounded-lg border border-[#111]/10 bg-white p-2.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#111]/45">
          Quality gates
        </p>
        <p className="mt-1 font-mono text-[10.5px] text-[#111]/75">
          audio sync · caption drift · black frames
        </p>
      </div>
    </div>
  );
}

const SCENES = [
  { src: "/hero/1.jpg", label: "S01 · 0:04", active: false },
  { src: "/hero/3.jpg", label: "S02 · 0:07", active: false },
  { src: "/hero/12.jpg", label: "S03 · 0:05", active: true },
  { src: "/hero/5.jpg", label: "S04 · 0:06", active: false },
  { src: "/hero/11.jpg", label: "S05 · 0:03", active: false },
  { src: "/hero/14.jpg", label: "S06 · 0:02", active: false },
] as const;

function VisualsMain() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="text-[#111]">Scene matching · 6 scenes</span>
        <span className="text-[#111]/55">12 clips · auto</span>
      </div>
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 sm:grid-cols-3">
        {SCENES.map((scene) => (
          <div
            key={scene.label}
            className={`relative overflow-hidden rounded-md ${
              scene.active ? "ring-2 ring-[#ff5600]" : "ring-1 ring-[#111]/10"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={scene.src}
              alt=""
              loading="lazy"
              className="aspect-video w-full object-cover"
            />
            <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-px font-mono text-[9px] text-white">
              {scene.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualsRight() {
  const rows = [
    ["Source", "Web search"],
    ["License", "Free to use"],
    ["Style match", "high"],
    ["Motion", "slow pan"],
  ] as const;
  return (
    <div className="flex h-full flex-col">
      <p className="font-mono text-[11px] text-[#111]">S03 · selected</p>
      <div className="mt-2 divide-y divide-[#111]/8">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between py-[7px] font-mono text-[10.5px]"
          >
            <span className="text-[#111]/45">{k}</span>
            <span className="text-[#111]/85">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#111]/45">
          Palette
        </p>
        <div className="mt-1.5 flex gap-1.5">
          {["#111111", "#f4f3ec", "#ff5600", "#d9e2d4"].map((c) => (
            <span
              key={c}
              className="h-5 w-5 rounded ring-1 ring-[#111]/10"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <span className="mt-auto inline-flex items-center justify-center rounded-[5px] border border-[#111]/20 px-3 py-1.5 font-sans text-[11px] font-medium text-[#111]">
        Swap source
      </span>
    </div>
  );
}

const RENDER_QUEUE = [
  { fmt: "9:16 Reels", size: "1080×1920", state: "done" },
  { fmt: "1:1 Square", size: "1080×1080", state: "done" },
  { fmt: "16:9 YouTube", size: "1920×1080", state: "62%" },
  { fmt: "9:16 Stories", size: "1080×1920", state: "28%" },
  { fmt: "4:5 Meta Ads", size: "1080×1350", state: "queued" },
] as const;

function ExportMain() {
  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg ring-1 ring-[#111]/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/bg-preview.jpg"
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="absolute bottom-9 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 font-sans text-[10.5px] text-white">
          - just a finished MP4.
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-5">
          <span aria-hidden className="text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="h-[3px] flex-1 rounded-full bg-white/30">
            <span className="block h-full w-[60%] rounded-full bg-white" />
          </span>
          <span className="font-mono text-[9px] text-white/90">
            00:27 / 00:45
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {["1080p", "720p", "Square", "9:16"].map((preset, i) => (
            <span
              key={preset}
              className={`rounded-full px-2.5 py-[3px] font-mono text-[10px] ${
                i === 0
                  ? "bg-[#111] text-[#f4f3ec]"
                  : "border border-[#111]/15 text-[#111]/55"
              }`}
            >
              {preset}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-2 rounded-[5px] bg-[#111] px-3 py-1.5 font-sans text-[11px] font-medium text-[#f4f3ec]">
          Export MP4
          <kbd className="font-mono text-[9px] text-[#f4f3ec]/60">⌘E</kbd>
        </span>
      </div>
    </div>
  );
}

function ExportRight() {
  return (
    <div className="flex h-full flex-col">
      <div className="divide-y divide-[#111]/8">
        {RENDER_QUEUE.map((row) => (
          <div
            key={row.fmt}
            className="flex items-center justify-between gap-2 py-[7px]"
          >
            <span className="min-w-0">
              <span className="block truncate font-mono text-[10.5px] text-[#111]/85">
                {row.fmt}
              </span>
              <span className="block font-mono text-[9px] text-[#111]/40">
                {row.size}
              </span>
            </span>
            <span
              className={`shrink-0 font-mono text-[10px] ${
                row.state === "done"
                  ? "text-[#111]"
                  : row.state === "queued"
                    ? "text-[#111]/40"
                    : "text-[#ff5600]"
              }`}
            >
              {row.state === "done" ? "✓ done" : row.state}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-auto font-mono text-[10px] text-[#111]/45">
        one render · every crop · no watermarks
      </p>
    </div>
  );
}

type TabDef = {
  id: string;
  label: string;
  bg: string;
  activeJob: string;
  title: string;
  status: string;
  rightTitle: string;
  Main: () => ReactNode;
  Right: () => ReactNode;
};

const TABS: TabDef[] = [
  {
    id: "script",
    label: "Cutline, the script engine",
    bg: "/hero/bg-script.jpg",
    activeJob: "vlog-ep-12",
    title: "vlog-ep-12.md",
    status: "drafting",
    rightTitle: "Director",
    Main: ScriptMain,
    Right: ScriptRight,
  },
  {
    id: "director",
    label: "Directed by a 12-stage AI",
    bg: "/hero/bg-director.jpg",
    activeJob: "redis-explainer",
    title: "redis-explainer",
    status: "rendering",
    rightTitle: "Telemetry",
    Main: PipelineMain,
    Right: PipelineRight,
  },
  {
    id: "visuals",
    label: "Visuals matched to every line",
    bg: "/hero/bg-visuals.jpg",
    activeJob: "saas-pitch-45s",
    title: "saas-pitch-45s",
    status: "matching",
    rightTitle: "Match details",
    Main: VisualsMain,
    Right: VisualsRight,
  },
  {
    id: "export",
    label: "Every format, one render",
    bg: "/hero/bg-export.jpg",
    activeJob: "q3-product-update",
    title: "q3-product-update",
    status: "exporting",
    rightTitle: "Render queue",
    Main: ExportMain,
    Right: ExportRight,
  },
];

export function ProductTabs() {
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!autoplay) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(
      () => setActive((current) => (current + 1) % TABS.length),
      AUTOPLAY_MS,
    );
    return () => clearTimeout(timer);
  }, [active, autoplay]);

  const select = (i: number) => {
    setAutoplay(false);
    setActive(i);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (active + 1) % TABS.length;
    else if (event.key === "ArrowLeft")
      next = (active - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    if (next !== null) {
      event.preventDefault();
      select(next);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <section className="pt-14 md:pt-16 pb-20 sm:pb-24">
      <Container>
        <div className="-mx-5 sm:-mx-8 overflow-x-auto scrollbar-hide px-5 sm:px-8 min-[1370px]:mx-0 min-[1370px]:overflow-visible min-[1370px]:px-0">
          <div
            role="tablist"
            aria-label="Cutline product capabilities"
            onKeyDown={handleKeyDown}
            className="flex min-w-max min-[1370px]:min-w-0"
          >
            {TABS.map((tab, i) => {
              const selected = active === i;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`v2-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`v2-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(i)}
                  className={`relative -ml-px flex-1 overflow-hidden whitespace-nowrap border border-[#111]/10 px-6 py-4 text-left font-sans text-[15px] transition-colors duration-200 first:ml-0 lg:px-10 ${
                    selected
                      ? "bg-[#faf9f6] text-[#111]"
                      : "bg-white text-[#111]/50 hover:text-[#111]/75"
                  }`}
                >
                  <span
                    key={`bar-${active}-${autoplay}`}
                    aria-hidden
                    className={`v2-tab-progress absolute left-0 top-0 h-0.5 w-full origin-left bg-[#ff5600] ${
                      selected && autoplay ? "" : "opacity-0"
                    }`}
                    style={
                      selected && autoplay
                        ? {
                            animation: `v2-tab-progress ${AUTOPLAY_MS}ms linear forwards`,
                            transform: "scaleX(0)",
                          }
                        : { transform: "scaleX(0)" }
                    }
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="-mt-px overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {TABS.map((tab, i) => {
              const selected = active === i;
              return (
                <div
                  key={tab.id}
                  role="tabpanel"
                  id={`v2-panel-${tab.id}`}
                  aria-labelledby={`v2-tab-${tab.id}`}
                  aria-hidden={!selected}
                  tabIndex={selected ? 0 : -1}
                  className={`relative min-w-0 shrink-0 grow-0 basis-full ${
                    selected ? "" : "pointer-events-none"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tab.bg}
                    alt=""
                    loading={i === 0 ? "eager" : "lazy"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="relative flex aspect-[4/5] items-center justify-center px-4 py-6 sm:aspect-square sm:px-8 md:aspect-[1.92154/1]">
                    <AppShell
                      activeJob={tab.activeJob}
                      title={tab.title}
                      status={tab.status}
                      rightTitle={tab.rightTitle}
                      main={<tab.Main />}
                      right={<tab.Right />}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
