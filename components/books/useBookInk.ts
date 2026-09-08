"use client";

import { useEffect, useState } from "react";
import { bookRequest } from "./api";
import type { Book, InkStroke } from "@/types/books";

type InkOperation = { stroke: InkStroke } | { removeStroke: string };

export function useBookInk(
  id: string,
  saved: InkStroke[],
  onSaved: (strokes: InkStroke[]) => void,
) {
  const [queue, setQueue] = useState<InkOperation[]>([]);
  const [error, setError] = useState("");
  const operation = queue[0];

  useEffect(() => {
    if (!operation || error) return;
    let active = true;
    bookRequest<Book>(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(operation),
    }).then((book) => {
      if (!active) return;
      onSaved(book.strokes ?? []);
      setQueue((current) => current.slice(1));
    }).catch(() => {
      if (active) setError("Ink could not be saved. Keep this reader open and retry.");
    });
    return () => { active = false; };
  }, [id, operation, error, onSaved]);

  useEffect(() => {
    if (!queue.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [queue.length]);

  const strokes = queue.reduce((current, change) => {
    if ("stroke" in change) {
      return [...current.filter((stroke) => stroke.id !== change.stroke.id), change.stroke];
    }
    return current.filter((stroke) => stroke.id !== change.removeStroke);
  }, saved);

  return {
    strokes,
    saving: queue.length > 0,
    error,
    retry: () => setError(""),
    add: (stroke: InkStroke) => setQueue((current) => [...current, { stroke }]),
    remove: (removeStroke: string) => setQueue((current) => [...current, { removeStroke }]),
  };
}
