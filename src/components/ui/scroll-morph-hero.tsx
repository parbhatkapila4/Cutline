"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue } from "framer-motion";

export type AnimationPhase = "scatter" | "line" | "circle" | "bottom-strip";

interface FlipCardProps {
  src: string;
  nextSrc: string | null;
  target: { x: number; y: number; rotation: number; scale: number; opacity: number };
}

const IMG_WIDTH = 60;
const IMG_HEIGHT = 85;

const FALLBACK_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect fill="#e5e7eb" width="300" height="300"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="14">Video</text></svg>'
  );

function FlipCard({
  src,
  nextSrc,
  target,
}: FlipCardProps) {
  const [imgSrc, setImgSrc] = React.useState(src);
  const [errorCount, setErrorCount] = React.useState(0);
  React.useEffect(() => {
    setImgSrc(src);
    setErrorCount(0);
  }, [src]);
  const handleError = () => {
    if (errorCount === 0 && nextSrc) {
      setErrorCount(1);
      setImgSrc(nextSrc);
    } else {
      setImgSrc(FALLBACK_IMAGE);
    }
  };

  return (
    <motion.div
      animate={{
        x: target.x,
        y: target.y,
        rotate: target.rotation,
        scale: target.scale,
        opacity: target.opacity,
      }}
      transition={{
        type: "spring",
        stiffness: 40,
        damping: 15,
      }}
      style={{
        position: "absolute",
        width: IMG_WIDTH,
        height: IMG_HEIGHT,
      }}
      className="cursor-default"
    >
      <div className="relative h-full w-full overflow-hidden rounded-xl shadow-lg bg-gray-100">
        <img
          src={imgSrc}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={handleError}
          referrerPolicy="no-referrer"
        />
      </div>
    </motion.div>
  );
}

const TOTAL_IMAGES = 20;
const MAX_SCROLL = 3000;

interface IntroAnimationProps {
  onScrollComplete?: () => void;
}

const IMAGES = Array.from({ length: TOTAL_IMAGES }, (_, i) => `/hero/${i + 1}.jpg`);
export const HERO_IMAGES = IMAGES;

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
const seededNoise = (seed: number) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

