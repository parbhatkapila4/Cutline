"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { CutlineLogo } from "@/components/brand/CutlineLogo";

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
}

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/8 bg-white/4 backdrop-blur-sm transition-all duration-200 focus-within:border-violet-400/40 focus-within:bg-violet-500/6 hover:border-white/12">
    {children}
  </div>
);

const TestimonialCard = ({
  testimonial,
  delay,
}: {
  testimonial: Testimonial;
  delay: string;
}) => (
  <div
    className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-white/6 backdrop-blur-xl border border-white/10 p-5 w-64 shadow-xl shadow-black/20`}
  >
    <img
      src={testimonial.avatarSrc}
      className="h-10 w-10 object-cover rounded-2xl shrink-0"
      alt={testimonial.name}
    />
    <div className="text-sm leading-snug min-w-0">
      <p className="font-medium text-white">{testimonial.name}</p>
      <p className="text-zinc-500 text-xs">{testimonial.handle}</p>
      <p className="mt-1.5 text-zinc-300/80 text-[13px] leading-relaxed">
        {testimonial.text}
      </p>
    </div>
  </div>
);

const accentGradient =
  "linear-gradient(135deg, #a855f7 0%, #7c3aed 25%, #6366f1 50%, #ec4899 75%, #f43f5e 100%)";

export const SignInPage: React.FC<SignInPageProps> = ({
  title = (
    <span className="font-sans font-semibold tracking-tight text-white">
      Sign in to{" "}
      <span
        className="bg-clip-text text-transparent"
        style={{ backgroundImage: accentGradient }}
      >
        CUTLINE
      </span>
    </span>
  ),
  description =
  "Sign in to save your videos, access your dashboard, and create more with one-sentence video generation.",
  heroImageSrc,
  testimonials = [],
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="h-dvh flex flex-col md:flex-row w-full bg-black overflow-hidden font-sans">
      <section className="flex-1 flex items-center justify-center p-8 md:p-12 lg:p-16 relative">
        <div
          className="pointer-events-none absolute top-0 left-0 w-[50%] h-[50%] opacity-30"
          style={{
            background:
              "radial-gradient(circle at 20% 30%, rgba(139,92,246,0.06) 0%, transparent 60%)",
          }}
        />

        <div className="w-full max-w-md relative z-10">
          <div className="flex flex-col gap-6">
            <Link href="/" className="animate-element inline-block w-fit">
              <CutlineLogo size="md" className="max-w-[220px]" />
            </Link>
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
              {title}
            </h1>
            <p className="animate-element animate-delay-200 text-zinc-500 text-[15px] leading-relaxed">
              {description}
            </p>

            <form className="space-y-5" onSubmit={onSignIn}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-zinc-400 mb-2 block">
                  Email Address
                </label>
                <GlassInputWrapper>
                  <input
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    autoComplete="email"
                    required
                    className="w-full bg-transparent text-sm text-white p-4 rounded-2xl focus:outline-none placeholder:text-zinc-600"
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-zinc-400 mb-2 block">
                  Password
                </label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="w-full bg-transparent text-sm text-white p-4 pr-12 rounded-2xl focus:outline-none placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-zinc-500 hover:text-zinc-300 transition-colors" />
                      ) : (
                        <Eye className="w-5 h-5 text-zinc-500 hover:text-zinc-300 transition-colors" />
                      )}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    className="custom-checkbox"
                  />
                  <span className="text-zinc-300/90 text-[13px]">
                    Keep me signed in
                  </span>
                </label>
                <button
                  type="button"
                  onClick={onResetPassword}
                  className="text-violet-400 hover:text-violet-300 hover:underline transition-colors text-[13px]"
                >
                  Reset password
                </button>
              </div>

              <button
                type="submit"
                className="animate-element animate-delay-600 group relative w-full rounded-2xl bg-white py-4 font-medium text-zinc-900 hover:bg-zinc-100 transition-all duration-200 overflow-hidden"
              >
                <span className="relative z-10">Sign In</span>
                <div
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.1) 50%, transparent 100%)",
                  }}
                />
              </button>
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center">
              <span className="w-full border-t border-white/8" />
              <span className="px-4 text-sm text-zinc-600 bg-black absolute whitespace-nowrap">
                Or continue with
              </span>
            </div>

            <button
              type="button"
              onClick={onGoogleSignIn}
              className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-white/8 rounded-2xl py-4 text-zinc-300 font-medium hover:bg-white/4 hover:border-white/15 transition-all duration-200"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <p className="animate-element animate-delay-900 text-center text-sm text-zinc-500">
              New to CUTLINE?{" "}
              <button
                type="button"
                onClick={onCreateAccount}
                className="text-violet-400 hover:text-violet-300 hover:underline transition-colors font-medium"
              >
                Create account
              </button>
            </p>
          </div>
        </div>
      </section>

      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-3">
          <div
            className="animate-slide-right animate-delay-300 absolute inset-3 rounded-3xl bg-cover bg-center overflow-hidden"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          >
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {testimonials.length > 0 && (
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center z-10">
              <TestimonialCard
                testimonial={testimonials[0]}
                delay="animate-delay-1000"
              />
              {testimonials[1] && (
                <div className="hidden xl:flex">
                  <TestimonialCard
                    testimonial={testimonials[1]}
                    delay="animate-delay-1200"
                  />
                </div>
              )}
              {testimonials[2] && (
                <div className="hidden 2xl:flex">
                  <TestimonialCard
                    testimonial={testimonials[2]}
                    delay="animate-delay-1400"
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
