import Link from "next/link";
import { FileUp } from "lucide-react";
import { NoteList } from "@/components/notes/NoteList";
import { Button } from "@/components/ui/button";

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-14 pb-28">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-medium leading-tight text-ink">
            Notes
          </h1>
          <p className="mt-2 text-ink-2">
            Markdown you&apos;ve imported, parsed once and kept for reading.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/notes/import">
            <FileUp className="mr-2 h-4 w-4" aria-hidden />
            Import markdown
          </Link>
        </Button>
      </header>

      <NoteList />
    </div>
  );
}
