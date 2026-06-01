"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useAnimationFrame,
  useReducedMotion,
} from "framer-motion";

const PLACEHOLDERS = [
  "Explain Redis pub/sub for backend engineers",
  "Pitch my SaaS app in 45 seconds",
  "Onboarding video for a new design tool",
  "How transformers work, for high schoolers",
  "Quarterly product update for Q3 2026",
];

const EXAMPLE_CHIPS = [
  "Pitch my SaaS in 45s",
  "Explain Kubernetes",
  "Onboarding flow",
  "Series A pitch",
];

const MARQUEE_PHOTOS = Array.from({ length: 20 }, (_, i) => i + 1);

function useTypewriter(
  phrases: string[],
  opts: { typeSpeed?: number; deleteSpeed?: number; pauseTime?: number } = {}
) {
  const { typeSpeed = 42, deleteSpeed = 22, pauseTime = 1800 } = opts;
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[idx];
    if (!deleting && text === phrase) {
      const t = window.setTimeout(() => setDeleting(true), pauseTime);
      return () => window.clearTimeout(t);
    }
    if (deleting && text === "") {
      const t = window.setTimeout(() => {
        setDeleting(false);
        setIdx((i) => (i + 1) % phrases.length);
      }, deleteSpeed);
      return () => window.clearTimeout(t);
    }
    const speed = deleting ? deleteSpeed : typeSpeed;
    const t = window.setTimeout(() => {
      setText((prev) =>
        deleting
          ? phrase.substring(0, prev.length - 1)
          : phrase.substring(0, prev.length + 1)
      );
    }, speed);
    return () => window.clearTimeout(t);
  }, [text, deleting, idx, phrases, typeSpeed, deleteSpeed, pauseTime]);

  return text;
}

