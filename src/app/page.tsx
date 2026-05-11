"use client";

import TestimonialV2 from "@/components/ui/testimonial-v2";
import { useCachedSession } from "@/lib/auth-client";
import { HomeFooter } from "@/app/_landing/HomeFooter";
import { Navbar } from "@/app/_landing/Navbar";
import { Hero } from "@/app/_landing/Hero";
import { Features } from "@/app/_landing/Features";
import { How } from "@/app/_landing/How";
import { Pricing } from "@/app/_landing/Pricing";
import { PainPoint } from "@/app/_landing/PainPoint";

export default function HomePage() {
  const { data: sessionData, isPending: sessionPending } = useCachedSession();
  const isLoggedIn = !sessionPending && !!sessionData;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 relative overflow-x-clip">
      <Navbar />
      <main>
        <Hero isLoggedIn={isLoggedIn} />
        <Features />
        <How />
        <Pricing />
        <PainPoint />
      </main>
      <TestimonialV2 />
      <HomeFooter />
    </div>
  );
}
