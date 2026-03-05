"use client";

import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

type Props = {
  videoUrl: string;
};

export function CopyLinkButton({ videoUrl }: Props) {
  const { copy, copied } = useCopyToClipboard();

  return (
    <button
      type="button"
      onClick={() => copy(videoUrl)}
      className="inline-flex items-center gap-2 text-zinc-400 hover:text-white font-medium px-5 py-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors text-sm"
      aria-label="Copy link"
      aria-live="polite"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}
