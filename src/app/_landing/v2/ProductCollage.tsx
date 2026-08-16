"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Container } from "./primitives";

const cssVar = (vars: Record<string, string>) => vars as CSSProperties;

function Window({
  label,
  title,
  actions,
  children,
  className = "",
  style,
}: {
  label: string;
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      <span className="inline-block rounded-t-md border border-b-0 border-[#111]/15 bg-[#f7f5f1] px-3 py-1.5 font-mono text-[11px] text-[#111]/70">
        {label}
      </span>
      <div className="overflow-hidden rounded-lg rounded-tl-none bg-white ring-1 ring-[#111]/12 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#111]/8 px-3.5 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-4 w-4 shrink-0 rounded-[4px] bg-[#111]"
              aria-hidden
            />
            <span className="truncate font-mono text-[11px] text-[#111]/80">
              {title}
            </span>
          </span>
          {actions ? (
            <span className="flex shrink-0 items-center gap-1.5">
              {actions}
            </span>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function ChipButton({
  children,
  solid = false,
}: {
  children: ReactNode;
  solid?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-2 py-1 font-sans text-[10.5px] font-medium ${
        solid
          ? "bg-[#111] text-[#f7f5f1]"
          : "border border-[#111]/15 text-[#111]/75"
      }`}
    >
      {children}
    </span>
  );
}

const ALL_SHOTS = [
  ["S01", "Hook - metric on screen", "0:04"],
  ["S02", "Feature run-through", "0:14"],
  ["S03", "Customer quote card", "0:08"],
  ["S04", "B-roll montage", "0:11"],
  ["S05", "Pricing beat", "0:06"],
  ["S06", "CTA - end card", "0:02"],
] as const;

const ACTIVE_STATES = ["voice", "visuals", "score", "render"] as const;

const PACING_LINES = [
  { color: "#ff5600", points: "0,64 40,58 80,44 120,50 160,30 200,34 240,18" },
  { color: "#7a9c7a", points: "0,74 40,70 80,64 120,58 160,54 200,44 240,40" },
  { color: "#8b7ab8", points: "0,80 40,78 80,74 120,72 160,66 200,64 240,58" },
] as const;

const PACING_ALT = [
  { color: "#ff5600", points: "0,70 40,52 80,56 120,38 160,42 200,24 240,28" },
  { color: "#7a9c7a", points: "0,78 40,72 80,60 120,62 160,50 200,48 240,36" },
  { color: "#8b7ab8", points: "0,82 40,80 80,76 120,70 160,68 200,60 240,54" },
] as const;

const VOICE_TICKS = [
  'voice: "Nova" · pace 1.05 · music: ambient',
  'voice: "Nova" · pace 1.10 · music: soft synth',
  'voice: "Atlas" · pace 0.98 · music: ambient',
] as const;

function ScriptNotebook({ live }: { live: boolean }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!live) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setTick((value) => value + 1), 6200);
    return () => clearInterval(timer);
  }, [live]);

  const start = tick % (ALL_SHOTS.length - 2);
  const rows = ALL_SHOTS.slice(start, start + 3);
  const activeState = ACTIVE_STATES[tick % ACTIVE_STATES.length];
  const pacing = tick % 2 === 0 ? PACING_LINES : PACING_ALT;
  const voiceLine = VOICE_TICKS[tick % VOICE_TICKS.length];

  return (
    <div className="p-4">
      <p className="font-sans text-[17px] font-bold tracking-[-0.01em] text-[#111]">
        Q3 Update - Script
      </p>
      <p className="mt-0.5 font-sans text-[10.5px] text-[#111]/40">
        Add a description…
      </p>

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#111]/40">
        Prompt cell
      </p>
      <div className="mt-1 rounded-md border border-[#111]/10 bg-[#faf9f6] p-2.5 font-mono text-[10.5px] leading-[1.6]">
        <span className="text-[#ff5600]">generate</span>{" "}
        <span className="text-[#111]/80">
          &quot;45s product update for Q3&quot;
        </span>
        <br />
        <span className="text-[#111]/45">tone</span>
        <span className="text-[#111]/80">=confident </span>
        <span className="text-[#111]/45">format</span>
        <span className="text-[#111]/80">=16:9</span>
        <span className="v2-caret ml-1" aria-hidden />
      </div>

      <div className="mt-3 overflow-hidden rounded-md border border-[#111]/10">
        <div className="grid grid-cols-[44px_1fr_40px_44px] gap-2 border-b border-[#111]/8 bg-[#faf9f6] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#111]/40">
          <span>shot</span>
          <span>scene</span>
          <span>dur</span>
          <span>state</span>
        </div>
        {rows.map(([id, scene, dur], i) => {
          const isLast = i === rows.length - 1;
          const state = isLast ? activeState : "done";
          return (
            <div
              key={`${id}-${start}`}
              className="v2-tick-in grid grid-cols-[44px_1fr_40px_44px] gap-2 border-b border-[#111]/6 px-2.5 py-1.5 font-mono text-[9.5px] last:border-0"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className="text-[#111]/60">{id}</span>
              <span className="truncate text-[#111]/85">{scene}</span>
              <span className="text-[#111]/60">{dur}</span>
              <span className={isLast ? "text-[#ff5600]" : "text-[#111]/60"}>
                {state}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#111]/40">
        Pacing by scene (S01-S12)
      </p>
      <svg viewBox="0 0 240 90" className="mt-1 h-[84px] w-full" aria-hidden>
        {[18, 40, 62, 84].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="240"
            y2={y}
            stroke="#111"
            strokeOpacity="0.06"
          />
        ))}
        {pacing.map((line, i) => (
          <polyline
            key={`${line.color}-${tick}`}
            points={line.points}
            pathLength={1}
            className={live ? "v2-redraw" : ""}
            style={cssVar({ "--draw-delay": `${i * 200}ms` })}
            fill="none"
            stroke={line.color}
            strokeWidth="1.5"
          />
        ))}
      </svg>

      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#111]/40">
        Voice cell
      </p>
      <p className="mt-1 rounded-md border border-[#111]/10 bg-[#faf9f6] p-2.5 font-mono text-[10.5px] text-[#111]/70">
        <span key={voiceLine} className="v2-tick-in inline-block">
          {voiceLine}
        </span>
      </p>
    </div>
  );
}

const BOARD_THUMBS = [
  { src: "/hero/1.jpg", t: "0:00" },
  { src: "/hero/3.jpg", t: "0:04" },
  { src: "/hero/12.jpg", t: "0:14" },
  { src: "/hero/5.jpg", t: "0:22" },
  { src: "/hero/11.jpg", t: "0:31" },
  { src: "/hero/14.jpg", t: "0:39" },
] as const;

const COMPOSER_PROMPTS = [
  "Make the hook two seconds faster",
  "Swap scene 3 for city b-roll",
  "Cut a 9:16 version for Reels",
] as const;

function ConversationWindow({ typed, live }: { typed: string; live: boolean }) {
  const item = (delay: number) =>
    ({
      className: "v2-item",
      style: cssVar({ "--item-delay": `${delay}ms` }),
    }) as const;

  return (
    <div className="flex flex-col">
      <div className="max-h-[420px] p-3.5">
        <div
          {...item(100)}
          className="v2-item rounded-md bg-[#f1eeea] px-3 py-2 font-sans text-[11px] leading-[1.45] text-[#111]/55"
        >
          Can you make the hook land faster too? Lead with the shipped-features
          metric.
        </div>

        <p
          {...item(300)}
          className="v2-item mt-3 font-sans text-[12px] leading-[1.5] text-[#111]/85"
        >
          I&rsquo;ll re-cut the opening. Let me check your brand kit and pacing
          rules for the fastest hook.
        </p>

        <div
          {...item(500)}
          className="v2-item mt-2.5 flex items-center gap-1.5 border-y border-[#111]/8 py-2 font-mono text-[10.5px] text-[#111]/50"
        >
          <span aria-hidden>▸</span> Thought for 11 seconds
        </div>

        <p
          {...item(700)}
          className="v2-item mt-2.5 font-sans text-[12px] leading-[1.5] text-[#111]/85"
        >
          I found the endorsed brand kit{" "}
          <strong className="font-semibold text-[#111]">
            &quot;Cutline - Q3.&quot;
          </strong>{" "}
          It locks the palette, the &quot;Nova&quot; voice, and a metric-first
          hook pattern - the strongest base for this cut:
        </p>

        <div
          {...item(900)}
          className="v2-item mt-3 rounded-lg border border-[#111]/10 p-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[11px] font-medium text-[#111]/80">
              Storyboard - Q3 update (45s)
            </span>
            <span className="font-mono text-[10px] text-[#111]/45">
              ⊙ Preview
            </span>
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {BOARD_THUMBS.map((thumb, i) => (
              <div
                key={thumb.t}
                className="v2-shot relative overflow-hidden rounded"
                style={cssVar({ "--shot-delay": `${i * 1.2}s` })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb.src}
                  alt=""
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover"
                />
                <span className="absolute bottom-0.5 left-0.5 rounded-sm bg-black/55 px-1 font-mono text-[8px] text-white">
                  {thumb.t}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 font-sans text-[11px] leading-[1.45] text-[#111]/70">
            Quick insight:{" "}
            <strong className="font-semibold text-[#111]">
              the metric-first hook tests strongest
            </strong>{" "}
            with your returning viewers, while story-first cuts hold new ones.
          </p>
        </div>
      </div>
      <div className="border-t border-[#111]/8 p-3">
        <div className="rounded-md border-[1.5px] border-[#111]/30 px-3 py-2.5">
          <p className="font-sans text-[11.5px]">
            {typed ? (
              <span className="text-[#111]/85">
                {typed}
                <span className="v2-caret ml-px" aria-hidden />
              </span>
            ) : (
              <span className="text-[#111]/40">
                Ask for another cut…
                {live ? <span className="v2-caret ml-px" aria-hidden /> : null}
              </span>
            )}
          </p>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="flex h-5 w-5 items-center justify-center rounded border border-[#111]/15 font-mono text-[11px] text-[#111]/50">
              +
            </span>
            <span className="flex items-center gap-2 font-mono text-[10px] text-[#111]/55">
              Brand kit: Cutline Q3 ▾
              <span
                className="v2-breathe flex h-5 w-5 items-center justify-center rounded-full bg-[#111] text-[#f7f5f1]"
                aria-hidden
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="h-2.5 w-2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19V5m0 0l-6 6m6-6l6 6"
                  />
                </svg>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const SCATTER: Array<[number, number, string]> = [
  [28, 52, "#443983"],
  [34, 44, "#443983"],
  [40, 58, "#31688e"],
  [45, 38, "#443983"],
  [50, 50, "#31688e"],
  [55, 62, "#31688e"],
  [58, 30, "#21918c"],
  [63, 44, "#31688e"],
  [66, 56, "#21918c"],
  [70, 24, "#21918c"],
  [74, 40, "#35b779"],
  [78, 52, "#21918c"],
  [82, 32, "#35b779"],
  [86, 46, "#35b779"],
  [90, 20, "#90d743"],
  [94, 38, "#35b779"],
  [98, 54, "#31688e"],
  [102, 28, "#90d743"],
  [106, 44, "#35b779"],
  [110, 16, "#fde725"],
  [114, 34, "#90d743"],
  [118, 48, "#21918c"],
  [122, 24, "#90d743"],
  [126, 40, "#35b779"],
  [130, 12, "#fde725"],
  [134, 30, "#90d743"],
  [138, 46, "#21918c"],
  [142, 20, "#fde725"],
  [146, 36, "#90d743"],
  [150, 52, "#31688e"],
  [154, 26, "#90d743"],
  [158, 14, "#fde725"],
  [162, 42, "#35b779"],
  [166, 30, "#90d743"],
  [170, 50, "#21918c"],
  [174, 18, "#fde725"],
  [46, 68, "#443983"],
  [72, 66, "#31688e"],
  [100, 64, "#21918c"],
  [128, 60, "#35b779"],
  [152, 62, "#31688e"],
  [60, 72, "#443983"],
  [88, 70, "#31688e"],
  [120, 68, "#21918c"],
];

const DX = [5, -4, 3, -6, 2, -3, 6, -2] as const;
const DY = [-7, 5, -4, 8, -6, 3, -8] as const;
const clampY = (y: number) => Math.min(74, Math.max(10, y));
const SCATTER_ALT: Array<[number, number, string]> = SCATTER.map(
  ([x, y, color], i) => [
    x + DX[i % DX.length],
    clampY(y + DY[i % DY.length]),
    color,
  ],
);

const WATCH_TICKS = [
  { watch: "68%", watchDelta: "3.0", reelsDelta: "4.1" },
  { watch: "71%", watchDelta: "4.2", reelsDelta: "3.6" },
  { watch: "66%", watchDelta: "1.8", reelsDelta: "4.8" },
  { watch: "73%", watchDelta: "5.1", reelsDelta: "3.2" },
] as const;

function RenderDashboard({ live }: { live: boolean }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!live) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setTick((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, [live]);

  const layout = tick % 2 === 0 ? SCATTER : SCATTER_ALT;
  const values = WATCH_TICKS[tick % WATCH_TICKS.length];

  return (
    <div className="p-4">
      <p className="font-sans text-[17px] font-bold tracking-[-0.01em] text-[#111]">
        Render Overview
      </p>
      <p className="mt-0.5 font-sans text-[10.5px] text-[#111]/45">
        Performance across formats, hooks, and cuts
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-[#111]/10 p-2.5">
          <p className="font-sans text-[14px] font-bold text-[#111]">
            9:16 Reels
          </p>
          <p className="font-sans text-[9.5px] text-[#111]/50">Top format</p>
          <p className="mt-1 font-mono text-[9px] text-[#111]/60">
            ↑{" "}
            <span key={values.reelsDelta} className="v2-tick-in inline-block">
              {values.reelsDelta}%
            </span>{" "}
            vs last month
          </p>
        </div>
        <div className="rounded-md border border-[#111]/10 p-2.5">
          <p className="font-sans text-[14px] font-bold text-[#111]">
            <span key={values.watch} className="v2-tick-in inline-block">
              {values.watch}
            </span>
          </p>
          <p className="font-sans text-[9.5px] text-[#111]/50">Watch-through</p>
          <p className="mt-1 font-mono text-[9px] text-[#111]/60">
            ↑{" "}
            <span key={values.watchDelta} className="v2-tick-in inline-block">
              {values.watchDelta}%
            </span>{" "}
            vs last month
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <span className="flex-1 rounded-[4px] border border-[#111]/15 px-2 py-1.5 font-mono text-[9.5px] text-[#111]/70">
          Format · All ▾
        </span>
        <span className="flex-1 rounded-[4px] border border-[#111]/15 px-2 py-1.5 font-mono text-[9.5px] text-[#111]/70">
          Range · 30d ▾
        </span>
      </div>

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#111]/40">
        Watch-through vs hook speed, by cut
      </p>
      <div className="relative mt-1">
        <svg viewBox="0 0 200 84" className="h-[150px] w-full" aria-hidden>
          {[14, 38, 62].map((y) => (
            <line
              key={y}
              x1="16"
              y1={y}
              x2="196"
              y2={y}
              stroke="#111"
              strokeOpacity="0.06"
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <text
              key={i}
              x="2"
              y={16 + i * 22}
              fontSize="6"
              fill="#111"
              fillOpacity="0.35"
            >
              {75 - i * 25}
            </text>
          ))}
          {layout.map(([x, y, color], i) => (
            <circle
              key={i}
              cx={x + 14}
              cy={y}
              r="2.1"
              fill={color}
              className="v2-dot"
              style={cssVar({ "--dot-delay": `${400 + i * 28}ms` })}
            />
          ))}
        </svg>
        <span className="absolute bottom-1 right-1 inline-flex items-center gap-1.5 rounded-full border border-[#111]/15 bg-white px-2.5 py-1 font-sans text-[10px] font-medium text-[#111] shadow-sm">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#ff5600] motion-safe:animate-pulse"
            aria-hidden
          />
          Director
        </span>
      </div>
    </div>
  );
}

const NODES = [
  "Script rules",
  "Voice presets",
  "Endorsed b-roll",
  "Brand context",
  "Past renders",
  "Asset metadata",
  "Suggestions",
] as const;
const SELECTED_NODE = "Brand context";

function Constellation({ className = "" }: { className?: string }) {
  const anchors = NODES.map((_, i) => 90 + i * 176);
  const sources = [220, 620, 1020];
  return (
    <svg
      viewBox="0 0 1240 260"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      {anchors.map((x, i) => {
        const s = sources[i % 3];
        return (
          <path
            key={x}
            d={`M ${s} 0 C ${s} 130, ${x} 130, ${x} 244`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="v2-flow"
          />
        );
      })}
      {anchors.map((x) => (
        <circle key={`c-${x}`} cx={x} cy="246" r="2.5" fill="currentColor" />
      ))}
    </svg>
  );
}

function NodesRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start justify-between gap-2 ${className}`}>
      {NODES.map((node) => {
        const selected = node === SELECTED_NODE;
        return (
          <span
            key={node}
            className={`whitespace-nowrap px-3 py-2 text-center font-mono text-[11px] ${
              selected
                ? "border border-[#111]/40 bg-white text-[#111]"
                : "text-[#111]/55"
            }`}
          >
            {node}
          </span>
        );
      })}
    </div>
  );
}

export function ProductCollage() {
  const rootRef = useRef<HTMLElement | null>(null);
  const [live, setLive] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLive(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!live) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let promptIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = COMPOSER_PROMPTS[promptIdx];
      if (!deleting) {
        charIdx++;
        setTyped(current.slice(0, charIdx));
        if (charIdx >= current.length) {
          deleting = true;
          timer = setTimeout(tick, 2000);
          return;
        }
        timer = setTimeout(tick, 55);
      } else {
        charIdx--;
        setTyped(current.slice(0, charIdx));
        if (charIdx <= 0) {
          deleting = false;
          promptIdx = (promptIdx + 1) % COMPOSER_PROMPTS.length;
          timer = setTimeout(tick, 700);
          return;
        }
        timer = setTimeout(tick, 26);
      }
    };
    timer = setTimeout(tick, 1600);
    return () => clearTimeout(timer);
  }, [live]);

  return (
    <section
      ref={rootRef}
      className={`v2-collage overflow-hidden pb-16 pt-10 md:pb-20 ${live ? "is-live" : ""}`}
    >
      <Container>
        <div className="relative hidden h-[820px] lg:block">
          <Constellation className="absolute inset-x-0 bottom-9 h-[260px] w-full text-[#111]/15" />

          <Window
            label="Agentic script notebook"
            title="Q3 Update - Script"
            actions={<ChipButton>Notebook</ChipButton>}
            className="v2-cw absolute left-0 top-14 z-10 w-[420px]"
            style={cssVar({ "--cw-delay": "180ms" })}
          >
            <ScriptNotebook live={live} />
          </Window>

          <Window
            label="Finished video apps"
            title="q3-product-update (share)"
            actions={
              <>
                <ChipButton>Edit</ChipButton>
                <ChipButton>Share</ChipButton>
              </>
            }
            className="v2-cw absolute -right-9 top-20 z-20 w-[400px]"
            style={cssVar({ "--cw-delay": "340ms" })}
          >
            <RenderDashboard live={live} />
          </Window>

          <Window
            label="Conversational creation"
            title="Q3 product update (v3)"
            actions={
              <>
                <ChipButton>Share</ChipButton>
                <ChipButton solid>Continue in editor</ChipButton>
              </>
            }
            className="v2-cw absolute left-1/2 top-0 z-30 w-[560px] -translate-x-1/2"
            style={cssVar({ "--cw-delay": "0ms" })}
          >
            <ConversationWindow typed={typed} live={live} />
          </Window>

          <NodesRow className="absolute inset-x-0 bottom-0" />
        </div>

        <div className="lg:hidden">
          <Window
            label="Conversational creation"
            title="Q3 product update (v3)"
            actions={<ChipButton solid>Continue in editor</ChipButton>}
            className="v2-cw"
            style={cssVar({ "--cw-delay": "0ms" })}
          >
            <ConversationWindow typed={typed} live={live} />
          </Window>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {NODES.map((node) => (
              <span
                key={node}
                className={`px-2.5 py-1.5 font-mono text-[10.5px] ${
                  node === SELECTED_NODE
                    ? "border border-[#111]/40 bg-white text-[#111]"
                    : "text-[#111]/55"
                }`}
              >
                {node}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
