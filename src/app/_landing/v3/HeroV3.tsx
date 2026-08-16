"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useCachedSession } from "@/lib/auth-client";
import { Container, Btn, MonoChip, useHydrated } from "./primitives";

const PROMPT = "A 60-second explainer on cold brew";
const RUNTIME_S = 58;
const SHOTS = [
  {
    src: "/hero/shot-1.mp4",
    poster: "/hero/shot-1.jpg",
    caption: "Heat is what makes coffee taste bitter.",
  },
  {
    src: "/hero/shot-2.mp4",
    poster: "/hero/shot-2.jpg",
    caption: "So skip it. Start with a coarse grind.",
  },
  {
    src: "/hero/shot-3.mp4",
    poster: "/hero/shot-3.jpg",
    caption: "Same beans - no hot water anywhere.",
  },
  {
    src: "/hero/shot-4.mp4",
    poster: "/hero/shot-4.jpg",
    caption: "Steep twelve hours, then filter slow.",
  },
  {
    src: "/hero/shot-5.mp4",
    poster: "/hero/shot-5.jpg",
    caption: "Smoother, stronger, and never bitter.",
  },
];

const STAGES = [
  "Intent",
  "Narrative",
  "Shots",
  "Script",
  "Subtitles",
  "Voice",
  "Re-sync",
  "Motion",
  "Assets",
  "Visuals",
  "Imagery",
  "Render",
];

const PROOF = [
  { value: "12", label: "stages, one pass" },
  { value: "1080p", label: "mp4, no watermark" },
  { value: "97.9%", label: "render success" },
];

const WAVE = Array.from({ length: 52 }, (_, i) => {
  const phrase = 0.42 + 0.58 * Math.abs(Math.sin(i * 0.26 + 0.7));
  const syllable =
    0.34 + 0.66 * Math.abs(Math.sin(i * 1.9) * Math.cos(i * 0.83));
  return Math.max(0.16, phrase * syllable);
});

const TICK_MS = 100;
const SHOT_MS = 3400;
const TYPE_START = 12;
const STAGE_START = 52;
const STAGE_TICKS = 4;
const STAGE_END = STAGE_START + STAGES.length * STAGE_TICKS;
const CLOCK_END = STAGE_END + 10;

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

const timecode = (seconds: number) =>
  `0:${String(Math.round(seconds)).padStart(2, "0")}`;

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(MOTION_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
}

function Bars({ lit }: { lit?: boolean }) {
  return (
    <div aria-hidden className="flex h-full w-full items-center gap-[2px]">
      {WAVE.map((height, i) => (
        <span
          key={i}
          className={`flex-1 rounded-full ${
            lit ? "bg-[#b0d67e]" : "bg-[#f4f3f3]/25"
          }`}
          style={{ height: `${Math.round(height * 100)}%` }}
        />
      ))}
    </div>
  );
}

