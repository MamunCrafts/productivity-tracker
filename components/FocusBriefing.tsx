"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { startTimer } from "@/store/habitSlice";
import { moveTaskAsync } from "@/store/taskSlice";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The session rules, read once before the clock moves.
 *
 * There are three ways to start a session — a habit row, a routine block, a
 * note's habit — and the rules are the same for all of them, so they live here
 * and every entry point goes through `useFocusBriefing`. The timer is only
 * seeded once Continue is pressed: the point of the step is the pause, and a
 * clock already running while you read turns the checklist into a cost.
 */
const STEPS: ReactNode[] = [
  <>
    শুরুর আগে <b className="font-semibold text-ink">Target</b> আর{" "}
    <b className="font-semibold text-ink">Done means</b> লিখুন। একটাই কাজ।
  </>,
  <>ফোন অন্য ঘরে রাখুন, notification বন্ধ করুন।</>,
  <>
    Timer চালু করুন। মাঝে অন্য চিন্তা এলে{" "}
    <b className="font-semibold text-ink">Distractions</b> ঘরে লিখে রাখুন, follow
    করবেন না।
  </>,
  <>
    Timer শেষে এই তিনটি লিখে Save করুন:
    {/* Three things, listed as three — run together in one sentence they read
        as a single "fill in the form" step, and score is the one that gets
        dropped. */}
    <ul className="mt-2 space-y-1.5">
      {[
        ["Output", "কী শেষ হলো"],
        ["Next action", "পরের session ঠিক কোথা থেকে শুরু"],
        ["Score", "১–১০, focus কেমন ছিল"],
      ].map(([field, gloss]) => (
        <li key={field} className="flex flex-wrap items-baseline gap-x-2">
          <b className="font-semibold text-ink">{field}</b>
          <span className="text-sm text-ink-3">— {gloss}</span>
        </li>
      ))}
    </ul>
  </>,
  <>৬০–২০ মিনিট break — reels নয়। হাঁটা, পানি, stretch।</>,
];

