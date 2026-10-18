import { DODO_PAYMENT_URL } from "@/lib/payments/links";

export const POLL_INTERVAL_MS = 2500;

export const DEFAULT_TEXT_MODEL = "anthropic/claude-haiku-4.5";

export const TEXT_MODEL_OPTIONS: { value: string; label: string; desc: string }[] = [
  {
    value: "",
    label: "Default (Haiku 4.5)",
    desc: "Uses server default: Claude Haiku 4.5",
  },
  {
    value: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    desc: "Fast, capable default for script & intent",
  },
  {
    value: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    desc: "Fastest, lowest-cost Gemini",
  },
  {
    value: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    desc: "Stable Gemini Flash",
  },
];

export const STAGES = [
  "Analyzing prompt",
  "Writing script",
  "Sourcing visuals",
  "Generating voice",
  "Rendering video",
];

export function isExcludedFeature(feature: string): boolean {
  return /not included\.?$/i.test(feature.trim());
}

export const PRICING = [
  {
    planId: "free" as const,
    name: "Free",
    monthlyPrice: "$0",
    description: "For trying a real render before you pay.",
    features: [
      "3 videos per month",
      "Up to 20 seconds",
      "Stock-image slideshows only",
      "1080p MP4 export, no watermark",
      "Community support",
      "AI-generated imagery not included",
      "Talking-character videos not included",
    ],
    cta: "Start creating free",
    href: "/auth/sign-in",
    highlighted: false,
    popular: false,
    icon: "free",
  },
  {
    planId: "beginner" as const,
    name: "Beginner",
    monthlyPrice: "$29",
    description:
      "For solo creators shipping a few videos a month.",
    features: [
      "10 videos per month",
      "Up to 60 seconds",
      "AI-generated imagery when stock falls short",
      "Auto-directed script, voice, captions, images",
      "Reels, Shorts, LinkedIn, YouTube formats",
      "Email support",
      "Talking-character videos not included",
    ],
    cta: "Get started",
    href: DODO_PAYMENT_URL,
    highlighted: false,
    popular: false,
    icon: "beginner",
  },
  {
    planId: "professional" as const,
    name: "Professional",
    monthlyPrice: "$59",
    description:
      "For creators and small teams running content at volume.",
    features: [
      "90 seconds of talking-character video per month, top-ups available",
      "Talking-character videos - cartoon, cinematic and avatar",
      "Custom and preset avatars",
      "Your own images in a slideshow render",
      "Logo upload",
      "Unlimited videos per month",
      "Everything in Beginner",
      "Asset analysis from reference media",
      "Priority email support",
    ],
    cta: "Try Professional",
    href: DODO_PAYMENT_URL,
    highlighted: true,
    popular: true,
    icon: "professional",
  },
  {
    planId: "enterprise" as const,
    name: "Enterprise",
    monthlyPrice: "$299",
    description:
      "For agencies and product teams shipping at scale or via API.",
    features: [
      "400 seconds of talking-character video per month",
      "Everything in Professional",
      "REST API + webhook callbacks",
      "Custom integration support",
      "Direct support channel",
      "Onboarding session",
    ],
    cta: "Get Enterprise",
    href: "mailto:parbhat@parbhat.work?subject=Cutline%20Enterprise%20inquiry",
    highlighted: false,
    popular: false,
    icon: "enterprise",
  },
];
