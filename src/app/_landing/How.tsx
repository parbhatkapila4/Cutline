import Image from "next/image";
import { ImagePlayer } from "@/components/image-player";

const HOW_IT_WORKS_IMAGES = [
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1494&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1617869763329-8e8160d32adb?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1705675742522-b0bdc228f2ed?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1705615791178-d32cc2cdcd9c?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
];

export function How() {
  return (
    <section
      id="how"
      className="pt-44 pb-44 px-4 sm:px-6 xl:px-10 2xl:px-14 bg-[#F9FAFB]"
    >
      <div className="max-w-[min(1680px,96vw)] mx-auto text-center">
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm text-[10.5px] font-semibold tracking-[0.18em] text-gray-600 uppercase shadow-[0_1px_2px_rgba(15,23,42,0.04)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            How it works
          </div>
          <h2
            className="text-[2.25rem] sm:text-[3rem] md:text-[3.5rem] font-normal text-gray-900 leading-[1.04] tracking-[-0.03em] max-w-[24ch] mx-auto"
            style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
          >
            From idea to <span className="italic">video</span> in minutes.
          </h2>
          <p className="text-[15px] text-gray-500 max-w-[44ch] mx-auto mt-6 leading-relaxed">
            One sentence in. A directed, captioned, music-cut MP4 out, with every shot sourced, scripted, and rendered in a single pass.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div
            className="absolute -inset-x-12 -inset-y-8 -z-10 rounded-[3rem] opacity-60 pointer-events-none"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(15,23,42,0.05), transparent 70%)",
            }}
          />
          <div className="aspect-video rounded-[28px] border border-gray-200 bg-white overflow-hidden shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35),0_18px_40px_-24px_rgba(15,23,42,0.18)] ring-1 ring-black/5">
            <ImagePlayer
              images={HOW_IT_WORKS_IMAGES}
              interval={200}
              renderImage={(src) => (
                <Image
                  src={src}
                  width={1600}
                  height={900}
                  className="w-full h-full object-cover block"
                  alt="How Cutline works"
                  priority
                />
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
