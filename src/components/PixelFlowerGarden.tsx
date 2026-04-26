"use client";

import type { ReactElement } from "react";

const S = 7;
const D = 5;

const PAL: Record<string, string> = {
  P: "#EC4899",
  Y: "#FACC15",
  T: "#2DD4BF",
  M: "#E879F9",
  C: "#22D3EE",
  G: "#4ADE80",
  g: "#16A34A",
  B: "#38BDF8",
};

type FlowerDef = { x: number; rows: string[] };

const FLOWERS: FlowerDef[] = [
  {
    x: 0,
    rows: [
      "    PP    ",
      "   P  P   ",
      "  P PP P  ",
      " PP PP PP ",
      "P  PPPP  P",
      " PP PP PP ",
      "  P PP P  ",
      "   P  P   ",
      "    PP    ",
      "    gg    ",
      "    gg    ",
      "   ggg    ",
      "    gg    ",
      "    gg    ",
      "    gg    ",
    ],
  },
  {
    x: 80,
    rows: [
      "     Y     ",
      "    YYY    ",
      "   Y Y Y   ",
      "  YY Y YY  ",
      " Y  YYY  Y ",
      "YYYYY YYYYY",
      " Y  YYY  Y ",
      "  YY Y YY  ",
      "   Y Y Y   ",
      "    YYY    ",
      "     Y     ",
      "     g     ",
      "     g     ",
      "    ggg    ",
      "     g     ",
      "     g     ",
    ],
  },
  {
    x: 170,
    rows: [
      "    TTT    ",
      "  TTTTTTT  ",
      " TTTTTTTTT ",
      "TTTTTTTTTTT",
      "TTTTTTTTTTT",
      "TTTTTTTTTTT",
      " TTTTTTTTT ",
      "  TTTTTTT  ",
      "    TTT    ",
      "     g     ",
      "    ggg    ",
      "     g     ",
      "     g     ",
      "     g     ",
      "     g     ",
      "     g     ",
    ],
  },
  {
    x: 270,
    rows: [
      "M       M",
      " M     M ",
      "  M   M  ",
      "   M M   ",
      "    M    ",
      "   M M   ",
      "  M   M  ",
      " M     M ",
      "M       M",
      "    g    ",
      "    g    ",
      "   ggg   ",
      "    g    ",
      "    g    ",
    ],
  },
  {
    x: 350,
    rows: [
      "  TT  TT  ",
      " T TT T T ",
      "T TTTTTT T",
      " TTTTTTTT ",
      "TTTTTTTTTT",
      "TTTTTTTTTT",
      "TTTTTTTTTT",
      " TTTTTTTT ",
      "  TTTTTT  ",
      "    TT    ",
      "    gg    ",
      "    gg    ",
      "   ggg    ",
      "    gg    ",
      "    gg    ",
      "    gg    ",
      "    gg    ",
    ],
  },
  {
    x: 450,
    rows: [
      " C C ",
      "CCCCC",
      " C C ",
      "CCCCC",
      " C C ",
      "  g  ",
      "  g  ",
      " ggg ",
      "  g  ",
      "  g  ",
    ],
  },
  {
    x: 510,
    rows: [
      "   YY   ",
      "  YYYY  ",
      " YY  YY ",
      "YY    YY",
      "YY    YY",
      " YY  YY ",
      "  YYYY  ",
      "   YY   ",
      "   gg   ",
      "  ggg   ",
      "   gg   ",
      "   gg   ",
    ],
  },
  {
    x: 590,
    rows: [
      " TTTTTTTTTTTT ",
      "TTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTT",
      "TTT  TTTT  TTT",
      "TTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTT",
      " TTTTTTTTTTTT ",
      "  TTTTTTTTTT  ",
      "   TTTTTTTT   ",
      "    TTTTTT    ",
      "     gggg     ",
      "      gg      ",
      "      gg      ",
      "     gggg     ",
      "      gg      ",
      "      gg      ",
      "      gg      ",
      "      gg      ",
    ],
  },
  {
    x: 730,
    rows: [
      "    M    ",
      "   MMM   ",
      "  MMMMM  ",
      " MMMMMMM ",
      "MMMMMMMMM",
      " MMMMMMM ",
      "  MMMMM  ",
      "   MMM   ",
      "    M    ",
      "    g    ",
      "   ggg   ",
      "    g    ",
      "    g    ",
      "    g    ",
    ],
  },
  {
    x: 830,
    rows: [
      "  P   P  ",
      " PPP PPP ",
      "PPPPPPPPP",
      " PPPPPPP ",
      "  PPPPP  ",
      "   PPP   ",
      "    P    ",
      "    g    ",
      "   ggg   ",
      "    g    ",
      "    g    ",
      "    g    ",
    ],
  },
  {
    x: 920,
    rows: [
      "  BB  BB  ",
      " BBBBBBBB ",
      "BBBBBBBBBB",
      "BBBBBBBBBB",
      " BBBBBBBB ",
      "  BBBBBB  ",
      "   BBBB   ",
      "    BB    ",
      "    gg    ",
      "   ggg    ",
      "    gg    ",
      "    gg    ",
      "    gg    ",
    ],
  },
  {
    x: 1020,
    rows: [
      "Y   Y   Y",
      " Y Y Y Y ",
      "  YYY YY  ",
      "YYYYYYYYY ",
      "  YYY YY  ",
      " Y Y Y Y ",
      "Y   Y   Y",
      "    g     ",
      "    g     ",
      "   ggg    ",
      "    g     ",
      "    g     ",
    ],
  },
  {
    x: 1110,
    rows: [
      "  MMMM  ",
      " MMMMMM ",
      "MMMMMMMM",
      "MM MM MM",
      "MMMMMMMM",
      " MMMMMM ",
      "  MMMM  ",
      "   gg   ",
      "  gggg  ",
      "   gg   ",
      "   gg   ",
      "   gg   ",
    ],
  },
  {
    x: 1200,
    rows: [
      " TTTT ",
      "TTTTTT",
      "TTTTTT",
      "TTTTTT",
      "TTTTTT",
      " TTTT ",
      "  TT  ",
      "  gg  ",
      " gggg ",
      "  gg  ",
      "  gg  ",
      "  gg  ",
      "  gg  ",
    ],
  },
  {
    x: 1280,
    rows: [
      "   CC   ",
      "  CCCC  ",
      " CCCCCC ",
      "CCCCCCCC",
      "CCCCCCCC",
      "CCCCCCCC",
      " CCCCCC ",
      "  CCCC  ",
      "   CC   ",
      "   gg   ",
      "  gggg  ",
      "   gg   ",
      "   gg   ",
      "   gg   ",
      "   gg   ",
      "   gg   ",
    ],
  },
  {
    x: 1370,
    rows: [
      " P P P ",
      "PPP PPP",
      " PPPPP ",
      "PPPPPPP",
      " PPPPP ",
      "PPP PPP",
      " P P P ",
      "   g   ",
      "  ggg  ",
      "   g   ",
      "   g   ",
      "   g   ",
    ],
  },
];

