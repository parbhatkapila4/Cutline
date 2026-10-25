"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Maximize, Pause, Play, TriangleAlert, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

const RATES = [1, 1.25, 1.5, 2, 0.75];
const SEEK_STEP_S = 5;

export type VideoDimensions = { width: number; height: number; duration: number };

type VideoPlayerProps = {
  src: string;
  ratio: number;
  label: string;
  className?: string;
  style?: CSSProperties;
  onDimensions?: (dims: VideoDimensions) => void;
};

export function formatClock(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

const CONTROL_BTN =
  "inline-grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/12 [&_svg]:size-[18px]";

export function VideoPlayer({ src, ratio, label, className, style, onDimensions }: VideoPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) setTime(v.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    const d = v?.duration;
    if (!v || !d || !Number.isFinite(d)) return;
    v.currentTime = Math.max(0, Math.min(d, t));
    setTime(v.currentTime);
  };

  const seekToPointer = (clientX: number) => {
    const bar = barRef.current;
    const d = videoRef.current?.duration;
    if (!bar || !d || !Number.isFinite(d)) return;
    const box = bar.getBoundingClientRect();
    seekTo(Math.max(0, Math.min(1, (clientX - box.left) / box.width)) * d);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  };

  const cycleRate = () => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = RATES[(RATES.indexOf(v.playbackRate) + 1) % RATES.length] ?? 1;
  };

  const toggleFullscreen = () => {
    const root = rootRef.current;
    const v = videoRef.current as FullscreenVideo | null;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (root?.requestFullscreen) {
      root.requestFullscreen().catch(() => v?.webkitEnterFullscreen?.());
    } else {
      v?.webkitEnterFullscreen?.();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const onButton = (e.target as HTMLElement).closest("button") != null;
    const now = videoRef.current?.currentTime ?? 0;
    switch (e.key) {
      case " ":
        if (onButton) return;
        e.preventDefault();
        toggle();
        return;
      case "k":
      case "K":
        e.preventDefault();
        toggle();
        return;
      case "ArrowRight":
        e.preventDefault();
        seekTo(now + SEEK_STEP_S);
        return;
      case "ArrowLeft":
        e.preventDefault();
        seekTo(now - SEEK_STEP_S);
        return;
      case "Home":
        e.preventDefault();
        seekTo(0);
        return;
      case "End":
        e.preventDefault();
        seekTo(Number.POSITIVE_INFINITY);
        return;
      case "m":
      case "M":
        toggleMute();
        return;
      case "f":
      case "F":
        toggleFullscreen();
        return;
    }
  };

  const onBarPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToPointer(e.clientX);
  };

  const onBarPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) seekToPointer(e.clientX);
  };

  const progress = duration > 0 ? Math.min(1, time / duration) : 0;

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label={label}
      data-playing={playing}
      onKeyDown={onKeyDown}
      className={cn(
        "group/player relative isolate overflow-hidden rounded-2xl bg-black [container-type:inline-size]",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_2px_6px_rgba(0,0,0,0.4),0_40px_90px_-30px_rgba(0,0,0,0.9)]",
        "[&:fullscreen]:rounded-none",
        className
      )}
      style={{ aspectRatio: String(ratio), ...style }}
    >
      <video
        ref={videoRef}
        src={`${src}#t=0.001`}
        preload="metadata"
        playsInline
        className="absolute inset-0 size-full object-contain"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onSeeked={(e) => setTime(e.currentTarget.currentTime)}
        onTimeUpdate={(e) => {
          if (e.currentTarget.paused) setTime(e.currentTarget.currentTime);
        }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration || 0);
          if (v.videoWidth > 0 && v.videoHeight > 0) {
            onDimensions?.({ width: v.videoWidth, height: v.videoHeight, duration: v.duration || 0 });
          }
        }}
        onError={() => setBroken(true)}
      />

      {broken ? (
        <div className="absolute inset-0 z-[6] grid place-items-center bg-black/80 p-4 text-center">
          <div className="grid justify-items-center gap-2 text-[13px] text-zinc-300">
            <TriangleAlert className="size-5 text-[#f4b740]" aria-hidden />
            <p>This video couldn&apos;t be loaded. Refresh the page to try again.</p>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        aria-label="Play"
        tabIndex={playing ? -1 : 0}
        className={cn(
          "absolute left-1/2 top-1/2 z-[3] grid size-[clamp(48px,9cqw,72px)] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white",
          "bg-[rgba(14,14,16,0.42)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-[14px] backdrop-saturate-[1.4]",
          "transition-[transform,opacity,background-color] duration-200 hover:scale-105 hover:bg-[rgba(14,14,16,0.55)]",
          "@max-[220px]:hidden",
          playing && "pointer-events-none scale-90 opacity-0"
        )}
      >
        <Play className="ml-[6%] size-[40%] fill-current" strokeWidth={0} aria-hidden />
      </button>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-[4] translate-y-1.5 bg-linear-to-t from-black/65 via-black/30 via-55% to-transparent px-3.5 pb-2.5 pt-11 text-white opacity-0 transition-[opacity,transform] duration-200",
          "group-hover/player:translate-y-0 group-hover/player:opacity-100 group-focus-within/player:translate-y-0 group-focus-within/player:opacity-100",
          "pointer-coarse:group-data-[playing=false]/player:translate-y-0 pointer-coarse:group-data-[playing=false]/player:opacity-100",
          "@max-[380px]:px-2 @max-[380px]:pb-1.5 @max-[380px]:pt-9 @max-[220px]:hidden"
        )}
      >
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${formatClock(time)} of ${formatClock(duration)}`}
          onPointerDown={onBarPointerDown}
          onPointerMove={onBarPointerMove}
          className="group/bar relative flex h-4 cursor-pointer touch-none items-center"
        >
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/22 transition-[height] duration-150 group-hover/bar:h-1.5">
            <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
          </div>
          <i
            aria-hidden
            className={cn(
              "absolute top-1/2 -ml-[6.5px] -mt-[6.5px] size-[13px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-transform duration-150",
              playing ? "scale-0 group-hover/bar:scale-100" : "scale-100"
            )}
            style={{ left: `${progress * 100}%` }}
          />
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className={CONTROL_BTN}>
            {playing ? (
              <Pause className="fill-current" strokeWidth={0} aria-hidden />
            ) : (
              <Play className="fill-current" strokeWidth={0} aria-hidden />
            )}
          </button>
          <span className="ml-1.5 whitespace-nowrap font-mono text-[12.5px] font-medium tabular-nums tracking-[-0.01em] text-white/90 @max-[380px]:ml-0.5 @max-[380px]:text-[11.5px]">
            {formatClock(time)} <span className="text-white/55">/ {formatClock(duration)}</span>
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={cycleRate}
            aria-label={`Playback speed ${rate}×`}
            className={cn(CONTROL_BTN, "@max-[380px]:hidden")}
          >
            {rate}×
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className={cn(CONTROL_BTN, "@max-[380px]:hidden")}
          >
            {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
          </button>
          <button type="button" onClick={toggleFullscreen} aria-label="Full screen" className={CONTROL_BTN}>
            <Maximize aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