const TITLE_TEXT = "One sentence. One video.";

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const typed = useTypewriter(PLACEHOLDERS);
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const showTypewriter = inputValue.length === 0 && !inputFocused;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 80, damping: 18, mass: 0.6 });
  const smoothY = useSpring(mouseY, { stiffness: 80, damping: 18, mass: 0.6 });
  const titleX = useTransform(smoothX, [-1, 1], [-8, 8]);
  const titleY = useTransform(smoothY, [-1, 1], [-4, 4]);
  const marqueeX = useTransform(smoothX, [-1, 1], [-14, 14]);
  const slateX = useTransform(smoothX, [-1, 1], [-4, 4]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 2);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);

  const buildCreateHref = (preset?: string) => {
    if (!isLoggedIn) return "/auth/sign-in";
    const text = (preset ?? inputValue).trim();
    return text ? `/create?prompt=${encodeURIComponent(text)}` : "/create";
  };

  return (
    <section className="relative w-full bg-[#060606] text-white overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative min-h-screen flex flex-col px-6 sm:px-10 lg:px-16">
        <CornerBrackets />

        <div className="h-[100px] shrink-0" aria-hidden />

        <div className="flex-1 flex flex-col items-center justify-center text-center pb-10">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            style={{ x: slateX }}
            className="flex items-center gap-3 mb-8 font-mono text-[10px] tracking-[0.32em] uppercase text-white/40"
          >
            <span className="flex items-center gap-1.5">
              <span className="relative inline-flex w-1.5 h-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-white/70 font-semibold">Cutline</span>
            </span>
            <span className="text-white/15">/</span>
            <span>1080p</span>
            <span className="text-white/15">·</span>
            <span>16:9</span>
            <span className="text-white/15">·</span>
            <span>24fps</span>
          </motion.div>

          <motion.h1
            style={{ x: titleX, y: titleY }}
            className="font-black uppercase leading-[0.84] tracking-[-0.045em] text-[clamp(2.6rem,10vw,10rem)] text-transparent bg-clip-text"
          >
            <span
              className="inline-flex flex-wrap justify-center"
              style={{
                fontFamily:
                  "'Inter', 'Helvetica Neue', system-ui, sans-serif",
                fontWeight: 900,
                backgroundImage:
                  "linear-gradient(180deg, #ffffff 0%, #e9e9ea 55%, #b9b9bd 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
              aria-label={TITLE_TEXT}
            >
              {TITLE_TEXT.split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{
                    duration: 0.85,
                    delay: 0.12 + i * 0.025,
                    ease: [0.2, 0.7, 0.2, 1],
                  }}
                  aria-hidden
                  style={{
                    display: "inline-block",
                    whiteSpace: "pre",
                  }}
                >
                  {char === " " ? " " : char}
                </motion.span>
              ))}
            </span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
            style={{ x: marqueeX }}
            className="relative w-full mt-9 sm:mt-12 mb-9"
          >
            <PhotoMarquee />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="max-w-[46ch] text-[11px] sm:text-[12.5px] tracking-[0.22em] uppercase text-white/65 leading-[1.7]"
          >
            Type one sentence. A 12-stage AI director plans, narrates, and
            renders a finished MP4 in a single pass.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="mt-14 w-full max-w-[640px]"
            aria-label="12-stage pipeline, 4 phases"
          >
            <PhaseTimeline />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.85 }}
            className="mt-14 w-full max-w-[640px]"
          >
            <form
              onSubmit={(e) => e.preventDefault()}
              className="group relative flex items-stretch gap-0 rounded-md bg-black/40 border border-white/12 backdrop-blur-md transition-colors focus-within:border-white/30"
            >
              <div className="shrink-0 flex items-center gap-2 pl-4 pr-3.5 border-r border-white/8">
                <span className="relative inline-flex w-1.5 h-1.5" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-[10px] tracking-[0.28em] text-white/70 uppercase">
                  Rec
                </span>
              </div>

              <div className="relative flex-1 min-w-0 flex items-center px-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  aria-label="Describe your video"
                  className="relative w-full h-12 bg-transparent text-white text-[14.5px] tracking-[-0.005em] outline-none placeholder:text-transparent caret-emerald-400"
                  placeholder=" "
                />
                {showTypewriter && (
                  <div className="absolute inset-y-0 left-4 right-4 flex items-center pointer-events-none text-white/35 text-[14.5px]">
                    <span className="truncate">{typed}</span>
                    <span
                      className="inline-block w-[1.5px] h-[1.1em] bg-white/55 ml-px align-middle shrink-0"
                      style={{
                        animation: "typingCursor 1s steps(2, end) infinite",
                      }}
                      aria-hidden
                    />
                  </div>
                )}
              </div>

              <Link
                href={buildCreateHref()}
                className="shrink-0 inline-flex items-center gap-2.5 pl-5 pr-5 border-l border-white/8 text-white/85 hover:text-white font-mono text-[11px] tracking-[0.28em] uppercase transition-colors group/btn"
              >
                <span>Generate</span>
                <span
                  className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 transition-colors group-hover/btn:bg-emerald-500/25 group-hover/btn:border-emerald-400/70 group-hover/btn:text-emerald-200"
                  aria-hidden
                >
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h14m0 0l-6-6m6 6l-6 6"
                    />
                  </svg>
                </span>
              </Link>
            </form>

            <div className="mt-6 flex flex-wrap justify-center items-center gap-x-3 gap-y-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                Try
              </span>
              {EXAMPLE_CHIPS.map((chip) => (
                <Link
                  key={chip}
                  href={buildCreateHref(chip)}
                  className="font-mono text-[11px] tracking-[0.12em] uppercase text-white/55 hover:text-white transition-colors relative pb-0.5 border-b border-white/8 hover:border-white/40"
                >
                  {chip}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

      </div>

      <style jsx>{`
        @keyframes typingCursor {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}

const PHASES = [
  { num: "01", name: "Intent" },
  { num: "02", name: "Narrative" },
  { num: "03", name: "Visualize" },
  { num: "04", name: "Render" },
];

const TOTAL_SECONDS = 45;

const TL_PLAY = 5200;
const TL_HOLD = 750;
const TL_RESET = 650;
const TL_FADE_IN = 450;
const TL_CYCLE = TL_PLAY + TL_HOLD + TL_RESET;

function easeInOutQuad(k: number) {
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function PhaseTimeline() {
  const reduced = useReducedMotion();
  const progress = useMotionValue(0);
  const liveOpacity = useMotionValue(0);
  const [pct, setPct] = useState(0);

  useAnimationFrame((time) => {
    if (reduced) {
      progress.set(1);
      liveOpacity.set(1);
      setPct((prev) => (prev === 100 ? prev : 100));
      return;
    }
    const e = time % TL_CYCLE;
    let t: number;
    let op: number;
    if (e < TL_PLAY) {
      t = easeInOutQuad(e / TL_PLAY);
      op = e < TL_FADE_IN ? e / TL_FADE_IN : 1;
    } else if (e < TL_PLAY + TL_HOLD) {
      t = 1;
      op = 1;
    } else {
      t = 1;
      op = 1 - (e - TL_PLAY - TL_HOLD) / TL_RESET;
    }
    progress.set(t);
    liveOpacity.set(op);
    const next = Math.round(t * 100);
    setPct((prev) => (prev === next ? prev : next));
  });

  const playheadLeft = useTransform(progress, (v) => `${(v * 100).toFixed(3)}%`);

  const seconds = Math.min(
    TOTAL_SECONDS,
    Math.round((pct / 100) * TOTAL_SECONDS)
  );
  const activePhase = Math.min(
    PHASES.length - 1,
    Math.floor((pct / 100) * PHASES.length)
  );

  return (
    <div className="relative select-none">
      <div className="flex items-center gap-3 mb-4 font-mono text-[9.5px] tracking-[0.3em] uppercase text-white/35">
        <span className="text-white/55">12-Stage Pipeline</span>
        <span className="h-px flex-1 bg-white/8" />
        <span className="flex items-center gap-1.5 tabular-nums">
          <span className="text-white/70">00:{pad2(seconds)}</span>
          <span className="text-white/20">/</span>
          <span>00:{pad2(TOTAL_SECONDS)}</span>
        </span>
      </div>

      <div className="grid grid-cols-4 mb-2.5">
        {PHASES.map((ph, i) => {
          const done = i < activePhase;
          const active = i === activePhase;
          return (
            <div
              key={ph.num}
              className="flex items-baseline gap-1.5 font-mono text-[9px] sm:text-[10px] tracking-[0.18em] uppercase"
            >
              <span
                className={`tabular-nums transition-colors duration-500 ${active
                    ? "text-emerald-400"
                    : done
                      ? "text-emerald-400/60"
                      : "text-emerald-400/20"
                  }`}
              >
                {ph.num}
              </span>
              <span
                className={`transition-colors duration-500 ${active
                    ? "text-white/95"
                    : done
                      ? "text-white/55"
                      : "text-white/30"
                  }`}
              >
                {ph.name}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative h-9">
        {PHASES.map((_, i) => (
          <span
            key={`seg-${i}`}
            aria-hidden
            className={`absolute top-0 bottom-0 transition-colors duration-500 ${i === activePhase ? "bg-emerald-400/[0.045]" : ""
              }`}
            style={{ left: `${(i / 4) * 100}%`, width: "25%" }}
          />
        ))}

        {[1, 2, 3].map((i) => (
          <span
            key={`div-${i}`}
            aria-hidden
            className="absolute top-1.5 bottom-1.5 w-px bg-white/8"
            style={{ left: `${(i / 4) * 100}%` }}
          />
        ))}

        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/10"
        />

        {PHASES.map((_, p) =>
          [0, 1, 2].map((s) => {
            const idx = p * 3 + s;
            const pos = (idx + 0.5) / 12;
            const passed = pos * 100 <= pct;
            const isPhaseStart = s === 0;
            return (
              <span
                key={`tick-${idx}`}
                aria-hidden
                className={`absolute top-1/2 w-[1.5px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-200 ${passed
                    ? "bg-emerald-400/80"
                    : isPhaseStart
                      ? "bg-white/25"
                      : "bg-white/12"
                  }`}
                style={{
                  left: `${pos * 100}%`,
                  height: isPhaseStart ? "15px" : "9px",
                }}
              />
            );
          })
        )}

        <motion.span
          aria-hidden
          className="absolute left-0 top-1/2 h-[2px] w-full origin-left -translate-y-1/2"
          style={{
            scaleX: progress,
            opacity: liveOpacity,
            background:
              "linear-gradient(90deg, rgba(52,211,153,0) 0%, rgba(52,211,153,0.5) 100%)",
            boxShadow: "0 0 10px rgba(52,211,153,0.35)",
          }}
        />

        <motion.div
          aria-hidden
          className="absolute top-0 bottom-0 z-10"
          style={{ left: playheadLeft, opacity: liveOpacity }}
        >
          <span
            className="absolute inset-y-0 left-0 w-[1.5px] -translate-x-1/2 bg-emerald-400"
            style={{ boxShadow: "0 0 12px rgba(52,211,153,0.7)" }}
          />
          <span
            className="absolute left-0 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-emerald-400"
            style={{ boxShadow: "0 0 8px rgba(52,211,153,0.85)" }}
          />
        </motion.div>

        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/70"
        />
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-[9px] tracking-[0.2em] uppercase text-white/25 tabular-nums">
        <span>00:00</span>
        <span>00:{pad2(TOTAL_SECONDS)}</span>
      </div>
    </div>
  );
}

function CornerBrackets() {
  const armLen = 42;
  const thickness = 1.5;
  const inset = 18;
  const color = "rgba(255,255,255,0.9)";
  const base: React.CSSProperties = {
    position: "absolute",
    backgroundColor: color,
  };
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20"
    >
      <span
        style={{
          ...base,
          top: inset,
          left: inset,
          width: armLen,
          height: thickness,
        }}
      />
      <span
        style={{
          ...base,
          top: inset,
          left: inset,
          width: thickness,
          height: armLen,
        }}
      />
      <span
        style={{
          ...base,
          top: inset,
          right: inset,
          width: armLen,
          height: thickness,
        }}
      />
      <span
        style={{
          ...base,
          top: inset,
          right: inset,
          width: thickness,
          height: armLen,
        }}
      />
      <span
        style={{
          ...base,
          bottom: inset,
          left: inset,
          width: armLen,
          height: thickness,
        }}
      />
      <span
        style={{
          ...base,
          bottom: inset,
          left: inset,
          width: thickness,
          height: armLen,
        }}
      />
      <span
        style={{
          ...base,
          bottom: inset,
          right: inset,
          width: armLen,
          height: thickness,
        }}
      />
      <span
        style={{
          ...base,
          bottom: inset,
          right: inset,
          width: thickness,
          height: armLen,
        }}
      />
    </div>
  );
}

function PhotoMarquee() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const photos = Array.from(
      wrapper.querySelectorAll<HTMLElement>("[data-marquee-photo]")
    );

    let rafId = 0;
    let wrapperLeft = 0;
    let wrapperWidth = 0;
    let halfWidth = 0;

    const measure = () => {
      const rect = wrapper.getBoundingClientRect();
      wrapperLeft = rect.left;
      wrapperWidth = rect.width;
      halfWidth = wrapperWidth / 2;
    };

    const update = () => {
      for (const photo of photos) {
        const photoRect = photo.getBoundingClientRect();
        const photoCenter = photoRect.left + photoRect.width / 2;
        const wrapperCenter = wrapperLeft + halfWidth;
        const offset = (photoCenter - wrapperCenter) / halfWidth;

        const clamped = Math.max(-1.15, Math.min(1.15, offset));
        const eased =
          Math.sign(clamped) * Math.pow(Math.abs(clamped), 1.4);

        const rotateY = eased * 72;
        const translateZ = -Math.abs(eased) * 110;
        const translateY = Math.abs(eased) * 8;

        photo.style.transform = `translate3d(0, ${translateY}px, ${translateZ}px) rotateY(${rotateY}deg)`;
      }
      rafId = requestAnimationFrame(update);
    };

    measure();
    rafId = requestAnimationFrame(update);

    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full overflow-hidden"
      style={{
        perspective: "1200px",
        perspectiveOrigin: "center center",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
      }}
    >
      <div
        className="marquee-track flex items-center gap-[10px] sm:gap-[14px]"
        style={{
          transformStyle: "preserve-3d",
          width: "max-content",
        }}
      >
        {[...MARQUEE_PHOTOS, ...MARQUEE_PHOTOS].map((id, i) => (
          <div
            key={`${id}-${i}`}
            data-marquee-photo
            className="relative shrink-0 overflow-hidden rounded-[6px] ring-1 ring-white/15"
            style={{
              width: "clamp(120px, 13vw, 200px)",
              aspectRatio: "3 / 4",
              transformStyle: "preserve-3d",
              willChange: "transform",
              boxShadow:
                "0 22px 40px -16px rgba(0,0,0,0.8), 0 4px 14px -4px rgba(0,0,0,0.5)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/hero/${id}.jpg`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              draggable={false}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.22) 100%)",
              }}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .marquee-track {
          animation: marquee-scroll 60s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        @keyframes marquee-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
