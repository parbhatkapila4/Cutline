import { DODO_PAYMENT_URL } from "@/lib/payments/links";

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

type PreviewTone = "emerald" | "sky" | "rose" | "violet" | "amber";
type PipelineStatus = "done" | "active" | "pending";
type SettingIcon = "resolution" | "format" | "captions" | "fps";

export type FeatureTabPreview = {
  card1: {
    filename: string;
    status: { label: string; tone: PreviewTone };
    tags: [string, string, string, string];
    lines: { text: string; emphasis?: boolean }[];
    readTime: string;
    aiHint: { label: string; body: string };
    stat: { value: string; label: string };
    variations: number;
  };
  card2: {
    perf: string;
    status: { label: string; tone: PreviewTone };
    tiles: { image: string; label: string; meta?: string; active?: boolean }[];
    sourceTag: string;
    scene: { name: string; detail: string; badge: string };
    summary: { label: string; value: string };
    palette?: string[];
  };
  card3: {
    status: { label: string; tone: PreviewTone };
    presets: { label: string; active?: boolean }[];
    settings: { icon: SettingIcon; label: string; value: string }[];
    progress: number;
    eta: string;
    pipeline: { label: string; status: PipelineStatus }[];
    ctaLabel: string;
    shortcut: string;
  };
};

