"use client";

import React from "react";
import { motion } from "framer-motion";

interface Testimonial {
  text: string;
  image: string;
  name: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    text: "Cutline turned our product ideas into polished videos in minutes. Just a prompt and a few images, and we ship social content faster than ever.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150",
    name: "Briana Patton",
    role: "Content Lead",
  },
  {
    text: "The pipeline is smooth: script, shots, and voiceover all in one place. No more juggling tools. Our team actually enjoys making videos now.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150",
    name: "Bilal Ahmed",
    role: "Video Producer",
  },
  {
    text: "We use Cutline for explainers and ads. The AI gets our tone right, and we can tweak the script and visuals before it goes to voice. Game changer.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150",
    name: "Saman Malik",
    role: "Marketing Manager",
  },
  {
    text: "From idea to 1080p download in one flow. We needed something that felt professional without a full production team. Cutline does exactly that.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150",
    name: "Omar Raza",
    role: "Founder",
  },
  {
    text: "Prompt plus optional images → finished video. We run multiple variants for A/B tests without burning through our budget. Quality is consistently good.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150",
    name: "Zainab Hussain",
    role: "Growth Lead",
  },
  {
    text: "We switched to Cutline for our weekly updates. Script, visuals, and voiceover are all aligned. Saves us hours every week and the output looks pro.",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150",
    name: "Aliza Khan",
    role: "Communications",
  },
  {
    text: "Our campaigns needed more video and we didn’t have the bandwidth. Cutline lets us go from brief to asset in minutes. No watermarks, no lock-in.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150",
    name: "Farhan Siddiqui",
    role: "Marketing Director",
  },
  {
    text: "We use it for sales demos and onboarding. One pipeline, same high bar every time. Clients think we have a full video team. We don’t, we have Cutline.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150",
    name: "Sana Sheikh",
    role: "Sales Lead",
  },
  {
    text: "We create short-form video at scale with Cutline. Prompt, optional images, and we get a ready-to-post video. No editing suite, no learning curve.",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150",
    name: "Hassan Ali",
    role: "Social Media Manager",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.ul
        animate={{ translateY: "-50%" }}
        transition={{
          duration: props.duration ?? 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-transparent list-none m-0 p-0"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <motion.li
                  key={`${index}-${i}`}
                  aria-hidden={index === 1 ? "true" : "false"}
                  tabIndex={index === 1 ? -1 : 0}
                  whileHover={{
                    scale: 1.03,
                    y: -8,
                    boxShadow:
                      "0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                    transition: { type: "spring", stiffness: 400, damping: 17 },
                  }}
                  whileFocus={{
                    scale: 1.03,
                    y: -8,
                    boxShadow:
                      "0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                    transition: { type: "spring", stiffness: 400, damping: 17 },
                  }}
                  className="p-10 rounded-3xl border border-neutral-200 shadow-lg shadow-black/5 max-w-xs w-full bg-white cursor-default select-none group focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                >
                  <blockquote className="m-0 p-0">
                    <p className="text-neutral-600 leading-relaxed font-normal m-0">
                      {text}
                    </p>
                    <footer className="flex items-center gap-3 mt-6">
                      <img
                        width={40}
                        height={40}
                        src={image}
                        alt={`Avatar of ${name}`}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-neutral-100 group-hover:ring-gray-900/20 transition-all duration-300 ease-in-out"
                      />
                      <div className="flex flex-col">
                        <cite className="font-semibold not-italic tracking-tight leading-5 text-neutral-900">
                          {name}
                        </cite>
                        <span className="text-sm leading-5 tracking-tight text-neutral-500 mt-0.5">
                          {role}
                        </span>
                      </div>
                    </footer>
                  </blockquote>
                </motion.li>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.ul>
    </div>
  );
};

export default function TestimonialV2() {
  return (
    <section
      aria-labelledby="testimonials-heading"
      className="bg-gray-50 py-24 relative overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, y: 50, rotate: -2 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{
          duration: 1.2,
          ease: [0.16, 1, 0.3, 1],
          opacity: { duration: 0.8 },
        }}
        className="container px-4 z-10 mx-auto"
      >
        <div className="flex flex-col items-center justify-center max-w-[540px] mx-auto mb-16">
          <div className="flex justify-center">
            <div className="border border-neutral-300 py-1 px-4 rounded-full text-xs font-semibold tracking-wide uppercase text-neutral-600 bg-neutral-100/80">
              Testimonials
            </div>
          </div>

          <h2
            id="testimonials-heading"
            className="text-4xl md:text-5xl font-extrabold tracking-tight mt-6 text-center text-neutral-900"
          >
            What our users say
          </h2>
          <p className="text-center mt-5 text-neutral-500 text-lg leading-relaxed max-w-sm">
            See how creators and teams go from prompt to polished video with Cutline.
          </p>
        </div>

        <div
          className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] max-h-[740px] overflow-hidden"
          role="region"
          aria-label="Scrolling Testimonials"
        >
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={19}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={17}
          />
        </div>
      </motion.div>
    </section>
  );
}
