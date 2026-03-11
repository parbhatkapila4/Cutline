"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.43, 0.13, 0.23, 0.96] as const,
      delayChildren: 0.1,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.43, 0.13, 0.23, 0.96] as const,
    },
  },
};

const numberVariants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction * 40,
    y: 15,
    rotate: direction * 5,
  }),
  visible: {
    opacity: 0.7,
    x: 0,
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.8,
      ease: [0.43, 0.13, 0.23, 0.96] as const,
    },
  },
};

const ghostVariants = {
  hidden: {
    scale: 0.8,
    opacity: 0,
    y: 15,
    rotate: -5,
  },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.6,
      ease: [0.43, 0.13, 0.23, 0.96] as const,
    },
  },
  hover: {
    scale: 1.1,
    y: -10,
    rotate: [0, -5, 5, -5, 0],
    transition: {
      duration: 0.8,
      ease: "easeInOut" as const,
      rotate: {
        duration: 2,
        ease: "linear" as const,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
  },
  floating: {
    y: [-5, 5],
    transition: {
      y: {
        duration: 2,
        ease: "easeInOut" as const,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
  },
};

function GhostIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 130"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ghost-body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f2f2f2" />
        </linearGradient>
        <linearGradient id="ghost-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="70%" stopColor="transparent" />
          <stop offset="100%" stopColor="#e5e5e5" />
        </linearGradient>
      </defs>
      <path
        d="M60 16
           C32 16 18 34 18 52
           L18 88
           Q18 98 28 102 Q38 106 42 98
           Q48 106 56 100 Q62 106 68 100 Q74 106 80 100 Q86 106 92 100
           Q98 106 108 102 Q118 98 118 88
           L118 52 C118 34 104 16 76 16
           Q68 14 60 16 Z"
        fill="url(#ghost-body)"
        stroke="#b8b8b8"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M60 16
           C32 16 18 34 18 52
           L18 88
           Q18 98 28 102 Q38 106 42 98
           Q48 106 56 100 Q62 106 68 100 Q74 106 80 100 Q86 106 92 100
           Q98 106 108 102 Q118 98 118 88
           L118 52 C118 34 104 16 76 16
           Q68 14 60 16 Z"
        fill="url(#ghost-shadow)"
      />
      <ellipse cx="44" cy="50" rx="5" ry="6" fill="#2d2d2d" />
      <ellipse cx="76" cy="50" rx="5" ry="6" fill="#2d2d2d" />
      <ellipse cx="60" cy="70" rx="5" ry="4" fill="#2d2d2d" />
    </svg>
  );
}

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <AnimatePresence mode="wait">
        <motion.div
          className="text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <div className="flex items-center justify-center gap-4 md:gap-6 mb-8 md:mb-12">
            <motion.span
              className="text-[80px] md:text-[120px] font-bold text-[#222222] opacity-70 select-none"
              variants={numberVariants}
              custom={-1}
            >
              4
            </motion.span>
            <motion.div
              variants={ghostVariants}
              whileHover="hover"
              animate={["visible", "floating"]}
              className="w-[80px] h-[80px] md:w-[120px] md:h-[120px] flex items-center justify-center"
            >
              <GhostIcon className="w-full h-full object-contain select-none" />
            </motion.div>
            <motion.span
              className="text-[80px] md:text-[120px] font-bold text-[#222222] opacity-70 select-none"
              variants={numberVariants}
              custom={1}
            >
              4
            </motion.span>
          </div>

          <motion.h1
            className="text-2xl md:text-4xl font-semibold text-[#171717] mb-2 select-none tracking-tight"
            variants={itemVariants}
          >
            Page not found
          </motion.h1>

          <motion.p
            className="text-[15px] md:text-base text-[#737373] mb-8 md:mb-10 select-none"
            variants={itemVariants}
          >
            Go back to the dashboard to continue.
          </motion.p>

          <motion.div
            variants={itemVariants}
            whileHover={{
              scale: 1.05,
              transition: {
                duration: 0.3,
                ease: [0.43, 0.13, 0.23, 0.96] as const,
              },
            }}
          >
            <Link
              href="/"
              className="inline-block bg-[#222222] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#000000] transition-colors select-none"
            >
              Scared! Let&apos;s go back to dashboard
            </Link>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
