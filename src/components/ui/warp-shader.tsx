"use client";

import { Warp } from "@paper-design/shaders-react";

/**
 * Full-bleed Warp shader background (rose/pink fluid, matches app gradient).
 * Use as background layer; content goes on top with z-10.
 */
export default function WarpShaderHero() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Warp
        style={{ height: "100%", width: "100%" }}
        proportion={0.45}
        softness={1}
        distortion={0.25}
        swirl={0.8}
        swirlIterations={10}
        shape="checks"
        shapeScale={0.1}
        scale={1}
        rotation={0}
        speed={1}
        colors={[
          "hsl(346, 80%, 20%)",
          "hsl(351, 96%, 75%)",
          "hsl(348, 87%, 35%)",
          "hsl(352, 88%, 65%)",
        ]}
      />
      <div className="absolute inset-0 bg-black/40" aria-hidden />
    </div>
  );
}
