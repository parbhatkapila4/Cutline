"use client";

import { motion } from "framer-motion";

const accentGradient = "linear-gradient(90deg, #f5f0e8 0%, #e8e0d4 100%)";

export function CutlineHeader({ className }: { className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.08, delayChildren: 0.05 },
        },
      }}
      style={{
        background: "linear-gradient(180deg, #0c0c0e 0%, #0a0a0c 100%)",
        borderRadius: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <svg
        viewBox="0 0 640 200"
        className="w-full h-auto block"
        aria-hidden
        style={{ display: "block", verticalAlign: "middle" }}
      >
        <defs>
          <linearGradient id="cutline-header-bg" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor="#0c0c0e" />
            <stop offset="1" stopColor="#0a0a0c" />
          </linearGradient>
          <linearGradient id="cutline-header-accent" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor="#f5f0e8" />
            <stop offset="1" stopColor="#e8e0d4" />
          </linearGradient>
        </defs>

        <rect width="640" height="200" fill="url(#cutline-header-bg)" />
        <g stroke="#1c1c1e" strokeWidth="0.8" fill="none" opacity="0.5">
          <motion.rect
            x="72"
            y="48"
            width="56"
            height="32"
            rx="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
          />
          <rect x="140" y="56" width="48" height="27" rx="2" />
          <rect x="500" y="52" width="52" height="29" rx="2" />
          <rect x="564" y="44" width="48" height="27" rx="2" />
        </g>

        <g fill="#1a1a1c" opacity="0.7">
          <rect x="0" y="88" width="12" height="8" />
          <rect x="0" y="104" width="12" height="8" />
          <rect x="0" y="120" width="12" height="8" />
          <rect x="628" y="88" width="12" height="8" />
          <rect x="628" y="104" width="12" height="8" />
          <rect x="628" y="120" width="12" height="8" />
        </g>
      </svg>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ padding: "0 1rem" }}
      >
        <div className="text-center">
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-[2.25rem] md:text-[2.75rem] font-bold tracking-tight"
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              letterSpacing: "-0.04em",
            }}
          >
            <span className="text-[#fafafa]">CUT</span>
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: accentGradient }}
            >
              LINE
            </span>
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, scaleX: 0 },
              visible: { opacity: 1, scaleX: 1 },
            }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="h-1 rounded-full mx-auto mt-1 origin-center"
            style={{
              width: "min(344px, 54vw)",
              background: accentGradient,
            }}
          />

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 6 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="text-[#fafafa] text-base md:text-lg font-medium mt-3"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            One sentence in, one video out.
          </motion.p>

          <motion.p
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 },
            }}
            transition={{ duration: 0.35, delay: 0.35 }}
            className="text-[#52525b] text-xs md:text-sm mt-1"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            Script to video. One platform. Export anywhere.
          </motion.p>
        </div>
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="h-1 w-full origin-left"
        style={{ background: accentGradient }}
      />
    </motion.div>
  );
}
