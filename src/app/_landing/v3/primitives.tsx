"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { btnClasses, type BtnSize, type BtnVariant } from "./styles";
const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useLive<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || live) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setLive(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [live]);

  return { ref, live };
}

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1400px] px-5 sm:px-10 ${className}`}>
      {children}
    </div>
  );
}

export function ArrowNE({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 17L17 7M9 7h8v8"
      />
    </svg>
  );
}

export function Btn({
  href,
  variant = "light",
  size = "md",
  children,
  className = "",
  arrow = true,
}: {
  href: string;
  variant?: BtnVariant;
  size?: BtnSize;
  children: ReactNode;
  className?: string;
  arrow?: boolean;
}) {
  const cls = `${btnClasses(variant, size)} ${className}`;
  const inner = (
    <>
      {children}
      {arrow ? <ArrowNE /> : null}
    </>
  );
  if (href.startsWith("http") || href.startsWith("mailto:")) {
    return (
      <a
        href={href}
        className={cls}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

export function MonoChip({
  children,
  tone = "light",
  className = "",
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const toneCls =
    tone === "dark"
      ? "border-[#f4f3f3]/35 text-[#f4f3f3]/80"
      : "border-[#1d1c1b]/35 text-[#1d1c1b]/75";
  return (
    <span
      className={`inline-flex items-center rounded-[5px] border px-2 py-[3px] font-plex text-[10.5px] uppercase tracking-[0.07em] ${toneCls} ${className}`}
    >
      {children}
    </span>
  );
}

export function RuleHeader({
  title,
  lede,
  action,
  tone = "light",
  className = "",
}: {
  title: ReactNode;
  lede?: ReactNode;
  action?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const rule = tone === "dark" ? "border-[#f4f3f3]/16" : "border-[#1d1c1b]/16";
  const titleCls = tone === "dark" ? "text-[#f4f3f3]" : "text-[#1d1c1b]";
  const ledeCls = tone === "dark" ? "text-[#f4f3f3]/75" : "text-[#1d1c1b]/75";
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${className}`}>
      <div className={`border-l ${rule} py-2 pl-6 sm:pl-10`}>
        <h2
          className={`font-sans font-normal tracking-[-0.03em] leading-[1.06] text-[38px] sm:text-[48px] lg:text-[56px] ${titleCls}`}
        >
          {title}
        </h2>
      </div>
      <div
        className={`border-l md:border-r ${rule} mt-8 py-2 pl-6 sm:pl-10 md:mt-0`}
      >
        {lede ? (
          <p
            className={`max-w-[340px] font-sans text-[15px] font-medium leading-[1.5] ${ledeCls}`}
          >
            {lede}
          </p>
        ) : null}
        {action ? <div className="mt-7">{action}</div> : null}
      </div>
    </div>
  );
}

export function Band({
  children,
  className = "",
  id,
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "light" | "dark" | "bare";
}) {
  const bg =
    tone === "dark" ? "bg-[#1d1c1b]" : tone === "light" ? "bg-[#f4f3f3]" : "";
  return (
    <section id={id} className={`py-20 sm:py-28 lg:py-32 ${bg} ${className}`}>
      {children}
    </section>
  );
}

export type NumberedItem = {
  id: string;
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

export function NumberedList({
  items,
  openId,
  onOpen,
  tone = "dark",
  numbered = true,
  bodyWidth = "max-w-[300px]",
}: {
  items: NumberedItem[];
  openId: string;
  onOpen: (id: string) => void;
  tone?: "light" | "dark";
  numbered?: boolean;
  bodyWidth?: string;
}) {
  const dark = tone === "dark";
  return (
    <ul className="min-w-0 space-y-1">
      {items.map((item, i) => {
        const open = item.id === openId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onOpen(item.id)}
              aria-expanded={open}
              className={`flex w-full items-baseline gap-3 rounded-[14px] px-5 py-4 text-left transition-colors ${
                open
                  ? dark
                    ? "bg-[#f4f3f3]/[0.07] text-[#f4f3f3]"
                    : "bg-[#1d1c1b]/[0.05] text-[#1d1c1b]"
                  : dark
                    ? "text-[#f4f3f3]/70 hover:text-[#f4f3f3]"
                    : "text-[#1d1c1b]/60 hover:text-[#1d1c1b]"
              }`}
            >
              {numbered ? (
                <span className="font-sans text-[17px] font-normal tabular-nums">
                  {i + 1}.
                </span>
              ) : null}
              <span className="font-sans text-[17px] font-normal tracking-[-0.01em]">
                {item.title}
              </span>
            </button>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 pt-3">
                  <p
                    className={`${bodyWidth} font-sans text-[14.5px] font-medium leading-[1.5] ${
                      dark ? "text-[#f4f3f3]/70" : "text-[#1d1c1b]/70"
                    }`}
                  >
                    {item.body}
                  </p>
                  {item.href ? (
                    <Btn
                      href={item.href}
                      variant={dark ? "dark" : "light"}
                      size="sm"
                      className="mt-6"
                    >
                      {item.linkLabel ?? "Learn more"}
                    </Btn>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function LeaderLabel({
  label,
  caption,
  stem = "down",
  stemLength = "h-10",
  captionClassName = "",
  className = "",
}: {
  label: string;
  caption?: ReactNode;
  stem?: "up" | "down" | "none";
  stemLength?: string;
  captionClassName?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {stem === "up" ? (
        <span
          aria-hidden
          className={`mb-3 w-px bg-[#f4f3f3]/25 ${stemLength}`}
        />
      ) : null}
      <MonoChip tone="dark">{label}</MonoChip>
      {caption ? (
        <p
          className={`mt-2.5 max-w-[190px] font-sans text-[12.5px] font-medium leading-[1.45] text-[#f4f3f3]/55 ${captionClassName}`}
        >
          {caption}
        </p>
      ) : null}
      {stem === "down" ? (
        <span
          aria-hidden
          className={`mt-3 w-px bg-[#f4f3f3]/25 ${stemLength}`}
        />
      ) : null}
    </div>
  );
}
