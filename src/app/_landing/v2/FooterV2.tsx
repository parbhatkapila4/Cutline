"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Container, Eyebrow, PillButton } from "./primitives";

type SubscribeStatus = "idle" | "submitted" | "repeated" | "rejected";

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/;

const PRODUCT_LINKS: { label: string; href: string }[] = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "How it works", href: "/how" },
  { label: "Docs", href: "/docs" },
  { label: "Changelog", href: "/changelog" },
  { label: "Status", href: "/status" },
];

const COMPANY_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Contact", href: "/contact" },
  { label: "Email us", href: "mailto:parbhat@parbhat.work", external: true },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

const SOCIAL_LINKS: { label: string; href: string }[] = [
  { label: "GitHub", href: "https://github.com/parbhatkapila4/cutline" },
  { label: "X", href: "https://x.com/Parbhat03" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/parbhat-kapila/" },
  { label: "Discord", href: "https://discord.gg/weAfbtKGtx" },
];

const COLUMN_HEADING_CLS =
  "font-mono text-[11px] uppercase tracking-[0.14em] text-[#111]/50";
const LINK_CLS =
  "font-sans text-[14.5px] text-[#111]/70 hover:text-[#111] transition-colors";
const INPUT_CLS =
  "w-full bg-transparent border-b border-[#111]/20 focus:border-[#111] outline-none py-2 text-[15px] font-sans text-[#111] placeholder:text-[#111]/35 transition-colors";

export function FooterV2() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubscribeStatus>("idle");
  const subscribedRef = useRef<Set<string>>(new Set());
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailErrorId = useId();

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const onSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    if (!trimmedName || !normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
      setStatus("rejected");
    } else if (subscribedRef.current.has(normalizedEmail)) {
      setStatus("repeated");
    } else {
      subscribedRef.current.add(normalizedEmail);
      setStatus("submitted");
      setName("");
      setEmail("");
      resetTimerRef.current = setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const buttonLabel = status === "submitted" ? "Submitted" : "Subscribe";
  const errorMessage =
    status === "rejected"
      ? "Enter a valid email."
      : status === "repeated"
        ? "You’re already subscribed."
        : null;

  return (
    <footer className="bg-[#f4f3ec] border-t border-[#111]/10">
      <Container className="py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] gap-10">
          <div>
            <Eyebrow className="mb-4">Stay in the loop</Eyebrow>
            <h3 className="font-display font-normal text-[28px] leading-[1.1] tracking-[-0.01em] text-[#111]">
              Don&rsquo;t miss out on future updates.
            </h3>
            <form onSubmit={onSubscribe} noValidate className="mt-6 space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Name"
                placeholder="Name"
                required
                autoComplete="name"
                className={INPUT_CLS}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "rejected" || status === "repeated") {
                    setStatus("idle");
                  }
                }}
                aria-label="Email"
                placeholder="Email"
                required
                autoComplete="email"
                aria-invalid={errorMessage ? true : undefined}
                aria-describedby={errorMessage ? emailErrorId : undefined}
                className={INPUT_CLS}
              />
              {errorMessage ? (
                <p
                  id={emailErrorId}
                  role="alert"
                  className="font-sans text-[12.5px] text-[#ff5600]"
                >
                  {errorMessage}
                </p>
              ) : null}
              <PillButton type="submit" variant="primary" className="mt-2">
                <span aria-live="polite">{buttonLabel}</span>
              </PillButton>
              <p className="font-mono text-[11px] text-[#111]/45 pt-1">
                Unsubscribe anytime.
              </p>
            </form>
          </div>
          <nav aria-label="Product">
            <h4 className={COLUMN_HEADING_CLS}>Product</h4>
            <ul className="mt-5 space-y-2.5">
              {PRODUCT_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={LINK_CLS}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Company">
            <h4 className={COLUMN_HEADING_CLS}>Company</h4>
            <ul className="mt-5 space-y-2.5">
              {COMPANY_LINKS.map((item) => (
                <li key={item.href}>
                  {item.external ? (
                    <a href={item.href} className={LINK_CLS}>
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className={LINK_CLS}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Social">
            <h4 className={COLUMN_HEADING_CLS}>Social</h4>
            <ul className="mt-5 space-y-2.5">
              {SOCIAL_LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_CLS}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
      <Container className="overflow-hidden">
        <div
          aria-hidden
          className="select-none h-[0.62em] overflow-hidden w-full font-display font-normal text-[26vw] lg:text-[320px] leading-[0.8] tracking-[-0.04em] text-[#111]/95 whitespace-nowrap"
        >
          Cutline
        </div>
      </Container>
      <div className="border-t border-[#111]/10">
        <Container className="py-5">
          <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-[#111]/45">
            <span>© 2026 Cutline - One sentence in. One video out.</span>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span>sentence → mp4 · 12 stages · 4K · single-pass</span>
              <Link
                href="/status"
                className="hover:text-[#ff5600] transition-colors"
              >
                Status
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}
