import type { HighlightColor, NoteHighlight } from "@/types/notes";

// Shared palette for the toolbar and server validation.
export const HIGHLIGHT_COLORS: { value: HighlightColor; label: string; background: string }[] = [
  { value: "yellow", label: "Yellow", background: "#fde68a" },
  { value: "green", label: "Green", background: "#bbf7d0" },
  { value: "blue", label: "Blue", background: "#bfdbfe" },
  { value: "pink", label: "Pink", background: "#fbcfe8" },
  { value: "purple", label: "Purple", background: "#ddd6fe" },
];

// Bound storage and reject overlapping or invalid ranges.
export function isValidHighlights(value: unknown): value is NoteHighlight[] {
  if (!Array.isArray(value) || value.length > 1000) return false;
  let previousEnd = 0;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const valid = Number.isSafeInteger(item.start) && Number.isSafeInteger(item.end)
      && item.start >= previousEnd && item.end > item.start
      && item.end <= 10_000_000 && typeof item.text === "string"
      && item.text.length === item.end - item.start
      && HIGHLIGHT_COLORS.some((color) => color.value === item.color);
    previousEnd = item.end;
    return valid;
  });
}

// Recolor or erase only the selection, preserving both outside portions.
export function changeHighlights(
  highlights: NoteHighlight[],
  selection: { start: number; end: number; text: string },
  color: HighlightColor | null
): NoteHighlight[] {
  const result = highlights.flatMap((highlight) => {
    if (highlight.end <= selection.start || highlight.start >= selection.end) return [highlight];
    const parts: NoteHighlight[] = [];
    if (highlight.start < selection.start) {
      parts.push({ ...highlight, end: selection.start, text: highlight.text.slice(0, selection.start - highlight.start) });
    }
    if (highlight.end > selection.end) {
      parts.push({ ...highlight, start: selection.end, text: highlight.text.slice(selection.end - highlight.start) });
    }
    return parts;
  });
  if (color) result.push({ ...selection, color });
  return result.sort((first, second) => first.start - second.start);
}
