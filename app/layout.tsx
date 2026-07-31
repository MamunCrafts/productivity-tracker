import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import StoreProvider from "./StoreProvider";
import { Nav } from "@/components/Nav";
import { FocusTimer } from "@/components/FocusTimer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Fraunces carries the "things you're studying" — habit names, page and dialog
 * titles — while Geist handles interface chrome. The split gives the subject
 * matter a different voice from the controls, so the eye separates the two
 * without needing extra rules or boxes to do it.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Productivity Tracker",
  description:
    "A simple app to track and visualize your productivity over time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased min-h-screen flex flex-col bg-base text-ink selection:bg-amber/25`}
      >
        {/* A single warm pool of light from above, like a desk lamp — replaces
            the two cool blobs, which put high-energy blue on the page edges. */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[30%] left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-amber/[0.055] blur-[130px]" />
        </div>

        {/* Store lives at the layout so habits/logs are fetched once and shared
            across client-side navigation between Analytics and Habits. */}
        <StoreProvider>
          <div className="relative z-10">
            <Nav />
          </div>
          <main className="flex-1 relative z-10">{children}</main>
          {/* Global so a running session stays reachable across both routes. */}
          <FocusTimer />
        </StoreProvider>

        {/* A colophon rather than a footer: in a book it's the short note at the
            back saying who set the type. Same job here, and it lets the page end
            quietly instead of with three centred lines competing for attention.
            The bottom padding keeps it clear of the docked session bar. */}
        <footer className="relative z-10 mt-auto border-t border-line">
          <div className="mx-auto max-w-5xl px-6 pb-24 pt-8">
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-3">
              Built by
            </p>
            <div className="mt-3 flex flex-col gap-x-8 gap-y-2 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="font-display text-lg text-ink">
                Md AL Mamun Mim
                <span className="ml-3 font-sans text-sm text-ink-2">
                  Senior Software Developer
                  <span className="mx-2 text-ink-3">·</span>
                  Fanfare
                </span>
              </p>
              <p className="shrink-0 text-xs text-ink-3">
                <span className="tnum">{new Date().getFullYear()}</span>
                <span className="mx-2">·</span>
                All rights reserved
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
