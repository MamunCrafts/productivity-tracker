"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Ban,
  CheckCircle2,
  Circle,
  Footprints,
  GlassWater,
  StretchHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScaleSlider } from "@/components/ui/scale-slider";
import { cn } from "@/lib/utils";

interface SessionWrapUpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitTitle: string;
  /** Formatted duration about to be written, e.g. "1h 12m". */
  duration: string;
  /**
   * The card picked in the briefing, if there was one — absent when the session
   * wasn't started against a board card, or when that card has since been
   * deleted.
   */
  task?: { title: string; done: boolean };
  /** Moves the card between Doing and Done. Applied straight away, not on save. */
  onToggleTaskDone?: () => void;
  onSave: (input: {
    note: string;
    nextAction: string;
    focusScore: number | null;
    energyScore: number | null;
    outputScore: number | null;
  }) => void;
  onDiscard: () => void;
}

/**
 * The three scales, in the order the session is remembered: how sharp the
 * attention was, what you had left in the tank, and what actually came out.
 * Kept apart rather than averaged — a session can be deeply focused and still
 * produce nothing, and one number hides exactly that.
 */
const SCALES = [
  { key: "focusScore", label: "Focus", hint: "How sharp your attention was" },
  { key: "energyScore", label: "Energy", hint: "What you had left in the tank" },
  { key: "outputScore", label: "Output", hint: "How much actually got done" },
] as const;

type ScaleKey = (typeof SCALES)[number]["key"];

/**
 * What a break is actually for. Named rather than left to "take a break",
 * because the default break is a phone, and a phone is not rest — it is the
 * same eyes doing the same thing at a faster cadence. Three things you can do
 * standing up, in the order they cost effort.
 */
const BREAK_MOVES = [
  { icon: Footprints, label: "হাঁটা" },
  { icon: GlassWater, label: "পানি" },
  { icon: StretchHorizontal, label: "Stretch" },
] as const;

/**
 * The two questions worth asking at the end of a session: what you did, and how
 * it went. Everything is optional — Enter saves — because a prompt you can't
 * skip is a reason to stop using the timer.
 */
