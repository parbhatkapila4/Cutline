"use client";

import { Band, Btn, Container, RuleHeader, useLive } from "./primitives";
import { LaneSlab } from "./laneSlab";

function EngineCard({
  name,
  kind,
  lead,
  body,
  href,
  slab,
}: {
  name: string;
  kind: string;
  lead: string;
  body: string;
  href: string;
  slab: React.ReactNode;
}) {
  const { ref, live } = useLive<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`v3-diagram relative overflow-hidden rounded-[40px] bg-[#232221] px-7 pb-4 pt-12 sm:px-11 ${live ? "is-live" : ""
        }`}
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#f4f3f3]/25"
        >
          <span className="block h-2.5 w-2.5 rounded-[2px] bg-[#f4f3f3]/70" />
        </span>
        <h3 className="font-sans text-[26px] font-normal tracking-[-0.02em] text-[#f4f3f3]">
          {name}
        </h3>
      </div>

      <p className="mt-8 max-w-[440px] font-sans text-[15px] font-medium leading-[1.5] text-[#f4f3f3]/75">
        <span className="text-[#f4f3f3]">{kind}.</span> {lead} {body}
      </p>

      <Btn href={href} variant="dark" size="sm" className="mt-7">
        Learn more
      </Btn>

      <div className="-mx-3 mt-6 sm:-mx-5">{slab}</div>
    </div>
  );
}

export function EngineV3() {
  return (
    <Band tone="dark">
      <Container>
        <RuleHeader
          tone="dark"
          title={
            <>
              A director that plans,
              <br />a compositor that ships
            </>
          }
          lede="Language models made text writable. Cutline does the same for video - planning the cut, then actually rendering it."
          action={
            <Btn href="/how" variant="dark">
              Learn more
            </Btn>
          }
        />

        <div className="mt-20 grid gap-6 lg:mt-24 lg:grid-cols-2">
          <EngineCard
            name="The Director"
            kind="Planning model"
            lead="You can't cut what hasn't been written."
            body="It reads your one line, decides what the video is actually about, and produces a timed shot list - narration, pacing, an image brief per shot and caption cues - before a frame is rendered."
            href="/how"
            slab={
              <LaneSlab
                id="director"
                className="h-auto w-full"
                labels={[
                  { text: "Intent", icon: "intent", seg: 7, t: 1, side: "top", y: 40 },
                  { text: "Narrative", icon: "narrative", seg: 9, t: 0, side: "bottom", y: 290, pill: "left" },
                  { text: "Shots", icon: "shots", seg: 11, t: 1, side: "top", y: 92 },
                  { text: "Script", icon: "script", seg: 13, t: 0, side: "bottom", y: 362 },
                ]}
                cubes={[
                  [6, 0.3],
                  [6, 0.82],
                  [7, 0.42],
                  [8, 0.18],
                  [8, 0.66],
                  [9, 0.86],
                  [10, 0.38],
                  [11, 0.16],
                  [11, 0.62],
                  [12, 0.9],
                  [13, 0.3],
                  [14, 0.7],
                ]}
              />
            }
          />

          <EngineCard
            name="The Compositor"
            kind="Render engine"
            lead="Most tools stop at a storyboard."
            body="This one composites the voiceover, the images, the motion and the captions into a single timeline and encodes it - one pass, and slideshow renders come out at 1080p."
            href="/features"
            slab={

              <LaneSlab
                id="compositor"
                className="h-auto w-full"
                labels={[
                  { text: "Voice", icon: "voice", seg: 6, t: 0, side: "top", y: 36 },
                  { text: "Captions", icon: "captions", seg: 8, t: 1, side: "bottom", y: 290, pill: "left" },
                  { text: "Motion", icon: "motion", seg: 10, t: 0, side: "top", y: 84 },
                  { text: "Visuals", icon: "visuals", seg: 12, t: 0, side: "top", y: 132 },
                  { text: "Render → MP4", icon: "render", seg: 14, t: 1, side: "bottom", y: 362 },
                ]}
                cubes={[
                  [6, 0.62],
                  [7, 0.2],
                  [7, 0.74],
                  [8, 0.44],
                  [9, 0.14],
                  [9, 0.84],
                  [10, 0.56],
                  [11, 0.3],
                  [12, 0.76],
                  [13, 0.22],
                  [14, 0.5],
                ]}
              />
            }
          />
        </div>
      </Container>
    </Band>
  );
}
