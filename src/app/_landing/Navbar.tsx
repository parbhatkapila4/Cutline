"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authClient, useCachedSession } from "@/lib/auth-client";

export function Navbar() {
  const { data: sessionData, isPending: sessionPending } = useCachedSession();
  const sessionUser = sessionData?.user;
  const isLoggedIn = !sessionPending && !!sessionData;
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const router = useRouter();
  const [isSigningIn, startSigningIn] = useTransition();

  const handleSignInClick = () => {
    startSigningIn(() => {
      router.push("/auth/sign-in");
    });
  };

  const prefetchSignIn = () => {
    router.prefetch("/auth/sign-in");
  };

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onDocPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const menu = document.getElementById("home-account-menu");
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
      <header className="fixed top-0 left-0 right-0 z-50 font-sans">
        <div className="bg-[#0a0a0a] text-white">
          <div className="max-w-[1440px] mx-auto h-9 px-5 sm:px-8 flex items-center justify-center gap-2 text-[11.5px] tracking-[0.02em]">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="font-semibold uppercase tracking-[0.16em]">Live</span>
            </span>
            <span className="text-white/30" aria-hidden>·</span>
            <span className="text-white/85 hidden sm:inline">Generate your first video free at cutline.cloud</span>
            <span className="text-white/85 sm:hidden">Your first video is free</span>
            <Link href={isLoggedIn ? "/create" : "/auth/sign-in"} className="ml-1 inline-flex items-center gap-1 text-white hover:text-emerald-300 transition-colors">
              <span className="font-semibold">Try it</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>

        <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200/70">
          <div className="max-w-[1440px] mx-auto flex items-center px-5 sm:px-8 h-[60px]">
            <Link href="/" className="flex items-center gap-2 shrink-0 mr-7 sm:mr-9 group">
              <span className="relative inline-flex w-8 h-8 rounded-[8px] overflow-hidden bg-[#0a0a0a] ring-1 ring-black/5">
                <Image
                  src="/cutline-logo.png"
                  alt=""
                  width={1280}
                  height={720}
                  priority
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: "78% 50%" }}
                />
              </span>
              <span className="text-[15.5px] font-semibold tracking-[-0.02em] text-[#0a0a0a]">Cutline</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link href="/features" className="px-3 py-1.5 text-[13.5px] font-medium text-[#3f3f46] hover:text-[#0a0a0a] transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="px-3 py-1.5 text-[13.5px] font-medium text-[#3f3f46] hover:text-[#0a0a0a] transition-colors">
                Pricing
              </Link>
              <Link href="/how" className="px-3 py-1.5 text-[13.5px] font-medium text-[#3f3f46] hover:text-[#0a0a0a] transition-colors">
                How it works
              </Link>
              {isLoggedIn && sessionUser ? (
                <Link href="/dashboard" className="px-3 py-1.5 text-[13.5px] font-medium text-[#3f3f46] hover:text-[#0a0a0a] transition-colors">
                  Dashboard
                </Link>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <a href="https://github.com/parbhatkapila4/cutline" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-md text-[#71717a] hover:text-[#0a0a0a] hover:bg-gray-100/70 transition-colors">
                <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="currentColor" aria-hidden>
                  <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.438 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12.5c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
              <a href="https://discord.gg/weAfbtKGtx" target="_blank" rel="noopener noreferrer" aria-label="Discord" className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-md text-[#71717a] hover:text-[#0a0a0a] hover:bg-gray-100/70 transition-colors">
                <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="currentColor" aria-hidden>
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0188 1.3332-.946 2.4189-2.1569 2.4189zm7.9748 0c-1.1826 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                </svg>
              </a>
              <a href="https://x.com/Parbhat03" target="_blank" rel="noopener noreferrer" aria-label="X" className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-md text-[#71717a] hover:text-[#0a0a0a] hover:bg-gray-100/70 transition-colors">
                <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/in/parbhat-kapila/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-md text-[#71717a] hover:text-[#0a0a0a] hover:bg-gray-100/70 transition-colors">
                <svg viewBox="0 0 24 24" className="w-[14px] h-[14px]" fill="currentColor" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>

              <span className="hidden sm:block w-px h-5 bg-gray-200/80 mx-2" aria-hidden />

              {sessionPending ? (
                <div className="h-8 w-[180px] bg-gray-100 rounded-full animate-pulse" aria-hidden />
              ) : isLoggedIn && sessionUser ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 rounded-full bg-[#0a0a0a] hover:bg-black text-white text-[12px] font-bold tracking-[0.06em] uppercase shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] transition-colors"
                  >
                    Dashboard
                  </Link>
                  <div id="home-account-menu" className="relative">
                    <button
                      type="button"
                      onClick={() => setAccountMenuOpen((v) => !v)}
                      aria-expanded={accountMenuOpen}
                      aria-haspopup="menu"
                      aria-label="Account menu"
                      className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white hover:border-gray-300 transition-colors overflow-hidden"
                    >
                      {typeof sessionUser.image === "string" && sessionUser.image.trim() ? (
                        <img src={sessionUser.image} alt="" width={36} height={36} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-[12px] font-semibold text-gray-700">
                          {(sessionUser.name?.trim()?.[0] ?? sessionUser.email?.trim()?.[0] ?? "?").toUpperCase()}
                        </span>
                      )}
                    </button>
                    {accountMenuOpen ? (
                      <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-40 min-w-[200px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-[0_16px_32px_-20px_rgba(0,0,0,0.55)]">
                        <div className="px-3 py-2 border-b border-gray-100 mb-1">
                          <p className="text-[13px] font-semibold text-[#0a0a0a] truncate">
                            {sessionUser.name?.trim() || "Account"}
                          </p>
                          {sessionUser.email ? (
                            <p className="text-[11.5px] text-gray-500 truncate">{sessionUser.email}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={async () => {
                            setAccountMenuOpen(false);
                            try {
                              await authClient.signOut({ fetchOptions: { onSuccess: () => { } } });
                            } finally {
                              window.location.href = "/";
                            }
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSignInClick}
                  onMouseEnter={prefetchSignIn}
                  onFocus={prefetchSignIn}
                  disabled={isSigningIn}
                  aria-busy={isSigningIn}
                  aria-label={isSigningIn ? "Opening sign-in" : "Sign in"}
                  className="relative inline-flex items-center justify-center min-w-[88px] px-4 py-2 rounded-full bg-[#0a0a0a] hover:bg-black text-white text-[12px] font-bold tracking-[0.06em] uppercase shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] transition-colors disabled:cursor-default"
                >
                  <span className={isSigningIn ? "invisible" : ""}>Sign in</span>
                  {isSigningIn && (
                    <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                      <span className="block w-3.5 h-3.5 rounded-full border-[1.5px] border-white/15 border-t-emerald-400 animate-spin" />
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </nav>
      </header>
  );
}
