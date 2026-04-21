"use client";

import { useEffect, useState } from "react";
import { Warp } from "@paper-design/shaders-react";

export type WarpShaderHeroProps = {
  /**
   * When true, skips the WebGL `Warp` layer (CSS-only background).
   * Use while generating or when an HD video is playing on top — the shader
   * competes for GPU with decoding and tanks scroll / playback frame rate.
   */
  disableWarp?: boolean;
};

/**
 * Full-bleed background: CSS gradient + soft orbs (always visible), then optional
 * Warp shader on top when WebGL works. If the shader fails to paint, you still
 * get a live editorial gradient instead of flat black.
 */
export default function WarpShaderHero({ disableWarp = false }: WarpShaderHeroProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [lowPerfDevice, setLowPerfDevice] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 8;
    const memory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
    // Guardrail for older / low-power machines where full-screen WebGL + blur layers
    // can tank scroll FPS on long pages.
    setLowPerfDevice(cores <= 6 || memory <= 4);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setIsPageVisible(!document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const showWarp =
    !disableWarp &&
    !prefersReducedMotion &&
    !lowPerfDevice &&
    isPageVisible;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Base + animated orbs: never depends on WebGL */}
      <div className="absolute inset-0 bg-linear-to-br from-zinc-950 via-black to-zinc-950" aria-hidden />
      <div
        className="absolute -top-28 -right-28 h-[min(100vw,520px)] w-[min(100vw,520px)] rounded-full bg-linear-to-br from-amber-500/22 via-orange-500/10 to-transparent blur-3xl opacity-85"
        style={{ willChange: showWarp ? "transform, opacity" : "auto" }}
        aria-hidden
      />
      <div
        className="absolute -bottom-36 -left-28 h-[min(100vw,440px)] w-[min(100vw,440px)] rounded-full bg-linear-to-tr from-teal-500/18 via-emerald-600/8 to-transparent blur-3xl opacity-75"
        style={{ willChange: showWarp ? "transform, opacity" : "auto" }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
        aria-hidden
      />

      {/* Shader layer: only when not disabled — avoids GPU contention with video decode */}
      {showWarp ? (
        <div className="absolute inset-0 z-1 min-h-full w-full opacity-65 mix-blend-screen">
          <Warp
            style={{ height: "100%", width: "100%" }}
            proportion={0.45}
            softness={1}
            distortion={0.22}
            swirl={0.7}
            swirlIterations={10}
            shape="checks"
            shapeScale={0.1}
            scale={1}
            rotation={0}
            speed={0.55}
            colors={[
              "hsl(20, 60%, 6%)",
              "hsl(38, 95%, 58%)",
              "hsl(24, 80%, 22%)",
              "hsl(172, 70%, 42%)",
            ]}
          />
        </div>
      ) : null}

      {/* Vignette: deeper at edges to ground the cards on top */}
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
