"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileUp, FolderTree, Search } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { sortNotes } from "@/store/noteSlice";
import { pathOf, subtreeIds } from "@/lib/tree";
import { tagCounts } from "@/lib/noteView";
import { ShimmerRows } from "@/components/ui/shimmer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NoteCard } from "./NoteCard";
import { TagFilter } from "./TagFilter";
import { CategoryTree, UNFILED, type Selection } from "./CategoryTree";

/**
 * The shelf: folder rail plus the notes in the selected folder.
 *
 * Filtering runs over title, excerpt and tags only — the bodies aren't in the
 * store, and fetching every note's markdown to support search would undo the
 * whole reason the index is metadata-only.
 */
export function NoteList() {
  const notes = useAppSelector((state) => state.note.notes);
  const categories = useAppSelector((state) => state.note.categories);
  const status = useAppSelector((state) => state.note.status);

  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selection>(null);
  const [showFolders, setShowFolders] = useState(false);

  // A folder means itself and everything under it; showing only direct
  // children would make a parent look empty while its subfolders hold notes.
  const inScope = useMemo(() => {
    if (selected === null) return notes;
    if (selected === UNFILED) return notes.filter((n) => !n.categoryId);
    const ids = subtreeIds(categories, selected);
    return notes.filter((n) => n.categoryId && ids.has(n.categoryId));
  }, [notes, categories, selected]);

  // Counted over the folder in view rather than the whole shelf, so the row
  // only ever offers tags that have something behind them here — picking one
  // can no longer land on "No notes match that".
  const tags = useMemo(() => tagCounts(inScope), [inScope]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortNotes(
      inScope.filter((note) => {
        if (tag && !note.tags.includes(tag)) return false;
        if (!needle) return true;
        return (
          note.title.toLowerCase().includes(needle) ||
          note.excerpt.toLowerCase().includes(needle) ||
          note.tags.some((t) => t.toLowerCase().includes(needle))
        );
      })
    );
  }, [inScope, query, tag]);

  const breadcrumb =
    selected && selected !== UNFILED ? pathOf(categories, selected) : [];

  if (status === "loading" && notes.length === 0) {
    return <ShimmerRows count={3} label="Loading notes" />;
  }

  if (notes.length === 0 && categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-2 px-6 py-16 text-center">
        <FileUp className="mx-auto h-7 w-7 text-ink-3" aria-hidden />
        <p className="mt-3 font-display text-lg text-ink">Nothing on the shelf</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-2">
          Import a markdown file and it&apos;s parsed, stored and ready to read.
        </p>
        <Button asChild className="mt-5">
          <Link href="/notes/import">Import markdown</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-8">
      {/* Below lg the rail is a disclosure rather than a column: 15rem of
          folders beside a 360px viewport leaves nothing for the notes. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setShowFolders((prev) => !prev)}
          aria-expanded={showFolders}
          className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-2 transition-colors hover:text-ink lg:min-h-0"
        >
          <FolderTree className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left">
            {selected === null
              ? "All notes"
              : selected === UNFILED
                ? "No folder"
                : breadcrumb.map((c) => c.name).join(" / ")}
          </span>
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-ink-3 transition-transform",
              showFolders && "rotate-90"
            )}
            aria-hidden
          />
        </button>
        {showFolders && (
          <div className="mt-2 rounded-lg border border-line bg-surface p-2">
            <CategoryTree
              selected={selected}
              onSelect={(next) => {
                setSelected(next);
                setShowFolders(false);
              }}
            />
          </div>
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <CategoryTree selected={selected} onSelect={setSelected} />
        </div>
      </aside>

      <div className="mt-5 min-w-0 space-y-5 lg:mt-0">
        {breadcrumb.length > 0 && (
          <nav aria-label="Folder path" className="flex flex-wrap items-center gap-1 text-sm">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-ink-3 transition-colors hover:text-ink"
            >
              All notes
            </button>
            {breadcrumb.map((category, i) => (
              <span key={category.id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-ink-3" aria-hidden />
                <button
                  type="button"
                  onClick={() => setSelected(category.id)}
                  className={cn(
                    "transition-colors",
                    i === breadcrumb.length - 1
                      ? "text-ink"
                      : "text-ink-3 hover:text-ink"
                  )}
                >
                  {category.name}
                </button>
              </span>
            ))}
          </nav>
        )}

        {/* The tag row wraps, so it takes a line of its own rather than
            competing with the search field for one. */}
        <div className="space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles and tags"
              aria-label="Search notes"
              // `text-base` on a phone is not a size choice: iOS Safari zooms
              // the page in on any input under 16px, and it does not zoom back
              // out. `h-11` matches the `Input` primitive, which is sized for
              // the same two reasons.
              className="h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-base text-ink outline-none placeholder:text-ink-3 focus:border-line-2 sm:h-10 sm:text-sm"
            />
          </div>

          <TagFilter tags={tags} value={tag} onChange={setTag} />
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-2 px-6 py-12 text-center text-sm text-ink-2">
            {notes.length === 0
              ? "No notes yet — import one to get started."
              : inScope.length === 0
                ? "This folder is empty."
                : "No notes match that."}
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
