"use client";

import { useCachedSession } from "@/lib/auth-client";
import {
  Container,
  MediaStrip,
  PillLink,
  Section,
  useHydrated,
} from "./primitives";

const STRIP_IMAGES = [
  "/hero/11.jpg",
  "/hero/12.jpg",
  "/hero/13.jpg",
  "/hero/14.jpg",
  "/hero/15.jpg",
  "/hero/16.jpg",
  "/hero/17.jpg",
  "/hero/18.jpg",
  "/hero/19.jpg",
  "/hero/20.jpg",
];

export function FinalCTA() {
  const { data: sessionData, isPending: sessionPending } = useCachedSession();
  const hydrated = useHydrated();
  const isLoggedIn = hydrated && !sessionPending && !!sessionData;

  return (
    <Section rule>
      <Container>
        <h2 className="font-display font-normal text-[44px] sm:text-[60px] lg:text-[72px] leading-[1.0] tracking-[-0.02em] text-center text-[#111] max-w-[880px] mx-auto">
          Your next video is one sentence away.
        </h2>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <PillLink href={isLoggedIn ? "/create" : "/auth/sign-in"} variant="primary">
            Start creating free
          </PillLink>
          <PillLink
            href="mailto:parbhat@parbhat.work?subject=Cutline%20inquiry"
            variant="secondary"
          >
            Talk to us
          </PillLink>
        </div>
      </Container>
      <MediaStrip images={STRIP_IMAGES} className="mt-16" />
    </Section>
  );
}
