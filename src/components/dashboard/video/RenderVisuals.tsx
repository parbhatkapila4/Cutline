import type { CSSProperties, ReactNode } from "react";
import { Archive, Check, TriangleAlert } from "lucide-react";
import { PIPELINE_STEPS } from "@/components/generate/constants";
import { cn } from "@/lib/utils";

const STEP_TONES = {
  glass: {
    next: "text-white/40",
    done: "text-white/72",
    now: "text-white",
  },
  card: {
    next: "text-zinc-500",
    done: "text-zinc-400",
    now: "text-zinc-100",
  },
} as const;

export function RenderSteps({ step, tone }: { step: number; tone: keyof typeof STEP_TONES }) {
  return (
    <ol className="grid gap-2">
      {PIPELINE_STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "now" : "next";
        return (
          <li key={label} className={cn("flex items-center gap-2.5 text-[12.5px]", STEP_TONES[tone][state])}>
            <i
              aria-hidden
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full not-italic",
                state === "done" && "bg-[#f4b740]/20 text-[#ffd27a]",
                state === "now" && "shadow-[inset_0_0_0_1.5px_#f4b740]",
                state === "next" && "shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.2)]"
              )}
            >
              {state === "done" ? <Check className="size-2.5" strokeWidth={3} /> : null}
              {state === "now" ? <span className="size-1.5 animate-pulse rounded-full bg-[#f4b740]" /> : null}
            </i>
            {label}
            {state === "now" ? <span className="sr-only"> (in progress)</span> : null}
            {state === "done" ? <span className="sr-only"> (done)</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

type RenderingFrameProps = {
  step: number;
  title: string;
  detail: ReactNode;
  footer: [string, string];
};

export function RenderingFrame({ step, title, detail, footer }: RenderingFrameProps) {
  const total = PIPELINE_STEPS.length;
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 grid place-items-center overflow-hidden bg-[#0b0a09] @container"
    >
      <div className="vd-aura" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="vd-grain" aria-hidden />
      <div className="relative z-[1] grid w-[min(86%,340px)] gap-3.5 rounded-2xl bg-[rgba(16,15,14,0.55)] p-[18px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-[18px] backdrop-saturate-[1.3] @max-[300px]:gap-3 @max-[300px]:p-3.5">
        <div className="flex items-center gap-[13px]">
          <div className="relative grid shrink-0 place-items-center">
            <div className="vd-ring size-[42px]" style={{ "--p": (step + 0.5) / total } as CSSProperties} />
            <b className="absolute font-mono text-[11px] font-semibold text-white">
              {step + 1}/{total}
            </b>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-[-0.01em] text-white">{title}</p>
            <p className="mt-0.5 text-xs text-white/60">{detail}</p>
          </div>
        </div>
        <div className="@max-[300px]:hidden">
          <RenderSteps step={step} tone="glass" />
        </div>
        <div className="flex justify-between gap-2.5 text-[11.5px] text-white/45 @max-[300px]:hidden">
          <span>{footer[0]}</span>
          <span>{footer[1]}</span>
        </div>
      </div>
    </div>
  );
}

type UnavailableFrameProps = {
  kind: "expired" | "failed";
  title: string;
  body: string;
  actions?: ReactNode;
};

export function UnavailableFrame({ kind, title, body, actions }: UnavailableFrameProps) {
  const Icon = kind === "expired" ? Archive : TriangleAlert;
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden bg-[#0a0a0b] @container">
      <div className="vd-aura is-still" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="vd-grain" aria-hidden />
      <div className="relative z-[1] grid w-[min(86%,360px)] justify-items-center gap-2 rounded-[18px] bg-[rgba(14,14,16,0.5)] px-5 pb-5 pt-[22px] text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-[18px] @max-[300px]:px-3.5 @max-[300px]:py-4">
        <span className="mb-1 grid size-10 place-items-center rounded-xl bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
          <Icon className={cn("size-[19px]", kind === "failed" && "text-[#ffd27a]")} aria-hidden />
        </span>
        <p className="text-[15.5px] font-semibold tracking-[-0.015em] text-white">{title}</p>
        <p className="text-[12.5px] leading-[1.55] text-pretty text-white/62 @max-[300px]:hidden">{body}</p>
        {actions ? <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
