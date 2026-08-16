import Link from "next/link";
import { Container } from "./primitives";
const TILT = "perspective(1600px) rotateY(-16deg) rotateX(3deg)";

type Tile = {
  src: string;
  left: string;
  top: string;
  width: string;
  z: string;
  pos: string;
  win: string;
};

type Row = {
  heading: string;
  body: string;
  ctaLabel: string;
  href: string;
  iconPath: string;
  tiles: Tile[];
};

const ROWS: Row[] = [
  {
    heading: "Open source, end to end",
    body: "Every stage of the pipeline is public on GitHub. Audit it, self-host it, or extend it - no black boxes, no lock-in.",
    ctaLabel: "Read the source",
    href: "https://github.com/parbhatkapila4/cutline",
    iconPath: "M9 7l-5 5 5 5M15 7l5 5-5 5",
    tiles: [
      {
        src: "/hero/6.jpg",
        left: "0%",
        top: "0%",
        width: "46%",
        z: "z-10",
        pos: "64% 40%",
        win: "50% 56%",
      },
      {
        src: "/hero/1.jpg",
        left: "27%",
        top: "17%",
        width: "48%",
        z: "z-20",
        pos: "50% 54%",
        win: "50% 56%",
      },
      {
        src: "/hero/17.jpg",
        left: "54%",
        top: "34%",
        width: "48%",
        z: "z-30",
        pos: "50% 42%",
        win: "50% 56%",
      },
    ],
  },
];

function FrostTile({ tile }: { tile: Tile }) {
  const winMask = `radial-gradient(70% 64% at ${tile.win}, transparent 14%, #000 64%)`;
  return (
    <div
      className={`absolute ${tile.z}`}
      style={{ left: tile.left, top: tile.top, width: tile.width }}
    >
      <div
        className="relative"
        style={{ aspectRatio: "1 / 1.04", transform: TILT }}
      >
        <div
          className="absolute inset-x-[10%] bottom-[-7%] h-[32%] rounded-[50%] bg-[#a85f8a]/35 blur-2xl"
          aria-hidden
        />

        <div
          className="absolute -inset-[7%] rounded-[46%] bg-[#f6a6d3]/45 blur-2xl"
          aria-hidden
        />

        <div className="relative h-full w-full overflow-hidden rounded-[40%] border border-white/45 shadow-[0_28px_46px_-20px_rgba(150,70,115,0.5)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tile.src}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover brightness-[1.04] saturate-[0.9]"
            style={{ objectPosition: tile.pos }}
          />

          <div
            className="absolute inset-0"
            style={{ WebkitMaskImage: winMask, maskImage: winMask }}
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tile.src}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-[15px] brightness-[1.5] contrast-[0.88] saturate-[1.1]"
              style={{ objectPosition: tile.pos }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(95% 70% at 26% 2%, rgba(255, 231, 170, 0.97), transparent 62%)," +
                  "radial-gradient(78% 60% at 95% 0%, rgba(252, 219, 232, 0.94), transparent 60%)," +
                  "radial-gradient(85% 66% at 92% 98%, rgba(203, 229, 158, 0.86), transparent 62%)," +
                  "linear-gradient(180deg, rgba(255, 252, 246, 0.68), rgba(255, 253, 248, 0.18) 55%, rgba(255, 255, 255, 0) 72%)",
              }}
            />
          </div>

          <div
            className="absolute inset-0 rounded-[40%]"
            style={{
              boxShadow:
                "inset 0 0 24px 5px rgba(245, 150, 205, 0.7), inset 0 0 60px 20px rgba(245, 150, 205, 0.14), inset 0 3px 12px rgba(255, 255, 255, 0.55)",
            }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}

function RowCta({ href, label }: { href: string; label: string }) {
  const cls =
    "inline-flex items-center gap-2 rounded-full border border-[#111]/20 bg-white/90 px-5 py-2.5 font-sans text-[14px] font-medium text-[#111] transition-colors hover:border-[#111]/50";
  const arrow = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 17L17 7M8 7h9v9"
      />
    </svg>
  );
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {label}
        {arrow}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {label}
      {arrow}
    </Link>
  );
}

export function PartnerCards() {
  return (
    <section className="v2-mesh">
      <Container>
        {ROWS.map((row) => (
          <div
            key={row.heading}
            className="grid items-center gap-12 py-16 first:pt-24 last:pb-24 lg:grid-cols-2 lg:gap-20 lg:py-24 lg:first:pt-28 lg:last:pb-28"
          >
            <div className="mx-auto w-full max-w-[560px]">
              <div className="relative aspect-[3/2]">
                <div
                  className="absolute z-40 flex flex-col items-center"
                  style={{ left: "40%", top: "-6%" }}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-[1.5px] border-[#111]/70 bg-white/60 backdrop-blur-sm">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      className="h-5 w-5 text-[#111]"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={row.iconPath}
                      />
                    </svg>
                  </span>
                  <span className="h-12 w-px bg-[#111]/60" aria-hidden />
                </div>
                {row.tiles.map((tile) => (
                  <FrostTile key={tile.src} tile={tile} />
                ))}
              </div>
            </div>

            <div className="border-[#111]/15 lg:border-l lg:pl-14">
              <h3 className="font-sans text-[32px] font-medium leading-[1.12] tracking-[-0.03em] text-[#111] lg:text-[44px]">
                {row.heading}
              </h3>
              <p className="mt-6 max-w-[520px] font-sans text-[15px] leading-[1.6] text-[#111]/70">
                {row.body}
              </p>
              <div className="mt-8">
                <RowCta href={row.href} label={row.ctaLabel} />
              </div>
            </div>
          </div>
        ))}
      </Container>
    </section>
  );
}
