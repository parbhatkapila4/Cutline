import { NavV3 } from "@/app/_landing/v3/NavV3";
import { HeroV3 } from "@/app/_landing/v3/HeroV3";
import { PipelineV3 } from "@/app/_landing/v3/PipelineV3";
import { CapabilitiesV3 } from "@/app/_landing/v3/CapabilitiesV3";
import { StatsV3 } from "@/app/_landing/v3/StatsV3";
import { SolutionsV3 } from "@/app/_landing/v3/SolutionsV3";
import { SecureV3 } from "@/app/_landing/v3/SecureV3";
import { EngineV3 } from "@/app/_landing/v3/EngineV3";
import { StoriesV3 } from "@/app/_landing/v3/StoriesV3";
import { PricingV3 } from "@/app/_landing/v3/PricingV3";
import { FinalCtaV3 } from "@/app/_landing/v3/FinalCtaV3";
import { FooterV3 } from "@/app/_landing/v3/FooterV3";
export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#f4f3f3] font-sans text-[#1d1c1b]">
      <NavV3 />
      <main>
        <HeroV3 />
        <PipelineV3 />
        <CapabilitiesV3 />
        <StatsV3 />
        <SolutionsV3 />
        <SecureV3 />
        <EngineV3 />
        <StoriesV3 />
        <PricingV3 />
        <FinalCtaV3 />
      </main>
      <FooterV3 />
    </div>
  );
}