export default function IntroAnimation({ onScrollComplete }: IntroAnimationProps) {
  const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    setContainerSize({
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
    });

    return () => observer.disconnect();
  }, []);

  const virtualScroll = useMotionValue(0);
  const scrollRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const atMax = scrollRef.current >= MAX_SCROLL;
      const atMin = scrollRef.current <= 0;
      const scrollingDown = e.deltaY > 0;
      const scrollingUp = e.deltaY < 0;

      if (atMax && scrollingDown) return;
      if (atMin && scrollingUp) return;

      e.preventDefault();
      e.stopPropagation();
      const newScroll = Math.min(Math.max(scrollRef.current + e.deltaY, 0), MAX_SCROLL);
      scrollRef.current = newScroll;
      virtualScroll.set(newScroll);
      if (newScroll >= MAX_SCROLL && !completedRef.current && onScrollComplete) {
        completedRef.current = true;
        onScrollComplete();
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      touchStartY = touchY;
      const newScroll = Math.min(Math.max(scrollRef.current + deltaY, 0), MAX_SCROLL);
      scrollRef.current = newScroll;
      virtualScroll.set(newScroll);
      if (newScroll >= MAX_SCROLL && !completedRef.current && onScrollComplete) {
        completedRef.current = true;
        onScrollComplete();
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [virtualScroll, onScrollComplete]);

  const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
  const smoothMorph = useSpring(morphProgress, { stiffness: 40, damping: 20 });

  const scrollRotate = useTransform(virtualScroll, [600, 3000], [0, 360]);
  const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 40, damping: 20 });

  const mouseX = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const normalizedX = (relativeX / rect.width) * 2 - 1;
      mouseX.set(normalizedX * 100);
    };
    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX]);

  useEffect(() => {
    const timer1 = setTimeout(() => setIntroPhase("line"), 500);
    const timer2 = setTimeout(() => setIntroPhase("circle"), 2500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const scatterPositions = useMemo(() => {
    return IMAGES.map((_, i) => ({
      x: (seededNoise(i + 1) - 0.5) * 1500,
      y: (seededNoise(i + 101) - 0.5) * 1000,
      rotation: (seededNoise(i + 1001) - 0.5) * 180,
      scale: 0.6,
      opacity: 0,
    }));
  }, []);

  const [morphValue, setMorphValue] = useState(0);
  const [rotateValue, setRotateValue] = useState(0);
  const [parallaxValue, setParallaxValue] = useState(0);

  useEffect(() => {
    const unsubscribeMorph = smoothMorph.on("change", setMorphValue);
    const unsubscribeRotate = smoothScrollRotate.on("change", setRotateValue);
    const unsubscribeParallax = smoothMouseX.on("change", setParallaxValue);
    return () => {
      unsubscribeMorph();
      unsubscribeRotate();
      unsubscribeParallax();
    };
  }, [smoothMorph, smoothScrollRotate, smoothMouseX]);

  const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
  const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#FAFAFA] overflow-hidden">
      <div
        className="flex h-full w-full flex-col items-center justify-center perspective-1000"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute inset-x-0 top-1/2 z-50 flex flex-col items-center justify-center px-5 text-center pointer-events-none sm:px-8"
          style={{ transform: "translateY(-50%) translateZ(120px)" }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={
              introPhase === "circle" && morphValue < 0.5
                ? { opacity: 1 - morphValue * 2, y: 0, filter: "blur(0px)" }
                : { opacity: 0, filter: "blur(10px)" }
            }
            transition={{ duration: 1 }}
            className="text-balance font-medium leading-tight tracking-tight text-gray-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] w-full max-w-[calc(100vw-2.5rem)] px-1 text-[clamp(1rem,4.6vw,1.35rem)] sm:max-w-xl sm:text-[clamp(1.05rem,3.8vw,1.5rem)] md:max-w-2xl md:text-2xl lg:max-w-3xl lg:text-3xl xl:max-w-4xl xl:text-4xl"
          >
            Brief. Assembly. Master.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={
              introPhase === "circle" && morphValue < 0.5
                ? { opacity: 0.5 - morphValue }
                : { opacity: 0 }
            }
            transition={{ duration: 1, delay: 0.2 }}
            className="mt-2 max-w-[min(16rem,calc(100vw-3rem))] text-[0.6rem] font-bold tracking-[0.16em] text-gray-500 md:mt-3 md:text-xs md:tracking-[0.2em]"
          >
            SCROLL ON
          </motion.p>
        </div>

        <motion.div
          style={{ opacity: contentOpacity, y: contentY }}
          className="absolute top-[10%] z-30 flex flex-col items-center justify-center text-center pointer-events-none px-4"
        >
          <h2 className="text-3xl md:text-5xl font-semibold text-gray-900 tracking-tight mb-4">
            AI-directed video editing
          </h2>
          <p className="text-sm md:text-base text-gray-600 max-w-lg leading-relaxed">
            One sentence of intent. CUTLINE decides narrative, pacing, motion, and subtitles-and delivers a finished video.{" "}
            <br className="hidden md:block" />
            No scripts. No assets.
          </p>
        </motion.div>

        <div
          className="relative z-0 flex h-full w-full items-center justify-center"
          style={{ transform: "translateZ(0)" }}
        >
          {IMAGES.slice(0, TOTAL_IMAGES).map((src, i) => {
            let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

            if (introPhase === "scatter") {
              target = scatterPositions[i];
            } else if (introPhase === "line") {
              const lineSpacing = 70;
              const lineTotalWidth = TOTAL_IMAGES * lineSpacing;
              const lineX = i * lineSpacing - lineTotalWidth / 2;
              target = { x: lineX, y: 0, rotation: 0, scale: 1, opacity: 1 };
            } else {
              const cw = Math.max(containerSize.width, 1);
              const ch = Math.max(containerSize.height, 1);
              const isMobile = cw < 768;
              const isNarrow = cw < 480;
              const minDimension = Math.min(cw, ch);

              const radiusFactor = isNarrow ? 0.52 : isMobile ? 0.46 : cw < 1024 ? 0.4 : 0.35;
              const vwCap = cw * (isNarrow ? 0.46 : isMobile ? 0.42 : 0.38);
              const circleRadius = Math.min(minDimension * radiusFactor, vwCap, 350);
              const circleAngle = (i / TOTAL_IMAGES) * 360;
              const circleRad = (circleAngle * Math.PI) / 180;
              const circlePos = {
                x: Math.cos(circleRad) * circleRadius,
                y: Math.sin(circleRad) * circleRadius,
                rotation: circleAngle + 90,
              };

              const baseRadius = Math.min(cw, ch * 1.5);
              const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1);
              const arcApexY = ch * (isMobile ? 0.35 : 0.25);
              const arcCenterY = arcApexY + arcRadius;
              const spreadAngle = isMobile ? 100 : 130;
              const startAngle = -90 - spreadAngle / 2;
              const step = spreadAngle / (TOTAL_IMAGES - 1);

              const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1);
              const maxRotation = spreadAngle * 0.8;
              const boundedRotation = -scrollProgress * maxRotation;

              const currentArcAngle = startAngle + i * step + boundedRotation;
              const arcRad = (currentArcAngle * Math.PI) / 180;

              const arcPos = {
                x: Math.cos(arcRad) * arcRadius + parallaxValue,
                y: Math.sin(arcRad) * arcRadius + arcCenterY,
                rotation: currentArcAngle + 90,
                scale: isMobile ? 1.25 : 1.8,
              };

              const circleScaleBase = isNarrow ? 0.72 : isMobile ? 0.82 : 1;

              target = {
                x: lerp(circlePos.x, arcPos.x, morphValue),
                y: lerp(circlePos.y, arcPos.y, morphValue),
                rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
                scale: lerp(circleScaleBase, arcPos.scale, morphValue),
                opacity: 1,
              };
            }

            return (
              <FlipCard
                key={i}
                src={src}
                nextSrc={IMAGES[(i + 1) % IMAGES.length]}
                target={target}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
