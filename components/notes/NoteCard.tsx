"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderInput, Pin, PinOff, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { NoteMeta } from "@/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteNoteAsync, updateNoteAsync } from "@/store/noteSlice";
import { Button } from "@/components/ui/button";
import { pathLabel } from "@/lib/tree";
import { readingMinutes } from "@/lib/noteView";
import { CategoryPicker } from "./CategoryPicker";
import { cn } from "@/lib/utils";

/**
 * One row of the shelf. Same silhouette as a habit row — colour rail, title,
 * meta, recessive actions — so the two lists read as the same kind of object
 * even though nothing links them.
 */
export function NoteCard({ note }: { note: NoteMeta }) {
  const dispatch = useAppDispatch();
  const habit = useAppSelector((state) =>
    note.habitId ? state.habit.habits.find((h) => h.id === note.habitId) : undefined
  );
  const categories = useAppSelector((state) => state.note.categories);
  const [confirming, setConfirming] = useState(false);
  const [moving, setMoving] = useState(false);

  const folder = pathLabel(categories, note.categoryId);

  return (
    <li className="group relative overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-line-2">
      {habit && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ backgroundColor: habit.color }}
        />
      )}

      <div className="flex flex-col gap-4 p-5 pl-6 sm:flex-row sm:items-start sm:gap-6">
        <div className="min-w-0 flex-1">
          <Link href={`/notes/${note.id}`} className="block">
            {/* The link covers the row, so the whole card is the target; the
                action cluster sits above it in the stacking order. */}
            <span className="absolute inset-0 z-0" aria-hidden />
            <h2 className="font-display text-lg font-medium leading-snug text-ink">
              {note.title}
            </h2>
          </Link>

          {note.excerpt && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-2">
              {note.excerpt}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-3">
            <span className="tnum">
              {readingMinutes(note.wordCount)} min read
            </span>
            <span aria-hidden>·</span>
            <span className="tnum">
              {format(parseISO(note.updatedAt), "MMM d, yyyy")}
            </span>
            {folder && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex min-w-0 items-center gap-1 text-ink-2">
                  <FolderInput className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{folder}</span>
                </span>
              </>
            )}
            {habit && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-2">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                  <span className="truncate">{habit.title}</span>
                </span>
              </>
            )}
          </div>

          {note.tags.length > 0 && (
            <ul className="relative z-10 mt-3 flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] text-ink-2"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Touch has no hover, so these sit visible-but-quiet rather than
            hidden behind group-hover. */}
        <div className="relative z-10 flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-9 w-9", moving && "bg-surface-2 text-ink")}
            title="Move to a folder"
            onClick={() => setMoving((prev) => !prev)}
          >
            <FolderInput className="h-4 w-4" />
            <span className="sr-only">Move {note.title} to a folder</span>
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            title={note.pinnedAt ? "Unpin note" : "Pin note"}
            onClick={() =>
              dispatch(
                updateNoteAsync({
                  id: note.id,
                  // A timestamp, not a flag — the most recent pin sorts first.
                  patch: { pinnedAt: note.pinnedAt ? null : new Date().toISOString() },
                })
              )
            }
          >
            {note.pinnedAt ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
            <span className="sr-only">
              {note.pinnedAt ? `Unpin ${note.title}` : `Pin ${note.title}`}
            </span>
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-9 w-9",
              confirming && "bg-danger/12 text-danger hover:bg-danger/20"
            )}
            title={confirming ? "Tap again to delete" : "Delete note"}
            onClick={() => {
              // Notes hard-delete and feed no total, so a second tap is guard
              // enough — but the markdown is gone for good, hence the confirm.
              if (!confirming) {
                setConfirming(true);
                return;
              }
              dispatch(deleteNoteAsync(note.id));
            }}
            onBlur={() => setConfirming(false)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">
              {confirming ? `Confirm delete ${note.title}` : `Delete ${note.title}`}
            </span>
          </Button>
        </div>
      </div>

      {/* Revealed in place rather than in a dialog: moving a note is a
          one-field edit, and a modal for it costs more than it saves. */}
      {moving && (
        <div className="relative z-10 border-t border-line px-5 py-3 pl-6">
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-ink-3">
            Folder
          </label>
          <CategoryPicker
            categories={categories}
            value={note.categoryId}
            onChange={(categoryId) => {
              dispatch(updateNoteAsync({ id: note.id, patch: { categoryId } }));
              setMoving(false);
            }}
            className="text-sm"
          />
        </div>
      )}

      {note.pinnedAt && (
        <span
          aria-hidden
          className="absolute right-0 top-0 h-6 w-6 bg-gradient-to-bl from-amber/25 to-transparent"
        />
      )}
    </li>
  );
}
