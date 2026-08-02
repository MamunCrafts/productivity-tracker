import Link from "next/link";
import { FileUp } from "lucide-react";
import { NoteList } from "@/components/notes/NoteList";
import { PageHeader, PageShell } from "@/components/PageFrame";
import { Button } from "@/components/ui/button";

export default function NotesPage() {
  return (
    <PageShell width="5xl">
      <PageHeader
        title="Notes"
        lead="Markdown you've imported, parsed once and kept for reading."
        action={
          <Button
            asChild
            className="h-9 shrink-0 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm"
          >
            <Link href="/notes/import">
              <FileUp className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" aria-hidden />
              {/* "Import" alone beside the title at 360px; the file type is
                  obvious from the page you land on, and the full label needs
                  more width than the title leaves. */}
              <span className="sm:hidden">Import</span>
              <span className="hidden sm:inline">Import markdown</span>
            </Link>
          </Button>
        }
      />

      <NoteList />
    </PageShell>
  );
}
