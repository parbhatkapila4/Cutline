"use client";

import { useEffect, useState } from "react";
import { StorySlab } from "./storySlab";
import { RenderSlab } from "./renderSlab";

const PANEL =
  "rounded-[18px] border border-[#f4f3f3]/10 bg-[#1b1a19] overflow-hidden";
const LABEL =
  "font-plex text-[10px] uppercase tracking-[0.13em] text-[#f4f3f3]/35";

type Tok = { t: string; c?: string };
const S = "text-[#b0d67e]";
const K = "text-[#ef9c74]";
const N = "text-[#d99b12]";
const P = "text-[#f4f3f3]/40";
const W = "text-[#f4f3f3]/90";
const C = "text-[#f4f3f3]/28";

const CURL: Tok[][] = [
  [{ t: "curl", c: W }, { t: " -X POST", c: P }, { t: " https://cutline.cloud/api/v1/generate", c: S }, { t: " \\", c: P }],
  [{ t: "  -H ", c: P }, { t: '"X-API-Key: ck_live_••••••••"', c: S }, { t: " \\", c: P }],
  [{ t: "  -H ", c: P }, { t: '"Content-Type: application/json"', c: S }, { t: " \\", c: P }],
  [{ t: "  -d ", c: P }, { t: "'{", c: W }],
  [{ t: "    ", c: P }, { t: '"input"', c: K }, { t: ": ", c: P }, { t: '"A 60-second explainer on cold brew"', c: S }, { t: ",", c: P }],
  [{ t: "    ", c: P }, { t: '"durationSeconds"', c: K }, { t: ": ", c: P }, { t: "60", c: N }, { t: ",", c: P }],
  [{ t: "    ", c: P }, { t: '"captions"', c: K }, { t: ": ", c: P }, { t: '"on"', c: S }, { t: ",", c: P }],
  [{ t: "    ", c: P }, { t: '"platform"', c: K }, { t: ": ", c: P }, { t: '"youtube_shorts"', c: S }],
  [{ t: "  }'", c: W }],
];

const NODE: Tok[][] = [
  [{ t: "const", c: K }, { t: " res = ", c: W }, { t: "await", c: K }, { t: " fetch(", c: W }, { t: '"https://cutline.cloud/api/v1/generate"', c: S }, { t: ", {", c: W }],
  [{ t: "  method: ", c: W }, { t: '"POST"', c: S }, { t: ",", c: P }],
  [{ t: "  headers: {", c: W }],
  [{ t: "    ", c: P }, { t: '"X-API-Key"', c: K }, { t: ": process.env.CUTLINE_API_KEY,", c: W }],
  [{ t: "    ", c: P }, { t: '"X-Idempotency-Key"', c: K }, { t: ": crypto.randomUUID(),", c: W }],
  [{ t: "  },", c: W }],
  [{ t: "  body: JSON.stringify({ input, durationSeconds: ", c: W }, { t: "60", c: N }, { t: " }),", c: W }],
  [{ t: "});", c: W }],
  [{ t: "const", c: K }, { t: " { jobId } = ", c: W }, { t: "await", c: K }, { t: " res.json();", c: W }],
];

const PY: Tok[][] = [
  [{ t: "import", c: K }, { t: " os, requests, uuid", c: W }],
  [{ t: "", c: W }],
  [{ t: "res = requests.post(", c: W }],
  [{ t: "    ", c: P }, { t: '"https://cutline.cloud/api/v1/generate"', c: S }, { t: ",", c: P }],
  [{ t: "    headers={", c: W }, { t: '"X-API-Key"', c: K }, { t: ": os.environ[", c: W }, { t: '"CUTLINE_API_KEY"', c: S }, { t: "]},", c: W }],
  [{ t: "    json={", c: W }],
  [{ t: "        ", c: P }, { t: '"input"', c: K }, { t: ": ", c: P }, { t: '"A 60-second explainer on cold brew"', c: S }, { t: ",", c: P }],
  [{ t: "        ", c: P }, { t: '"durationSeconds"', c: K }, { t: ": ", c: P }, { t: "60", c: N }, { t: ",", c: P }],
  [{ t: "    },", c: W }],
  [{ t: ")", c: W }],
  [{ t: "job_id = res.json()[", c: W }, { t: '"jobId"', c: S }, { t: "]", c: W }],
];

