"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { pillClasses, type PillSize } from "./pill-styles";
const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-[1360px] mx-auto px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-[12px] uppercase tracking-[0.14em] text-[#111]/55 ${className}`}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const alignCls = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`max-w-[880px] ${alignCls} ${className}`}>
      {eyebrow ? <Eyebrow className="mb-5">{eyebrow}</Eyebrow> : null}
      <h2 className="font-display font-normal text-[44px] sm:text-[60px] lg:text-[72px] leading-[1.0] tracking-[-0.02em] text-[#111]">
        {title}
      </h2>
      {lede ? (
        <p
          className={`mt-6 text-[17px] sm:text-[19px] leading-[1.5] text-[#111]/70 font-sans max-w-[640px] ${align === "center" ? "mx-auto" : ""}`}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}

export function PillLink({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
  external = false,
}: {
  href: string;
  variant?: "primary" | "secondary";
  size?: PillSize;
  children: ReactNode;
  className?: string;
  external?: boolean;
}) {
  const cls = `${pillClasses(variant, size)} ${className}`;
  if (external || href.startsWith("http") || href.startsWith("mailto:")) {
    return (
      <a
        href={href}
        className={cls}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function PillButton({
  onClick,
  variant = "primary",
  size = "md",
  children,
  className = "",
  type = "button",
  disabled = false,
}: {
  onClick?: () => void;
  variant?: "primary" | "secondary";
  size?: PillSize;
  children: ReactNode;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${pillClasses(variant, size)} disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function TextArrowLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const cls = `inline-flex items-center gap-1.5 text-[15px] font-medium text-[#111] hover:text-[#ff5600] transition-colors ${className}`;
  const arrow = (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
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
        {children}
        {arrow}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
      {arrow}
    </Link>
  );
}

const STRIP_ASPECTS = [
  "3/4",
  "1/1",
  "4/3",
  "9/16",
  "4/3",
  "3/4",
  "1/1",
] as const;

export function MediaStrip({
  images,
  className = "",
}: {
  images: string[];
  className?: string;
}) {
  const tiles = images.map((src, i) => ({
    src,
    aspect: STRIP_ASPECTS[i % STRIP_ASPECTS.length],
  }));
  const renderTiles = (ariaHidden: boolean) => (
    <div className="flex gap-3 pr-3" aria-hidden={ariaHidden || undefined}>
      {tiles.map((t) => (
        <div
          key={t.src}
          className="relative h-[240px] sm:h-[320px] rounded-xl overflow-hidden bg-[#111]/5 shrink-0"
          style={{ aspectRatio: t.aspect }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={t.src}
            alt=""
            loading={ariaHidden ? "lazy" : "eager"}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
  return (
    <div className={`v2-marquee overflow-hidden ${className}`}>
      <div className="v2-marquee-track flex w-max">
        {renderTiles(false)}
        {renderTiles(true)}
      </div>
    </div>
  );
}

export type AccordionItem = {
  id: string;
  title: string;
  body: string;
  linkHref?: string;
  linkLabel?: string;
};

export function AccordionList({
  items,
  openId: controlledOpenId,
  onOpen,
  className = "",
}: {
  items: AccordionItem[];
  openId?: string;
  onOpen?: (id: string) => void;
  className?: string;
}) {
  const [uncontrolledOpenId, setUncontrolledOpenId] = useState<string>(
    items[0]?.id ?? "",
  );
  const listId = useId();
  const openId = controlledOpenId ?? uncontrolledOpenId;
  const setOpen = (id: string) => {
    onOpen?.(id);
    if (controlledOpenId === undefined) setUncontrolledOpenId(id);
  };
  return (
    <ul className={`border-t border-[#111]/10 ${className}`}>
      {items.map((item) => {
        const open = item.id === openId;
        const buttonId = `${listId}-btn-${item.id}`;
        const panelId = `${listId}-panel-${item.id}`;
        return (
          <li key={item.id} className="border-b border-[#111]/10">
            <button
              type="button"
              id={buttonId}
              onClick={() => setOpen(item.id)}
              aria-expanded={open}
              aria-controls={panelId}
              className="w-full flex items-center justify-between gap-4 py-5 text-left group"
            >
              <span className="font-sans text-[16px] sm:text-[17px] font-medium text-[#111]">
                {item.title}
              </span>
              <span
                aria-hidden
                className={`shrink-0 text-[#111]/50 group-hover:text-[#111] transition-transform duration-200 ${open ? "rotate-45" : ""}`}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <div className="pb-6 pr-10">
                  <p className="text-[15.5px] leading-[1.55] text-[#111]/65 font-sans">
                    {item.body}
                  </p>
                  {item.linkHref ? (
                    <TextArrowLink href={item.linkHref} className="mt-3">
                      {item.linkLabel ?? "Learn more"}
                    </TextArrowLink>
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

export function TestimonialFigure({
  quote,
  name,
  role,
  avatarSrc,
  className = "",
}: {
  quote: string;
  name: string;
  role: string;
  avatarSrc?: string;
  className?: string;
}) {
  return (
    <figure className={`max-w-[1080px] ${className}`}>
      <blockquote className="font-display font-normal text-[30px] sm:text-[42px] lg:text-[52px] leading-[1.12] tracking-[-0.01em] text-[#111]">
        {quote}
      </blockquote>
      <figcaption className="mt-8 flex items-center gap-3.5">
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            className="w-11 h-11 rounded-full object-cover"
          />
        ) : null}
        <span className="flex flex-col">
          <span className="font-sans text-[15px] font-medium text-[#111]">
            {name}
          </span>
          <span className="font-sans text-[14px] text-[#111]/55">{role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

const HANDLE_BASE =
  "relative inline-flex items-center justify-center rounded-[3px] px-5 py-2.5 font-sans text-[14px] font-medium text-[#111] transition-colors whitespace-nowrap";

function CornerHandles() {
  const handle = "absolute h-[7px] w-[7px] border border-[#111]/50 bg-white";
  return (
    <span aria-hidden>
      <span className={`${handle} -left-[4px] -top-[4px]`} />
      <span className={`${handle} -right-[4px] -top-[4px]`} />
      <span className={`${handle} -bottom-[4px] -left-[4px]`} />
      <span className={`${handle} -bottom-[4px] -right-[4px]`} />
    </span>
  );
}

export function HandleLink({
  href,
  variant = "primary",
  children,
  className = "",
}: {
  href: string;
  variant?: "primary" | "secondary";
  children: ReactNode;
  className?: string;
}) {
  const style =
    variant === "primary"
      ? "border border-[#111]/30 bg-[#ffe9e0] hover:bg-[#ffdccd]"
      : "border border-[#111]/20 bg-white hover:border-[#111]/50";
  return (
    <Link href={href} className={`${HANDLE_BASE} ${style} ${className}`}>
      {children}
      {variant === "primary" ? <CornerHandles /> : null}
    </Link>
  );
}

export function CornerDots({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 m-3 xl:m-4 hidden md:block text-[#ff5600] ${className}`}
    >
      <span className="absolute top-0 left-0 size-2 bg-current" />
      <span className="absolute top-0 right-0 size-2 bg-current" />
      <span className="absolute bottom-0 left-0 size-2 bg-current" />
      <span className="absolute bottom-0 right-0 size-2 bg-current" />
    </div>
  );
}

export function Section({
  children,
  className = "",
  rule = false,
  compact = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  rule?: boolean;
  compact?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`${compact ? "py-14 sm:py-16" : "py-20 sm:py-28 lg:py-32"} ${rule ? "border-t border-[#111]/10" : ""} ${className}`}
    >
      {children}
    </section>
  );
}
