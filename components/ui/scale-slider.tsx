"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export const SCALE_MAX = 10;
/** Where an untouched thumb sits — the middle, so a drag either way is equal. */
const NEUTRAL = 5;

/**
 * The verdict bands. 1-3 is a session that didn't work, 8-10 one that did, and
 * the middle is the ordinary case that stays in the app's own amber. Colour
 * repeats what the number already says rather than replacing it — the value is
 * always printed beside the track.
 */
function toneOf(value: number | null) {
  if (value === null) return { track: "scale-slider-unset", text: "text-ink-3" };
  if (value <= 3) return { track: "scale-slider-low", text: "text-danger-ink" };
  if (value >= 8) return { track: "scale-slider-high", text: "text-success" };
  return { track: "", text: "text-amber" };
}

interface ScaleSliderProps {
  label: string;
  /** `null` until the slider is touched; an unrated session isn't a 1. */
  value: number | null;
  onChange: (next: number) => void;
  /** Read out beside the number, e.g. "how sharp your attention was". */
  hint?: string;
  className?: string;
}

/**
 * One 1-10 self-rating: a label, the number, and a track.
 *
 * A native `input[type=range]` rather than a Radix slider — it is already
 * keyboard-operable, already announces its value, and the thumb hits the 44px
 * touch floor without a wrapper. The look comes from `.scale-slider` in
 * `globals.css`, which reads the same theme tokens as everything else.
 *
 * Untouched reads `–/10` and wears the muted thumb, because a slider that shows
 * `5/10` before you've moved it writes an opinion you never gave.
 */
export function ScaleSlider({
  label,
  value,
  onChange,
  hint,
  className,
}: ScaleSliderProps) {
  const id = useId();
  const set = value !== null;
  const tone = toneOf(value);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3"
        >
          {label}
        </label>
        <p className="font-mono text-sm tnum">
          <span className={tone.text}>{set ? value : "–"}</span>
          <span className="text-ink-3">/{SCALE_MAX}</span>
        </p>
      </div>

      <input
        id={id}
        type="range"
        min={1}
        max={SCALE_MAX}
        step={1}
        value={value ?? NEUTRAL}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={set ? `${value} out of ${SCALE_MAX}` : "not rated"}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn("scale-slider w-full", tone.track)}
      />

      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}
