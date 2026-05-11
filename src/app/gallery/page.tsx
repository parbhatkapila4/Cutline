import Link from "next/link";
import { GalleryGrid } from "./GalleryGrid";

type Persona =
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
    videoSrc: "/gallery/01.mp4",
    poster: "/hero/1.jpg",
    format: "9:16",
  },
  {
    id: "02",
    prompt: "Three things that changed how I edit videos in 2026.",
    persona: "Content Creators",
    durationSec: 38,
    videoSrc: "/gallery/02.mp4",
    poster: "/hero/2.jpg",
    format: "9:16",
  },
  {
    id: "03",
    prompt: "Cut your customer-acquisition cost by 40% in 14 days.",
    persona: "Marketers",
    durationSec: 28,
    videoSrc: "/gallery/03.mp4",
    poster: "/hero/3.jpg",
    format: "16:9",
  },
  {
    id: "04",
    prompt: "Made for the way you actually move. Free returns for 60 days.",
    persona: "E-commerce",
    durationSec: 22,
    videoSrc: "/gallery/04.mp4",
    poster: "/hero/4.jpg",
    format: "1:1",
  },
  {
    id: "05",
    prompt: "Today we'll break down photosynthesis in three steps.",
    persona: "Educators",
    durationSec: 45,
    videoSrc: "/gallery/05.mp4",
    poster: "/hero/5.jpg",
    format: "16:9",
  },
  {
    id: "06",
    prompt: "Wait — don't scroll yet. The trend everyone is missing.",
    persona: "Social Media",
    durationSec: 18,
    videoSrc: "/gallery/06.mp4",
    poster: "/hero/6.jpg",
    format: "9:16",
  },
  {
    id: "07",
    prompt: "Acme Q4 product launch. Approved scripts. Six variants in one render.",
    persona: "Agencies",
    durationSec: 42,
    videoSrc: "/gallery/07.mp4",
    poster: "/hero/7.jpg",
    format: "16:9",
  },
  {
    id: "08",
    prompt: "Behind the scenes of our studio setup. Equipment, lighting, room tone.",
    persona: "Content Creators",
    durationSec: 35,
    videoSrc: "/gallery/08.mp4",
    poster: "/hero/8.jpg",
    format: "9:16",
  },
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-gray-200/70">
        <div className="max-w-[1280px] mx-auto flex items-center px-5 sm:px-8 h-[60px]">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-[7px] bg-[#0a0a0a]">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
                <path d="M8 5.14v13.72a1 1 0 0 0 1.5.866l11.5-6.86a1 1 0 0 0 0-1.732l-11.5-6.86A1 1 0 0 0 8 5.14z" />
              </svg>
            </span>
            <span className="text-[15.5px] font-semibold tracking-[-0.02em] text-[#0a0a0a]">Cutline</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-[14px] font-medium text-gray-600">Gallery</span>
          </Link>
          <div className="ml-auto">
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center px-4 py-2 rounded-full bg-[#0a0a0a] hover:bg-black text-white text-[12px] font-bold tracking-[0.06em] uppercase transition-colors"
            >
              Try it
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-5 sm:px-8 py-12 sm:py-16">

        <div className="mb-12 text-center">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500 mb-3">
            Gallery
          </p>
          <h1 className="text-[2.25rem] sm:text-[2.75rem] font-bold tracking-[-0.025em] text-[#0a0a0a] leading-[1.05] max-w-[28ch] mx-auto">
            Real videos, generated from one sentence each.
          </h1>
          <p className="mt-5 text-[15px] text-gray-500 leading-relaxed max-w-[58ch] mx-auto">
            Every clip below was produced by the same 12-stage pipeline you can call from the API. No manual edits. The prompt is shown beneath each video.
          </p>
        </div>

        <GalleryGrid items={GALLERY} />

        <div className="mt-16 pt-10 border-t border-gray-200 text-center">
          <p className="text-[14px] text-gray-700 mb-4">
            Want one of these for your own brief?
          </p>
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0a0a0a] hover:bg-black text-white text-[13px] font-bold tracking-[0.06em] uppercase transition-colors"
          >
            Generate yours
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

      </main>
    </div>
  );
}
