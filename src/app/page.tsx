import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { WhyThisExists } from "@/components/WhyThisExists";
import { WhatMakesItDifferent } from "@/components/WhatMakesItDifferent";
import { ExampleSection } from "@/components/ExampleSection";
import { FinalCta } from "@/components/FinalCta";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-6">
          <span className="text-lg font-semibold tracking-tight text-zinc-900">
            CUTLINE
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6">
        <Hero />
        <HowItWorks />
        <WhyThisExists />
        <WhatMakesItDifferent />
        <ExampleSection />
        <FinalCta />
      </main>

      <footer className="border-t border-zinc-200 py-8">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm text-zinc-500">CUTLINE. AI-directed video editing.</p>
        </div>
      </footer>
    </div>
  );
}
