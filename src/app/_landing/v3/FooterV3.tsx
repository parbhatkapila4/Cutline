import Image from "next/image";
import { LoadingLink } from "@/components/ui/loading-link";
import { Container, MonoChip } from "./primitives";

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
              <LoadingLink href={link.href} className={LINK_CLS}>
                {link.label}
              </LoadingLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FooterScene() {
  return (
    <div
      aria-hidden
      className="relative aspect-[16/10] w-full overflow-hidden bg-[#e8ebeb] [container-type:inline-size] sm:aspect-[2400/1018]"
    >
      <Image
        src="/hero/footer-painting.jpg"
        alt=""
        fill
        sizes="100vw"
        draggable={false}
        className="pointer-events-none select-none object-cover object-[52%_50%] sm:object-center"
      />
      <div className="absolute inset-x-0 top-0 h-[14%] bg-gradient-to-b from-[#f4f3f3] to-transparent" />
      <div className="absolute inset-x-0 top-[1.4%] flex flex-col items-center gap-[1.4cqw] sm:gap-[0.5cqw]">
        <MonoChip className="bg-[#f4f3f3]/75 backdrop-blur-[2px]">
          AI-directed video · one sentence in
        </MonoChip>
        <span className="select-none text-center font-sans text-[10.5cqw] font-normal leading-none tracking-[-0.045em] text-[#1d1c1b] mix-blend-multiply sm:text-[6cqw]">
          Cutline
        </span>
      </div>
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
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-x border-t border-[#1d1c1b]/14 px-6 py-4 font-plex text-[11px] text-[#1d1c1b]/55 sm:px-8">
          <span>© 2026 Cutline</span>
          <nav aria-label="Social" className="flex items-center gap-5">
            {SOCIAL.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-[#1d1c1b]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </Container>

      <FooterScene />
    </footer>
  );
}
