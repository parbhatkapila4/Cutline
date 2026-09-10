"use client";

import { useState } from "react";
import {
  Band,
  Btn,
  Container,
  LeaderLabel,
  NumberedList,
  RuleHeader,
  useLive,
  type NumberedItem,
} from "./primitives";
import { RenderTube } from "./diagrams";

const STAGES: NumberedItem[] = [
  {
    id: "director",
    title: "The Director",
    body: "One sentence in. A 12-stage agent plans the arc, the beats and the shot list before a single frame is touched.",
    href: "/how",
    linkLabel: "Learn more",
  },
  {
    id: "script",
    title: "Script + storyboard",
    body: "Narration written to the pacing of the cut, then broken into timed shots with the b-roll brief attached to each one.",
    href: "/features",
    linkLabel: "Learn more",
  },
  {
    id: "voice",

    title: "Voice + captions",
    body: "A generated read over the cut, with captions chunked to the line and burned into the frame rather than dropped on top of it.",
    href: "/features",
    linkLabel: "Learn more",
  },
  {
    id: "render",
    title: "Render + export",
    body: "Composited and encoded in a single pass. 4K MP4, no watermark, sized for Reels, Shorts, LinkedIn or YouTube.",
    href: "/features",
    linkLabel: "Learn more",
  },
];

export function PipelineV3() {
  const [openId, setOpenId] = useState(STAGES[0].id);
  const { ref, live } = useLive<HTMLDivElement>();

  return (
    <Band tone="dark">
      <Container>
        <RuleHeader
          tone="dark"
          title={<>A finished film in about a minute of render time.</>}
          lede="The whole production pipeline as one call - script, voice, visuals and captions, rendered end to end."
          action={
            <Btn href="/docs" variant="dark">
              Developer docs
            </Btn>
          }
        />

        <div className="mt-20 grid gap-10 lg:mt-24 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-16">
          <div className="border-l border-[#f4f3f3]/16 pl-5 lg:pt-2">
            <NumberedList
              items={STAGES}
              openId={openId}
              onOpen={setOpenId}
              tone="dark"
            />
          </div>

          <div
            ref={ref}
            className={`v3-diagram relative overflow-hidden rounded-[40px] bg-[#232221] p-6 ${
              live ? "is-live" : ""
            }`}
          >
            <RenderTube className="h-auto w-full" />

            <div className="absolute left-[6%] top-[5%] z-10 sm:left-[20%]">
              <LeaderLabel
                label="Speed"
                caption={
                  <>
                    ~60s of render time;
                    <br />a 12-stage pass per render
                  </>
                }
                stem="down"
                stemLength="h-14 sm:h-[120px]"
                captionClassName="hidden sm:block"
              />
            </div>

            <div className="absolute bottom-[6%] left-[4%] z-10">
              <LeaderLabel
                label="Scale"
                caption="Queue-backed workers; batch renders over the API"
                stem="up"
                stemLength="h-10 sm:h-[64px]"
                captionClassName="hidden sm:block"
              />
            </div>

            <div className="absolute bottom-[6%] right-[5%] z-10">
              <LeaderLabel
                label="Output"
                caption="4K H.264 MP4, burned captions, no watermark"
                stem="up"
                stemLength="h-10 sm:h-[64px]"
                captionClassName="hidden sm:block"
              />
            </div>
          </div>
        </div>
      </Container>
    </Band>
  );
}
