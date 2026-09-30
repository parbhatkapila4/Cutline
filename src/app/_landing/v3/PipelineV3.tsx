"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Band,
  Btn,
  Container,
  NumberedList,
  RuleHeader,
  useLive,
  useReducedMotion,
  type NumberedItem,
} from "./primitives";
const DWELL_MS = 2000;
import {
  DirectorPanel,
  RenderPanel,
  StoryboardPanel,
  VoicePanel,
} from "./stageDiagrams";

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
    body: "Narration written to the pacing of the cut, then broken into timed shots with the image brief attached to each one.",
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
    body: "Composited and encoded in a single pass. H.264 MP4, no watermark, sized for Reels, Shorts, LinkedIn or YouTube. Slideshow renders are 1080p; talking-character clips come back at the resolution the video provider returns.",
    href: "/features",
    linkLabel: "Learn more",
  },
];
const VISUALS: Record<string, ReactNode> = {
  director: <DirectorPanel />,
  script: <StoryboardPanel />,
  voice: <VoicePanel />,
  render: <RenderPanel />,
};

export function PipelineV3() {
  const [openId, setOpenId] = useState(STAGES[0].id);
  const [onScreen, setOnScreen] = useState(false);
  const { ref, live } = useLive<HTMLDivElement>();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const playing = onScreen && !reduced;
  const visual = VISUALS[openId] ?? VISUALS[STAGES[0].id];

  useEffect(() => {
    const node = stageRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setOnScreen(entries.some((e) => e.isIntersecting)),
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setOpenId((id) => {
        const at = STAGES.findIndex((s) => s.id === id);
        return STAGES[(at + 1) % STAGES.length].id;
      });
    }, DWELL_MS);
    return () => clearTimeout(t);
  }, [playing, openId]);

  return (
    <Band tone="dark">
      <Container>
        <RuleHeader
          tone="dark"
          title={<>A finished film from one sentence.</>}
          lede="The whole production pipeline as one call - script, voice, visuals and captions, rendered end to end."
          action={
            <Btn href="/docs" variant="dark">
              Developer docs
            </Btn>
          }
        />
        <div
          ref={stageRef}
          className="mt-20 grid gap-10 lg:mt-24 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:gap-16"
        >
          <div className="border-l border-[#f4f3f3]/16 pl-5 xl:pt-2">
            <NumberedList
              items={STAGES}
              openId={openId}
              onOpen={setOpenId}
              tone="dark"
              dwellMs={playing ? DWELL_MS : undefined}
            />
          </div>

          <div
            ref={ref}
            className={`v3-diagram relative flex flex-col overflow-hidden rounded-[32px] bg-[#232221] p-4 sm:rounded-[40px] sm:p-6 ${live ? "is-live" : ""
              }`}
          >
            <div
              key={openId}
              className="v3-panel-in flex min-h-[380px] flex-col sm:min-h-[430px]"
            >
              {visual}
            </div>
          </div>
        </div>
      </Container>
    </Band>
  );
}
