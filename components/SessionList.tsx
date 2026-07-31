"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteLogAsync, updateLogAsync } from "@/store/habitSlice";
import { TimeLog } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RATINGS, dayKey, formatHours, toHours } from "@/lib/analytics";

function RatingChips({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FOCUS_RATINGS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(value === option.value ? null : option.value)}
          className={cn(
            "rounded border px-2 py-1 text-xs transition-colors",
            value === option.value
              ? "border-amber bg-amber/12 text-amber"
              : "border-line-2 text-ink-3 hover:text-ink-2"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function EditRow({ log, onDone }: { log: TimeLog; onDone: () => void }) {
  const dispatch = useAppDispatch();
  const [minutes, setMinutes] = useState(Math.round(log.durationSeconds / 60));
  const [date, setDate] = useState(log.date);
  const [note, setNote] = useState(log.note ?? "");
  const [rating, setRating] = useState<number | null>(log.focusRating ?? null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (minutes <= 0) return;
    dispatch(
      updateLogAsync({
        id: log.id,
        patch: {
          durationSeconds: minutes * 60,
          date,
          note: note.trim(),
          focusRating: rating,
        },
      })
    );
    onDone();
  };

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border border-line-2 bg-base p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`m-${log.id}`} className="text-xs text-ink-3">
            Minutes
          </Label>
          <Input
            id={`m-${log.id}`}
            type="number"
            min="1"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="h-9 font-mono tnum"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`d-${log.id}`} className="text-xs text-ink-3">
            Date
          </Label>
          <Input
            id={`d-${log.id}`}
            type="date"
            max={dayKey(new Date())}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 font-mono tnum"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`n-${log.id}`} className="text-xs text-ink-3">
          Note
        </Label>
        <Input
          id={`n-${log.id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What you worked on"
          className="h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-ink-3">Focus</Label>
        <RatingChips value={rating} onChange={setRating} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={minutes <= 0}>
          <Check className="mr-1.5 h-3.5 w-3.5" /> Save
        </Button>
      </div>
    </form>
  );
}

/**
 * The only place a logged session can be corrected or removed. Before this,
 * a mistyped manual entry was permanent and silently skewed every total.
 */
export function SessionList({ habitId }: { habitId: string }) {
  const logs = useAppSelector((state) => state.habit.logs);
  const dispatch = useAppDispatch();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const mine = logs
    .filter((l) => l.habitId === habitId)
    .slice()
    .sort((a, b) => (a.date === b.date ? b.startTime.localeCompare(a.startTime) : b.date.localeCompare(a.date)));

  if (mine.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
        No sessions logged yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {mine.map((log) => {
        if (editing === log.id) {
          return (
            <li key={log.id}>
              <EditRow log={log} onDone={() => setEditing(null)} />
            </li>
          );
        }

        const rating = FOCUS_RATINGS.find((r) => r.value === log.focusRating);

        return (
          <li
            key={log.id}
            className="group rounded-lg border border-line bg-base px-3 py-2.5"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="font-mono text-ink tnum">
                    {formatHours(toHours(log.durationSeconds))}
                  </span>
                  <span className="text-ink-3">
                    {format(parseISO(log.date), "EEE, MMM d")}
                  </span>
                  <span className="text-xs text-ink-3">
                    {log.endTime ? "timed" : "manual"}
                  </span>
                  {rating && (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-2">
                      {rating.label}
                    </span>
                  )}
                </div>
                {log.note && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-2">{log.note}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="Edit session"
                  onClick={() => setEditing(log.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit session</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-danger/12 hover:text-danger"
                  title="Delete session"
                  onClick={() => setConfirming(log.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete session</span>
                </Button>
              </div>
            </div>

            {confirming === log.id && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-danger/10 px-3 py-2">
                <p className="text-sm text-ink-2">
                  Delete this session for good? It leaves your totals immediately.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                    Keep
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      dispatch(deleteLogAsync(log.id));
                      setConfirming(null);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
