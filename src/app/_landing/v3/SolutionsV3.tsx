"use client";

import { LoadingLink } from "@/components/ui/loading-link";
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Container, RuleHeader } from "./primitives";

type PanelKind = "render" | "formats" | "lesson";

type Solution = {
  id: string;
  tab: string;
  eyebrow: string;
  title: string;
  body: string;

  image: string;
  focus: string;
  zoom: number;
  prompt: string;
  status: string;

  job: string;
  panel: PanelKind;
  href: string;
};

const SOLUTIONS: Solution[] = [
  {
    id: "creators",
    tab: "Creators",
    eyebrow: "For creators",
    title: "Creators & solo founders",
    body: "The idea you had this morning, posted before lunch. No editor, no timeline, no three-hour render - describe the video and download the cut.",
    image: "/hero/card-creators.jpg",
    focus: "50% 10%",
    zoom: 1,
    prompt: "A 45-second explainer on why cold brew tastes sweeter",
    status: "Rendering · 0:45",
    job: "RUN 4821",
    panel: "render",
    href: "/features",
  },
  {
    id: "marketing",
    tab: "Marketing teams",
    eyebrow: "For marketing teams",
    title: "Marketing teams",
    body: "Ship the campaign cut without booking a shoot. Brand colours and logo locked across every render, in every aspect ratio the channel needs.",
    image: "/hero/card-marketing.jpg",
    focus: "50% 50%",
    zoom: 1.18,
    prompt: "Launch cut for Q3 - brand kit, every channel",
    status: "3 aspects · ready",
    job: "RUN 5107",
    panel: "formats",
    href: "/features",
  },
  {
    id: "educators",
    tab: "Educators & courses",
    eyebrow: "For educators",
    title: "Educators & course builders",
    body: "Turn a lesson plan into a lecture people actually finish. Captions burned in, pacing tuned for retention, exports sized for any LMS.",
    image: "/hero/card-educators.jpg",
    focus: "50% 44%",
    zoom: 1.1,
    prompt: "Module 2 - extraction, as a 6-minute lecture",
    status: "Captions · 112 cues",
    job: "RUN 5233",
    panel: "lesson",
    href: "/features",
  },
];

const CARD_W = "min(1080px,84vw)";
const STEP = 22;
const RADIUS = 2.655;
const PERSPECTIVE = 2.407;
const CLONES = 2;

const CARD_BOX =
  "aspect-[4/5] w-[min(1080px,84vw)] sm:aspect-[16/10] lg:aspect-[16/9]";

const SLOTS = Array.from(
  { length: SOLUTIONS.length + CLONES * 2 },
  (_, slot) => {
    const wrapped =
      (((slot - CLONES) % SOLUTIONS.length) + SOLUTIONS.length) %
      SOLUTIONS.length;
    return {
      slot,
      index: wrapped,
      item: SOLUTIONS[wrapped],
      clone: slot < CLONES || slot >= CLONES + SOLUTIONS.length,
    };
  },
);

const EASE =
  "duration-[820ms] ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:duration-[1ms]";
const SWING = `transition-transform ${EASE}`;
const FADE = `transition-opacity ${EASE}`;

function veilFor(offset: number) {
  const steps = Math.abs(offset);
  if (steps === 0) return 0;
  return steps === 1 ? 0.36 : 0.6;
}