function FocusBriefingDialog({
  open,
  onOpenChange,
  onContinue,
  habitId,
  habitTitle,
  selectedTaskId,
  onSelectTask,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  habitId?: string;
  habitTitle?: string;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}) {
  // Rule 1 is "একটাই কাজ" — one job — so the board's Todo column for this habit
  // is exactly the list to pick that job from. Only this habit's cards: the
  // session is already scoped to it, and a card from another habit picked here
  // would move to Doing while the clock ran against something else.
  // Filtered in a memo rather than inside the selector: a selector that builds
  // a new array every call fails react-redux's reference check and re-renders
  // on any store change at all, and this dialog is mounted once per habit row.
  const tasks = useAppSelector((state) => state.task.tasks);
  const todo = useMemo(
    () =>
      tasks
        .filter((task) => task.status === "Todo" && task.habitId === habitId)
        .sort((a, b) => a.order - b.order),
    [tasks, habitId]
  );

  const hasTargets = Boolean(habitId) && todo.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Wider on a desk, and wider still when there are cards to pick — the
          rules and the pick are two separate readings, and side by side both
          fit above the fold instead of the pick hiding under five paragraphs.
          The phone keeps the single column. */}
      <DialogContent
        className={cn("max-w-xl", hasTargets ? "md:max-w-5xl" : "md:max-w-2xl")}
      >
        <DialogHeader>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber">
            Deep focus
          </span>
          <DialogTitle className="md:text-3xl">Session Tracker</DialogTitle>
          <DialogDescription>
            {habitTitle
              ? `How to use — before the clock starts on ${habitTitle}.`
              : "How to use — before the clock starts."}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "space-y-5",
            hasTargets &&
              "md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-start md:gap-8 md:space-y-0"
          )}
        >
          <div className="space-y-4">
            {/* Each rule is its own card, not a row in a shared panel — these
                are five separate things to do, and anything that runs them
                together reads as one instruction you skim past. The numeral
                sits in its own column so the wrapped lines of a long rule stay
                under its own text rather than sliding beneath the number. */}
            <ol className="space-y-2.5">
              {STEPS.map((step, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-lg border border-line bg-surface-2/60 px-4 py-3.5 transition-colors hover:border-line-2 sm:gap-4 sm:px-5 md:py-4"
                >
                  <span
                    aria-hidden
                    className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-[11px] tnum text-ink-3"
                  >
                    {i + 1}
                  </span>
                  {/* A div, not a p — one rule carries a nested list of its
                      own, and a list inside a paragraph is invalid markup that
                      the browser silently unnests. */}
                  <div className="min-w-0 text-[15px] leading-relaxed text-ink-2">
                    {step}
                  </div>
                </li>
              ))}
            </ol>

            {/* A gloss on rule 4, not a sixth rule — so it sits outside the
                cards rather than becoming another row you're meant to act on. */}
            <p className="border-l-2 border-line-2 pl-4 text-sm leading-relaxed text-ink-3">
              Next action যত specific হবে, পরের session শুরু করা তত সহজ হবে।
              «Backend continue» নয় — «/refresh-token endpoint-এর expiration
              validation implement করা»।
            </p>
          </div>

          {/* The board, answering rule 1 in place. Picking a card here is what
              moves it to Doing when the clock starts, so the board says what
              you are actually doing without a second trip to /tasks. Optional:
              a session that isn't a card on the board is still a session. */}
          {hasTargets && (
            <div className="rounded-xl border border-line bg-base/60 p-4 md:sticky md:top-0 md:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                {/* The same amber eyebrow the dialog opens with — this is the
                    other thing here you're meant to answer, not a caption on a
                    list. It names rule 1 in the rule's own word. */}
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber">
                  Target
                </p>
                <p className="text-xs text-ink-3">
                  <span className="text-ink-2">Doing</span> on continue
                </p>
              </div>

              <p className="mt-2 text-sm text-ink-2">
                একটাই কাজ বেছে নিন — আজকের session শেষে এটা{" "}
                <span className="text-ink">Done</span>।
              </p>

              {/* A radiogroup rather than checkboxes — one job, and the second
                  press on a chosen card clears it rather than trapping you into
                  starting with a card you didn't mean to pick. */}
              <ul
                role="radiogroup"
                aria-label="Card to work on"
                className="mt-3 max-h-52 space-y-1.5 overflow-y-auto md:max-h-[26rem]"
              >
                {todo.map((task) => {
                  const chosen = selectedTaskId === task.id;
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={chosen}
                        onClick={() => onSelectTask(chosen ? null : task.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          chosen
                            ? "border-amber bg-amber/12"
                            : "border-line bg-surface-2/60 hover:border-line-2"
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "mt-1 h-2.5 w-2.5 shrink-0 rounded-full border",
                            chosen ? "border-amber bg-amber" : "border-line-2"
                          )}
                        />
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-sm",
                              chosen ? "text-ink" : "text-ink-2"
                            )}
                          >
                            {task.title}
                          </span>
                          {task.notes && (
                            <span className="mt-0.5 block truncate text-xs text-ink-3">
                              {task.notes}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-line pt-5">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not yet
          </Button>
          <Button onClick={onContinue} className="gap-2">
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Owns the pending habit and the dialog element. A call site swaps its
 * `dispatch(startTimer(id))` for `requestFocus(id)` and renders `briefing`
 * somewhere in its tree — nothing else changes, and the timer still starts
 * through the same reducer.
 */
export function useFocusBriefing() {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((state) => state.task.tasks);
  const [pending, setPending] = useState<{ id: string; title?: string } | null>(
    null
  );
  const [taskId, setTaskId] = useState<string | null>(null);

  const requestFocus = useCallback((habitId: string, habitTitle?: string) => {
    setPending({ id: habitId, title: habitTitle });
    setTaskId(null);
  }, []);

  const close = () => {
    setPending(null);
    setTaskId(null);
  };

  const start = () => {
    if (!pending) return;

    // The card moves before the clock does, and lands at the top of Doing —
    // the same place a drop on an empty column puts it. `moveTaskAsync` applies
    // the move locally first and rolls it back if the write fails, so a dead
    // network leaves the card in Todo rather than lying about where it is.
    if (taskId) {
      const highest = Math.min(
        0,
        ...tasks.filter((t) => t.status === "Doing").map((t) => t.order)
      );
      dispatch(moveTaskAsync({ id: taskId, status: "Doing", order: highest - 1 }));
    }

    dispatch(startTimer({ habitId: pending.id, taskId }));
    close();
  };

  const briefing = (
    <FocusBriefingDialog
      open={pending !== null}
      habitId={pending?.id}
      habitTitle={pending?.title}
      selectedTaskId={taskId}
      onSelectTask={setTaskId}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      onContinue={start}
    />
  );

  return { requestFocus, briefing };
}