const VIEW_W = 1500;
const VIEW_H = 188;
const GROUND = VIEW_H;

function FlowerGroup({ flower, index }: { flower: FlowerDef; index: number }) {
  const totalRows = flower.rows.length;
  const startY = GROUND - totalRows * S;

  const maxW = Math.max(...flower.rows.map((r) => r.length));
  const pivotX = flower.x + (maxW * S) / 2;
  const pivotY = GROUND;

  const rects: ReactElement[] = [];
  let k = 0;

  for (let ry = 0; ry < totalRows; ry++) {
    const row = flower.rows[ry];
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch !== " " && PAL[ch]) {
        rects.push(
          <rect
            key={k++}
            x={flower.x + rx * S}
            y={startY + ry * S}
            width={D}
            height={D}
            fill={PAL[ch]}
            rx={0.5}
          />,
        );
      }
    }
  }

  const delay = (index % 5) * 0.06;

  return (
    <g
      className="pixel-flower"
      style={{
        transformOrigin: `${pivotX}px ${pivotY}px`,
        animationDelay: `${delay}s`,
      }}
    >
      {rects}
    </g>
  );
}

export default function PixelFlowerGarden() {
  return (
    <div className="w-full overflow-hidden -mt-1" aria-hidden>
      <style>{`
        .pixel-flower {
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .pixel-garden:hover .pixel-flower {
          animation: flowerSway 1.8s ease-in-out infinite alternate;
        }
        .pixel-flower:hover {
          transform: translateY(-12px) scale(1.12) !important;
          animation: none !important;
          filter: drop-shadow(0 8px 6px rgba(0,0,0,0.06));
        }
        @keyframes flowerSway {
          0%   { transform: rotate(0deg)   translateY(0); }
          25%  { transform: rotate(2deg)   translateY(-3px); }
          50%  { transform: rotate(-1deg)  translateY(-5px); }
          75%  { transform: rotate(1.5deg) translateY(-2px); }
          100% { transform: rotate(-2deg)  translateY(-4px); }
        }
      `}</style>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMax meet"
        className="w-full h-auto pixel-garden"
        style={{ display: "block", cursor: "pointer" }}
      >
        {FLOWERS.map((flower, i) => (
          <FlowerGroup key={i} flower={flower} index={i} />
        ))}
      </svg>
    </div>
  );
}