export function SolutionsV3() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const origin = useRef<{ x: number; w: number } | null>(null);

  const activeSlot = CLONES + activeIndex;
  const angle = -(activeSlot + drag) * STEP;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const width = spacerRef.current?.offsetWidth ?? 0;
    if (!width) return;
    origin.current = { x: event.clientX, w: width };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const offsetFrom = (clientX: number) => {
    const start = origin.current;
    if (!start) return 0;
    return Math.max(-1.2, Math.min(1.2, -(clientX - start.x) / start.w));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!origin.current) return;
    setDrag(offsetFrom(event.clientX));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!origin.current) return;
    const released = offsetFrom(event.clientX);
    origin.current = null;
    setDragging(false);
    setDrag(0);
    if (Math.abs(released) > 0.18) {
      const step = released > 0 ? 1 : -1;
      setActiveIndex((i) =>
        Math.min(SOLUTIONS.length - 1, Math.max(0, i + step)),
      );
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onPointerCancel = () => {
    origin.current = null;
    setDragging(false);
    setDrag(0);
  };

  const swing = dragging ? "" : SWING;
  const fade = dragging ? "" : FADE;

  return (
    <section
      id="solutions"
      className="bg-[#f1f0ef] pb-20 pt-4 sm:pb-28 lg:pb-32"
    >
      <Container>
        <RuleHeader
          title={<>Built for every kind of video.</>}
          lede="One pipeline behind creators, marketing teams, educators and agencies - whatever you need out the door this week."
        />
      </Container>

      <div className="mt-16 flex flex-wrap items-center justify-center gap-2 px-5">
        {SOLUTIONS.map((item, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-pressed={active}
              className={`rounded-full px-6 py-3 font-sans text-[14.5px] font-medium transition-colors ${
                active
                  ? "bg-[#1d1c1b] text-[#f4f3f3]"
                  : "text-[#1d1c1b]/55 hover:text-[#1d1c1b]"
              }`}
            >
              {item.tab}
            </button>
          );
        })}
      </div>

      <div className="mt-10 overflow-hidden sm:mt-12">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className="cursor-grab touch-pan-y select-none active:cursor-grabbing"
          style={{ perspective: `calc(${CARD_W} * ${PERSPECTIVE})` }}
        >
          <div
            className={`relative will-change-transform ${swing}`}
            style={{
              transformStyle: "preserve-3d",
              transform: `translateZ(calc(${CARD_W} * -${RADIUS})) rotateY(${angle}deg)`,
            }}
          >
            <div
              ref={spacerRef}
              aria-hidden
              className={`${CARD_BOX} invisible mx-auto`}
            />

            {SLOTS.map(({ slot, index, item, clone }) => {
              const active = !clone && index === activeIndex;
              return (
                <div
                  key={slot}
                  aria-hidden={clone || undefined}
                  onClick={
                    clone || active ? undefined : () => setActiveIndex(index)
                  }
                  className={`${CARD_BOX} absolute left-1/2 top-0 overflow-hidden rounded-[28px] bg-[#161514] sm:rounded-[40px] ${
                    clone || active ? "" : "cursor-pointer"
                  }`}
                  style={{
                    transform: `translateX(-50%) rotateY(${slot * STEP}deg) translateZ(calc(${CARD_W} * ${RADIUS}))`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                      objectPosition: item.focus,
                      transform: `scale(${item.zoom})`,
                      transformOrigin: item.focus,
                    }}
                  />

                  <div
                    aria-hidden
                    className="absolute inset-0 hidden lg:block"
                    style={{
                      background:
                        "radial-gradient(58% 76% at 74% 50%, rgba(255,231,196,0.16) 0%, rgba(255,231,196,0.05) 42%, rgba(255,231,196,0) 72%)",
                    }}
                  />

                  <div
                    aria-hidden
                    className="absolute inset-0 bg-[#0b0a09]/35 sm:hidden"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(93deg, rgba(9,8,7,0.92) 0%, rgba(9,8,7,0.82) 18%, rgba(9,8,7,0.52) 36%, rgba(9,8,7,0.14) 58%, rgba(9,8,7,0) 76%)",
                    }}
                  />

                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(125% 105% at 52% 46%, rgba(9,8,7,0) 52%, rgba(9,8,7,0.34) 100%)",
                    }}
                  />
                  <div
                    aria-hidden
                    className={`absolute inset-0 bg-[#0b0a09] ${fade}`}
                    style={{ opacity: veilFor(slot - activeSlot) }}
                  />
                  {clone ? null : (
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute right-[3.5%] top-1/2 hidden w-[45%] max-w-[486px] -translate-y-1/2 lg:block ${fade}`}
                      style={{ opacity: active ? 1 : 0 }}
                    >
                      <AppPanel item={item} />
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center px-7 sm:px-10 lg:px-14">
                    <div className="w-full max-w-[400px] lg:max-w-[min(42%,420px)]">
                      <span className="inline-flex items-center rounded-[5px] border border-[#f4f3f3]/30 px-2 py-[3px] font-plex text-[10.5px] uppercase tracking-[0.07em] text-[#f4f3f3]/70">
                        {item.eyebrow}
                      </span>
                      <h3 className="mt-5 font-sans text-[26px] font-normal leading-[1.1] tracking-[-0.025em] text-[#f4f3f3] sm:text-[32px] lg:text-[38px]">
                        {item.title}
                      </h3>
                      <p className="mt-4 font-sans text-[14.5px] font-medium leading-[1.55] text-[#f4f3f3]/72 sm:mt-5 sm:text-[15.5px]">
                        {item.body}
                      </p>

                      {active ? (
                        <LoadingLink
                          href={item.href}
                          className={LEARN_MORE}
                          draggable={false}
                        >
                          Learn more
                          <BoxedArrow />
                        </LoadingLink>
                      ) : (
                        <span
                          className={LEARN_MORE}
                          aria-hidden={clone || undefined}
                        >
                          Learn more
                          <BoxedArrow />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AppPanel({ item }: { item: Solution }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#f4f3f3]/12 bg-[#131211]/95 shadow-[0_50px_100px_-25px_rgba(0,0,0,0.95)]">
      <div className="flex items-center gap-2.5 border-b border-[#f4f3f3]/10 px-3.5 py-2.5">
        <PlayheadMark />
        <span className="font-plex text-[10px] uppercase tracking-[0.09em] text-[#f4f3f3]/55">
          Director
        </span>
        <span className="ml-auto font-plex text-[10px] tabular-nums text-[#f4f3f3]/30">
          {item.job}
        </span>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2.5 rounded-full border border-[#f4f3f3]/10 bg-[#f4f3f3]/[0.05] px-3.5 py-2.5">
          <SearchIcon />
          <span className="truncate font-sans text-[12.5px] font-medium text-[#f4f3f3]/75">
            {item.prompt}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[5px] border border-[#b0d67e]/40 px-2 py-[3px] font-plex text-[10px] uppercase tracking-[0.06em] text-[#c7e6a0]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b0d67e]" />
            {item.status}
          </span>
          <span className="truncate font-plex text-[10px] text-[#f4f3f3]/45">
            4K · MP4 · no watermark
          </span>
        </div>

        <div className="mt-3.5">
          {item.panel === "render" ? <RenderBody /> : null}
          {item.panel === "formats" ? <FormatsBody /> : null}
          {item.panel === "lesson" ? <LessonBody /> : null}
        </div>
      </div>
    </div>
  );
}

function Frame({
  id,
  className,
  focus,
  muted = false,
  children,
}: {
  id: number;
  className: string;
  focus?: string;
  muted?: boolean;
  children?: ReactNode;
}) {
  return (
    <span
      className={`relative block overflow-hidden bg-[#f4f3f3]/[0.06] ring-1 ring-inset ring-[#f4f3f3]/12 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/hero/${id}.jpg`}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className={`absolute inset-0 h-full w-full object-cover ${
          muted ? "saturate-[0.45]" : ""
        }`}
        style={focus ? { objectPosition: focus } : undefined}
      />

      <span
        aria-hidden
        className={`absolute inset-0 ${muted ? "bg-[#0b0a09]/45" : "bg-[#0b0a09]/25"}`}
      />
      {children}
    </span>
  );
}

function PlayheadMark() {
  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-[#f4f3f3]">
      <svg
        className="h-[11px] w-[11px] text-[#1d1c1b]"
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
    <div className="mb-2 flex items-center gap-2.5">
      <span className="shrink-0 font-plex text-[10px] uppercase tracking-[0.07em] text-[#f4f3f3]/40">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-[#f4f3f3]/10" />
      <span className="shrink-0 font-plex text-[10px] text-[#f4f3f3]/35">
        {meta}
      </span>
    </div>
  );
}

function RatioTag({ children }: { children: ReactNode }) {
  return (
    <span className="absolute bottom-1.5 left-1.5 rounded-[4px] bg-[#0b0a09]/85 px-1.5 py-[2px] font-plex text-[9px] tracking-[0.04em] text-[#f4f3f3]/90">
      {children}
    </span>
  );
}

const RENDER_STAGES: { label: string; done: boolean }[] = [
  { label: "Script + storyboard", done: true },
  { label: "Voice + score", done: true },
  { label: "Captions", done: true },
  { label: "Render + export", done: false },
];

const RENDER_PROGRESS = 68;

const SHOT_STRIP = [11, 15, 9, 12];

function RenderBody() {
  return (
    <>
      <div className="flex gap-3">
        <Frame
          id={10}
          className="aspect-[9/16] w-[22%] shrink-0 self-start rounded-[10px]"
        >
          <RatioTag>9:16</RatioTag>
        </Frame>
        <ul className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
          {RENDER_STAGES.map((stage) => (
            <li
              key={stage.label}
              className="relative flex items-center gap-2.5 overflow-hidden rounded-[9px] border border-[#f4f3f3]/8 bg-[#f4f3f3]/[0.03] px-2.5 py-2.5"
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                {stage.done ? (
                  <TickIcon className="h-3 w-3 text-[#f4f3f3]/40" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#b0d67e]" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate font-sans text-[12px] font-medium text-[#f4f3f3]/78">
                {stage.label}
              </span>
              {stage.done ? null : (
                <span className="shrink-0 font-plex text-[10px] tabular-nums text-[#c7e6a0]">
                  {RENDER_PROGRESS}%
                </span>
              )}

              {stage.done ? null : (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-[#f4f3f3]/10"
                >
                  <span
                    className="block h-full bg-[#b0d67e]"
                    style={{ width: `${RENDER_PROGRESS}%` }}
                  />
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3.5">
        <SectionRule label="Shot list" meta="4 shots · 0:45" />
        <div className="flex gap-1.5">
          {SHOT_STRIP.map((id) => (
            <Frame
              key={id}
              id={id}
              muted
              className="aspect-[16/10] min-w-0 flex-1 rounded-[6px]"
            />
          ))}
        </div>
      </div>
    </>
  );
}

const CAMPAIGN_FRAME = 7;

const FORMATS: {
  ratio: string;
  shape: string;
  grow: string;
  where: string;
  focus: string;
}[] = [
  {
    ratio: "16:9",
    shape: "aspect-[16/9]",
    grow: "flex-[16]",
    where: "YouTube",
    focus: "50% 50%",
  },
  {
    ratio: "1:1",
    shape: "aspect-square",
    grow: "flex-[9]",
    where: "LinkedIn",
    focus: "26% 52%",
  },
  {
    ratio: "9:16",
    shape: "aspect-[9/16]",
    grow: "flex-[5]",
    where: "Reels",
    focus: "78% 46%",
  },
];

const BRAND_SWATCHES = ["#e8dcc8", "#c3603c", "#2f4f43"];

function FormatsBody() {
  return (
    <>
      <SectionRule label="Channels" meta="one cut · 3 aspects" />
      <div className="flex items-start gap-2">
        {FORMATS.map((format) => (
          <div key={format.ratio} className={`min-w-0 ${format.grow}`}>
            <Frame
              id={CAMPAIGN_FRAME}
              focus={format.focus}
              className={`${format.shape} w-full rounded-[10px]`}
            >
              <RatioTag>{format.ratio}</RatioTag>
            </Frame>
            <span className="mt-2 block truncate font-plex text-[10px] text-[#f4f3f3]/45">
              {format.where}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-2.5 rounded-[10px] border border-[#f4f3f3]/8 bg-[#f4f3f3]/[0.03] px-2.5 py-2">
        <span className="flex shrink-0 items-center gap-1">
          {BRAND_SWATCHES.map((hex) => (
            <span
              key={hex}
              className="h-3.5 w-3.5 rounded-[4px] ring-1 ring-inset ring-[#f4f3f3]/20"
              style={{ backgroundColor: hex }}
            />
          ))}
        </span>
        <span className="h-3.5 w-px shrink-0 bg-[#f4f3f3]/12" />
        <span className="min-w-0 flex-1 truncate font-sans text-[12px] font-medium text-[#f4f3f3]/70">
          Brand kit locked
        </span>
        <TickIcon className="h-3.5 w-3.5 text-[#b0d67e]" />
      </div>
    </>
  );
}

const CHAPTERS: { time: string; label: string }[] = [
  { time: "0:00", label: "Why temperature changes taste" },
  { time: "1:24", label: "Steep time vs acidity" },
];

const LESSON_PLAYHEAD = 46;

function LessonBody() {
  return (
    <>
      <Frame id={6} className="aspect-[16/9] w-full rounded-[10px]">
        <span className="absolute inset-x-0 bottom-7 flex justify-center px-3">
          <span className="rounded-[5px] bg-[#0b0a09]/80 px-2 py-[3px] text-center font-sans text-[11px] font-medium leading-[1.3] text-[#f4f3f3]">
            …so the acid never gets a chance to develop.
          </span>
        </span>

        <span className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2">
          <span className="relative h-[3px] flex-1 rounded-full bg-[#f4f3f3]/25">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-[#f4f3f3]"
              style={{ width: `${LESSON_PLAYHEAD}%` }}
            />
            <span
              className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4f3f3]"
              style={{ left: `${LESSON_PLAYHEAD}%` }}
            />
          </span>
          <span className="shrink-0 font-plex text-[9px] tabular-nums text-[#f4f3f3]/85">
            2:44
          </span>
        </span>
      </Frame>

      <div className="mt-3.5">
        <SectionRule label="Chapters" meta="12 · 6:12 total" />
      </div>
      <ul>
        {CHAPTERS.map((chapter) => (
          <li
            key={chapter.time}
            className="flex items-center gap-3 border-b border-[#f4f3f3]/8 py-2 first:border-t first:border-t-[#f4f3f3]/8"
          >
            <span className="w-[26px] shrink-0 font-plex text-[10px] tabular-nums text-[#f4f3f3]/45">
              {chapter.time}
            </span>
            <span className="min-w-0 flex-1 truncate font-sans text-[12px] font-medium text-[#f4f3f3]/78">
              {chapter.label}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-[#f4f3f3]/45"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function TickIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4.5 4.5L19 7"
      />
    </svg>
  );
}

const LEARN_MORE =
  "mt-7 inline-flex items-center gap-2.5 font-sans text-[14.5px] font-medium text-[#f4f3f3] transition-opacity duration-200 hover:opacity-70 sm:mt-8 sm:text-[15px]";

function BoxedArrow() {
  return (
    <svg
      className="h-[15px] w-[15px] shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <rect
        x="0.6"
        y="0.6"
        width="14.8"
        height="14.8"
        rx="4.4"
        stroke="currentColor"
        strokeOpacity="0.45"
      />
      <path
        d="M6 10 10 6M6.7 6h3.3v3.3"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
