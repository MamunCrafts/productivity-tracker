"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  FolderInput,
  Pin,
  PinOff,
  Play,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteNoteAsync, fetchNote, updateNoteAsync } from "@/store/noteSlice";
import { startTimer } from "@/store/habitSlice";
import { NoteBody } from "@/components/notes/BlockRenderer";
import { Button } from "@/components/ui/button";
import { CategoryPicker } from "@/components/notes/CategoryPicker";
import { TagList } from "@/components/notes/TagList";
import { HabitPicker } from "@/components/notes/HabitPicker";
import { Shimmer } from "@/components/ui/shimmer";
import { pathOf } from "@/lib/tree";
import {
  dropRedundantTitle,
  readingMinutes,
  tableOfContents,
} from "@/lib/noteView";
import { cn } from "@/lib/utils";

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const router = useRouter();

  const note = useAppSelector((state) => state.note.bodies[id]);
  const meta = useAppSelector((state) => state.note.notes.find((n) => n.id === id));
  const habit = useAppSelector((state) => {
    const habitId = note?.habitId ?? meta?.habitId;
    return habitId ? state.habit.habits.find((h) => h.id === habitId) : undefined;
  });

  const categories = useAppSelector((state) => state.note.categories);
  const habits = useAppSelector((state) => state.habit.habits);
  const activeTimer = useAppSelector((state) => state.habit.activeTimer);

  // The habit you can start a session on, as opposed to the one you can merely
  // read about. A finished or paused habit isn't taking sessions, and a
  // soft-deleted one never reaches `habits` in the first place — so the button
  // is simply absent in all three cases rather than present and inert.
  const focusHabit =
    habit && !habit.completed && habit.status !== "Paused" ? habit : undefined;
  // Written long-hand: `activeTimer?.habitId === habit?.id` reads true when
  // there is neither a timer nor a habit, both being undefined.
  const isRunning = habit ? activeTimer?.habitId === habit.id : false;
  const [missing, setMissing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Guards against a second request while the first is in flight; the store's
  // `loadingBodies` can't be a dependency here without re-running the effect.
  const requested = useRef<string | null>(null);

  useEffect(() => {
    if (note || requested.current === id) return;
    requested.current = id;
    dispatch(fetchNote(id))
      .unwrap()
      .catch(() => setMissing(true));
  }, [id, note, dispatch]);

  // The header already prints the title, so a leading `# Title` in the file
  // would render it a second time.
  const blocks = useMemo(
    () => (note ? dropRedundantTitle(note.blocks, note.title) : []),
    [note]
  );
  const toc = useMemo(() => tableOfContents(blocks), [blocks]);
  const breadcrumb = pathOf(categories, meta?.categoryId ?? null);

  // Arriving at `/notes/[id]#slug` directly — a bookmark, or a chapter link
  // shared out of the note — lands before the body does: blocks are fetched
  // into Redux after mount, so the browser resolves the fragment against a
  // page whose headings don't exist yet and simply stays at the top. Honour
  // it once the headings are actually rendered. In-page clicks don't need
  // this; the browser handles those natively.
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || blocks.length === 0) return;
    const raw = window.location.hash.slice(1);
    if (!raw) return;
    jumped.current = true;
    // Non-ASCII slugs (these notes are largely Bengali) arrive percent-encoded
    // from a typed or copied URL, but a stray `%` would throw — fall back.
    let slug = raw;
    try {
      slug = decodeURIComponent(raw);
    } catch {}
    // `scroll-mt-20` on the heading keeps the jump clear of the sticky nav.
    document.getElementById(slug)?.scrollIntoView();
  }, [blocks]);

  function download() {
    if (!note) return;
    // The original file, byte for byte — the reason `content` is kept
    // alongside the parsed blocks rather than discarded after import.
    const url = URL.createObjectURL(
      new Blob([note.content], { type: "text/markdown" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = note.sourceFilename ?? `${note.title}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="font-display text-2xl text-ink">Note not found</p>
        <p className="mt-2 text-ink-2">It may have been deleted.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/notes">Back to notes</Link>
        </Button>
      </div>
    );
  }

  const title = note?.title ?? meta?.title;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 sm:pt-14">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm">
        <Link
          href="/notes"
          className="inline-flex items-center gap-1.5 text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Notes
        </Link>
        {breadcrumb.map((category) => (
          <span key={category.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-ink-3" aria-hidden />
            <span className="text-ink-3">{category.name}</span>
          </span>
        ))}
      </nav>

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="min-w-0">
          <header className="border-b border-line pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0 flex-1">
                {title ? (
                  <h1 className="font-display text-3xl font-medium leading-tight text-ink sm:text-4xl">
                    {title}
                  </h1>
                ) : (
                  <Shimmer className="h-9 w-2/3 rounded" />
                )}
              </div>

              {/* Kept in the header rather than the desktop rail — the rail is
                  hidden below lg, and a control you can't reach on a phone is
                  a control that doesn't exist. */}
              {meta && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {/* The habit is the one thing on this page you can act on
                      rather than only read, so it gets a labelled button at
                      full weight while the file-management icons stay
                      recessive beside it. Same control as `HabitCard`'s,
                      because it starts the same session — the timer is docked
                      from the layout, so it appears without leaving the note
                      you're reading. */}
                  {focusHabit && (
                    <Button
                      size="sm"
                      onClick={() =>
                        !activeTimer && dispatch(startTimer(focusHabit.id))
                      }
                      disabled={Boolean(activeTimer)}
                      variant={isRunning ? "secondary" : "default"}
                      className="gap-2"
                      title={
                        activeTimer && !isRunning
                          ? "Another session is running — stop it first"
                          : `Start a focus session on ${focusHabit.title}`
                      }
                    >
                      <Play className="h-3.5 w-3.5" fill="currentColor" />
                      {isRunning ? "In session" : "Start focus"}
                    </Button>
                  )}

                  <div className="flex items-center gap-0.5 opacity-80 transition-opacity focus-within:opacity-100 hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-9 w-9", moving && "bg-surface-2 text-ink")}
                      title="Folder and habit"
                      aria-expanded={moving}
                      onClick={() => setMoving((prev) => !prev)}
                    >
                      <FolderInput className="h-4 w-4" />
                      <span className="sr-only">Folder and habit</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      title={meta.pinnedAt ? "Unpin note" : "Pin note"}
                      onClick={() =>
                        dispatch(
                          updateNoteAsync({
                            id,
                            patch: {
                              pinnedAt: meta.pinnedAt
                                ? null
                                : new Date().toISOString(),
                            },
                          })
                        )
                      }
                    >
                      {meta.pinnedAt ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {meta.pinnedAt ? "Unpin" : "Pin"}
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      title="Download the original markdown"
                      onClick={download}
                      disabled={!note}
                    >
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download original file</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9",
                        confirming && "bg-danger/12 text-danger hover:bg-danger/20"
                      )}
                      title={confirming ? "Tap again to delete" : "Delete note"}
                      onClick={async () => {
                        if (!confirming) {
                          setConfirming(true);
                          return;
                        }
                        await dispatch(deleteNoteAsync(id));
                        router.push("/notes");
                      }}
                      onBlur={() => setConfirming(false)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">
                        {confirming ? "Confirm delete" : "Delete note"}
                      </span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {meta && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-3">
                <span className="tnum">
                  {format(parseISO(meta.updatedAt), "MMMM d, yyyy")}
                </span>
                <span aria-hidden>·</span>
                <span className="tnum">{readingMinutes(meta.wordCount)} min read</span>
                <span aria-hidden>·</span>
                <span className="tnum">{meta.wordCount} words</span>
                {habit && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1.5 text-ink-2">
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: habit.color }}
                      />
                      {habit.title}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Both of a note's attachments, in one panel. The panel no longer
                closes on a change: with two fields, dismissing after the first
                one made setting the second a second trip through the toggle. */}
            {moving && meta && (
              <div className="mt-4 grid max-w-lg gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink-3">
                    Folder
                  </span>
                  <CategoryPicker
                    categories={categories}
                    value={meta.categoryId}
                    onChange={(categoryId) =>
                      dispatch(updateNoteAsync({ id, patch: { categoryId } }))
                    }
                    // `text-base` below `sm`: iOS zooms in on a select under
                    // 16px and does not zoom back out.
                    className="text-base sm:text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink-3">
                    Habit
                  </span>
                  <HabitPicker
                    habits={habits}
                    value={meta.habitId}
                    onChange={(habitId) =>
                      dispatch(updateNoteAsync({ id, patch: { habitId } }))
                    }
                    // `text-base` below `sm`: iOS zooms in on a select under
                    // 16px and does not zoom back out.
                    className="text-base sm:text-sm"
                  />
                </label>
              </div>
            )}

            {/* No cap here — the reader is the one place with room for a
                note's whole vocabulary. */}
            {meta && <TagList tags={meta.tags} className="mt-3" />}
          </header>

          <div className="mt-8">
            {note ? (
              <NoteBody blocks={blocks} />
            ) : (
              <div
                role="status"
                aria-busy="true"
                aria-live="polite"
                className="max-w-[68ch] space-y-3"
              >
                {[
                  "h-4 w-full",
                  "h-4 w-11/12",
                  "h-4 w-4/5",
                  "h-4 w-full",
                  "h-4 w-3/5",
                ].map((size, i) => (
                  <Shimmer key={i} className={cn("rounded", size)} delay={i * 140} />
                ))}
                <span className="sr-only">Loading note</span>
              </div>
            )}
          </div>
        </article>

        {/* The rail carries the table of contents and nothing else. Below lg
            it's dropped rather than stacked — a contents list sitting above
            the text it indexes is just a second title. */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            {toc.length > 1 && (
              <nav aria-label="On this page">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-ink-3">
                  On this page
                </p>
                <ul className="space-y-1.5 border-l border-line">
                  {toc.map((heading) => (
                    <li key={heading.slug}>
                      <a
                        href={`#${heading.slug}`}
                        className={cn(
                          "-ml-px block border-l border-transparent py-0.5 text-sm text-ink-2 transition-colors hover:border-line-2 hover:text-ink",
                          heading.depth === 2 ? "pl-3" : "pl-6"
                        )}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

          </div>
        </aside>
      </div>
    </div>
  );
}
