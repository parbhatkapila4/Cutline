"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Btn, Container, RuleHeader } from "./primitives";

const SHOT_MS = 3400;
const PLAYBACK_RATE = 0.7;

const RUNTIME = "0:44";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getMotion = () => window.matchMedia(REDUCED_QUERY).matches;
const getServerMotion = () => true;
type Shot = { label: string; time: string };

type Capability = {
  id: string;
  title: string;
  body: string;
  prompt: string;
  run: string;
  chip: string;
  ruleLabel: string;
  ruleMeta: string;
  unit: string;
  shots: Shot[];
};

const CAPABILITIES: Capability[] = [
  {
    id: "script",
    title: "Write the script",
    body: "Describe the video in a sentence. Cutline writes narration with a hook, a middle and a landing - paced to the length you asked for, not padded to fill it.",
    prompt: "A 45-second launch film for our new analytics dashboard",
    run: "RUN 4821",
    chip: "Script · 112 words",
    ruleLabel: "Shot list",
    ruleMeta: "5 shots · 0:44",
    unit: "Shot",
    shots: [
      { label: "Hook - the 3am spreadsheet", time: "0:00" },
      { label: "What we shipped", time: "0:09" },
      { label: "Every metric, one screen", time: "0:19" },
      { label: "Built by four people", time: "0:29" },
      { label: "Close - free in beta", time: "0:37" },
    ],
  },
  {
    id: "visuals",
    title: "Source the visuals",
    body: "Every shot gets a brief, then footage to match - your uploads first, then stock, then generated frames. No empty slots, no manual hunting.",
    prompt: "Match b-roll to each beat, prefer my brand kit",
    run: "RUN 4822",
    chip: "Visuals · 5 shots matched",
    ruleLabel: "Sources",
    ruleMeta: "2 uploads · 2 stock · 1 gen",
    unit: "Clip",
    shots: [
      { label: "Stock - the before", time: "0:00" },
      { label: "Uploaded - the product", time: "0:09" },
      { label: "Uploaded - the dashboard", time: "0:19" },
      { label: "Stock - the team", time: "0:29" },
      { label: "Generated - the close", time: "0:37" },
    ],
  },
  {
    id: "voice",
    title: "Cast the voice",
    body: "A read that matches the tone of the piece rather than the default announcer - warm for a story, flat and quick for a product note.",
    prompt: "Warm, unhurried, second person",
    run: "RUN 4823",
    chip: "Voice · 44s read",
    ruleLabel: "Takes",
    ruleMeta: "5 takes · 1 picked",
    unit: "Take",
    shots: [
      { label: "Warm - unhurried", time: "0:44" },
      { label: "Brisk - product note", time: "0:39" },
      { label: "Neutral - straight read", time: "0:42" },
      { label: "Warm, slower - retimed", time: "0:46" },
      { label: "Warm, second pass - picked", time: "0:44" },
    ],
  },
  {
    id: "captions",
    title: "Cut the captions",
    body: "Word-level timing burned into the frame, styled to the video rather than dropped on top of it. Sized correctly for sound-off feeds.",
    prompt: "Burn word-level captions, brand yellow",
    run: "RUN 4824",
    chip: "Captions · 112 cues",
    ruleLabel: "Cue sheet",
    ruleMeta: "112 cues · 5 checks",
    unit: "Step",
    shots: [
      { label: "Cue sheet exported", time: "0:00" },
      { label: "Timing pass", time: "0:09" },
      { label: "Safe-area checked", time: "0:19" },
      { label: "Styled to brand kit", time: "0:29" },
      { label: "Burned to frame", time: "0:37" },
    ],
  },

  {
    id: "render",
    title: "Render the cut",
    body: "Voice, footage, captions and motion composited into one timeline and encoded in a single pass. What lands in your downloads is a 4K MP4, not a project file.",
    prompt: "Burn it down to a 4K MP4",
    run: "RUN 4825",
    chip: "Render · 4K H.264",
    ruleLabel: "Output",
    ruleMeta: "1 pass · 0:44",
    unit: "Step",
    shots: [
      { label: "Timeline assembled", time: "0:00" },
      { label: "Captions burned in", time: "0:09" },
      { label: "Motion applied", time: "0:19" },
      { label: "Encoded to H.264", time: "0:29" },
      { label: "MP4 ready to download", time: "0:37" },
    ],
  },
];

