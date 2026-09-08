"use client";

import { useRef, useState, type PointerEvent } from "react";
import { MAX_INK_POINTS } from "@/lib/bookInk";
import type { InkPoint, InkStroke } from "@/types/books";

export type ReaderTool = "select" | "pen" | "eraser" | "hand";

export function InkLayer({ page, tool, color, width, strokes, onAdd, onRemove }: {
  page: number;
  tool: ReaderTool;
  color: string;
  width: number;
  strokes: InkStroke[];
  onAdd: (stroke: InkStroke) => void;
  onRemove: (id: string) => void;
}) {
  const active = useRef<{ pointer: number; stroke: InkStroke } | null>(null);
  const finger = useRef<{ pointer: number; x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<InkStroke | null>(null);

  function point(event: PointerEvent<SVGSVGElement> | globalThis.PointerEvent, bounds: DOMRect): InkPoint {
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
      pressure: event.pointerType === "pen" && event.pressure > 0 ? event.pressure : 0.5,
    };
  }

  function erase(event: PointerEvent<SVGSVGElement>) {
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-stroke-id]");
    if (target && event.currentTarget.contains(target)) onRemove(target.getAttribute("data-stroke-id")!);
  }

  function finish(event: PointerEvent<SVGSVGElement>, cancelled = false) {
    if (finger.current?.pointer === event.pointerId) finger.current = null;
    if (active.current?.pointer !== event.pointerId) return;
    const stroke = active.current.stroke;
    active.current = null;
    setDraft(null);
    if (!cancelled) onAdd(stroke);
  }

  return (
    <svg
      className="pdf-ink"
      data-editing={tool === "pen" || tool === "eraser"}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      aria-label={`Handwriting on page ${page}`}
      onPointerDown={(event) => {
        if (event.button !== 0 || active.current || finger.current) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        if (event.pointerType === "touch") {
          finger.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
          return;
        }
        if (tool === "eraser") { erase(event); return; }
        if (tool !== "pen") return;
        const stroke = { id: crypto.randomUUID(), page, color, width,
          points: [point(event, event.currentTarget.getBoundingClientRect())] };
        active.current = { pointer: event.pointerId, stroke };
        setDraft(stroke);
      }}
      onPointerMove={(event) => {
        const touch = finger.current;
        if (touch?.pointer === event.pointerId) {
          const desk = event.currentTarget.closest(".reader-desk");
          desk?.scrollBy(touch.x - event.clientX, touch.y - event.clientY);
          finger.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
          return;
        }
        if (event.pointerType === "touch") return;
        if (tool === "eraser" && event.buttons === 1) { erase(event); return; }
        const drawing = active.current;
        if (!drawing || drawing.pointer !== event.pointerId) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];
        const points = (samples.length ? samples : [event.nativeEvent]).map((sample) => point(sample, bounds));
        drawing.stroke = { ...drawing.stroke, points: [...drawing.stroke.points, ...points].slice(0, MAX_INK_POINTS) };
        setDraft(drawing.stroke);
        if (drawing.stroke.points.length === MAX_INK_POINTS) {
          onAdd(drawing.stroke);
          drawing.stroke = { ...drawing.stroke, id: crypto.randomUUID(), points: [drawing.stroke.points.at(-1)!] };
          setDraft(drawing.stroke);
        }
      }}
      onPointerUp={(event) => finish(event)}
      onPointerCancel={(event) => finish(event, true)}
      onLostPointerCapture={(event) => finish(event, true)}
    >
      {[...strokes, ...(draft ? [draft] : [])].map((stroke) => (
        <g key={stroke.id} data-stroke-id={stroke.id} stroke={stroke.color} strokeLinecap="round">
          {stroke.points.map((end, index) => {
            const start = stroke.points[Math.max(0, index - 1)];
            return <line key={index} x1={start.x * 1000} y1={start.y * 1000}
              x2={end.x * 1000 + (index === 0 ? 0.01 : 0)} y2={end.y * 1000}
              strokeWidth={stroke.width * 1000 * (0.5 + end.pressure)} />;
          })}
        </g>
      ))}
    </svg>
  );
}
