export const POLL_INTERVAL_MS = 2500;

export const DEFAULT_TEXT_MODEL = "anthropic/claude-3.5-haiku";

export const TEXT_MODEL_OPTIONS: { value: string; label: string; desc: string }[] = [
  {
    value: "",
    label: "Default (Haiku 3)",
    desc: "Uses server default: Claude 3.5 Haiku",
  },
  {
    value: "anthropic/claude-3.5-haiku",
    label: "Claude 3.5 Haiku",
    desc: "Fast, capable default for script & intent",
  },
  {
    value: "google/gemini-2.0-flash-exp",
    label: "Gemini 2 Flash Exp",
    desc: "Experimental: ~500 req/day",
  },
  {
    value: "google/gemini-2.5-flash-preview-05-20",
    label: "Gemini 2.5 Flash",
    desc: "Latest: ~10K req/day",
  },
  {
    value: "google/gemini-2.0-flash-lite-001",
    label: "Gemini 2 Flash Lite",
    desc: "Lightweight & fast",
  },
];

export const STAGES = [
  "Analyzing prompt",
  "Writing script",
  "Sourcing visuals",
  "Generating voice",
  "Rendering video",
];

export const FEATURES = [
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        />
      </svg>
    ),
    title: "AI Script Generation",
    desc: "Transforms your one-liner into a complete script with proper pacing and narrative structure.",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"
        />
      </svg>
    ),
    title: "Smart Visual Selection",
    desc: "Images optional. We use your uploads or fetch from stock photos and AI based on your description.",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
        />
      </svg>
    ),
    title: "Natural Voiceover",
    desc: "Multiple AI voices that sound human, automatically matched to your content's tone.",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5"
        />
      </svg>
    ),
    title: "Professional Editing",
    desc: "Automatic cuts, transitions, and pacing that feel hand-crafted by an expert editor.",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
        />
      </svg>
    ),
    title: "Background Music",
    desc: "Royalty-free music matched to your video's mood and synced to the pacing.",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
        />
      </svg>
    ),
    title: "Auto Captions",
    desc: "Perfectly synced subtitles styled to match your video's aesthetic.",
  },
  {
    icon: null,
    title: "1080p HD Export",
    desc: "Download your finished video in full HD quality, ready for any platform.",
  },
  {
    icon: null,
    title: "No Watermarks",
    desc: "Your videos are yours. No branding, no watermarks, no strings attached.",
  },
];

export const FEATURE_TABS = [
  "Content Creators",
  "Marketers",
  "Educators",
  "E-commerce",
  "Social Media",
  "Agencies",
];

