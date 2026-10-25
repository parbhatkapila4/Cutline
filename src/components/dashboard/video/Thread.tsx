import type { ReactNode } from "react";
import { ChevronRight, Info } from "lucide-react";
import { RenderSteps } from "@/components/dashboard/video/RenderVisuals";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-[#f4b740]/25 border-t-[#ffd27a]",
        className
      )}
    />
  );
}

export function UserBubble({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="grid justify-items-end gap-1">
      {caption ? <p className="pr-1 text-[11.5px] text-zinc-600">{caption}</p> : null}
      <p className="max-w-[90%] whitespace-pre-wrap rounded-[16px_16px_6px_16px] bg-[#1b1b20] px-3.5 py-2.5 text-[13.5px] leading-[1.55] text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] [overflow-wrap:anywhere]">
        {children}
      </p>
    </div>
  );
}

export function AiMessage({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[26px_minmax(0,1fr)] items-start gap-[11px]">
      <span
        aria-hidden
        className="relative size-[26px] rounded-lg bg-linear-to-br from-[#2a2a30] to-[#18181c] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] after:absolute after:inset-y-1.5 after:left-3 after:w-0.5 after:rounded-full after:bg-[#f4b740] after:shadow-[0_0_8px_rgba(244,183,64,0.6)] after:content-['']"
      />
      <div className="grid min-w-0 gap-2.5 pt-[3px] text-[13.5px] leading-[1.6] text-zinc-400 [&_b]:font-[550] [&_b]:text-zinc-100">
        {children}
      </div>
    </div>
  );
}

type VersionCardProps = {
  title: string;
  meta: string;
  thumb: ReactNode;
  selected: boolean;
  onSelect: () => void;
};

export function VersionCard({ title, meta, thumb, selected, onSelect }: VersionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-[13px] py-2 pl-2 pr-3 text-left transition-[background-color,box-shadow] duration-150",
        selected
          ? "bg-[#141418] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.17),inset_0_1px_0_rgba(255,255,255,0.045)]"
          : "bg-[#0f0f12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.065),inset_0_1px_0_rgba(255,255,255,0.045)] hover:bg-[#141418]"
      )}
    >
      {thumb}
      <span className="grid min-w-0 flex-1 gap-0.5">
        <b className="text-[13px] font-[550] text-zinc-100">{title}</b>
        <span className="truncate text-xs text-zinc-500">{meta}</span>
      </span>
      {selected ? (
        <span className="shrink-0 rounded-md bg-white/[0.08] px-[7px] text-[11px] font-semibold leading-5 text-zinc-100">
          Viewing
        </span>
      ) : (
        <ChevronRight className="size-4 shrink-0 text-zinc-600" aria-hidden />
      )}
    </button>
  );
}

type RunCardProps = {
  title: string;
  elapsed: string;
  step: number;
  foot: ReactNode;
  action?: ReactNode;
};

export function RunCard({ title, elapsed, step, foot, action }: RunCardProps) {
  return (
    <div className="grid gap-3 rounded-[14px] bg-linear-to-b from-[#f4b740]/[0.07] to-[#f4b740]/[0.02] p-3.5 shadow-[inset_0_0_0_1px_rgba(244,183,64,0.2)]">
      <div className="flex items-center gap-[9px] text-zinc-100">
        <Spinner />
        <b className="min-w-0 flex-1 text-[13.5px] font-semibold">{title}</b>
        <span className="font-mono text-xs font-medium tabular-nums text-[#ffd27a]">{elapsed}</span>
      </div>
      <RenderSteps step={step} tone="card" />
      <div className="flex items-center justify-between gap-3 text-xs leading-normal text-zinc-500">
        <p>{foot}</p>
        {action}
      </div>
    </div>
  );
}

export function NoteBox({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-[9px] rounded-[11px] bg-[#f4b740]/[0.07] px-3 py-[9px] text-[12.5px] leading-normal text-[#f1d9a3] shadow-[inset_0_0_0_1px_rgba(244,183,64,0.16)]"
    >
      <Info className="mt-px size-[15px] shrink-0 text-[#f4b740]" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
