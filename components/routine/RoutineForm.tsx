"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createRoutineBlock, updateRoutineBlock } from "@/store/routineSlice";
import { RoutineBlock, Weekday } from "@/types";
import { HabitPicker } from "@/components/notes/HabitPicker";
import { DayPicker } from "@/components/routine/DayPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { clockOf, formatDuration, minutesOf } from "@/lib/routine";

/** A new block defaults to a weekday morning hour — the commonest slot to add first. */
const EMPTY = {
  label: "",
  habitId: "",
  startTime: "07:00",
  durationMinutes: 60,
  days: [1, 2, 3, 4, 5] as Weekday[],
};

type FormState = typeof EMPTY;

const fromBlock = (block: RoutineBlock): FormState => ({
  label: block.label,
  habitId: block.habitId ?? "",
  startTime: block.startTime,
  durationMinutes: block.durationMinutes,
  days: [...block.days],
});

/** Enough to build a day out of without typing, and the arithmetic stays honest. */
const PRESETS = [15, 30, 45, 60, 90, 120];

export function RoutineForm({
  block,
  compact = false,
}: {
  /** Omit to create; pass a block to edit it in place. */
  block?: RoutineBlock;
  /** Icon-only trigger, for the per-block edit control. */
  compact?: boolean;
}) {
  const dispatch = useAppDispatch();
  // Filtered outside the selector: a selector returning a fresh array re-runs
  // this component on every store change, and there is one form per block.
  const allHabits = useAppSelector((state) => state.habit.habits);
  /**
   * "A running habit" — one you could actually sit down to. A finished habit
   * is history and a paused one isn't taking sessions, so neither belongs in a
   * routine you are about to follow. Soft-deleted ones never arrive here.
   */
  const habits = useMemo(
    () => allHabits.filter((h) => !h.completed && h.status !== "Paused"),
    [allHabits]
  );

  const isEdit = Boolean(block);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(
    block ? fromBlock(block) : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openChange = (next: boolean) => {
    // Reopening shows what's saved, not what was left behind after a cancel.
    if (next) {
      setForm(block ? fromBlock(block) : EMPTY);
      setError(null);
    }
    setOpen(next);
  };

  const label = form.label.trim();
  const valid = label.length > 0 && form.days.length > 0 && form.durationMinutes > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;

    setSaving(true);
    setError(null);
    const payload = {
      label,
      habitId: form.habitId || null,
      startTime: form.startTime,
      durationMinutes: form.durationMinutes,
      // Stored in `getDay()` order so nothing downstream has to remap it.
      days: [...form.days].sort((a, b) => a - b),
    };

    try {
      if (block) {
        await dispatch(updateRoutineBlock({ id: block.id, patch: payload })).unwrap();
      } else {
        await dispatch(createRoutineBlock(payload)).unwrap();
      }
      setOpen(false);
    } catch {
      // Kept open with the input intact — a failed save must not eat the typing.
      setError("That didn't save. Check the times and try again.");
    } finally {
      setSaving(false);
    }
  }

  // Shown live under the time fields so the end of the slot is never a
  // calculation you do in your head.
  const ends = clockOf(minutesOf(form.startTime) + form.durationMinutes);

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon"
            // Touch has no hover, so a row action is recessive rather than
            // hidden — never gated behind `group-hover` alone.
            className="h-8 w-8 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Edit ${block?.label ?? "block"}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" aria-hidden />
            Add block
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit block" : "Add a block"}</DialogTitle>
          <DialogDescription>
            One slot in the day. Set it once and it lands on every day you pick.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="routine-label">What</Label>
            <Input
              id="routine-label"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Morning run"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="routine-habit">Habit</Label>
            <HabitPicker
              id="routine-habit"
              habits={habits}
              value={form.habitId || null}
              onChange={(habitId) => set("habitId", habitId ?? "")}
              rootLabel="No habit — just part of the day"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="routine-start">Starts</Label>
              <Input
                id="routine-start"
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="routine-duration">For (minutes)</Label>
              <Input
                id="routine-duration"
                type="number"
                min={1}
                max={1440}
                inputMode="numeric"
                value={form.durationMinutes}
                onChange={(e) =>
                  set("durationMinutes", Math.max(0, Number(e.target.value)))
                }
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => set("durationMinutes", minutes)}
                aria-pressed={form.durationMinutes === minutes}
                className={
                  form.durationMinutes === minutes
                    ? "rounded-md border border-amber-deep bg-amber-deep/20 px-2 py-1 font-mono text-xs text-ink"
                    : "rounded-md border border-line-2 px-2 py-1 font-mono text-xs text-ink-3 transition-colors hover:text-ink-2"
                }
              >
                {formatDuration(minutes)}
              </button>
            ))}
            {form.durationMinutes > 0 && (
              <p className="ml-auto font-mono text-xs tnum text-ink-3">
                ends {ends}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="routine-days">Repeats on</Label>
            <DayPicker
              id="routine-days"
              value={form.days}
              onChange={(days) => set("days", days)}
            />
          </div>

          {/* `aria-live` so the message is announced, not just drawn. */}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {form.days.length === 0 && (
            <p className="text-sm text-ink-3">
              Pick at least one day, or this block never happens.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving ? "Saving…" : isEdit ? "Save block" : "Add block"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
