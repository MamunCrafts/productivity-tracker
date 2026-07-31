"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, ListChecks, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Analytics", Icon: BarChart3 },
  { href: "/habits", label: "Habits", Icon: ListChecks },
  { href: "/review", label: "Review", Icon: NotebookPen },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-base/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-base text-ink">
          <Activity className="h-4 w-4 text-amber" />
          Productivity Tracker
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface-2 text-ink"
                    : "text-ink-2 hover:bg-surface hover:text-ink"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
