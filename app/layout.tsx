import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import StoreProvider from "./StoreProvider";
import { Nav } from "@/components/Nav";
import { FocusTimer } from "@/components/FocusTimer";
import { Colophon } from "@/components/Colophon";

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

        <Colophon />
      </body>
    </html>
  );
}