export const FEATURE_TAB_DATA = [
  {
    card1: {
      title: "AI Script Engine",
      desc: "A fast, intelligent script engine built for content speed - auto-generate narratives, structure, and pacing with zero friction.",
      statValue: "30%",
      statLabel: "vs Last Week",
      mainLabel: "Script Length",
      mainValue: "247 words",
    },
    card2: {
      title: "Visual\nIntelligence",
      desc: "Smart image sourcing from the web, AI generation, or your uploads - matched to each scene automatically.",
      list: [
        { name: "Web Search", count: "12", active: true },
        { name: "AI Generated", count: "5", active: false },
        { name: "Uploads", count: "", active: false },
      ],
      product: {
        name: "Mountain Scene",
        detail: "Matched to your narrative, sourced in HD quality.",
        badge: "HD 1080p",
      },
    },
    card3: {
      title: "Video Studio",
      desc: "Full control from resolution to captions - preview, export, and download your HD video instantly.",
      dd1: "1080p Resolution",
      dd2: "MP4 Format",
      infoTitle: "Render Time",
      infoDesc:
        "Track your render speed across all videos - average 60\u00a0seconds for a complete HD export.",
      btn: "Export MP4",
    },
  },

  {
    card1: {
      title: "Campaign Script",
      desc: "Generate ad copy, landing page scripts, and marketing narratives tuned for conversion - on brand, on message.",
      statValue: "45%",
      statLabel: "vs Last Month",
      mainLabel: "Ad Copy",
      mainValue: "180 words",
    },
    card2: {
      title: "Brand\nVisuals",
      desc: "Pull from your brand kit, stock libraries, or let AI generate on-brand imagery for every campaign touchpoint.",
      list: [
        { name: "Stock Library", count: "24", active: true },
        { name: "AI Enhanced", count: "8", active: false },
        { name: "Brand Assets", count: "", active: false },
      ],
      product: {
        name: "Product Shot",
        detail: "On-brand hero image, color-matched to your palette.",
        badge: "4K Ready",
      },
    },
    card3: {
      title: "Multi-Format",
      desc: "Export for every channel - Instagram, YouTube, LinkedIn, TikTok - in one click.",
      dd1: "4K Resolution",
      dd2: "All Platforms",
      infoTitle: "Campaign ROI",
      infoDesc:
        "Track engagement and conversion across every video asset you publish.",
      btn: "Export All",
    },
  },

  {
    card1: {
      title: "Lesson Builder",
      desc: "Turn lesson plans into engaging video lectures with clear structure, pacing, and visual cues - automatically.",
      statValue: "52%",
      statLabel: "Engagement Up",
      mainLabel: "Lesson Plan",
      mainValue: "320 words",
    },
    card2: {
      title: "Visual\nAids",
      desc: "Auto-generate diagrams, illustrations, and slide visuals that reinforce key concepts in every lesson.",
      list: [
        { name: "Diagrams", count: "15", active: true },
        { name: "Illustrations", count: "7", active: false },
        { name: "Slides", count: "", active: false },
      ],
      product: {
        name: "Concept Map",
        detail: "Visual breakdown of complex topics for better retention.",
        badge: "HD 1080p",
      },
    },
    card3: {
      title: "Course Studio",
      desc: "Optimized exports for LMS platforms, YouTube, and classroom presentations - captioned and accessible.",
      dd1: "720p Optimized",
      dd2: "WebM Format",
      infoTitle: "Student Retention",
      infoDesc:
        "Average 3x higher completion rate with video-first lesson delivery.",
      btn: "Export Lesson",
    },
  },

  {
    card1: {
      title: "Product Script",
      desc: "Auto-generate product demos, unboxing scripts, and feature highlights that sell - no copywriter needed.",
      statValue: "38%",
      statLabel: "Conv. Boost",
      mainLabel: "Product Copy",
      mainValue: "156 words",
    },
    card2: {
      title: "Product\nImagery",
      desc: "Source lifestyle shots, catalog images, and AI-enhanced product visuals matched to your store\u2019s look.",
      list: [
        { name: "Catalog", count: "18", active: true },
        { name: "Lifestyle", count: "6", active: false },
        { name: "User Photos", count: "", active: false },
      ],
      product: {
        name: "Hero Banner",
        detail: "High-converting product imagery for storefronts and ads.",
        badge: "4K Ready",
      },
    },
    card3: {
      title: "Store Export",
      desc: "Sized and formatted for Shopify, Amazon, Instagram Shopping, and every major storefront.",
      dd1: "Square 1:1",
      dd2: "Shopify Format",
      infoTitle: "Ad Spend ROAS",
      infoDesc:
        "Track return on ad spend with video vs static across every channel.",
      btn: "Export Listing",
    },
  },

  {
    card1: {
      title: "Viral Script",
      desc: "Craft scroll-stopping hooks, punchy narratives, and platform-native scripts optimized for shares and saves.",
      statValue: "62%",
      statLabel: "Share Rate",
      mainLabel: "Caption",
      mainValue: "89 words",
    },
    card2: {
      title: "Trend\nVisuals",
      desc: "Auto-source trending templates, effects, and visual styles that match what\u2019s performing right now.",
      list: [
        { name: "Trending", count: "20", active: true },
        { name: "Templates", count: "9", active: false },
        { name: "Custom", count: "", active: false },
      ],
      product: {
        name: "Reel Cover",
        detail: "Thumb-stopping cover frames optimized for the feed.",
        badge: "HD 1080p",
      },
    },
    card3: {
      title: "Platform Export",
      desc: "One-click export sized for Reels, TikTok, Shorts, and Stories - no manual cropping.",
      dd1: "9:16 Portrait",
      dd2: "Reel Format",
      infoTitle: "Reach Analytics",
      infoDesc:
        "Average 4.2x more reach with AI-generated Reels vs static posts.",
      btn: "Export Reel",
    },
  },

  {
    card1: {
      title: "Client Scripts",
      desc: "Turn client briefs into polished video scripts at scale - consistent tone, fast turnaround, zero rewrites.",
      statValue: "28%",
      statLabel: "Faster Delivery",
      mainLabel: "Brief",
      mainValue: "412 words",
    },
    card2: {
      title: "Asset\nLibrary",
      desc: "Centralize client assets, licensed footage, and AI-generated visuals in one searchable workspace.",
      list: [
        { name: "Client Assets", count: "32", active: true },
        { name: "Licensed", count: "14", active: false },
        { name: "Generated", count: "", active: false },
      ],
      product: {
        name: "Brand Intro",
        detail: "White-label intro sequences ready for any client.",
        badge: "4K Master",
      },
    },
    card3: {
      title: "Batch Export",
      desc: "Deliver multiple formats and resolutions in a single run - built for agency-scale output.",
      dd1: "4K Master",
      dd2: "Multi-Format",
      infoTitle: "Delivery Time",
      infoDesc: "Cut average project delivery from 5 days to under 2 hours.",
      btn: "Export Batch",
    },
  },
];

export const PRICING = [
  {
    planId: "beginner" as const,
    name: "Beginner",
    monthlyPrice: "$29",
    yearlyPrice: "$19",
    description:
      "Perfect for solo creators and hobbyists looking to explore AI video generation.",
    features: [
      "Up to 10 videos per month",
      "1080p HD output",
      "Standard AI voiceover",
      "Auto captions & subtitles",
      "Basic template library",
      "Email support",
    ],
    cta: "Get Started",
    href: "#create",
    highlighted: false,
    icon: "beginner",
  },
  {
    planId: "professional" as const,
    name: "Professional",
    monthlyPrice: "$59",
    yearlyPrice: "$39",
    description:
      "Ideal for growing creators who need more advanced tools to enhance productivity.",
    features: [
      "Unlimited video generation",
      "4K Ultra HD output",
      "Premium AI voices",
      "Advanced motion & pacing",
      "Priority render queue",
      "Priority email support",
    ],
    cta: "Get Started",
    href: "#create",
    highlighted: true,
    icon: "professional",
  },
  {
    planId: "enterprise" as const,
    name: "Enterprise",
    monthlyPrice: "$89",
    yearlyPrice: "$59",
    description:
      "Designed for teams and agencies requiring comprehensive AI video solutions.",
    features: [
      "Everything in Professional",
      "Custom branding & logos",
      "API access & integrations",
      "Batch video generation",
      "Dedicated account manager",
      "24/7 dedicated support",
    ],
    cta: "Get Started",
    href: "#create",
    highlighted: false,
    icon: "enterprise",
  },
];
