"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { authClient, useCachedSession } from "@/lib/auth-client";
import { Container, ArrowNE, useHydrated } from "./primitives";
import { btnClasses } from "./styles";

const NAV_LINKS = [
  { label: "Platform", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "How it works", href: "/how" },
  { label: "Docs", href: "/docs" },
] as const;

const LINK_CLS =
  "px-3.5 py-2 font-sans text-[14.5px] font-medium text-[#f4f3f3]/80 hover:text-[#f4f3f3] transition-colors";

export function NavV3() {
  const { data: sessionData, isPending: sessionPending } = useCachedSession();
  const sessionUser = sessionData?.user;
  const hydrated = useHydrated();
  const isLoggedIn = hydrated && !sessionPending && !!sessionData;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (document.getElementById("v3-account-menu")?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="absolute inset-x-0 top-0 z-50 font-sans">
      <div className="px-3 pt-3 sm:px-5">
        <Link
          href="/how"
          className="relative flex items-center justify-center overflow-hidden rounded-[10px] bg-[#2a2827] px-6 py-2.5 transition-colors hover:bg-[#333130]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-70"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(176,214,126,0.25) 30%, rgba(246,220,142,0.3) 55%, rgba(255,212,184,0.3) 75%, rgba(246,205,236,0.32))",
            }}
          />
          <span className="relative z-10 text-center font-sans text-[13.5px] font-medium text-[#f4f3f3]">
            <span className="font-semibold">Cutline ships the render API</span>{" "}
            <span className="hidden text-[#f4f3f3]/70 sm:inline">
              - batch generation with webhook callbacks.{" "}
            </span>
            <span className="font-semibold underline underline-offset-2">
              Read more.
            </span>
          </span>
        </Link>
      </div>

      <nav>
        <Container className="flex h-[74px] items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="relative inline-flex h-7 w-7 overflow-hidden rounded-[7px] bg-[#0b0b0b]">
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
            <span className="font-sans text-[19px] font-medium tracking-[-0.02em] text-[#f4f3f3]">
              Cutline
            </span>
          </Link>

          <div className="hidden items-center lg:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={LINK_CLS}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {!hydrated || sessionPending ? (
              <div
                aria-hidden
                className="h-10 w-[164px] animate-pulse rounded-full bg-[#f4f3f3]/10"
              />
            ) : isLoggedIn && sessionUser ? (
              <>
                <Link
                  href="/dashboard"
                  className={`${btnClasses("darkSolid", "sm")} hidden sm:inline-flex`}
                >
                  Dashboard
                  <ArrowNE />
                </Link>
                <div id="v3-account-menu" className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                    className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#f4f3f3]/25 transition-colors hover:border-[#f4f3f3]/60"
                  >
                    {typeof sessionUser.image === "string" &&
                    sessionUser.image.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sessionUser.image}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="font-sans text-[13px] font-medium text-[#f4f3f3]/85">
                        {(
                          sessionUser.name?.trim()?.[0] ??
                          sessionUser.email?.trim()?.[0] ??
                          "?"
                        ).toUpperCase()}
                      </span>
                    )}
                  </button>
                  {menuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+10px)] z-40 min-w-[210px] rounded-2xl border border-[#f4f3f3]/12 bg-[#232221] p-1.5"
                    >
                      <div className="mb-1 border-b border-[#f4f3f3]/12 px-3 py-2">
                        <p className="truncate font-sans text-[13px] font-medium text-[#f4f3f3]">
                          {sessionUser.name?.trim() || "Account"}
                        </p>
                        {sessionUser.email ? (
                          <p className="truncate font-sans text-[11.5px] text-[#f4f3f3]/50">
                            {sessionUser.email}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={async () => {
                          setMenuOpen(false);
                          try {
                            await authClient.signOut({
                              fetchOptions: { onSuccess: () => {} },
                            });
                          } finally {
                            window.location.href = "/";
                          }
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left font-sans text-[14px] font-medium text-[#f4f3f3]/80 transition-colors hover:bg-[#f4f3f3]/10 hover:text-[#f4f3f3]"
                      >
                        Log out
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/sign-in"
                  className={btnClasses("darkSolid", "sm")}
                >
                  Start free
                </Link>
                <Link
                  href="/contact"
                  className={`${btnClasses("dark", "sm")} hidden sm:inline-flex`}
                >
                  Talk to us
                </Link>
              </>
            )}
          </div>
        </Container>
      </nav>
    </header>
  );
}
