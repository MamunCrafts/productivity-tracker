"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Plain anchors, not fetch + blob: the route already sets Content-Disposition,
 * so the browser handles the download and there's no object URL to clean up.
 */
export function ExportButton() {
  return (
    <div className="flex items-center gap-2">
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
