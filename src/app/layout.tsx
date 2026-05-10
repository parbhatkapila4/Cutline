import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TopProgress } from "@/components/ui/top-progress";

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cutline.cloud"),
  title: "Cutline: AI-directed video, one sentence in",
  description:
    "Cutline turns a single sentence into a finished 30-60 second MP4: script, voice, captions, b-roll, and score, rendered in a single pass.",
  applicationName: "Cutline",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://cutline.cloud",
    siteName: "Cutline",
    title: "Cutline: AI-directed video, one sentence in",
    description:
      "Cutline turns a single sentence into a finished 30-60 second MP4: script, voice, captions, b-roll, and score, rendered in a single pass.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cutline: AI-directed video, one sentence in",
    description:
      "One sentence in, one finished MP4 out. Script, voice, captions, b-roll, and score in a single render.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-mono", jetbrainsMono.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <TopProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
