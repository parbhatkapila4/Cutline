"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

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

// All 20 photos — used twice for seamless marquee loop
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
      setDeleting(false);
      setIdx((i) => (i + 1) % phrases.length);
      return;
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
      {/* Film grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Content frame (dark viewport area) */}
      <div className="relative min-h-screen flex flex-col px-6 sm:px-10 lg:px-16">
        {/* Corner brackets scoped to the dark viewport so they don't bleed into the fade zone */}
        <CornerBrackets />

        {/* Spacer to clear fixed navbar */}
        <div className="h-[100px] shrink-0" aria-hidden />

        <div className="flex-1 flex flex-col items-center justify-center text-center pb-10">
          {/* Slate header: format specs */}
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

          {/* Title — per-letter reveal + subtle mouse parallax */}
          <motion.h1
            style={{ x: titleX, y: titleY }}
            className="font-black uppercase leading-[0.84] tracking-[-0.045em] text-[clamp(2.6rem,10vw,10rem)] text-transparent bg-clip-text"
            // background-clip + per-letter span requires the gradient on h1 to be inherited
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

          {/* Photo marquee — subtle counter-parallax */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
            style={{ x: marqueeX }}
            className="relative w-full mt-9 sm:mt-12 mb-9"
          >
            <PhotoMarquee />
          </motion.div>

          {/* Description (small caps cinema style) */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="max-w-[46ch] text-[11px] sm:text-[12.5px] tracking-[0.22em] uppercase text-white/65 leading-[1.7]"
          >
            Type one sentence. A 12-stage AI director plans, narrates, and
            renders a finished MP4 — in a single pass.
          </motion.p>

          {/* Pipeline phase timeline */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="mt-14 w-full max-w-[640px]"
            aria-label="12-stage pipeline, 4 phases"
          >
            <PhaseTimeline />
          </motion.div>

          {/* Prompt input + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.85 }}
            className="mt-14 w-full max-w-[640px]"
          >
            <form
              onSubmit={(e) => e.preventDefault()}
              className="group relative flex items-stretch gap-0 rounded-md bg-black/40 border border-white/[0.12] backdrop-blur-md transition-colors focus-within:border-white/30"
            >
              {/* REC indicator */}
              <div className="shrink-0 flex items-center gap-2 pl-4 pr-3.5 border-r border-white/[0.08]">
                <span className="relative inline-flex w-1.5 h-1.5" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-[10px] tracking-[0.28em] text-white/70 uppercase">
                  Rec
                </span>
              </div>

              {/* Input */}
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
                      className="inline-block w-[1.5px] h-[1.1em] bg-white/55 ml-[1px] align-middle shrink-0"
                      style={{
                        animation: "typingCursor 1s steps(2, end) infinite",
                      }}
                      aria-hidden
                    />
                  </div>
                )}
              </div>

              {/* Generate button */}
              <Link
                href={buildCreateHref()}
                className="shrink-0 inline-flex items-center gap-2.5 pl-5 pr-5 border-l border-white/[0.08] text-white/85 hover:text-white font-mono text-[11px] tracking-[0.28em] uppercase transition-colors group/btn"
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
                  className="font-mono text-[11px] tracking-[0.12em] uppercase text-white/55 hover:text-white transition-colors relative pb-0.5 border-b border-white/[0.08] hover:border-white/40"
                >
                  {chip}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

      </div>

      {/* Cinema fade zone — blends the dark hero into the light section below */}
      <div
        aria-hidden
        className="relative h-[300px] w-full pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #060606 0%, #0a0a0a 8%, #131313 20%, #232323 32%, #3d3d3d 44%, #6b6b6b 56%, #9d9d9d 67%, #c4c4c4 76%, #dedede 84%, #ececec 90%, #f5f5f5 96%, #FAFAFA 100%)",
        }}
      >
        {/* Continue subtle film grain through the transition so it reads as one filmic surface */}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
            maskImage:
              "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)",
          }}
        />
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

function PhaseTimeline() {
  const phases = [
    { num: "01", name: "Intent" },
    { num: "02", name: "Narrative" },
    { num: "03", name: "Visualize" },
    { num: "04", name: "Render" },
  ];

  return (
    <div className="relative">
      {/* Header strip */}
      <div className="flex items-center gap-3 mb-3 font-mono text-[9.5px] tracking-[0.3em] uppercase text-white/35">
        <span className="text-white/55">12-Stage Pipeline</span>
        <span className="h-px flex-1 bg-white/[0.08]" />
        <span className="tabular-nums">4 Phases</span>
      </div>

      {/* Phase row */}
      <div className="relative flex items-center">
        {/* Base track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/[0.08]" />

        {/* Animated emerald playhead sweep — sits ABOVE the phase boxes so it visibly crosses over them */}
        <motion.div
          aria-hidden
          className="absolute z-20 top-1/2 -translate-y-1/2 h-[2px] w-16 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(52,211,153,0.85), transparent)",
            boxShadow: "0 0 14px rgba(52,211,153,0.55)",
          }}
          animate={{ left: ["-4%", "100%"] }}
          transition={{
            duration: 4.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Phase nodes */}
        <div className="relative z-10 flex w-full justify-between">
          {phases.map((p, i) => (
            <motion.div
              key={p.num}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 + i * 0.07 }}
              className="flex flex-col items-center gap-2 bg-[#060606] px-3"
            >
              <div className="relative flex items-center justify-center">
                <span
                  className="w-2 h-2 rounded-full bg-white/15"
                  style={{
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.25)",
                  }}
                />
                <motion.span
                  aria-hidden
                  className="absolute w-2 h-2 rounded-full bg-emerald-400"
                  animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
                  transition={{
                    duration: 4.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (i / phases.length) * 4.2,
                  }}
                />
              </div>
              <div className="flex items-baseline gap-1.5 font-mono text-[10px] tracking-[0.22em] uppercase">
                <span className="text-emerald-400/80 tabular-nums">
                  {p.num}
                </span>
                <span className="text-white/70">{p.name}</span>
              </div>
            </motion.div>
          ))}
        </div>
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
        const offset = (photoCenter - wrapperCenter) / halfWidth; // -1..+1 across the wrapper

        const clamped = Math.max(-1.15, Math.min(1.15, offset));
        // Easing: photos stay flatter near the center, bend sharply at the edges
        const eased =
          Math.sign(clamped) * Math.pow(Math.abs(clamped), 1.4);

        const rotateY = eased * 72; // up to ±72°
        const translateZ = -Math.abs(eased) * 110; // push edges back
        const translateY = Math.abs(eased) * 8; // slight lift at edges

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