const TABS = [
  { id: "curl", label: "cURL", lines: CURL, plain: "curl -X POST https://cutline.cloud/api/v1/generate" },
  { id: "node", label: "Node.js", lines: NODE, plain: "await fetch('https://cutline.cloud/api/v1/generate')" },
  { id: "python", label: "Python", lines: PY, plain: "requests.post('https://cutline.cloud/api/v1/generate')" },
] as const;

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setDone(true)).catch(() => { });
      }}
      aria-label="Copy request"
      className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#f4f3f3]/12 text-[#f4f3f3]/45 transition-colors hover:border-[#f4f3f3]/25 hover:text-[#f4f3f3]/80"
    >
      {done ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="#b0d67e" strokeWidth={2.2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
          <rect x="9" y="9" width="11" height="11" rx="2.5" />
          <path d="M5 15V6a2 2 0 0 1 2-2h8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export function DirectorPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("curl");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className={`${PANEL} flex flex-col bg-[#131211]`}>
        <div className="flex shrink-0 items-center gap-2 border-b border-[#f4f3f3]/8 px-3 py-2.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-[7px] px-2.5 py-1 font-sans text-[12px] font-medium transition-colors ${t.id === tab
                  ? "bg-[#f4f3f3]/10 text-[#f4f3f3]"
                  : "text-[#f4f3f3]/40 hover:text-[#f4f3f3]/70"
                }`}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-2.5">
            <span className={LABEL}>POST /v1/generate</span>
            <CopyButton text={active.plain} />
          </span>
        </div>

        <div className="overflow-hidden px-1 py-3">
          {active.lines.map((line, i) => (
            <div key={i} className="flex gap-3 px-3 leading-[1.75]">
              <span className="w-4 shrink-0 select-none text-right font-plex text-[11px] text-[#f4f3f3]/18">
                {i + 1}
              </span>
              <code className="whitespace-pre font-plex text-[12px]">
                {line.map((tok, j) => (
                  <span key={j} className={tok.c ?? W}>
                    {tok.t}
                  </span>
                ))}
              </code>
            </div>
          ))}
        </div>
      </div>

      <div className={`${PANEL} shrink-0 bg-[#131211]`}>
        <div className="flex items-center gap-2.5 border-b border-[#f4f3f3]/8 px-3.5 py-2">
          <span className="rounded-[5px] border border-[#5da53c]/40 bg-[#5da53c]/12 px-1.5 py-[1px] font-plex text-[10px] text-[#b0d67e]">
            200
          </span>
          <span className={LABEL}>job opened · 12 stages queued</span>
        </div>
        <div className="flex gap-3 px-3 py-2.5">
          <span className="w-4 shrink-0 select-none text-right font-plex text-[11px] text-[#f4f3f3]/18">
            1
          </span>
          <code className="whitespace-pre font-plex text-[12px]">
            <span className={W}>{"{ "}</span>
            <span className={K}>&quot;jobId&quot;</span>
            <span className={P}>: </span>
            <span className={S}>&quot;job_01HK8Z9X2YBN5T7QM3R4S5T6&quot;</span>
            <span className={W}>{" }"}</span>
          </code>
        </div>
      </div>
      <div className={`${PANEL} shrink-0 bg-[#131211]`}>
        <div className="flex items-center gap-2.5 border-b border-[#f4f3f3]/8 px-3.5 py-2">
          <span className="rounded-[5px] border border-[#f4f3f3]/15 px-1.5 py-[1px] font-plex text-[10px] text-[#f4f3f3]/55">
            GET
          </span>
          <span className={LABEL}>/v1/generate/:jobId</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#b0d67e]" />
            <span className={LABEL}>processing</span>
          </span>
        </div>
        <div className="flex gap-3 px-3 py-2.5">
          <span className="w-4 shrink-0 select-none text-right font-plex text-[11px] text-[#f4f3f3]/18">
            1
          </span>
          <code className="min-w-0 truncate font-plex text-[12px]">
            <span className={W}>{"{ "}</span>
            <span className={K}>&quot;status&quot;</span>
            <span className={P}>: </span>
            <span className={S}>&quot;processing&quot;</span>
            <span className={P}>, </span>
            <span className={K}>&quot;stage&quot;</span>
            <span className={P}>: </span>
            <span className={S}>&quot;tts&quot;</span>
            <span className={W}>{" }"}</span>
          </code>
        </div>
      </div>
    </div>
  );
}


