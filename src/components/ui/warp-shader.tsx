"use client";

import { memo, useEffect, useState } from "react";
import { Warp } from "@paper-design/shaders-react";

export type WarpShaderHeroProps = {
  disableWarp?: boolean;
};

function WarpShaderHero({ disableWarp = false }: WarpShaderHeroProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const showWarp = !disableWarp && !prefersReducedMotion;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden contain-[paint]">

      <div className="absolute inset-0 bg-linear-to-br from-zinc-950 via-black to-zinc-950" aria-hidden />


      {!showWarp ? (
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.72,
            background: [
              `radial-gradient(ellipse 120% 75% at 82% 8%, hsl(38 95% 58% / 0.22) 0%, transparent 58%)`,
              `radial-gradient(ellipse 95% 65% at 12% 92%, hsl(172 70% 42% / 0.18) 0%, transparent 52%)`,
              `radial-gradient(ellipse 80% 55% at 48% 55%, hsl(24 80% 22% / 0.2) 0%, transparent 62%)`,
              `linear-gradient(128deg, hsl(20 60% 6% / 0.55) 0%, transparent 42%, hsl(172 70% 42% / 0.08) 100%)`,
            ].join(", "),
          }}
          aria-hidden
        />
      ) : null}


      <div
        className="absolute -top-28 -right-28 h-[min(100vw,520px)] w-[min(100vw,520px)] rounded-full bg-linear-to-br from-amber-500/22 via-orange-500/10 to-transparent blur-3xl opacity-90"
        aria-hidden
      />
      <div
        className="absolute -bottom-36 -left-28 h-[min(100vw,440px)] w-[min(100vw,440px)] rounded-full bg-linear-to-tr from-teal-500/18 via-emerald-600/8 to-transparent blur-3xl opacity-80"
        aria-hidden
      />


      {showWarp ? (
        <div className="absolute inset-0 z-1 min-h-full w-full opacity-65 mix-blend-screen">
          <Warp
            style={{ height: "100%", width: "100%" }}
            proportion={0.45}
            softness={1}
            distortion={0.22}
            swirl={0.7}
            swirlIterations={10}
            shape="stripes"
            shapeScale={0.1}
            scale={1}
            rotation={0}
            speed={0}
            frame={0}
            colors={[
              "hsl(20, 60%, 6%)",
              "hsl(38, 95%, 58%)",
              "hsl(24, 80%, 22%)",
              "hsl(172, 70%, 42%)",
            ]}
          />
        </div>
      ) : null}


      <div
        className="absolute inset-0 z-2"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.7) 100%)",
        }}
        aria-hidden
      />
    </div>
  );
}

export default memo(WarpShaderHero);
