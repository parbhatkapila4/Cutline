"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { authClient, useCachedSession } from "@/lib/auth-client";
import { Container, HandleLink, useHydrated } from "./primitives";

const TICKER_ITEMS = [
  {
    emoji: "🎬",
    text: "New: brand kits lock your look across every render",
    href: "/features",
  },
  {
    emoji: "⚡",
    text: "From one sentence to a 1080p MP4 in about 60 seconds",
    href: "/how",
  },
  {
    emoji: "🔌",
    text: "API v1: batch generation with webhook callbacks",
    href: "/docs",
  },
  {
    emoji: "🆓",
    text: "Your first video is free - no card required",
    href: "/auth/sign-in",
  },
] as const;

function TickerRow({ ariaHidden }: { ariaHidden: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center"
      aria-hidden={ariaHidden || undefined}
    >
      {TICKER_ITEMS.map((item) => (
        <Link
          key={item.text}
          href={item.href}
          tabIndex={ariaHidden ? -1 : undefined}
          className="flex items-center gap-2 px-10 font-mono text-[12px] text-[#111]/75 hover:text-[#111] transition-colors"
        >
          <span aria-hidden>{item.emoji}</span>
          <span className="whitespace-nowrap">{item.text}</span>
          <span aria-hidden>→</span>
        </Link>
      ))}
    </div>
  );
}

const NAV_LINK_CLS =
  "px-3 py-1.5 text-[14px] font-medium text-[#111]/70 hover:text-[#111] transition-colors";

export function NavbarV2() {
  const { data: sessionData, isPending: sessionPending } = useCachedSession();
  const sessionUser = sessionData?.user;
  const mounted = useHydrated();
  const isLoggedIn = mounted && !sessionPending && !!sessionData;
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onDocPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const menu = document.getElementById("v2-account-menu");
      if (menu?.contains(target)) return;
      setAccountMenuOpen(false);
    };
    const onDocKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [accountMenuOpen]);

  return (
    <header className="font-sans">
      <div className="v2-ticker overflow-hidden border-b border-[#111]/10 bg-[#faf9f6] py-2.5">
        <div className="v2-ticker-track flex w-max">
          <TickerRow ariaHidden={false} />
          <TickerRow ariaHidden />
        </div>
      </div>
      <nav className="sticky top-0 z-50 border-b border-[#111]/10 bg-[#f7f5f1]/90 backdrop-blur">
        <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="hidden items-center justify-start md:flex">
            <Link href="/features" className={NAV_LINK_CLS}>
              Features
            </Link>
            <Link href="/pricing" className={NAV_LINK_CLS}>
              Pricing
            </Link>
            <Link href="/how" className={NAV_LINK_CLS}>
              How it works
            </Link>
          </div>
          <div className="md:hidden" aria-hidden />
          <Link
            href="/"
            className="flex items-center gap-2.5 justify-self-center"
          >
            <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-[8px] bg-[#0b0b0b]">
              <Image
                src="/cutline-logo.png"
                alt=""
                width={1280}
                height={720}
                priority
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "78% 50%" }}
              />
            </span>
            <span className="text-[17px] font-bold tracking-[-0.02em] text-[#111]">
              Cutline
            </span>
          </Link>
          <div className="flex items-center justify-end gap-1.5">
            <Link
              href="/docs"
              className={`${NAV_LINK_CLS} hidden md:inline-flex`}
            >
              Docs
            </Link>
            {isLoggedIn && sessionUser ? (
              <Link
                href="/dashboard"
                className={`${NAV_LINK_CLS} hidden md:inline-flex`}
              >
                Dashboard
              </Link>
            ) : null}

            {!mounted || sessionPending ? (
              <div
                className="h-9 w-[150px] animate-pulse rounded-[3px] bg-[#111]/5"
                aria-hidden
              />
            ) : isLoggedIn && sessionUser ? (
              <>
                <HandleLink href="/dashboard" className="ml-1.5">
                  Dashboard
                </HandleLink>
                <div id="v2-account-menu" className="relative ml-1.5">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((v) => !v)}
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#111]/15 bg-[#faf9f6] transition-colors hover:border-[#111]/40"
                  >
                    {typeof sessionUser.image === "string" &&
                    sessionUser.image.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sessionUser.image}
                        alt=""
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center rounded-full bg-[#111]/5 text-[12px] font-semibold text-[#111]/70">
                        {(
                          sessionUser.name?.trim()?.[0] ??
                          sessionUser.email?.trim()?.[0] ??
                          "?"
                        ).toUpperCase()}
                      </span>
                    )}
                  </button>
                  {accountMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+8px)] z-40 min-w-[200px] rounded-xl border border-[#111]/10 bg-[#faf9f6] p-1.5 shadow-[0_16px_32px_-20px_rgba(0,0,0,0.35)]"
                    >
                      <div className="mb-1 border-b border-[#111]/10 px-3 py-2">
                        <p className="truncate text-[13px] font-semibold text-[#111]">
                          {sessionUser.name?.trim() || "Account"}
                        </p>
                        {sessionUser.email ? (
                          <p className="truncate text-[11.5px] text-[#111]/55">
                            {sessionUser.email}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={async () => {
                          setAccountMenuOpen(false);
                          try {
                            await authClient.signOut({
                              fetchOptions: { onSuccess: () => {} },
                            });
                          } finally {
                            window.location.href = "/";
                          }
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#ff5600] transition-colors hover:bg-[#ff5600]/10"
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/sign-in"
                  className="inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-[14px] font-medium text-[#111]/70 transition-colors hover:text-[#111]"
                >
                  Sign in
                </Link>
                <HandleLink href="/auth/sign-in" className="ml-1.5">
                  Get started
                </HandleLink>
              </>
            )}
          </div>
        </Container>
      </nav>
    </header>
  );
}
