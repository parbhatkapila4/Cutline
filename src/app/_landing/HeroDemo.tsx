"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Scene = {
  img: string;
  caption: string;
};

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1920&h=1080&fit=crop&crop=entropy&q=90&auto=format&fm=jpg`;

const SCENES: Scene[] = [
  { img: UNSPLASH("1455390582262-044cdead277a"), caption: "One sentence in." },
  { img: UNSPLASH("1590602847861-f357a9332bbc"), caption: "Script. Voice. Captions." },
  { img: UNSPLASH("1485846234645-a62644f84728"), caption: "B-roll, timed to every word." },
  { img: UNSPLASH("1493863641943-9b68992a8d07"), caption: "Music, mixed in one pass." },
  { img: UNSPLASH("1574717024653-61fd2cf4d44d"), caption: "One finished MP4." },
];

const SCENE_DURATION_MS = 2400;

export function HeroDemo() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % SCENES.length);
    }, SCENE_DURATION_MS);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    SCENES.forEach((s) => {
      const img = new window.Image();
      img.src = s.img;
    });
  }, []);

  const current = SCENES[idx];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a0a0a]">
      <AnimatePresence mode="sync">
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: 1.04 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{
            opacity: { duration: 0.55 },
            scale: { duration: SCENE_DURATION_MS / 1000, ease: "linear" },
          }}
          className="absolute inset-0"
          style={{ willChange: "transform, opacity" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.img}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
            decoding="async"
            loading="eager"
            style={{ imageRendering: "auto" }}
          />
        </motion.div>
      </AnimatePresence>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
        aria-hidden
      />

      <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold tracking-[0.12em] uppercase tabular-nums">
        <span className="relative flex h-1 w-1">
          <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-70 animate-ping" />
          <span className="relative inline-flex h-1 w-1 rounded-full bg-rose-500" />
        </span>
        Playing
      </div>

      <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-white/90 text-[10px] font-mono tabular-nums">
        00:{String(Math.min((idx + 1) * 6, 30)).padStart(2, "0")} / 00:30
      </div>

      <div className="absolute bottom-7 inset-x-0 flex justify-center px-6 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.32, delay: 0.18 }}
            className="px-3.5 py-1.5 rounded-md bg-black/70 backdrop-blur-md text-white text-[14px] sm:text-[15px] font-semibold tracking-[-0.01em] shadow-[0_4px_20px_rgba(0,0,0,0.4)] max-w-[80%] text-center"
          >
            {current.caption}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
        <motion.div
          key={`bar-${idx}`}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: SCENE_DURATION_MS / 1000, ease: "linear" }}
          className="h-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
        />
      </div>

      <div className="absolute bottom-2 left-2 flex items-end gap-[2px] h-3.5">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="w-[2px] bg-white/70 rounded-full"
            animate={{
              height: ["20%", "90%", "40%", "75%", "30%"],
            }}
            transition={{
              duration: 0.9 + (i % 3) * 0.15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i % 5) * 0.07,
            }}
            style={{ height: "30%" }}
          />
        ))}
      </div>
    </div>
  );
}
