"use client";

import { useEffect, useRef } from "react";
import { useCachedSession } from "@/lib/auth-client";
import { Container, Btn, useHydrated } from "./primitives";

export function FinalCtaV3() {
  const { data: sessionData, isPending: sessionPending } = useCachedSession();
  const hydrated = useHydrated();
  const isLoggedIn = hydrated && !sessionPending && !!sessionData;
  const startHref = isLoggedIn ? "/create" : "/auth/sign-in";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.muted = true;

    const play = () => {
      void video.play().catch(() => {});
    };

    if (typeof IntersectionObserver === "undefined") {
      play();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) play();
          else video.pause();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#f4f3f3] py-20 sm:py-28 lg:py-32">
      <Container>
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-16 -bottom-4 -top-14 blur-[76px]"
            style={{
              background:
                "radial-gradient(72% 60% at 50% 26%, rgba(228,186,128,0.5) 0%, rgba(228,186,128,0.18) 50%, rgba(228,186,128,0) 80%)",
            }}
          />

          <div className="relative overflow-hidden rounded-[44px] bg-[#1d1c1b] shadow-[0_2px_6px_rgba(29,28,27,0.05),0_18px_36px_-10px_rgba(29,28,27,0.12),0_52px_100px_-28px_rgba(29,28,27,0.26)] sm:aspect-[21/9]">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              poster="/hero/cta-loop.jpg"
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
              tabIndex={-1}
            >
              <source src="/hero/cta-loop.mp4" type="video/mp4" />
            </video>

            <div aria-hidden className="absolute inset-0 bg-[#161514]/22" />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(62% 82% at 72% 70%, rgba(22,21,20,0.46) 0%, rgba(22,21,20,0.18) 52%, rgba(22,21,20,0) 100%)",
              }}
            />

            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#f4f3f3]/28 to-transparent"
            />

            <div className="relative flex flex-col items-center justify-center px-6 py-16 text-center sm:absolute sm:inset-0 sm:py-0">
              <h2 className="max-w-[620px] font-sans text-[30px] font-normal leading-[1.08] tracking-[-0.03em] text-[#f4f3f3] sm:text-[42px] lg:text-[48px]">
                Ready to make the video you keep putting off?
              </h2>
              <p className="mt-5 max-w-[440px] font-sans text-[14.5px] font-medium leading-[1.5] text-[#f4f3f3]/80 sm:text-[15.5px]">
                Three free renders a month. No card, no watermark, no editor.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Btn href={startHref} variant="darkSolid">
                  Start creating
                </Btn>
                <Btn href="/contact" variant="dark">
                  Talk to us
                </Btn>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