function PlayheadMark() {
  return (
    <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[6px] bg-[#1d1c1b]">
      <svg
        className="h-[11px] w-[11px] text-[#fbfbfa]"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <path
          d="M2 13h12"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M5.6 2.6h4.8v3.6L8 8.4 5.6 6.2z"
          fill="currentColor"
          stroke="none"
        />
        <path d="M8 8.4V12.6" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function SectionRule({ label, meta }: { label: string; meta: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0 font-plex text-[10px] uppercase tracking-[0.08em] text-[#1d1c1b]/45">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-[#1d1c1b]/10" />
      <span className="shrink-0 font-plex text-[10px] tabular-nums text-[#1d1c1b]/40">
        {meta}
      </span>
    </div>
  );
}
function StatusChip({ children }: { children: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[5px] border border-[#5da53c]/35 bg-[#5da53c]/[0.07] px-2 py-[3px] font-plex text-[10px] uppercase tracking-[0.06em] text-[#41761f]">
      <span className="v3-pip h-1.5 w-1.5 rounded-full bg-[#5da53c]" />
      {children}
    </span>
  );
}

function StageList({
  openId,
  onOpen,
}: {
  openId: string;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <SectionRule label="Pipeline" meta="05 stages" />
      <ul className="relative mt-4 flex flex-1 flex-col justify-between">
        <span
          aria-hidden
          className="absolute bottom-[26px] left-[13px] top-[30px] w-px bg-[#1d1c1b]/12"
        />
        {CAPABILITIES.map((c, i) => {
          const open = c.id === openId;
          return (
            <li key={c.id} className="relative">
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                aria-expanded={open}
                className="group flex w-full items-start gap-3.5 py-2 text-left"
              >
                <span
                  className={`relative z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[8px] font-plex text-[10.5px] tabular-nums transition-colors ${
                    open
                      ? "bg-[#1d1c1b] text-[#fbfbfa]"
                      : "border border-[#1d1c1b]/15 bg-[#fbfbfa] text-[#1d1c1b]/45 group-hover:border-[#1d1c1b]/35 group-hover:text-[#1d1c1b]/70"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span className="min-w-0 flex-1 pt-[3px]">
                  <span
                    className={`block font-sans text-[17px] font-normal tracking-[-0.01em] transition-colors ${
                      open
                        ? "text-[#1d1c1b]"
                        : "text-[#1d1c1b]/55 group-hover:text-[#1d1c1b]"
                    }`}
                  >
                    {c.title}
                  </span>
                  <span
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <span className="overflow-hidden">
                      <span className="block max-w-[330px] pb-2 pt-2 font-sans text-[14.5px] font-medium leading-[1.5] text-[#1d1c1b]/70">
                        {c.body}
                      </span>
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-10">
        <span aria-hidden className="block h-px bg-[#1d1c1b]/10" />
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <Btn href="/how" variant="light" size="sm">
            How it works
          </Btn>
          <span className="font-plex text-[10.5px] uppercase tracking-[0.07em] text-[#1d1c1b]/40">
            12 stages · one pass
          </span>
        </div>
      </div>
    </div>
  );
}

const PERF = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, rgba(29,28,27,0.16) 0 7px, transparent 7px 16px)",
};

const pad = (n: number) => String(n).padStart(2, "0");

function ShotFilm({
  src,
  poster,
  motion,
}: {
  src: string;
  poster: string;
  motion: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!motion) {
      video.pause();
      return;
    }

    video.muted = true;
    video.playbackRate = PLAYBACK_RATE;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }, [motion, src]);

  return (
    <video
      ref={ref}
      className="v3-frame-in absolute inset-0 h-full w-full object-cover"
      poster={poster}
      muted
      loop
      playsInline
      preload={motion ? "auto" : "none"}
      aria-hidden
      tabIndex={-1}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

function StatusGlyphs() {
  return (
    <span aria-hidden className="flex items-center gap-[3px] text-[#fbfbfa]">
      <svg width="11" height="8" viewBox="0 0 11 8" fill="currentColor">
        <rect x="0" y="5.4" width="2" height="2.6" rx="0.6" />
        <rect x="3" y="3.8" width="2" height="4.2" rx="0.6" />
        <rect x="6" y="2" width="2" height="6" rx="0.6" />
        <rect x="9" y="0" width="2" height="8" rx="0.6" opacity="0.45" />
      </svg>
      <svg
        width="10"
        height="8"
        viewBox="0 0 10 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      >
        <path d="M1 3.1a6 6 0 0 1 8 0" />
        <path d="M2.7 5a3.6 3.6 0 0 1 4.6 0" />
        <circle cx="5" cy="6.9" r="0.65" fill="currentColor" stroke="none" />
      </svg>
      <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
        <rect
          x="0.4"
          y="0.4"
          width="11.6"
          height="7.2"
          rx="2.2"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="0.8"
        />
        <rect
          x="1.5"
          y="1.5"
          width="8"
          height="5"
          rx="1.4"
          fill="currentColor"
        />
        <path
          d="M13 2.9v2.2a1.6 1.6 0 0 0 0-2.2z"
          fill="currentColor"
          fillOpacity="0.5"
        />
      </svg>
    </span>
  );
}

const RAIL =
  "linear-gradient(146deg,#8e8983 0%,#3a3835 13%,#232120 29%,#5d5955 44%,#1e1c1b 60%,#4a4744 76%,#8a8580 90%,#2a2827 100%)";
const BUTTON = "linear-gradient(to bottom,#9c968f,#55524e 45%,#837e78)";

function PhoneFrame({
  item,
  shotIdx,
  motion,
}: {
  item: Capability;
  shotIdx: number;
  motion: boolean;
}) {
  const shot = item.shots[shotIdx] ?? item.shots[0];
  return (
    <div className="relative w-[184px] shrink-0 self-center sm:self-start lg:w-[196px]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-4 -bottom-2 top-8 rounded-[40px] bg-[#1d1c1b]/25 blur-[26px]"
      />
      <span
        aria-hidden
        className="absolute -left-[2px] top-[14%] h-[24px] w-[3px] rounded-l-[2px]"
        style={{ background: BUTTON }}
      />
      <span
        aria-hidden
        className="absolute -left-[2px] top-[22%] h-[40px] w-[3px] rounded-l-[2px]"
        style={{ background: BUTTON }}
      />
      <span
        aria-hidden
        className="absolute -left-[2px] top-[33%] h-[40px] w-[3px] rounded-l-[2px]"
        style={{ background: BUTTON }}
      />
      <span
        aria-hidden
        className="absolute -right-[2px] top-[26%] h-[62px] w-[3px] rounded-r-[2px]"
        style={{ background: BUTTON }}
      />

      <div
        className="relative rounded-[34px] p-[3px] shadow-[0_1px_2px_rgba(29,28,27,0.22),0_20px_38px_-16px_rgba(29,28,27,0.5)]"
        style={{ background: RAIL }}
      >
        <div className="rounded-[31px] bg-[#080807] p-[2px]">
          <div className="v3-grain relative aspect-[18/39] overflow-hidden rounded-[29px] bg-black">
            <ShotFilm
              key={`${item.id}-${shotIdx}`}
              src={`/hero/cap-${shotIdx + 1}.mp4`}
              poster={`/hero/cap-${shotIdx + 1}.jpg`}
              motion={motion}
            />

            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(6,5,5,0.6) 0%, rgba(6,5,5,0) 15%, rgba(6,5,5,0) 68%, rgba(6,5,5,0.34) 82%, rgba(6,5,5,0.9) 100%)",
                boxShadow: "inset 0 0 40px 6px rgba(0,0,0,0.26)",
              }}
            />

            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-[15px] pt-[10px]"
            >
              <span className="font-sans text-[8.5px] font-semibold leading-none text-[#fbfbfa]">
                9:41
              </span>
              <StatusGlyphs />
            </div>

            <span
              aria-hidden
              className="absolute left-1/2 top-[7px] flex h-[19px] w-[60px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-[6px]"
            >
              <span className="h-[7px] w-[7px] rounded-full bg-[#12212b] ring-[0.5px] ring-inset ring-[#fbfbfa]/15" />
            </span>

            <p
              key={`cap-${item.id}-${shotIdx}`}
              className="v3-frame-in absolute inset-x-[13px] bottom-[44px] text-center font-sans text-[10.5px] font-semibold leading-[1.35] text-[#fbfbfa]"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.85)" }}
            >
              {shot.label}
            </p>

            <div
              aria-hidden
              className="absolute inset-x-[14px] bottom-[27px] flex items-center justify-between font-plex text-[8px] uppercase tracking-[0.07em] tabular-nums text-[#fbfbfa]/75"
            >
              <span className="inline-flex items-center gap-1">
                <span className="v3-pip h-1 w-1 rounded-full bg-[#b0d67e]" />
                {item.unit} {pad(shotIdx + 1)}
              </span>
              <span>
                {shot.time} / {RUNTIME}
              </span>
            </div>

            <span
              aria-hidden
              className="absolute inset-x-[14px] bottom-[19px] h-[2.5px] overflow-hidden rounded-full bg-[#fbfbfa]/22"
            >
              {motion ? (
                <span
                  key={`ph-${item.id}-${shotIdx}`}
                  className="v3-dwell block h-full w-full rounded-full bg-[#b0d67e]"
                  style={{ animationDuration: `${SHOT_MS}ms` }}
                />
              ) : null}
            </span>

            <span
              aria-hidden
              className="absolute bottom-[7px] left-1/2 h-[3.5px] w-[34%] -translate-x-1/2 rounded-full bg-[#fbfbfa]/65"
            />

            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(118deg, rgba(255,255,255,0.17) 0%, rgba(255,255,255,0.055) 21%, rgba(255,255,255,0) 41%)",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[29px] ring-1 ring-inset ring-[#fbfbfa]/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppPanel({
  item,
  shotIdx,
  onShot,
  motion,
}: {
  item: Capability;
  shotIdx: number;
  onShot: (i: number) => void;
  motion: boolean;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[18px] border border-[#1d1c1b]/10 bg-white shadow-[0_1px_2px_rgba(29,28,27,0.04),0_12px_28px_-14px_rgba(29,28,27,0.14)]">
      <div className="flex items-center gap-2.5 border-b border-[#1d1c1b]/10 bg-[#1d1c1b]/[0.015] px-3.5 py-2.5">
        <PlayheadMark />
        <span className="font-plex text-[10px] uppercase tracking-[0.09em] text-[#1d1c1b]/55">
          Director
        </span>
        <span className="ml-auto font-plex text-[10px] tabular-nums text-[#1d1c1b]/30">
          {item.run}
        </span>
      </div>

      <div className="p-3.5">
        <div className="flex items-center rounded-full border border-[#1d1c1b]/12 bg-[#1d1c1b]/[0.025] px-4 py-2.5">
          <span className="truncate font-sans text-[14px] font-medium text-[#1d1c1b]/80">
            {item.prompt}
          </span>
          <span
            aria-hidden
            className="v3-caret ml-[3px] h-[16px] w-[2px] shrink-0 rounded-full bg-[#1d1c1b]/45"
          />
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <StatusChip>{item.chip}</StatusChip>
          <span className="truncate font-plex text-[10px] text-[#1d1c1b]/40">
            4K · MP4 · no watermark
          </span>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-5 sm:flex-row sm:items-stretch sm:gap-4">
          <div className="flex w-full min-w-0 flex-1 flex-col">
            <SectionRule label={item.ruleLabel} meta={item.ruleMeta} />

            <ul className="relative mt-3 flex flex-1 flex-col divide-y divide-[#1d1c1b]/[0.09] border-y border-[#1d1c1b]/[0.09]">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-[52px] hidden w-px bg-[#1d1c1b]/[0.09] sm:block"
              />

              {item.shots.map((s, i) => {
                const on = i === shotIdx;

                return (
                  <li
                    key={`${item.id}-s${i}`}
                    className="flex min-h-[52px] flex-1"
                  >
                    <button
                      type="button"
                      onClick={() => onShot(i)}
                      aria-label={`${item.unit} ${pad(i + 1)} - ${s.label}`}
                      aria-pressed={on}
                      className="group relative flex w-full items-center gap-x-3 text-left outline-none sm:gap-x-0"
                    >
                      <span
                        aria-hidden
                        className={`h-[20px] w-[2px] shrink-0 rounded-full transition-colors duration-300 ${
                          on
                            ? "bg-[#5da53c]"
                            : "bg-[#1d1c1b]/12 group-hover:bg-[#1d1c1b]/30"
                        }`}
                      />

                      <span
                        className={`shrink-0 font-plex text-[11px] tabular-nums transition-colors duration-300 sm:w-[40px] sm:pl-3 ${
                          on ? "text-[#41761f]" : "text-[#1d1c1b]/40"
                        }`}
                      >
                        {s.time}
                      </span>

                      <span
                        className={`min-w-0 flex-1 truncate font-sans text-[14.5px] font-medium tracking-[-0.005em] transition-colors duration-300 sm:pl-[13px] ${
                          on
                            ? "text-[#1d1c1b]"
                            : "text-[#1d1c1b]/60 group-hover:text-[#1d1c1b]/85"
                        }`}
                      >
                        {s.label}
                      </span>

                      <span
                        className={`ml-3 hidden shrink-0 font-plex text-[9.5px] uppercase tracking-[0.09em] tabular-nums transition-colors duration-300 sm:block ${
                          on ? "text-[#1d1c1b]/55" : "text-[#1d1c1b]/28"
                        }`}
                      >
                        {item.unit} {pad(i + 1)}
                      </span>

                      {on && motion ? (
                        <span
                          aria-hidden
                          key={`d-${item.id}-${i}`}
                          className="v3-dwell absolute inset-x-0 -bottom-px h-[2px] bg-[#5da53c]"
                          style={{ animationDuration: `${SHOT_MS}ms` }}
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <span
            aria-hidden
            className="hidden w-[3px] shrink-0 self-stretch sm:block"
            style={PERF}
          />

          <PhoneFrame item={item} shotIdx={shotIdx} motion={motion} />
        </div>
      </div>
    </div>
  );
}

export function CapabilitiesV3() {
  const [openId, setOpenId] = useState(CAPABILITIES[0].id);
  const [shotIdx, setShotIdx] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const active = CAPABILITIES.find((c) => c.id === openId) ?? CAPABILITIES[0];

  const reduced = useSyncExternalStore(
    subscribeMotion,
    getMotion,
    getServerMotion,
  );

  const motion = onScreen && !reduced;
  const playing = motion;

  const openStage = (id: string) => {
    setOpenId(id);
    setShotIdx(0);
  };

  useEffect(() => {
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setOnScreen(entries.some((e) => e.isIntersecting)),
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setShotIdx((i) => (i + 1) % active.shots.length);
      setOpenId((id) => {
        const at = CAPABILITIES.findIndex((c) => c.id === id);
        return CAPABILITIES[(at + 1) % CAPABILITIES.length].id;
      });
    }, SHOT_MS);
    return () => clearTimeout(t);
  }, [playing, shotIdx, openId, active.shots.length]);

  return (
    <section className="v3-wash pt-20 sm:pt-28 lg:pt-32">
      <Container>
        <RuleHeader
          title={<>Built for the way you actually publish.</>}
          lede="Made for people shipping video every week - turning the thing you can describe in a sentence into an asset you can post."
        />
      </Container>

      <Container className="mt-20 lg:mt-24">
        <div className="relative overflow-hidden rounded-[32px] lg:rounded-[44px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero/canvas-plate.jpg"
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
          />

          <div aria-hidden className="absolute inset-0 bg-[#f6f2ea]/20" />

          <div className="relative px-4 pb-5 pt-6 sm:px-9 sm:pb-9 sm:pt-14 lg:px-14 lg:pb-14 lg:pt-20">
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-4 rounded-[40px] bg-white/70 blur-[30px] sm:-inset-7 sm:rounded-[52px] sm:blur-[44px]"
              />

              <div
                ref={cardRef}
                className="relative rounded-[24px] bg-[#fbfbfa]/97 px-5 py-10 shadow-[0_2px_6px_rgba(29,28,27,0.04),0_16px_34px_-12px_rgba(29,28,27,0.12),0_44px_88px_-30px_rgba(29,28,27,0.22)] sm:rounded-[32px] sm:px-12 sm:py-14"
              >
                <div className="grid gap-10 lg:grid-cols-[minmax(0,368px)_minmax(0,1fr)] lg:gap-16">
                  <StageList openId={openId} onOpen={openStage} />
                  <div className="min-w-0">
                    <AppPanel
                      item={active}
                      shotIdx={shotIdx}
                      onShot={setShotIdx}
                      motion={motion}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <div className="h-20 sm:h-28 lg:h-32" />
    </section>
  );
}
