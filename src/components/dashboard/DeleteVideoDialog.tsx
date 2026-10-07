"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { DashboardVideoItem } from "@/app/api/dashboard/videos/route";
import { VideoCardFrame } from "@/components/dashboard/VideoCardFrame";

export type DeleteFailure = { message: string; action: "retry" | "signin" };

type DeleteVideoDialogProps = {
  video: DashboardVideoItem;
  pending: boolean;
  failure: DeleteFailure | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteVideoDialog({ video, pending, failure, onCancel, onConfirm }: DeleteVideoDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const title = video.title.trim() || "Untitled video";
  const meta = [video.date, video.duration].filter((part) => part && part !== "-").join(" · ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-video-title"
      aria-describedby="delete-video-body"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_140ms_ease-out] motion-reduce:animate-none"
        onClick={onCancel}
        aria-hidden
      />
      <div className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-zinc-950 p-5 sm:p-6 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.9)] animate-[popIn_160ms_ease-out] motion-reduce:animate-none">
        <div className="flex items-start justify-between gap-4">
          <h2 id="delete-video-title" className="text-[16px] font-semibold text-white tracking-[-0.01em]">
            Delete this video?
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="shrink-0 -mr-1.5 -mt-1 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Close dialog"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
          <div className="h-12 w-[86px] shrink-0 overflow-hidden rounded-lg bg-zinc-900">
            <VideoCardFrame videoUrl={video.videoUrl} status={video.status} compact />
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-[13.5px] font-medium leading-snug text-white" title={video.title}>
              {title}
            </p>
            {meta ? <p className="mt-0.5 text-xs text-zinc-500">{meta}</p> : null}
          </div>
        </div>

        <p id="delete-video-body" className="mt-4 text-[13px] leading-relaxed text-zinc-400">
          {video.status === "processing"
            ? "This one is still rendering. Deleting it stops the render and removes it for good."
            : "The video and its link are removed for good. Copies you’ve downloaded aren’t affected."}
        </p>

        {failure ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs leading-relaxed text-amber-200/90"
          >
            <svg className="mt-0.5 w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{failure.message}</span>
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            Cancel
          </button>
          {failure?.action === "signin" ? (
            <Link
              href="/auth/sign-in?redirect=%2Fdashboard"
              className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors"
            >
              Sign in
            </Link>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              aria-busy={pending}
              className="inline-flex min-w-[116px] items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:pointer-events-none"
            >
              {pending ? "Deleting…" : failure ? "Try again" : "Delete video"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
