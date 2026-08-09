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
import { ScaleSlider } from "@/components/ui/scale-slider";
import { dayKey, focusLabel, focusOutOf10, formatHours, toHours } from "@/lib/analytics";

/** The same three scales the wrap-up asks for, so a session can be re-rated. */
const SCALES = [
  { key: "focusScore", label: "Focus" },
  { key: "energyScore", label: "Energy" },
  { key: "outputScore", label: "Output" },
] as const;

type ScaleKey = (typeof SCALES)[number]["key"];

function EditRow({ log, onDone }: { log: TimeLog; onDone: () => void }) {
  const dispatch = useAppDispatch();
  const [minutes, setMinutes] = useState(Math.round(log.durationSeconds / 60));
  const [date, setDate] = useState(log.date);
  const [note, setNote] = useState(log.note ?? "");
  const [nextAction, setNextAction] = useState(log.nextAction ?? "");
  const [scores, setScores] = useState<Record<ScaleKey, number | null>>({
    focusScore: log.focusScore ?? null,
    energyScore: log.energyScore ?? null,
    outputScore: log.outputScore ?? null,
  });

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
          nextAction: nextAction.trim(),
          ...scores,
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

      {/* Editable here, but only the log's own copy — the board card was
          created when the session was saved and lives its own life after
          that, so renaming one doesn't silently rewrite the other. */}
      <div className="space-y-1.5">
        <Label htmlFor={`na-${log.id}`} className="text-xs text-ink-3">
          Next action
        </Label>
        <Input
          id={`na-${log.id}`}
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder="Where the next session starts"
          className="h-9"
        />
      </div>

      <div className="space-y-4">
        {SCALES.map((scale) => (
          <ScaleSlider
            key={scale.key}
            label={scale.label}
            value={scores[scale.key]}
            onChange={(next) =>
              setScores((prev) => ({ ...prev, [scale.key]: next }))
            }
          />
        ))}
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

        // Focus reads out of 10 whichever scale it was rated on; energy and
        // output only exist on the new one, so they're absent on older rows
        // rather than shown as zero.
        const focus = focusOutOf10(log);
        const scales = [
          focus !== null ? `Focus ${focus}/10` : null,
          typeof log.energyScore === "number"
            ? `Energy ${log.energyScore}/10`
            : null,
          typeof log.outputScore === "number"
            ? `Output ${log.outputScore}/10`
            : null,
        ].filter((entry): entry is string => entry !== null);

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
                  {focus !== null && (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-2">
                      {focusLabel(focus)}
                    </span>
                  )}
                </div>
                {log.note && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-2">{log.note}</p>
                )}
                {log.nextAction && (
                  <p className="mt-1 flex gap-1.5 text-sm text-ink-3">
                    <span className="shrink-0 text-ink-3">Next:</span>
                    <span className="min-w-0 whitespace-pre-wrap">
                      {log.nextAction}
                    </span>
                  </p>
                )}
                {scales.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] tnum text-ink-3">
                    {scales.map((entry) => (
                      <span key={entry}>{entry}</span>
                    ))}
                  </p>
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
