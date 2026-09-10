"use client";

import { Band, Btn, Container, RuleHeader, useLive } from "./primitives";
import { DiagramTag, StageSlab } from "./diagrams";

function EngineCard({
  name,
  kind,
  lead,
  body,
  href,
  slab,
  tags,
}: {
  name: string;
  kind: string;
  lead: string;
  body: string;
  href: string;
  slab: React.ReactNode;
  tags: { label: string; className: string; delay: number }[];
}) {
  const { ref, live } = useLive<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`v3-diagram relative overflow-hidden rounded-[40px] bg-[#232221] px-7 pb-0 pt-12 sm:px-11 ${
        live ? "is-live" : ""
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

      <div className="relative mt-8">
        {slab}
        <div className="pointer-events-none absolute inset-0">
          {tags.map((tag) => (
            <span key={tag.label} className={`absolute ${tag.className}`}>
              <DiagramTag delay={tag.delay}>{tag.label}</DiagramTag>
            </span>
          ))}
        </div>
      </div>
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
            body="It reads your one line, decides what the video is actually about, and produces a timed shot list - narration, pacing, b-roll brief and caption cues - before a frame is rendered."
            href="/how"
            slab={
              <StageSlab
                lanes={6}
                dots={[
                  [0, 0.18],
                  [1, 0.4],
                  [2, 0.28],
                  [3, 0.62],
                  [4, 0.48],
                  [2, 0.78],
                  [5, 0.34],
                ]}
                className="h-[280px] w-full"
              />
            }
            tags={[
              { label: "Script", className: "left-[6%] top-[16%]", delay: 900 },
              {
                label: "Pacing",
                className: "right-[12%] top-[30%]",
                delay: 1050,
              },
              {
                label: "Shot list",
                className: "left-[14%] bottom-[16%]",
                delay: 1200,
              },
            ]}
          />

          <EngineCard
            name="The Compositor"
            kind="Render engine"
            lead="Most tools stop at a storyboard."
            body="This one composites the voice, the footage, the captions and the score into a single timeline and encodes it - one pass, 4K, roughly a minute from prompt to download."
            href="/features"
            slab={
              <StageSlab
                lanes={7}
                dots={[
                  [1, 0.22],
                  [3, 0.5],
                  [5, 0.36],
                  [6, 0.7],
                ]}
                className="h-[280px] w-full"
              />
            }
            tags={[
              {
                label: "Voice + score",
                className: "left-[8%] top-[14%]",
                delay: 900,
              },
              {
                label: "Captions",
                className: "right-[10%] top-[34%]",
                delay: 1050,
              },
              {
                label: "Encode → MP4",
                className: "left-[16%] bottom-[14%]",
                delay: 1200,
              },
            ]}
          />
        </div>
      </Container>
    </Band>
  );
}
