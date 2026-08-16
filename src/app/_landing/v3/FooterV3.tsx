import Link from "next/link";
import { Container } from "./primitives";

type FooterLink = { label: string; href: string; external?: boolean };

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Overview", href: "/features" },
      { label: "How it works", href: "/how" },
      { label: "What you get", href: "/benefits" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Render API", href: "/docs#create-job" },
      { label: "Webhooks", href: "/docs#webhooks" },
      { label: "Rate limits", href: "/docs#rate-limits" },
      {
        label: "GitHub",
        href: "https://github.com/parbhatkapila4/cutline",
        external: true,
      },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Changelog", href: "/changelog" },
      { label: "Status", href: "/status" },
      { label: "Evals", href: "/evals" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      {
        label: "Email us",
        href: "mailto:parbhat@parbhat.work",
        external: true,
      },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

const SOCIAL: FooterLink[] = [
  { label: "X", href: "https://x.com/Parbhat03" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/parbhat-kapila/" },
  { label: "Discord", href: "https://discord.gg/weAfbtKGtx" },
];

const HEADING_CLS = "font-sans text-[14.5px] font-medium text-[#1d1c1b]";
const LINK_CLS =
  "font-sans text-[14.5px] font-medium text-[#1d1c1b]/70 hover:text-[#1d1c1b] transition-colors";

function Column({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <nav
      aria-label={heading}
      className="border-l border-[#1d1c1b]/14 px-6 py-9 sm:px-8"
    >
      <h3 className={HEADING_CLS}>{heading}</h3>
      <ul className="mt-6 space-y-3.5">
        {links.map((link) => (
          <li key={`${heading}-${link.label}`}>
            {link.external ? (
              <a
                href={link.href}
                className={LINK_CLS}
                {...(link.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className={LINK_CLS}>
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FooterScene() {
  const imgCls =
    "pointer-events-none absolute inset-0 h-full w-full object-cover select-none";
  return (
    <div
      aria-hidden
      className="relative aspect-[21/9] w-full overflow-hidden border-t border-[#1d1c1b]/12 [container-type:inline-size] sm:aspect-[2400/810]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero/footer-far.svg"
        alt=""
        className={imgCls}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <span className="absolute inset-x-0 top-[15.5%] select-none text-center font-sans text-[17cqw] font-normal leading-none tracking-[-0.045em] text-[#1d1c1b] sm:text-[13.4cqw]">
        Cutline
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero/footer-near.svg"
        alt=""
        className={imgCls}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

export function FooterV3() {
  return (
    <footer className="bg-[#f4f3f3]">
      <Container>
        <div className="grid grid-cols-2 border-r border-[#1d1c1b]/14 lg:grid-cols-4">
          {COLUMNS.map((column) => (
            <Column key={column.heading} {...column} />
          ))}
        </div>
      </Container>

      <FooterScene />

      <div className="bg-[#1d1c1b]">
        <Container className="py-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 font-plex text-[11px] text-[#f4f3f3]/50">
            <span>© 2026 Cutline, Inc. All rights reserved.</span>
            <span className="hidden md:inline">
              sentence → mp4 · 12 stages · 1080p · single pass
            </span>
            <nav aria-label="Social" className="flex items-center gap-5">
              {SOCIAL.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-[#f4f3f3]"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </Container>
      </div>
    </footer>
  );
}
