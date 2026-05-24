"use client";

import { useRef, useState, useMemo } from "react";
import Link from "next/link";
import type { GalleryItem, Persona } from "./page";

const PERSONAS: readonly Persona[] = [
  "Content Creators",
  "Marketers",
  "Educators",
  "E-commerce",
  "Social Media",
  "Agencies",
] as const;

type Filter = Persona | "All";

const SPAN: Record<GalleryItem["format"], string> = {
  "9:16": "lg:col-span-2",
  "1:1": "lg:col-span-2",
  "16:9": "lg:col-span-3",
};

const ASPECT: Record<GalleryItem["format"], string> = {
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video",
  "1:1": "aspect-square",
};

const FORMAT_LABEL: Record<GalleryItem["format"], string> = {
  "9:16": "9:16",
  "16:9": "16:9",
  "1:1": "1:1",
};

const FORMAT_NOTE: Record<GalleryItem["format"], string> = {
  "9:16": "Reels / Shorts",
  "16:9": "YouTube",
  "1:1": "Square",
};

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      All: items.length,
      "Content Creators": 0,
      Marketers: 0,
      Educators: 0,
      "E-commerce": 0,
      "Social Media": 0,
      Agencies: 0,
    };
    for (const item of items) base[item.persona] += 1;
    return base;
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length || 1;
    const totalShots = items.reduce((s, i) => s + i.shotCount, 0);
    const totalRender = items.reduce((s, i) => s + i.renderSec, 0);
    const totalDuration = items.reduce((s, i) => s + i.durationSec, 0);
    return {
      totalShots,
      avgRender: Math.round(totalRender / total),
      avgDuration: Math.round(totalDuration / total),
      formats: {
        "9:16": items.filter((i) => i.format === "9:16").length,
        "16:9": items.filter((i) => i.format === "16:9").length,
        "1:1": items.filter((i) => i.format === "1:1").length,
      },
    };
  }, [items]);

  const filtered = activeFilter === "All"
    ? items
    : items.filter((i) => i.persona === activeFilter);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-10 lg:gap-14">

      <aside
        className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto space-y-4"
        aria-label="Gallery filters"
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.16em] mb-3.5">
            Filter by persona
          </h2>
          <ul className="space-y-1.5 text-[13.5px]">
            {(["All", ...PERSONAS] as const).map((p) => {
              const isActive = activeFilter === p;
              return (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => setActiveFilter(p)}
                    aria-pressed={isActive}
                    className={`group flex w-full items-baseline justify-between gap-2 text-left leading-snug transition-colors ${isActive ? "text-white" : "text-zinc-400 hover:text-white"}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className={`h-1 w-1 rounded-full transition-colors ${isActive ? "bg-emerald-400" : "bg-transparent"}`}
                      />
                      {p}
                    </span>
                    <span
                      className={`font-mono text-[11px] tabular-nums transition-colors ${isActive ? "text-zinc-300" : "text-zinc-600"}`}
                    >
                      {counts[p]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.16em] mb-3.5">
            Spec
          </h2>
          <dl className="space-y-2.5 text-[13px]">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-zinc-400">Pipeline stages</dt>
              <dd className="font-mono text-white tabular-nums">12</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-zinc-400">Samples</dt>
              <dd className="font-mono text-white tabular-nums">{items.length}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-zinc-400">Total shots</dt>
              <dd className="font-mono text-white tabular-nums">{stats.totalShots}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-zinc-400">Avg duration</dt>
              <dd className="font-mono text-white tabular-nums">{stats.avgDuration}s</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-zinc-400">Avg render</dt>
              <dd className="font-mono text-white tabular-nums">{stats.avgRender}s</dd>
            </div>
          </dl>

          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-[10px] font-mono tracking-[0.18em] uppercase text-zinc-500 mb-2">
              Format mix
            </p>
            <div className="space-y-1.5 text-[12px]">
              {(["9:16", "16:9", "1:1"] as const).map((f) => {
                const count = stats.formats[f];
                const pct = items.length === 0 ? 0 : Math.round((count / items.length) * 100);
                return (
                  <div key={f} className="flex items-center gap-2">
                    <span className="font-mono text-zinc-400 w-10 shrink-0">{f}</span>
                    <span className="flex-1 h-[3px] rounded-full bg-white/5 overflow-hidden">
                      <span
                        className="block h-full bg-emerald-400/70"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="font-mono text-zinc-500 tabular-nums text-[11px] w-6 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <Link
          href="/auth/sign-in"
          className="group block rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:border-white/25 hover:bg-white/[0.07] transition-colors"
        >
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.16em] mb-1.5 group-hover:text-zinc-300 transition-colors">
            Generate
          </div>
          <div className="text-[14px] text-white font-medium flex items-center justify-between gap-2">
            <span>Try your own sentence</span>
            <svg
              className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </div>
          <p className="mt-2 text-[11.5px] text-zinc-500 leading-relaxed">
            First video free. No card.
          </p>
        </Link>
      </aside>

      <div className="min-w-0">

        <section className="mb-10">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.18em] mb-3">
            Gallery · {items.length} samples
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4 max-w-[20ch] leading-[1.05]">
            Real videos, one sentence each.
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[62ch]">
            Every clip below was produced by the same 12-stage pipeline you can call from the API. No manual edits, no templates. The prompt is shown beneath each video.
          </p>
        </section>

        <div className="mb-6 flex items-baseline justify-between gap-3 pb-3 border-b border-white/10">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-zinc-500">
            Showing <span className="text-white tabular-nums">{filtered.length}</span> of{" "}
            <span className="text-zinc-400 tabular-nums">{items.length}</span>
            {activeFilter !== "All" && (
              <>
                {" "}
                <span className="text-zinc-700" aria-hidden>·</span>{" "}
                <span className="text-white">{activeFilter}</span>
              </>
            )}
          </p>
          {activeFilter !== "All" && (
            <button
              type="button"
              onClick={() => setActiveFilter("All")}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400 hover:text-white transition-colors"
            >
              Clear ✕
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <p className="text-[13.5px] text-zinc-400">No samples match this filter yet.</p>
            <button
              type="button"
              onClick={() => setActiveFilter("All")}
              className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white hover:text-zinc-300 underline underline-offset-4 decoration-zinc-600 transition-colors"
            >
              Show all
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-5 [grid-auto-flow:dense]">
            {filtered.map((item) => (
              <VideoCard key={item.id} item={item} />
            ))}
          </div>
        )}

        <div className="mt-20 pt-10 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2 tracking-tight">
                Make one of these for your brief.
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-[52ch]">
                Type a sentence. The 12-stage director writes, narrates, and renders. First video is free - no card.
              </p>
            </div>
            <Link
              href="/auth/sign-in"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black text-[12px] font-bold tracking-[0.12em] uppercase hover:bg-zinc-200 transition-colors shadow-[0_4px_24px_-6px_rgba(255,255,255,0.3)]"
            >
              Generate yours
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

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
    <div
      className={`group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04] ${SPAN[item.format]}`}
    >
      <div
        className={`relative ${ASPECT[item.format]} bg-black overflow-hidden`}
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
        aria-label={`Preview example: ${item.prompt}`}
      >
        {hasError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.poster}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            loading="lazy"
            draggable={false}
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
          className={`absolute inset-0 transition-opacity duration-500 ${isPlaying ? "opacity-0" : "opacity-100"}`}
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 22%, transparent 60%, rgba(0,0,0,0.7) 100%)",
          }}
          aria-hidden
        />

        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/65 backdrop-blur-md text-white text-[10px] font-mono tabular-nums tracking-tight ring-1 ring-white/[0.08]">
          <span
            aria-hidden
            className={`relative flex h-1.5 w-1.5 ${isPlaying ? "" : "opacity-60"}`}
          >
            {isPlaying ? (
              <>
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
              </>
            ) : (
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </span>
          {item.durationSec}s
        </div>

        <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/65 backdrop-blur-md text-white text-[10px] font-mono tabular-nums tracking-tight ring-1 ring-white/[0.08]">
          <span>{FORMAT_LABEL[item.format]}</span>
          <span className="text-zinc-500" aria-hidden>·</span>
          <span className="text-zinc-300">{FORMAT_NOTE[item.format]}</span>
        </div>

        <div
          className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/65 backdrop-blur-md text-white text-[10px] font-mono tracking-[0.12em] uppercase ring-1 ring-white/[0.08] transition-all duration-300 ${isPlaying ? "opacity-0 -translate-x-1" : "opacity-100 translate-x-0"}`}
          aria-hidden
        >
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Preview
        </div>

        <div
          className={`absolute bottom-3 right-3 font-mono text-[9.5px] text-white/70 tracking-[0.16em] uppercase transition-opacity duration-300 ${isPlaying ? "opacity-100" : "opacity-0"}`}
          aria-hidden
        >
          Playing
        </div>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-[10px] font-mono tracking-[0.16em] uppercase text-zinc-500">
            {item.persona}
          </p>
          <p className="font-mono text-[10px] text-zinc-600 tabular-nums">
            <span className="text-zinc-300">{item.shotCount}</span>
            <span className="text-zinc-700">/</span>
            12
            <span className="text-zinc-700 ml-1">shots</span>
          </p>
        </div>
        <p className="text-[13.5px] text-zinc-100 leading-snug font-medium mb-3">
          &ldquo;{item.prompt}&rdquo;
        </p>
        <div className="mt-auto pt-3 border-t border-white/[0.06] flex items-center gap-3 font-mono text-[10.5px] text-zinc-500 flex-wrap">
          <span>
            render <span className="text-zinc-300 tabular-nums">{item.renderSec}s</span>
          </span>
          <span className="text-zinc-700" aria-hidden>·</span>
          <span>1080p</span>
          <span className="text-zinc-700" aria-hidden>·</span>
          <span>MP4</span>
        </div>
      </div>
    </div>
  );
}
