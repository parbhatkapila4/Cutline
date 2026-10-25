"use client";

import Link from "next/link";
import type { FormEvent, RefObject } from "react";
import {
  ArrowUp,
  Briefcase,
  ChevronDown,
  Layers,
  Megaphone,
  Shuffle,
  Smile,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Spinner } from "@/components/dashboard/video/Thread";
import { BTN_GHOST, BTN_GOLD } from "@/components/dashboard/video/buttons";
import {
  EDIT_IDEA_PROMPTS,
  EDIT_QUICK_PROMPTS,
  MAX_EDIT_MESSAGE_CHARS,
  type EditQuickPrompt,
  type EditQuickPromptCategory,
} from "@/lib/dashboard/editQuickPrompts";
import { cn } from "@/lib/utils";

const QUICK_ICONS: Record<EditQuickPrompt["id"], LucideIcon> = {
  casual: Smile,
  professional: Briefcase,
  punchier: Zap,
  detail: Layers,
  cta: Megaphone,
  angle: Shuffle,
};

const CATEGORY_TINT: Record<EditQuickPromptCategory, string> = {
  tone: "text-[#f4b740]",
  length: "text-[#5ee0c8]",
  structure: "text-[#8be09f]",
  angle: "text-[#7cc6fb]",
};

const CHIP =
  "inline-flex min-h-[30px] items-center gap-[7px] rounded-full bg-[#141418] pl-[9px] pr-[11px] text-[12.5px] font-medium text-zinc-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-[background-color,color,box-shadow] duration-150 hover:bg-[#1b1b20] hover:text-zinc-100 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.17)] disabled:pointer-events-none disabled:opacity-45";

export function QuickEdits({ disabled, onPick }: { disabled: boolean; onPick: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EDIT_QUICK_PROMPTS.map((prompt) => {
        const Icon = QUICK_ICONS[prompt.id];
        return (
          <button
            key={prompt.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(prompt.text)}
            title={`${prompt.text}. ${prompt.outcome}.`}
            className={CHIP}
          >
            <Icon className={cn("size-3.5 shrink-0", CATEGORY_TINT[prompt.category])} aria-hidden />
            {prompt.label}
          </button>
        );
      })}
    </div>
  );
}

type MoreIdeasProps = {
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onPick: (text: string) => void;
};

export function MoreIdeas({ open, disabled, onToggle, onPick }: MoreIdeasProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={open}
        className="inline-flex items-center gap-[5px] py-0.5 text-[12.5px] font-medium text-zinc-500 transition-colors hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-45"
      >
        More ideas
        <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {EDIT_IDEA_PROMPTS.map((idea) => (
            <button
              key={idea}
              type="button"
              disabled={disabled}
              onClick={() => onPick(idea)}
              className={cn(CHIP, "px-3 py-1.5 text-left leading-[1.35]")}
            >
              {idea}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  busyLabel: string | null;
  placeholder: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function Composer({ value, onChange, onSubmit, disabled, busyLabel, placeholder, textareaRef }: ComposerProps) {
  const count = value.length;
  const canSend = !disabled && value.trim().length > 0;
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (canSend) onSubmit();
  };
  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative rounded-2xl bg-[#0f0f12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.045),0_10px_30px_-14px_rgba(0,0,0,0.7)] transition-shadow duration-200",
        "focus-within:shadow-[inset_0_0_0_1px_rgba(244,183,64,0.36),0_0_0_4px_rgba(244,183,64,0.09),0_10px_30px_-14px_rgba(0,0,0,0.7)]",
        disabled && "opacity-60"
      )}
    >
      <label htmlFor="edit-with-ai" className="sr-only">
        Describe a change
      </label>
      <textarea
        id="edit-with-ai"
        ref={textareaRef}
        value={value}
        rows={2}
        maxLength={MAX_EDIT_MESSAGE_CHARS}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        className="block max-h-40 min-h-[52px] w-full resize-none bg-transparent px-[15px] pb-0.5 pt-[13px] text-sm leading-[1.55] text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:cursor-not-allowed"
      />
      <div className="flex items-center gap-2.5 pb-2 pl-[15px] pr-2 pt-1.5">
        {busyLabel ? (
          <span className="mr-auto inline-flex min-w-0 items-center gap-2 truncate text-xs text-[#ffd27a]">
            <Spinner />
            {busyLabel}
          </span>
        ) : (
          <span className="mr-auto flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11.5px] text-zinc-600 max-[899px]:hidden">
            <kbd className="inline-grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-white/6 px-1 font-mono text-[10.5px] text-zinc-500 shadow-[inset_0_-1px_0_rgba(0,0,0,0.35)]">
              ⏎
            </kbd>
            to send
            <kbd className="inline-grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-white/6 px-1 font-mono text-[10.5px] text-zinc-500 shadow-[inset_0_-1px_0_rgba(0,0,0,0.35)]">
              ⇧⏎
            </kbd>
            new line
          </span>
        )}
        <span
          className={cn(
            "ml-auto font-mono text-[11px] tabular-nums",
            count >= MAX_EDIT_MESSAGE_CHARS - 30 ? "text-[#f4b740]" : "text-zinc-600"
          )}
        >
          {count}/{MAX_EDIT_MESSAGE_CHARS}
        </span>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-linear-to-b from-[#ffd27a] to-[#f2a92c] text-[#1b1405] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_0_1px_rgba(242,169,44,0.5),0_6px_16px_-6px_rgba(244,183,64,0.6)] transition-[opacity,filter] duration-150 disabled:cursor-not-allowed disabled:bg-none disabled:bg-[#232328] disabled:text-zinc-600 disabled:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <ArrowUp className="size-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}

export function UpgradeCard({ flash }: { flash: boolean }) {
  return (
    <div
      className={cn(
        "relative grid gap-2.5 overflow-hidden rounded-2xl bg-[#0f0f12] bg-[radial-gradient(120%_140%_at_100%_0%,rgba(244,183,64,0.16),transparent_55%)] p-[18px] transition-shadow duration-300",
        flash
          ? "shadow-[inset_0_0_0_1px_rgba(244,183,64,0.36),0_0_0_4px_rgba(244,183,64,0.12)]"
          : "shadow-[inset_0_0_0_1px_rgba(244,183,64,0.22),inset_0_1px_0_rgba(255,255,255,0.045)]"
      )}
    >
      <span className="grid size-[34px] place-items-center rounded-[10px] bg-linear-to-br from-[#ffd27a] to-[#f2a92c] text-[#1b1405] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_20px_-8px_rgba(244,183,64,0.7)]">
        <Wand2 className="size-4" aria-hidden />
      </span>
      <p className="text-[14.5px] font-semibold tracking-[-0.01em] text-zinc-100">Edit with AI is on Pro</p>
      <p className="text-[12.5px] leading-[1.55] text-zinc-400">
        Describe a change and Cutline re-renders the video for you. Included with Professional and Enterprise.
      </p>
      <div className="mt-1 flex items-center gap-2">
        <Link href="/pricing" className={BTN_GOLD}>
          Upgrade to Pro
        </Link>
        <Link href="/pricing" className={BTN_GHOST}>
          See plans
        </Link>
      </div>
    </div>
  );
}
