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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FOCUS_RATINGS } from "@/lib/analytics";

interface SessionWrapUpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitTitle: string;
  /** Formatted duration about to be written, e.g. "1h 12m". */
  duration: string;
  onSave: (input: { note: string; focusRating: number | null }) => void;
  onDiscard: () => void;
}

/**
 * The two questions worth asking at the end of a session: what you did, and how
 * it went. Both optional — Enter saves — because a prompt you can't skip is a
 * reason to stop using the timer.
 */
export function SessionWrapUp({
  open,
  onOpenChange,
  habitTitle,
  duration,
  onSave,
  onDiscard,
}: SessionWrapUpProps) {
  const [note, setNote] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  const reset = () => {
    setNote("");
    setRating(null);
  };

  const save = () => {
    onSave({ note, focusRating: rating });
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Wrap up</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-ink tnum">{duration}</span> on{" "}
            <span className="text-ink">{habitTitle}</span>. Both fields are optional.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-6"
        >
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
              className="w-full resize-none rounded-md border border-line-2 bg-base px-3 py-2 text-base text-ink placeholder:text-ink-3 focus-visible:border-amber focus-visible:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  save();
                }
              }}
            />
            <p className="text-xs text-ink-3">⌘/Ctrl + Enter saves.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-ink-2">How was the focus?</Label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_RATINGS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={rating === option.value}
                  onClick={() =>
                    setRating(rating === option.value ? null : option.value)
                  }
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    rating === option.value
                      ? "border-amber bg-amber/12 text-amber"
                      : "border-line-2 text-ink-2 hover:bg-surface-2 hover:text-ink"
                  )}
                >
                  <span className="font-mono tnum">{option.value}</span>
                  <span className="ml-2">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="hover:bg-danger/12 hover:text-danger sm:mr-auto"
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
