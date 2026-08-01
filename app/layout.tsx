import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import StoreProvider from "./StoreProvider";
import { Nav } from "@/components/Nav";
import { FocusTimer } from "@/components/FocusTimer";
import { Colophon } from "@/components/Colophon";
import { ChromeOnly } from "@/components/ChromeOnly";
import { auth } from "@/auth";
import { THEME_SCRIPT } from "@/lib/theme";

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

// Async because the nav's sign-out control depends on the session, and reading
// it here means it is correct in the server-rendered HTML instead of appearing
// after hydration.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    // suppressHydrationWarning because the script below stamps data-theme onto
    // this element before React ever sees it, which is the whole point of it.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking on purpose, and before any markup: this is what stops a
            frame of the wrong theme on every load. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased min-h-screen flex flex-col bg-base text-ink selection:bg-amber/25`}
      >
        {/* A single warm pool of light from above, like a desk lamp — replaces
            the two cool blobs, which put high-energy blue on the page edges. */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="lamp-glow absolute -top-[30%] left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full blur-[130px]" />
        </div>

        {/* Store lives at the layout so habits/logs are fetched once and shared
            across client-side navigation between Analytics and Habits. */}
        <StoreProvider>
          <ChromeOnly>
            <div className="relative z-10">
              <Nav signedIn={Boolean(session?.user)} />
            </div>
          </ChromeOnly>
          {/* No client-side gate: middleware turns signed-out requests away
              before this renders at all. */}
          <main className="flex-1 relative z-10">{children}</main>
          {/* Global so a running session stays reachable across both routes. */}
          <ChromeOnly>
            <FocusTimer />
          </ChromeOnly>
        </StoreProvider>

        <ChromeOnly>
          <Colophon />
        </ChromeOnly>
      </body>
    </html>
  );
}
