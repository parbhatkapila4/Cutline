import Link from "next/link";
import { CutlineLogo } from "@/components/brand/CutlineLogo";
import { GalleryGrid } from "./GalleryGrid";

export type Persona =
  | "Content Creators"
  | "Marketers"
  | "Educators"
  | "E-commerce"
  | "Social Media"
  | "Agencies";

export type GalleryItem = {
  id: string;
  prompt: string;
  persona: Persona;
  durationSec: number;
  shotCount: number;
  renderSec: number;
  videoSrc: string;
  poster: string;
  format: "16:9" | "9:16" | "1:1";
};

const GALLERY: GalleryItem[] = [
  {
    id: "01",
    prompt: "Explain why coffee makes you feel awake in 30 seconds.",
    persona: "Educators",
    durationSec: 32,
    shotCount: 9,
    renderSec: 47,
    videoSrc: "/gallery/01.mp4",
    poster: "/hero/1.jpg",
    format: "9:16",
  },
  {
    id: "02",
    prompt: "Three things that changed how I edit videos in 2026.",
    persona: "Content Creators",
    durationSec: 38,
    shotCount: 11,
    renderSec: 58,
    videoSrc: "/gallery/02.mp4",
    poster: "/hero/2.jpg",
    format: "9:16",
  },
  {
    id: "03",
    prompt: "Cut your customer-acquisition cost by 40% in 14 days.",
    persona: "Marketers",
    durationSec: 28,
    shotCount: 8,
    renderSec: 41,
    videoSrc: "/gallery/03.mp4",
    poster: "/hero/3.jpg",
    format: "16:9",
  },
  {
    id: "04",
    prompt: "Made for the way you actually move. Free returns for 60 days.",
    persona: "E-commerce",
    durationSec: 22,
    shotCount: 7,
    renderSec: 36,
    videoSrc: "/gallery/04.mp4",
    poster: "/hero/4.jpg",
    format: "1:1",
  },
  {
    id: "05",
    prompt: "Today we'll break down photosynthesis in three steps.",
    persona: "Educators",
    durationSec: 45,
    shotCount: 12,
    renderSec: 71,
    videoSrc: "/gallery/05.mp4",
    poster: "/hero/5.jpg",
    format: "16:9",
  },
  {
    id: "06",
    prompt: "Wait — don't scroll yet. The trend everyone is missing.",
    persona: "Social Media",
    durationSec: 18,
    shotCount: 6,
    renderSec: 29,
    videoSrc: "/gallery/06.mp4",
    poster: "/hero/6.jpg",
    format: "9:16",
  },
  {
    id: "07",
    prompt: "Acme Q4 product launch. Approved scripts. Six variants in one render.",
    persona: "Agencies",
    durationSec: 42,
    shotCount: 11,
    renderSec: 64,
    videoSrc: "/gallery/07.mp4",
    poster: "/hero/7.jpg",
    format: "16:9",
  },
  {
    id: "08",
    prompt: "Behind the scenes of our studio setup. Equipment, lighting, room tone.",
    persona: "Content Creators",
    durationSec: 35,
    shotCount: 10,
    renderSec: 53,
    videoSrc: "/gallery/08.mp4",
    poster: "/hero/8.jpg",
    format: "9:16",
  },
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3 bg-black/60 backdrop-blur-sm border-b border-white/5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-white border border-white/20 hover:bg-white/5 px-3 py-2 rounded-lg transition-colors"
        >
          <CutlineLogo size="sm" className="max-w-[140px]" />
          <span>Home</span>
        </Link>
        <Link
          href="/auth/sign-in"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-black text-[12px] font-bold tracking-[0.1em] uppercase hover:bg-zinc-200 transition-colors"
        >
          Try it
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      <main className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[min(90vw,1760px)] mx-auto">
          <GalleryGrid items={GALLERY} />
        </div>
      </main>
    </div>
  );
}