function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[7px] border border-[#f4f3f3]/22 px-2.5 py-[5px] font-plex text-[10.5px] uppercase tracking-[0.11em] text-[#f4f3f3]/70">
      {children}
    </span>
  );
}

function Stem({ className = "h-7" }: { className?: string }) {
  return <span aria-hidden className={`w-px bg-[#f4f3f3]/18 ${className}`} />;
}
function Glow({ tone = "#b0d67e" }: { tone?: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        background: `radial-gradient(58% 54% at 50% 46%, ${tone}1f, transparent 70%)`,
      }}
    />
  );
}

export function StoryboardPanel() {
  return (
    <div className="relative my-auto w-full">
      <StorySlab className="h-auto w-full" />
    </div>
  );
}

const CUES = [
  { text: "Heat is what makes coffee bitter.", words: 6 },
  { text: "So skip it.", words: 3 },
  { text: "Start with a coarse grind.", words: 5 },
];

const BARS = Array.from({ length: 68 }, (_, i) => {
  const phrase = 0.42 + 0.58 * Math.abs(Math.sin(i * 0.26 + 0.7));
  const syll = 0.34 + 0.66 * Math.abs(Math.sin(i * 1.9) * Math.cos(i * 0.83));
  return Math.max(0.18, phrase * syll);
});

const PLAYHEAD = 62;

export function VoicePanel() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4 py-2">
      <Glow />

      <Chip>Voiceover · ElevenLabs</Chip>
      <Stem className="h-5" />
      <div className="flex w-full max-w-[480px] items-center gap-3">
        <div className="relative flex h-[58px] min-w-0 flex-1 items-center gap-[2px]">
          {BARS.map((h, i) => (
            <span
              key={i}
              className={`flex-1 rounded-full ${(i / BARS.length) * 100 < PLAYHEAD
                  ? "bg-[#b0d67e]"
                  : "bg-[#f4f3f3]/16"
                }`}
              style={{ height: `${Math.round(h * 100)}%` }}
            />
          ))}
          <span
            aria-hidden
            className="absolute inset-y-[-6px] w-px bg-[#f4f3f3]/60"
            style={{ left: `${PLAYHEAD}%` }}
          />
        </div>
        <span className="shrink-0 font-plex text-[11px] tabular-nums text-[#f4f3f3]/45">
          0:27 / 0:44
        </span>
      </div>

      <Stem className="h-5" />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CUES.map((c) => (
          <span
            key={c.text}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[#f4f3f3]/12 bg-[#f4f3f3]/[0.04] px-2.5 py-[7px]"
          >
            <span className="h-3 w-[2px] shrink-0 rounded-full bg-[#5da53c]" />
            <span className="font-sans text-[12px] font-medium text-[#f4f3f3]/80">
              {c.text}
            </span>
            <span className="font-plex text-[10px] text-[#f4f3f3]/30">
              {c.words}w
            </span>
          </span>
        ))}
      </div>

      <Stem className="h-5" />
      <div className={`${PANEL} relative h-[140px] w-full max-w-[280px] bg-black`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/shot-2.jpg"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-85"
        />
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.84) 6%, rgba(0,0,0,0.1) 52%, transparent 74%)",
          }}
        />
        <p className="absolute inset-x-3 bottom-3 text-center font-sans text-[13px] font-semibold leading-[1.3] text-[#f4f3f3]">
          Start with a coarse grind.
        </p>
      </div>

      <p className="max-w-[440px] text-center font-sans text-[12.5px] font-medium leading-[1.5] text-[#f4f3f3]/45">
        Six words or fewer per cue, burned into the frame — no caption file to
        lose.
      </p>
    </div>
  );
}

export function RenderPanel() {
  return (
    <div className="relative my-auto w-full">
      <RenderSlab className="h-auto w-full" />
    </div>
  );
}