function RenderConsole() {
  const [tick, setTick] = useState(0);
  const [shot, setShot] = useState(0);
  const reduced = useReducedMotion();
  const videos = useRef<(HTMLVideoElement | null)[]>([]);

  const t = reduced ? CLOCK_END : tick;

  useEffect(() => {
    if (reduced) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setTick(n);
      if (n >= CLOCK_END) clearInterval(id);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(
      () => setShot((s) => (s + 1) % SHOTS.length),
      SHOT_MS,
    );
    return () => clearTimeout(id);
  }, [shot, reduced]);

  useEffect(() => {
    videos.current.forEach((video, i) => {
      if (!video) return;
      if (i === shot && !reduced) {
        video.currentTime = 0;
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [shot, reduced]);

  const typed = PROMPT.slice(0, Math.max(0, t - TYPE_START));
  const typing = typed.length < PROMPT.length;
  const started = t >= STAGE_START;
  const done = t >= STAGE_END;
  const stage = Math.min(
    STAGES.length - 1,
    Math.max(0, Math.floor((t - STAGE_START) / STAGE_TICKS)),
  );
  const pct = Math.round(
    Math.min(1, Math.max(0, (t - STAGE_START) / (STAGE_END - STAGE_START))) *
      100,
  );

  const words = SHOTS[shot].caption.split(" ");
  const wordStep = Math.round((SHOT_MS * 0.62) / words.length);

  return (
    <div className="v3-console-in relative" style={delay(240)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-16 -inset-y-20 -z-10"
        style={{
          background:
            "radial-gradient(52% 50% at 52% 46%, rgba(217,155,18,0.16), transparent 72%)",
        }}
      />

      <div className="rounded-[26px] border border-[#f4f3f3]/12 bg-[#1f1e1d]/80 p-2.5 shadow-[0_44px_120px_-36px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-transform duration-500 ease-out hover:-translate-y-1">
        <div className="flex items-center justify-between gap-3 px-2.5 pb-2.5 pt-1.5">
          <div aria-hidden className="flex items-center gap-[5px]">
            <span className="h-[7px] w-[7px] rounded-full bg-[#f4f3f3]/18" />
            <span className="h-[7px] w-[7px] rounded-full bg-[#f4f3f3]/18" />
            <span className="h-[7px] w-[7px] rounded-full bg-[#f4f3f3]/18" />
          </div>
          <span className="font-plex text-[10.5px] uppercase tracking-[0.1em] text-[#f4f3f3]/35">
            cutline · render
          </span>
          <span className="font-plex text-[10.5px] tracking-[0.05em] text-[#f4f3f3]/35">
            1080p
          </span>
        </div>

        <div className="flex items-center gap-2.5 rounded-[14px] border border-[#f4f3f3]/10 bg-[#f4f3f3]/[0.045] px-4 py-3">
          <span aria-hidden className="font-plex text-[12px] text-[#b0d67e]">
            ▸
          </span>
          <span className="sr-only">Prompt: {PROMPT}</span>
          <p
            aria-hidden
            className="flex min-w-0 items-center truncate font-plex text-[12.5px] leading-none text-[#f4f3f3]/85 sm:text-[13px]"
          >
            {typed}
            {typing ? (
              <span className="v3-caret ml-[3px] h-[13px] w-[2px] shrink-0 rounded-full bg-[#b0d67e]" />
            ) : null}
          </p>
        </div>

        <div className="v3-grain relative mt-2.5 aspect-[16/9] overflow-hidden rounded-[16px] bg-black">
          {SHOTS.map((s, i) => (
            <video
              key={s.src}
              ref={(el) => {
                videos.current[i] = el;
              }}
              src={s.src}
              poster={s.poster}
              muted
              loop
              playsInline
              preload={i === 0 ? "auto" : "none"}
              aria-hidden
              tabIndex={-1}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms] ease-out ${
                i === shot ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.78) 2%, rgba(0,0,0,0.14) 40%, transparent 64%)",
              boxShadow: "inset 0 0 100px 24px rgba(0,0,0,0.5)",
            }}
          />

          <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 font-plex text-[10px] uppercase tracking-[0.09em] text-[#f4f3f3]/80 backdrop-blur-sm">
            <span className="v3-pip h-1.5 w-1.5 rounded-full bg-[#b0d67e]" />
            Shot {shot + 1} / {SHOTS.length}
          </span>

          <p
            key={shot}
            className="absolute inset-x-5 bottom-5 text-center font-sans text-[13.5px] font-medium leading-[1.35] text-[#f4f3f3] sm:text-[15px]"
            style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}
          >
            {words.map((word, i) => (
              <span
                key={`${shot}-${i}`}
                className="v3-word"
                style={delay(200 + i * wordStep)}
              >
                {word}
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        </div>

        <div className="mt-2.5 flex items-center gap-3 rounded-[12px] border border-[#f4f3f3]/[0.07] bg-[#f4f3f3]/[0.03] px-3 py-2">
          <span className="shrink-0 font-plex text-[9.5px] uppercase tracking-[0.12em] text-[#f4f3f3]/30">
            vo
          </span>
          <div className="relative h-[24px] min-w-0 flex-1">
            <Bars />
            <div
              key={`wave-${shot}`}
              className="v3-wave-fill absolute inset-0"
              style={{ animationDuration: `${SHOT_MS}ms` }}
            >
              <Bars lit />
            </div>
          </div>
          <span className="shrink-0 font-plex text-[10px] tabular-nums text-[#f4f3f3]/40">
            {timecode((shot / SHOTS.length) * RUNTIME_S)} /{" "}
            {timecode(RUNTIME_S)}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {SHOTS.map((s, i) => (
            <button
              key={s.poster}
              type="button"
              onClick={() => setShot(i)}
              aria-label={`Shot ${i + 1}: ${s.caption}`}
              aria-pressed={i === shot}
              className={`relative aspect-[16/9] overflow-hidden rounded-[8px] transition-all duration-500 ${
                i === shot
                  ? "opacity-100 ring-1 ring-[#b0d67e]/70"
                  : "opacity-35 hover:opacity-70"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.poster}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </button>
          ))}
        </div>

        <div className="px-1.5 pb-1 pt-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate font-plex text-[10.5px] uppercase tracking-[0.08em] text-[#f4f3f3]/55">
              {done ? (
                <>
                  <span className="text-[#b0d67e]">Render complete</span> ·
                  cold-brew.mp4
                </>
              ) : started ? (
                <>
                  Stage {String(stage + 1).padStart(2, "0")} / {STAGES.length} ·{" "}
                  {STAGES[stage]}
                </>
              ) : (
                <span className="text-[#f4f3f3]/35">Queued</span>
              )}
            </span>
            <span className="shrink-0 font-plex text-[10.5px] tabular-nums text-[#f4f3f3]/40">
              {pct}%
            </span>
          </div>

          <div className="mt-2.5 flex gap-[3px]">
            {STAGES.map((name, i) => (
              <span
                key={name}
                className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${
                  started && i <= stage ? "bg-[#b0d67e]/80" : "bg-[#f4f3f3]/10"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ children, at }: { children: string; at: number }) {
  return (
    <span className="block overflow-hidden pb-[0.1em] [margin-bottom:-0.1em]">
      <span className="v3-line-rise block" style={delay(at)}>
        {children}
      </span>
    </span>
  );
}

export function HeroV3() {
  const { data: sessionData, isPending: sessionPending } = useCachedSession();
  const hydrated = useHydrated();
  const isLoggedIn = hydrated && !sessionPending && !!sessionData;
  const startHref = isLoggedIn ? "/create" : "/auth/sign-in";

  return (
    <section className="relative isolate overflow-hidden pb-16 pt-[132px] sm:pb-20 sm:pt-[164px] lg:pb-24 lg:pt-[176px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(120% 88% at 80% 4%, rgba(217,155,18,0.11), transparent 56%), radial-gradient(96% 82% at 4% 98%, rgba(139,122,232,0.09), transparent 60%), #161514",
        }}
      />

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <Container className="h-full">
          <div className="grid h-full grid-cols-4 border-r border-[#f4f3f3]/[0.055]">
            {STAGES.slice(0, 4).map((k) => (
              <div key={k} className="border-l border-[#f4f3f3]/[0.055]" />
            ))}
          </div>
        </Container>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32"
        style={{
          background: "linear-gradient(to bottom, transparent, #1d1c1b)",
        }}
      />

      <Container>
        <div className="grid gap-y-9 pl-6 sm:gap-y-11 sm:pl-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[auto_auto] lg:gap-x-14 xl:gap-x-20">
          <div className="max-w-[620px] lg:col-start-1 lg:row-start-1">
            <div className="v3-rise" style={delay(40)}>
              <MonoChip tone="dark" className="border-[#f4f3f3]/25">
                One sentence → one mp4
              </MonoChip>
            </div>

            <h1 className="mt-6 font-sans text-[52px] font-normal leading-[0.98] tracking-[-0.035em] text-[#f4f3f3] sm:mt-7 sm:text-[68px] lg:text-[72px] xl:text-[82px]">
              <Line at={120}>Say it once.</Line>
              <Line at={215}>Ship the film.</Line>
            </h1>

            <p
              className="v3-rise mt-6 max-w-[470px] font-sans text-[17px] font-medium leading-[1.5] text-[#f4f3f3]/65 sm:mt-7 sm:text-[18px]"
              style={delay(360)}
            >
              Every video you meant to make is still a sentence in your notes
              app. Cutline takes the sentence and hands back the finished cut -
              script, voice, footage, captions.
            </p>

            <div
              className="v3-rise mt-8 flex flex-wrap items-center gap-3 sm:mt-9"
              style={delay(450)}
            >
              <Btn href={startHref} variant="darkSolid">
                Start creating free
              </Btn>
              <Btn href="/how" variant="dark">
                See how it works
              </Btn>
            </div>

            <p
              className="v3-rise mt-5 font-sans text-[13.5px] font-medium text-[#f4f3f3]/40"
              style={delay(520)}
            >
              The free plan includes one render a month.
            </p>
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <RenderConsole />
          </div>

          <dl
            className="v3-rise grid max-w-[620px] grid-cols-3 gap-x-6 border-t border-[#f4f3f3]/12 pt-8 lg:col-start-1 lg:row-start-2"
            style={delay(600)}
          >
            {PROOF.map((item) => (
              <div key={item.label}>
                <dt className="font-sans text-[25px] font-normal tracking-[-0.03em] text-[#f4f3f3] sm:text-[27px]">
                  {item.value}
                </dt>
                <dd className="mt-1 font-plex text-[10.5px] uppercase leading-[1.35] tracking-[0.08em] text-[#f4f3f3]/45">
                  {item.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
