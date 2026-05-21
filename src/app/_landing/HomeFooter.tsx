"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PixelFlowerGarden from "@/components/PixelFlowerGarden";

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "How it works", href: "/how" },
  { label: "Contact", href: "/contact" },
];

const EMAILS: string[] = ["parbhat@parbhat.work"];

type SubscribeStatus = "idle" | "submitted" | "repeated" | "rejected";

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/;

export function HomeFooter() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubscribeStatus>("idle");
  const subscribedRef = useRef<Set<string>>(new Set());
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const onSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
      setStatus("rejected");
    } else if (subscribedRef.current.has(normalizedEmail)) {
      setStatus("repeated");
    } else {
      subscribedRef.current.add(normalizedEmail);
      setStatus("submitted");
      setName("");
      setEmail("");
    }

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setStatus("idle"), 3000);
  };

  const buttonLabel =
    status === "submitted"
      ? "Submitted"
      : status === "repeated"
        ? "Repeated"
        : status === "rejected"
          ? "Rejected"
          : "Subscribe";
  const buttonTone =
    status === "submitted"
      ? "text-emerald-700"
      : status === "repeated"
        ? "text-amber-700"
        : status === "rejected"
          ? "text-rose-700"
          : "text-[#0a0a0a]";

  return (
    <footer className="relative bg-[#070707] text-white overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
        }}
        aria-hidden
      />

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12 pt-20 lg:pt-24 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          <div className="md:col-span-5 lg:col-span-4">
            <h3 className="text-[15.5px] font-semibold tracking-[-0.012em] text-white mb-5 leading-tight">
              Don&rsquo;t miss out on future updates.
            </h3>
            <form onSubmit={onSubscribe} className="space-y-2.5" noValidate>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Name"
                placeholder="Name"
                required
                autoComplete="name"
                className="w-full px-4 py-3 bg-[#161616] border border-white/[0.07] text-[13.5px] text-white placeholder:text-zinc-500 rounded-md outline-none focus:border-white/25 focus:bg-[#1a1a1a] transition-colors"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email"
                placeholder="Email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-[#161616] border border-white/[0.07] text-[13.5px] text-white placeholder:text-zinc-500 rounded-md outline-none focus:border-white/25 focus:bg-[#1a1a1a] transition-colors"
              />
              <button
                type="submit"
                aria-live="polite"
                className="relative w-full h-[46px] bg-white text-[11.5px] font-bold tracking-[0.18em] uppercase rounded-md hover:bg-zinc-200 transition-colors shadow-[0_4px_18px_-6px_rgba(255,255,255,0.4)] overflow-hidden"
              >
                <AnimatePresence initial={false}>
                  <motion.span
                    key={status}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    className={`absolute inset-0 flex items-center justify-center ${buttonTone}`}
                  >
                    {buttonLabel}
                  </motion.span>
                </AnimatePresence>
              </button>
              <p className="text-[11.5px] text-zinc-500 pt-1.5">
                Unsubscribe anytime.
              </p>
            </form>

            <div className="mt-7 space-y-2.5 font-mono text-[10.5px] tracking-[0.16em] uppercase">
              <div className="flex items-center gap-2.5 text-zinc-200">
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-sm bg-emerald-400 opacity-70 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-sm bg-emerald-400" />
                </span>
                <span>First video free. No card.</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-400">
                <span
                  className="inline-block h-2 w-2 rounded-sm bg-emerald-400/60 shrink-0"
                  aria-hidden
                />
                <span>30-60s · 1080p MP4 · single-pass.</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-500">
                <span
                  className="inline-block h-2 w-2 rounded-sm bg-emerald-400/35 shrink-0"
                  aria-hidden
                />
                <span>12-stage AI director. Zero templates.</span>
              </div>
            </div>
          </div>

          <nav
            aria-label="Footer"
            className="md:col-span-3 lg:col-span-4 flex md:justify-center"
          >
            <ul className="space-y-3 font-mono text-[13px] tracking-[0.22em] uppercase">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group relative inline-flex items-center text-zinc-400 hover:text-white transition-colors"
                  >
                    <span
                      className="absolute -left-4 top-1/2 -translate-y-1/2 w-0 h-px bg-emerald-400 group-hover:w-3 transition-all duration-300"
                      aria-hidden
                    />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-4 lg:col-span-4 flex md:justify-end">
            <div className="space-y-1.5 min-w-[220px]">
              {EMAILS.map((mail) => (
                <a
                  key={mail}
                  href={`mailto:${mail}`}
                  className="block text-[13px] text-zinc-300 hover:text-white underline underline-offset-[3px] decoration-zinc-700 hover:decoration-emerald-400 transition-all"
                >
                  {mail}
                </a>
              ))}

              <div className="pt-4 space-y-1.5">
                <Link
                  href="/privacy"
                  className="block text-[13px] font-medium text-white underline underline-offset-[3px] decoration-zinc-600 hover:decoration-white transition-all"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="block text-[13px] font-medium text-white underline underline-offset-[3px] decoration-zinc-600 hover:decoration-white transition-all"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/changelog"
                  className="block text-[13px] font-medium text-white underline underline-offset-[3px] decoration-zinc-600 hover:decoration-white transition-all"
                >
                  Changelog
                </Link>
              </div>

              <div className="pt-5 flex items-center gap-4 text-zinc-500">
                <a
                  href="https://github.com/parbhatkapila4/cutline"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="group inline-flex hover:text-white transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[15px] h-[15px] transition-transform group-hover:-translate-y-px"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.438 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12.5c0-6.63-5.37-12-12-12z" />
                  </svg>
                </a>
                <a
                  href="https://x.com/Parbhat03"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X / Twitter"
                  className="group inline-flex hover:text-white transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[13px] h-[13px] transition-transform group-hover:-translate-y-px"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/in/parbhat-kapila/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="group inline-flex hover:text-white transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[14px] h-[14px] transition-transform group-hover:-translate-y-px"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href="https://discord.gg/weAfbtKGtx"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Discord"
                  className="group inline-flex hover:text-white transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[15px] h-[15px] transition-transform group-hover:-translate-y-px"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0188 1.3332-.946 2.4189-2.1569 2.4189zm7.9748 0c-1.1826 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                </a>
              </div>

              <div className="pt-6">
                <Link
                  href="/status"
                  className="group inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase text-zinc-400 hover:text-white transition-colors"
                >
                  <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <span>All systems operational</span>
                  <span className="text-zinc-700" aria-hidden>·</span>
                  <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">v1.0.0</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 z-10">
          <div className="text-center">
            <p className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-zinc-500 mb-2">
              © 2026
            </p>
            <p
              className="text-[20px] sm:text-[22px] text-white leading-[1.2]"
              style={{
                fontFamily: 'Georgia, "Times New Roman", ui-serif, serif',
                fontStyle: "italic",
              }}
            >
              Cutline.
            </p>
            <p className="text-[13px] text-zinc-400 mt-1 tracking-[-0.005em]">
              One sentence in. One video out.
            </p>
          </div>
        </div>

        <div className="relative opacity-90">
          <PixelFlowerGarden />
        </div>
      </div>

      <div
        className="relative pointer-events-none select-none -mt-4 lg:-mt-8"
        aria-hidden
      >
        <h2
          className="text-center font-semibold leading-[0.82] whitespace-nowrap"
          style={{
            fontSize: "clamp(5.5rem, 23vw, 21rem)",
            letterSpacing: "-0.055em",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.02) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Cutline
        </h2>
      </div>

      <div className="relative px-6 lg:px-12 pb-5 pt-1">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.22em] uppercase text-zinc-600">
          <span>sentence</span>
          <span className="text-zinc-700" aria-hidden>→</span>
          <span>mp4</span>
          <span className="text-zinc-800" aria-hidden>·</span>
          <span>
            <span className="text-zinc-400">12</span> stages
          </span>
          <span className="text-zinc-800" aria-hidden>·</span>
          <span>
            <span className="text-zinc-400">4</span> phases
          </span>
          <span className="text-zinc-800" aria-hidden>·</span>
          <span>1080p</span>
          <span className="text-zinc-800" aria-hidden>·</span>
          <span>single-pass</span>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
        }}
        aria-hidden
      />
    </footer>
  );
}