export const FEATURE_TAB_PREVIEWS: FeatureTabPreview[] = [
  {
    card1: {
      filename: "vlog-ep-12.md",
      status: { label: "drafting", tone: "emerald" },
      tags: ["Hook", "Pacing", "Tone", "Structure"],
      lines: [
        { text: "Three things changed how I edit." },
        { text: "First, I stopped chasing perfect." },
        { text: "Then I wrote for the scroll, not the script.", emphasis: true },
        { text: "And I leaned into the silence." },
        { text: "That last one is what unlocks retention." },
      ],
      readTime: "1m 12s",
      aiHint: {
        label: "AI rewrite",
        body: "Tighten the hook: open with the question viewers are already asking.",
      },
      stat: { value: "+30%", label: "watch-through" },
      variations: 3,
    },
    card2: {
      perf: "0.4s",
      status: { label: "auto-matching", tone: "sky" },
      tiles: [
        { image: "https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=320&h=240&fit=crop&auto=format&q=70", label: "City Aesthetic", meta: "0:03" },
        { image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=320&h=240&fit=crop&auto=format&q=70", label: "Studio Light", meta: "0:05" },
        { image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=320&h=240&fit=crop&auto=format&q=70", label: "Sunset Frame", meta: "0:04", active: true },
        { image: "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=320&h=240&fit=crop&auto=format&q=70", label: "B-roll Stack", meta: "0:02" },
      ],
      sourceTag: "primary",
      scene: {
        name: "Sunset Skyline · 4K",
        detail: "Sourced from your reference deck.",
        badge: "HD 1080p",
      },
      summary: { label: "Style match", value: "94%" },
    },
    card3: {
      status: { label: "rendering", tone: "rose" },
      presets: [
        { label: "1080p", active: true },
        { label: "4K" },
        { label: "Square" },
        { label: "9:16" },
      ],
      settings: [
        { icon: "resolution", label: "Resolution", value: "1920 × 1080" },
        { icon: "format", label: "Format", value: "MP4 · H.264" },
        { icon: "captions", label: "Captions", value: "Auto · ON" },
        { icon: "fps", label: "Frame rate", value: "30 fps" },
      ],
      progress: 68,
      eta: "~ 19s left",
      pipeline: [
        { label: "Script", status: "done" },
        { label: "Visuals", status: "done" },
        { label: "Compose", status: "active" },
        { label: "Encode", status: "pending" },
      ],
      ctaLabel: "Export MP4",
      shortcut: "⌘ E",
    },
  },
  {
    card1: {
      filename: "q4-launch-ad.md",
      status: { label: "approved", tone: "emerald" },
      tags: ["Hook", "CTA", "Funnel", "Brand voice"],
      lines: [
        { text: "Cut your CAC by 40% in 14 days.", emphasis: true },
        { text: "Here's what we changed." },
        { text: "First, we killed every ad above $80 CPA." },
        { text: "Then we doubled down on the top three." },
        { text: "Margins up. Spend down. Story below." },
      ],
      readTime: "0m 54s",
      aiHint: {
        label: "AI lift",
        body: "Lead with the metric: readers anchor on the number, not the claim.",
      },
      stat: { value: "+45%", label: "vs control" },
      variations: 4,
    },
    card2: {
      perf: "0.6s",
      status: { label: "on-brand", tone: "sky" },
      tiles: [
        { image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=320&h=240&fit=crop&auto=format&q=70", label: "Hero Banner", meta: "v3 · A/B", active: true },
        { image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=320&h=240&fit=crop&auto=format&q=70", label: "Lifestyle", meta: "v1" },
        { image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=320&h=240&fit=crop&auto=format&q=70", label: "Product Shot", meta: "v2" },
        { image: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=320&h=240&fit=crop&auto=format&q=70", label: "Logo Lockup", meta: "v1" },
      ],
      sourceTag: "on-brand",
      scene: {
        name: "Hero · Product Reveal",
        detail: "Color-matched to brand palette #4F46E5.",
        badge: "4K Ready",
      },
      summary: { label: "Brand palette", value: "4 colors locked" },
      palette: ["#4F46E5", "#0F172A", "#F97316", "#F1F5F9"],
    },
    card3: {
      status: { label: "shipping", tone: "rose" },
      presets: [
        { label: "1:1" },
        { label: "16:9", active: true },
        { label: "9:16" },
        { label: "4:5" },
      ],
      settings: [
        { icon: "resolution", label: "Resolution", value: "1920 × 1080" },
        { icon: "format", label: "Format", value: "MP4 · Meta Ads" },
        { icon: "captions", label: "Captions", value: "Brand caps · ON" },
        { icon: "fps", label: "Frame rate", value: "30 fps" },
      ],
      progress: 82,
      eta: "~ 11s left",
      pipeline: [
        { label: "Brief", status: "done" },
        { label: "Variants", status: "done" },
        { label: "Approve", status: "active" },
        { label: "Ship", status: "pending" },
      ],
      ctaLabel: "Publish campaign",
      shortcut: "⌘ ↵",
    },
  },
  {
    card1: {
      filename: "biology-ch08.md",
      status: { label: "outline ready", tone: "emerald" },
      tags: ["Pace", "Clarity", "Recap", "Cues"],
      lines: [
        { text: "Today we'll break down photosynthesis." },
        { text: "There are three steps to remember.", emphasis: true },
        { text: "Step one: light hits the chloroplasts." },
        { text: "Step two: the Calvin cycle fixes carbon." },
        { text: "Step three: sugar feeds the plant." },
      ],
      readTime: "2m 04s",
      aiHint: {
        label: "AI tutor",
        body: "Add a recap before the next concept: students retain 38% more on the second pass.",
      },
      stat: { value: "+52%", label: "retention" },
      variations: 2,
    },
    card2: {
      perf: "0.5s",
      status: { label: "labeled", tone: "sky" },
      tiles: [
        { image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=320&h=240&fit=crop&auto=format&q=70", label: "Cell Diagram", meta: "8 callouts", active: true },
        { image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=320&h=240&fit=crop&auto=format&q=70", label: "Concept Map", meta: "5 callouts" },
        { image: "https://images.unsplash.com/photo-1567427018141-0584cfcbf1b8?w=320&h=240&fit=crop&auto=format&q=70", label: "Lab Photo", meta: "3 callouts" },
        { image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=320&h=240&fit=crop&auto=format&q=70", label: "Slide Mock", meta: "12 callouts" },
      ],
      sourceTag: "diagram",
      scene: {
        name: "Chloroplast cross-section",
        detail: "Annotated diagram with 8 callouts.",
        badge: "HD 720p",
      },
      summary: { label: "Annotated", value: "28 callouts · 4 figures" },
    },
    card3: {
      status: { label: "captioning", tone: "rose" },
      presets: [
        { label: "720p", active: true },
        { label: "1080p" },
        { label: "LMS" },
        { label: "16:9" },
      ],
      settings: [
        { icon: "resolution", label: "Resolution", value: "1280 × 720" },
        { icon: "format", label: "Format", value: "WebM · LMS-ready" },
        { icon: "captions", label: "Captions", value: "SDH · ON" },
        { icon: "fps", label: "Frame rate", value: "24 fps" },
      ],
      progress: 54,
      eta: "~ 28s left",
      pipeline: [
        { label: "Outline", status: "done" },
        { label: "Diagrams", status: "done" },
        { label: "Voice", status: "active" },
        { label: "Caption", status: "pending" },
      ],
      ctaLabel: "Publish lesson",
      shortcut: "⌘ ↵",
    },
  },
  {
    card1: {
      filename: "drop-22-launch.md",
      status: { label: "drafting", tone: "emerald" },
      tags: ["Hook", "USP", "Social proof", "CTA"],
      lines: [
        { text: "Made for the way you actually move." },
        { text: "Lightweight foam. Zero break-in." },
        { text: "Free returns for 60 days.", emphasis: true },
        { text: "Limited drop. Only 800 pairs." },
        { text: "Shop the drop on the homepage." },
      ],
      readTime: "0m 38s",
      aiHint: {
        label: "AI hook",
        body: "Front-load the return policy: it lifts add-to-cart 18% on first-time buyers.",
      },
      stat: { value: "+38%", label: "conversion" },
      variations: 5,
    },
    card2: {
      perf: "0.3s",
      status: { label: "catalog-matched", tone: "sky" },
      tiles: [
        { image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=320&h=240&fit=crop&auto=format&q=70", label: "Hero Shot", meta: "SKU-204" },
        { image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=320&h=240&fit=crop&auto=format&q=70", label: "Lifestyle", meta: "SKU-204", active: true },
        { image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=320&h=240&fit=crop&auto=format&q=70", label: "Detail Macro", meta: "SKU-204" },
        { image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=320&h=240&fit=crop&auto=format&q=70", label: "Pack Shot", meta: "SKU-204" },
      ],
      sourceTag: "catalog",
      scene: {
        name: "Lifestyle · Hero #04",
        detail: "Sized for Shopify hero banners.",
        badge: "4K Ready",
      },
      summary: { label: "Catalog", value: "84 SKUs · $24 - $280" },
    },
    card3: {
      status: { label: "publishing", tone: "rose" },
      presets: [
        { label: "1:1", active: true },
        { label: "9:16" },
        { label: "4:5" },
        { label: "16:9" },
      ],
      settings: [
        { icon: "resolution", label: "Resolution", value: "1080 × 1080" },
        { icon: "format", label: "Format", value: "MP4 · Shopify" },
        { icon: "captions", label: "Captions", value: "Burned-in" },
        { icon: "fps", label: "Frame rate", value: "30 fps" },
      ],
      progress: 76,
      eta: "~ 14s left",
      pipeline: [
        { label: "Hero", status: "done" },
        { label: "Variants", status: "done" },
        { label: "Sizes", status: "active" },
        { label: "Publish", status: "pending" },
      ],
      ctaLabel: "Publish to Shopify",
      shortcut: "⌘ ↵",
    },
  },
  {
    card1: {
      filename: "reel-trend-08.md",
      status: { label: "viral-ready", tone: "emerald" },
      tags: ["Hook", "Loop", "Pattern", "Hashtag"],
      lines: [
        { text: "Wait, don't scroll yet.", emphasis: true },
        { text: "This is the trend everyone is missing." },
        { text: "It works because the algo now…" },
        { text: "…ranks 3-second saves over watch time." },
        { text: "Save this so you don't lose it." },
      ],
      readTime: "0m 22s",
      aiHint: {
        label: "AI hook",
        body: "Promise a save in the first 1.5 seconds: saves rank higher than likes on Reels.",
      },
      stat: { value: "+62%", label: "share rate" },
      variations: 6,
    },
    card2: {
      perf: "0.2s",
      status: { label: "trending", tone: "sky" },
      tiles: [
        { image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=320&h=240&fit=crop&auto=format&q=70", label: "Reel Cover", meta: "12.4k saves", active: true },
        { image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=320&h=240&fit=crop&auto=format&q=70", label: "Trend Frame", meta: "8.1k saves" },
        { image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=320&h=240&fit=crop&auto=format&q=70", label: "Loop Pattern", meta: "5.7k saves" },
        { image: "https://images.unsplash.com/photo-1635776062764-e025521e3df3?w=320&h=240&fit=crop&auto=format&q=70", label: "Sticker Pack", meta: "3.2k saves" },
      ],
      sourceTag: "trending",
      scene: {
        name: "Reel Cover · Trend #08",
        detail: "Auto-cropped for Reels and Shorts.",
        badge: "9:16 HD",
      },
      summary: { label: "Trending now", value: "Top 3% · this week" },
    },
    card3: {
      status: { label: "scheduling", tone: "rose" },
      presets: [
        { label: "9:16", active: true },
        { label: "1:1" },
        { label: "4:5" },
        { label: "16:9" },
      ],
      settings: [
        { icon: "resolution", label: "Resolution", value: "1080 × 1920" },
        { icon: "format", label: "Format", value: "MP4 · Reels" },
        { icon: "captions", label: "Captions", value: "Karaoke · word" },
        { icon: "fps", label: "Frame rate", value: "60 fps" },
      ],
      progress: 91,
      eta: "~ 4s left",
      pipeline: [
        { label: "Hook", status: "done" },
        { label: "Cuts", status: "done" },
        { label: "Captions", status: "done" },
        { label: "Reel", status: "active" },
      ],
      ctaLabel: "Schedule Reel",
      shortcut: "⌘ S",
    },
  },
  {
    card1: {
      filename: "acme-q4-master.md",
      status: { label: "client-ready", tone: "emerald" },
      tags: ["Brief", "Approval", "Brand", "Delivery"],
      lines: [
        { text: "Acme: Q4 product launch." },
        { text: "Approved scripts. Approved palette.", emphasis: true },
        { text: "Six variants, three regions, one queue." },
        { text: "Delivery: Friday, 4 PM PT." },
        { text: "Master ships to client locker." },
      ],
      readTime: "1m 48s",
      aiHint: {
        label: "AI brief",
        body: "Match Acme's tone: 80% of approved copy uses 'we' over 'you'.",
      },
      stat: { value: "-28%", label: "delivery time" },
      variations: 6,
    },
    card2: {
      perf: "0.5s",
      status: { label: "white-label", tone: "sky" },
      tiles: [
        { image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=320&h=240&fit=crop&auto=format&q=70", label: "Client Asset", meta: "ACME · v2", active: true },
        { image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=320&h=240&fit=crop&auto=format&q=70", label: "Licensed B-roll", meta: "Getty · 4K" },
        { image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=320&h=240&fit=crop&auto=format&q=70", label: "Brand Lockup", meta: "ACME · v2" },
        { image: "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=320&h=240&fit=crop&auto=format&q=70", label: "Variant 03", meta: "EU · DE" },
      ],
      sourceTag: "client",
      scene: {
        name: "Acme · Brand Intro 4K",
        detail: "White-label master ready for any client.",
        badge: "4K Master",
      },
      summary: { label: "Acme · client locker", value: "24 assets · 6 variants" },
    },
    card3: {
      status: { label: "delivering", tone: "rose" },
      presets: [
        { label: "Master", active: true },
        { label: "Web" },
        { label: "Social" },
        { label: "Broadcast" },
      ],
      settings: [
        { icon: "resolution", label: "Resolution", value: "3840 × 2160" },
        { icon: "format", label: "Format", value: "ProRes 422" },
        { icon: "captions", label: "Captions", value: "Multi-language" },
        { icon: "fps", label: "Frame rate", value: "24 fps" },
      ],
      progress: 64,
      eta: "~ 42s left",
      pipeline: [
        { label: "Brief", status: "done" },
        { label: "Build", status: "done" },
        { label: "Review", status: "active" },
        { label: "Deliver", status: "pending" },
      ],
      ctaLabel: "Deliver batch",
      shortcut: "⌘ D",
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
      "For solo creators shipping a few videos a month.",
    features: [
      "10 videos per month",
      "1080p HD MP4 export",
      "Auto-directed script, voice, captions, b-roll",
      "Brand colors and logo upload",
      "Reels, Shorts, LinkedIn, YouTube formats",
      "Email support",
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
    yearlyPrice: "$39",
    description:
      "For creators and small teams running content at volume.",
    features: [
      "Unlimited videos per month",
      "Everything in Beginner",
      "Premium voice options",
      "Asset analysis from reference media",
      "Advanced motion and pacing controls",
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
    monthlyPrice: "$89",
    yearlyPrice: "$59",
    description:
      "For agencies and product teams shipping at scale or via API.",
    features: [
      "Everything in Professional",
      "REST API + webhook callbacks",
      "Unlimited API calls",
      "Custom integration support",
      "Direct support channel",
      "Onboarding session",
    ],
    cta: "Talk to us",
    href: "mailto:parbhat@parbhat.work?subject=Cutline%20Enterprise%20inquiry",
    highlighted: false,
    popular: false,
    icon: "enterprise",
  },
];
