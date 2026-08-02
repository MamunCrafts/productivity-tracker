"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Plain anchors, not fetch + blob: the route already sets Content-Disposition,
 * so the browser handles the download and there's no object URL to clean up.
 */
export function ExportButton() {
  return (
    // Desk-only. A CSV or JSON download on a phone lands somewhere you then
    // have to go and find, and it isn't what the page is opened on a phone to
    // do — so below `sm` the row gives its whole width to the range filter
    // instead. The route stays reachable by URL (`/api/export?format=csv`).
    <div className="hidden items-center gap-2 sm:flex">
      <span className="text-xs text-ink-3">Export</span>
      <Button asChild variant="outline" size="sm" className="gap-2">
        <a href="/api/export?format=csv" download>
          <Download className="h-3.5 w-3.5" />
          CSV
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="gap-2">
        <a href="/api/export?format=json" download>
          <Download className="h-3.5 w-3.5" />
          JSON
        </a>
      </Button>
    </div>
  );
}
