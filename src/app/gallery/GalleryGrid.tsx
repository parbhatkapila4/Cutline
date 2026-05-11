"use client";

import { useRef, useState } from "react";
import type { GalleryItem } from "./page";

const FORMAT_LABEL: Record<GalleryItem["format"], string> = {
  "9:16": "9 : 16  Reels / Shorts",
  "16:9": "16 : 9  YouTube",
  "1:1": "1 : 1  Square",
};

const FORMAT_ASPECT: Record<GalleryItem["format"], string> = {
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video",
  "1:1": "aspect-square",
};

function VideoCard({ item }: { item: GalleryItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleMouseEnter = () => {
    const v = videoRef.current;
    if (!v || hasError) return;
    void v.play().then(() => setIsPlaying(true)).catch(() => undefined);
  };

  const handleMouseLeave = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    const v = videoRef.current;
    if (!v || hasError) return;
    if (v.paused) {
      void v.play().then(() => setIsPlaying(true)).catch(() => undefined);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.18)]">
      <div
        className={`relative ${FORMAT_ASPECT[item.format]} bg-gray-900 overflow-hidden`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleTogglePlay}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleTogglePlay();
          }
        }}
        aria-label={`Play example: ${item.prompt}`}
      >
        {hasError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.poster}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <video
            ref={videoRef}
            src={item.videoSrc}
            poster={item.poster}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        )}

        <div
          className={`absolute inset-0 transition-opacity ${isPlaying ? "opacity-0" : "opacity-100 bg-gradient-to-t from-black/30 via-transparent to-transparent"}`}
          aria-hidden
        />

        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${isPlaying ? "opacity-0" : "opacity-100"}`}
          aria-hidden
        >
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/95 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
            <svg className="w-4 h-4 text-[#0a0a0a] translate-x-px" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>

        <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold tracking-[0.04em] tabular-nums">
          {item.durationSec}s
        </div>

        <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white/90 text-[9.5px] font-mono tabular-nums">
          {FORMAT_LABEL[item.format]}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <p className="text-[10.5px] font-semibold tracking-[0.16em] uppercase text-gray-400 mb-1.5">
          {item.persona}
        </p>
        <p className="text-[13.5px] text-[#0a0a0a] leading-snug font-medium">
          &ldquo;{item.prompt}&rdquo;
        </p>
      </div>
    </div>
  );
}

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {items.map((item) => (
        <VideoCard key={item.id} item={item} />
      ))}
    </div>
  );
}