export function SessionWrapUp({
  open,
  onOpenChange,
  habitTitle,
  duration,
  task,
  onToggleTaskDone,
  onSave,
  onDiscard,
}: SessionWrapUpProps) {
  const [note, setNote] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [scores, setScores] = useState<Record<ScaleKey, number | null>>({
    focusScore: null,
    energyScore: null,
    outputScore: null,
  });

  const reset = () => {
    setNote("");
    setNextAction("");
    setScores({ focusScore: null, energyScore: null, outputScore: null });
  };

  const save = () => {
    onSave({ note, nextAction, ...scores });
    reset();
  };

  /** ⌘/Ctrl + Enter saves from any field, not just the note. */
  const saveOnCommandEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      {/* Wider from `md` — on a laptop the single narrow column ran past the
          fold and the sliders, the part most likely to be skipped, were the
          part below it. The phone keeps one column; there is no width to
          spend there. */}
      <DialogContent className="max-w-md md:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Wrap up</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-ink tnum">{duration}</span> on{" "}
            <span className="text-ink">{habitTitle}</span>. Every field is optional.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-6 md:grid md:grid-cols-2 md:items-start md:gap-x-8 md:gap-y-6 md:space-y-0"
        >
          {/* The target you set at the start, closed at the end. It sits above
              everything else because it is the one question this session was
              started to answer — and one tap, not a trip to the board, is what
              keeps that answer honest. Full width: it is one row of text, and
              half a dialog of empty space beside it reads as a missing field. */}
          {task && (
            <div className="space-y-2 md:col-span-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber">
                Target
              </p>
              {/* Green only once it is finished. Amber would say "this is what
                  you're focused on", which was true while the clock ran and
                  isn't what's being reported here — the question at the end is
                  did it get done, and done has its own colour. */}
              <button
                type="button"
                onClick={onToggleTaskDone}
                aria-pressed={task.done}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                  task.done
                    ? "border-success bg-success/12"
                    : "border-line bg-surface-2/60 hover:border-line-2"
                )}
              >
                {task.done ? (
                  <CheckCircle2
                    className="mt-px h-5 w-5 shrink-0 text-success"
                    aria-hidden
                  />
                ) : (
                  <Circle className="mt-px h-5 w-5 shrink-0 text-ink-3" aria-hidden />
                )}
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm",
                      task.done
                        ? "text-ink line-through decoration-success/60"
                        : "text-ink-2"
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-3">
                    {task.done
                      ? "শেষ! এটা এখন Done — একটা কাজ কমে গেল।"
                      : "শেষ করে ফেলেছেন? tick দিন, কাজটা Done-এ যাক।"}
                  </span>
                </span>
              </button>
            </div>
          )}

          {/* The two written answers travel together in the first column, the
              three scales in the second — what happened on the left, how it
              felt on the right. */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="session-note" className="text-ink-2">
                What did you work on?
              </Label>
              <textarea
                id="session-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Finished the hooks chapter; still shaky on useReducer"
                className="w-full resize-none rounded-md border border-line-2 bg-base px-3 py-2 text-base text-ink placeholder:text-ink-3/55 focus-visible:border-amber focus-visible:outline-none md:min-h-28"
                onKeyDown={saveOnCommandEnter}
              />
              <p className="text-xs text-ink-3">⌘/Ctrl + Enter saves.</p>
            </div>

            {/* Asked here rather than at the start of the next session, because
                this is the only moment the answer is free — the work is still
                in your head. The more specific it is, the less of the next
                session goes on remembering where you were. */}
            <div className="space-y-2">
              <Label htmlFor="session-next-action" className="text-ink-2">
                Next action
              </Label>
              <textarea
                id="session-next-action"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                rows={2}
                placeholder="Implement expiration validation on the /refresh-token endpoint"
                className="w-full resize-none rounded-md border border-line-2 bg-base px-3 py-2 text-base text-ink placeholder:text-ink-3/55 focus-visible:border-amber focus-visible:outline-none md:min-h-24"
                onKeyDown={saveOnCommandEnter}
              />
              <p className="text-xs text-ink-3">
                One specific thing you can start on without deciding anything —
                not “continue the backend”. It becomes a card in{" "}
                <span className="text-ink-2">Todo</span> on the board.
              </p>
            </div>
          </div>

          <fieldset className="space-y-5 md:space-y-6">
            <legend className="mb-2 text-sm text-ink-2">How did it go?</legend>
            {/* Stacked rather than three-across even in the wide layout: at
                360px a row of three tracks leaves each about 90px wide, which
                is four pixels per step, and side by side they'd read as one
                three-part control rather than three questions. */}
            {SCALES.map((scale) => (
              <ScaleSlider
                key={scale.key}
                label={scale.label}
                hint={scale.hint}
                value={scores[scale.key]}
                onChange={(next) =>
                  setScores((prev) => ({ ...prev, [scale.key]: next }))
                }
              />
            ))}
          </fieldset>

          {/* The last thing read before the dialog closes, because the minute
              after it closes is the break — and the default break is a phone,
              which rests nothing. Deliberately not amber and not pressable:
              amber means focus and the primary action, and this is neither, it
              is a note about what to do once you've stood up. */}
          <div className="space-y-2 md:col-span-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
              Break
            </p>
            <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-2/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              {/* The verdict pair, used as a verdict: this is what a break was
                  and wasn't, not where to look or what to press — amber still
                  owns that. Colour is never the only channel, so the red side
                  carries a struck-through circle and the word "নয়", and the
                  green side keeps an icon per move. */}
              <p className="flex items-center gap-1.5 text-sm text-danger-ink">
                <Ban className="h-4 w-4 shrink-0" aria-hidden />
                Reels নয়।
              </p>
              {/* Wraps rather than scrolls — three short items fit 360px in one
                  row, and a reminder you have to swipe to finish reading is
                  one you don't read. */}
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {BREAK_MOVES.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-1.5 text-sm text-success"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter className="md:col-span-2 md:border-t md:border-line md:pt-5">
            {/* Red at rest, not only on hover: this is the one control here
                that throws the session away, and a destructive action that
                looks identical to "Keep going" until you're over it is a
                control you can hit by accident. `danger-ink` rather than
                `danger` — the fill colour is too dark to read as text. */}
            <Button
              type="button"
              variant="ghost"
              className="text-danger-ink hover:bg-danger/12 hover:text-danger-ink sm:mr-auto"
              onClick={() => {
                reset();
                onDiscard();
              }}
            >
              Discard session
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Keep going
            </Button>
            <Button type="submit">Save session</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
