"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, Trash2, TriangleAlert } from "lucide-react";
import type { Block } from "@/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createNote } from "@/store/noteSlice";
import { Button } from "@/components/ui/button";
import { NoteDropzone, type ReadFile } from "@/components/notes/NoteDropzone";
import { NoteBody } from "@/components/notes/BlockRenderer";
import { CategoryPicker } from "@/components/notes/CategoryPicker";
import { HabitPicker } from "@/components/notes/HabitPicker";
import { dropRedundantTitle, readingMinutes } from "@/lib/noteView";
import { cn } from "@/lib/utils";

interface Staged {
  key: string;
  filename: string;
  raw: string;
  title: string;
  tags: string[];
  habitId: string | null;
  categoryId: string | null;
  blocks: Block[];
  wordCount: number;
}

/**
 * Import is preview-first: dropping a file parses it in the browser and
 * renders it through the same component the reader uses, so what you approve
 * is literally what you'll get. Nothing reaches the database until Save.
 *
 * Staged files live in local state rather than Redux — they're ephemeral, and
 * a half-reviewed import shouldn't survive a navigation.
 */
export default function ImportNotesPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const habits = useAppSelector((state) => state.habit.habits);
  const existing = useAppSelector((state) => state.note.notes);
  const categories = useAppSelector((state) => state.note.categories);

  const [staged, setStaged] = useState<Staged[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // Sticky across the queue: a batch of files almost always belongs in
  // one folder, so the last choice becomes the default for the next file.
  const [lastFolder, setLastFolder] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = staged.find((s) => s.key === activeKey) ?? staged[0] ?? null;

  async function handleFiles(files: ReadFile[]) {
    setError(null);
    // The parser is loaded on demand: it's ~50KB of remark that only this
    // screen ever needs, and the reader renders JSON without it.
    const { parseNote } = await import("@/lib/markdown");

    const next = files.map((file, i) => {
      const parsed = parseNote(file.raw, file.filename);
      return {
        key: `${file.filename}-${staged.length + i}`,
        filename: file.filename,
        raw: file.raw,
        title: parsed.title,
        tags: parsed.tags,
        habitId: null,
        categoryId: lastFolder,
        blocks: parsed.blocks,
        wordCount: parsed.wordCount,
      } satisfies Staged;
    });

    setStaged((prev) => [...prev, ...next]);
    setActiveKey((prev) => prev ?? next[0]?.key ?? null);
  }

  function patchActive(patch: Partial<Staged>) {
    if (!active) return;
    setStaged((prev) =>
      prev.map((s) => (s.key === active.key ? { ...s, ...patch } : s))
    );
  }

  function remove(key: string) {
    setStaged((prev) => prev.filter((s) => s.key !== key));
    if (activeKey === key) setActiveKey(null);
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    try {
      // Sequential rather than parallel: a failure part-way leaves the
      // remaining files staged and reviewable instead of half-written.
      for (const note of staged) {
        await dispatch(
          createNote({
            title: note.title.trim() || note.filename,
            content: note.raw,
            tags: note.tags,
            habitId: note.habitId,
            categoryId: note.categoryId,
            sourceFilename: note.filename,
          })
        ).unwrap();
        setStaged((prev) => prev.filter((s) => s.key !== note.key));
      }
      router.push("/notes");
    } catch {
      setError("Could not save. The files below are still here — try again.");
    } finally {
      setSaving(false);
    }
  }

  const duplicate = active
    ? existing.find((n) => n.sourceFilename === active.filename)
    : undefined;

  return (
    <div className="mx-auto max-w-7xl px-6 py-14 pb-28">
      <header className="mb-8">
        <Link
          href="/notes"
          className="inline-flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Notes
        </Link>
        <h1 className="mt-3 font-display text-4xl font-medium leading-tight text-ink">
          Import markdown
        </h1>
        <p className="mt-2 max-w-prose text-ink-2">
          Files are read in the browser and shown exactly as they&apos;ll be
          stored. Check the title, then save.
        </p>
      </header>

      {staged.length === 0 ? (
        <NoteDropzone onFiles={handleFiles} />
      ) : (
        <div className="space-y-6">
          <NoteDropzone onFiles={handleFiles} compact />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            {/* The queue. Hidden entirely for a single file — a one-row list
                is noise next to the thing it lists. */}
            {staged.length > 1 && (
              <ul className="space-y-1.5">
                {staged.map((note) => (
                  <li key={note.key}>
                    <button
                      type="button"
                      onClick={() => setActiveKey(note.key)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                        note.key === active?.key
                          ? "border-line-2 bg-surface-2"
                          : "border-line bg-surface hover:border-line-2"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">
                        {note.title}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-ink-3 tnum">
                        {note.wordCount}w
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {active && (
              <div className={cn("min-w-0", staged.length === 1 && "lg:col-span-2")}>
                <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink-3">
                        Title
                      </span>
                      <input
                        value={active.title}
                        onChange={(e) => patchActive({ title: e.target.value })}
                        className="w-full rounded-md border border-line-2 bg-base px-3 py-2 text-ink outline-none focus:border-amber"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink-3">
                        Tags
                      </span>
                      <input
                        value={active.tags.join(", ")}
                        placeholder="comma separated"
                        onChange={(e) =>
                          patchActive({
                            tags: e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                          })
                        }
                        className="w-full rounded-md border border-line-2 bg-base px-3 py-2 text-ink outline-none placeholder:text-ink-3 focus:border-amber"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink-3">
                        Folder
                      </span>
                      <CategoryPicker
                        categories={categories}
                        value={active.categoryId}
                        onChange={(categoryId) => {
                          patchActive({ categoryId });
                          setLastFolder(categoryId);
                        }}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink-3">
                        Habit (optional)
                      </span>
                      <HabitPicker
                        habits={habits}
                        value={active.habitId}
                        onChange={(habitId) => patchActive({ habitId })}
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4 text-xs text-ink-3">
                    <span className="font-mono">{active.filename}</span>
                    <span aria-hidden>·</span>
                    <span className="tnum">{active.wordCount} words</span>
                    <span aria-hidden>·</span>
                    <span className="tnum">
                      {readingMinutes(active.wordCount)} min read
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(active.key)}
                      className="ml-auto inline-flex items-center gap-1.5 text-ink-2 transition-colors hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Remove
                    </button>
                  </div>

                  {duplicate && (
                    <p className="mt-3 flex items-start gap-2 rounded-md border border-line-2 bg-surface-2 px-3 py-2 text-xs text-ink-2">
                      <TriangleAlert
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber"
                        aria-hidden
                      />
                      <span>
                        A note from this filename already exists as{" "}
                        <Link
                          href={`/notes/${duplicate.id}`}
                          className="text-ink underline underline-offset-2"
                        >
                          {duplicate.title}
                        </Link>
                        . Saving creates a second copy.
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-line bg-surface p-5 sm:p-8">
                  <p className="mb-5 text-xs uppercase tracking-wider text-ink-3">
                    Preview
                  </p>
                  <NoteBody blocks={dropRedundantTitle(active.blocks, active.title)} />
                </div>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={saveAll} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {staged.length === 1 ? "Save note" : `Save ${staged.length} notes`}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setStaged([])}
              disabled={saving}
            >
              Discard all
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
