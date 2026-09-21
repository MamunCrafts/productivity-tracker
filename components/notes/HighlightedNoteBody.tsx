"use client";

import { useEffect, useRef, useState } from "react";
import { Highlighter, Eraser } from "lucide-react";
import type { Block, HighlightColor, Note } from "@/types/notes";
import { HIGHLIGHT_COLORS, changeHighlights, isValidHighlights } from "@/lib/noteHighlights";
import { useAppDispatch } from "@/store/hooks";
import { updateNoteAsync } from "@/store/noteSlice";
import { NoteBody } from "./BlockRenderer";

type TextSelection = { start: number; end: number; text: string };

// Restore a saved text range across inline formatting and block boundaries.
function restoreRange(root: HTMLElement, selection: TextSelection): Range | null {
  if (root.textContent?.slice(selection.start, selection.end) !== selection.text) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let started = false;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const end = offset + (node.textContent?.length ?? 0);
    if (!started && selection.start < end) {
      range.setStart(node, selection.start - offset);
      started = true;
    }
    if (started && selection.end <= end) {
      range.setEnd(node, selection.end - offset);
      return range;
    }
    offset = end;
  }
  return null;
}

// Keep annotation controls outside the text used for saved offsets.
export function HighlightedNoteBody({ note, blocks }: { note: Note; blocks: Block[] }) {
  const dispatch = useAppDispatch();
  const bodyRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [supported, setSupported] = useState(true);

  // selectionchange handles mouse, touch handles, and keyboard selection.
  useEffect(() => {
    function captureSelection() {
      const root = bodyRef.current;
      const current = window.getSelection();
      if (!root || !current || current.isCollapsed || !current.rangeCount) {
        if (!toolbarRef.current?.contains(document.activeElement)) setSelection(null);
        return;
      }
      const range = current.getRangeAt(0);
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        setSelection(null);
        return;
      }
      const prefix = document.createRange();
      prefix.selectNodeContents(root);
      prefix.setEnd(range.startContainer, range.startOffset);
      const start = prefix.toString().length;
      const text = range.toString();
      setSelection(text.trim() ? { start, end: start + text.length, text } : null);
    }
    document.addEventListener("selectionchange", captureSelection);
    return () => document.removeEventListener("selectionchange", captureSelection);
  }, []);

  // CSS highlights paint ranges without changing React's rendered elements.
  useEffect(() => {
    if (!("highlights" in CSS) || typeof Highlight === "undefined") {
      // Feature detection runs after hydration because these are browser APIs.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(false);
      return;
    }
    const root = bodyRef.current;
    if (!root) return;
    for (const color of HIGHLIGHT_COLORS) {
      const ranges = (note.highlights ?? [])
        .filter((highlight) => highlight.color === color.value)
        .map((highlight) => restoreRange(root, highlight))
        .filter((range): range is Range => range !== null);
      CSS.highlights.set(`note-${color.value}`, new Highlight(...ranges));
    }
    return () => {
      for (const color of HIGHLIGHT_COLORS) CSS.highlights.delete(`note-${color.value}`);
    };
  }, [note.highlights, blocks]);

  // Save before showing success; failed writes leave existing highlights intact.
  async function applyHighlight(color: HighlightColor | null) {
    if (!selection || savingRef.current) return;
    const highlights = changeHighlights(note.highlights ?? [], selection, color);
    if (!isValidHighlights(highlights)) {
      setMessage("Highlight limit reached. Remove some highlights first.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setMessage("");
    try {
      await dispatch(updateNoteAsync({ id: note.id, patch: { highlights } })).unwrap();
      window.getSelection()?.removeAllRanges();
      setSelection(null);
      setMessage(color ? "Highlight saved." : "Highlight removed.");
    } catch {
      setMessage("Could not save highlights. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      {/* Render these rules directly because the bundled CSS parser predates ::highlight. */}
      <style>{HIGHLIGHT_COLORS.map((color) =>
        `::highlight(note-${color.value}) { background-color: ${color.background}; color: #172033; }`
      ).join("\n")}</style>
      {/* Sticky controls stay reachable while reading long notes. */}
      <div ref={toolbarRef} className="sticky top-16 z-10 mb-6 rounded-lg border border-line bg-surface-2 p-3">
        <div role="group" aria-label="Text highlight colors" className="flex flex-wrap items-center gap-2">
          <Highlighter className="h-4 w-4 text-ink-2" aria-hidden />
          <span className="mr-1 text-sm text-ink-2">Highlight</span>
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              aria-label={`Highlight ${color.label.toLowerCase()}`}
              title={color.label}
              disabled={!supported || !selection || saving}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => applyHighlight(color.value)}
              className="h-8 w-8 rounded-full border border-black/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: color.background }}
            />
          ))}
          <button
            type="button"
            disabled={!supported || !selection || saving}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => applyHighlight(null)}
            className="inline-flex min-h-8 items-center gap-1.5 rounded px-2 text-sm text-ink-2 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Eraser className="h-4 w-4" aria-hidden /> Remove
          </button>
        </div>
        <p role="status" className="mt-2 text-xs text-ink-3">
          {!supported ? "Highlighting needs a newer browser." : saving ? "Saving highlight…" : message || "Select text, then choose a color. Select highlighted text to recolor or remove it."}
        </p>
      </div>
      <div ref={bodyRef}><NoteBody blocks={blocks} /></div>
    </>
  );
}
