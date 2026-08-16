"use client";

import { useCachedSession } from "@/lib/auth-client";
import { Container, HandleLink, useHydrated } from "./primitives";
function PixelSparkle({ className = "" }: { className?: string }) {
  const px: Array<[number, number, string]> = [
    [4, 0, "#ff5600"],
    [4, 1, "#ff8a50"],
    [1, 1, "#ffb08c"],
    [7, 1, "#ffb08c"],
    [4, 3, "#ff5600"],
    [0, 4, "#ff5600"],
    [1, 4, "#ff8a50"],
    [3, 4, "#ff5600"],
    [5, 4, "#ff5600"],
    [7, 4, "#ff8a50"],
    [8, 4, "#ff5600"],
    [4, 5, "#ff5600"],
    [1, 7, "#ffb08c"],
    [7, 7, "#ffb08c"],
    [4, 7, "#ff8a50"],
    [4, 8, "#ff5600"],
  ];
  return (
    <svg
      viewBox="0 0 9 9"
      className={className}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {px.map(([x, y, fill]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
      ))}
    </svg>
  );
}

export function HeroV2() {
  const { data: sessionData, isPending: sessionPending } = useCachedSession();
  const hydrated = useHydrated();
  const isLoggedIn = hydrated && !sessionPending && !!sessionData;
  const startHref = isLoggedIn ? "/create" : "/auth/sign-in";

  return (
    <section className="pt-16 pb-4 text-center md:pt-24">
      <Container>
        <h1 className="text-[#111]">
          <span className="relative inline-block font-display italic font-normal text-[52px] leading-[1.02] tracking-[-0.01em] sm:text-[74px] lg:text-[94px]">
            The AI Video Engine
            <PixelSparkle className="absolute -right-7 -top-2 h-6 w-6 sm:-right-10 sm:-top-3 sm:h-9 sm:w-9" />
          </span>
          <span className="mt-1 block font-sans font-bold text-[40px] leading-[1.08] tracking-[-0.035em] sm:text-[58px] lg:text-[72px]">
            where prompts become films
          </span>
        </h1>

        <p className="mx-auto mt-8 max-w-[640px] font-sans text-[18px] leading-[1.55] text-[#111]/65 sm:text-[21px]">
          Anyone can ship a finished video now - no editor, no timeline, no
          production team. A 12-stage AI director writes, voices, captions, and
          scores your MP4 in one 60-second pass.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <HandleLink href={startHref}>Start creating free</HandleLink>
          <HandleLink href="/demo" variant="secondary">
            View demo
          </HandleLink>
        </div>
      </Container>
    </section>
  );
}
