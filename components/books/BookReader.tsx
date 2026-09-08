"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { bookRequest } from "./api";
import type { Book, Highlight } from "@/types/books";
import "react-pdf/dist/Page/TextLayer.css";
import "./reader.css";

// Bundle the matching worker locally so reading does not depend on a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function BookReader({ id }: { id: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(0);
  const [pending, setPending] = useState<Highlight | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [turn, setTurn] = useState<{ from: number; direction: number } | null>(
    null,
  );
  const container = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const spread = width >= 760;
  const pageWidth = Math.max(
    150,
    Math.min(spread ? (width - 32) / 2 : width - 24, 560),
  );
  const firstPage = spread ? page - ((page - 1) % 2) : page;

  useEffect(() => {
    bookRequest<Book>(`/api/books/${id}`)
      .then((result) => {
        setBook(result);
        setPage(result.currentPage);
      })
      .catch((error) => setError(error.message));
  }, [id]);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  // Reading position saves cannot overwrite annotations from another tab.
  useEffect(() => {
    if (!pageCount) return;
    const timer = setTimeout(() => {
      bookRequest(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPage: page }),
      }).catch(() =>
        setStatus("Reading position could not be saved. Turn a page to retry."),
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [id, page, pageCount]);

  const navigate = useCallback(
    (destination: number) => {
      if (turn || !pageCount || !Number.isInteger(destination)) return;
      const target = Math.max(1, Math.min(pageCount, destination));
      if (target === page) return;
      setPending(null);
      window.getSelection()?.removeAllRanges();
      if (!reducedMotion)
        setTurn({
          from:
            target > page && spread
              ? Math.min(firstPage + 1, pageCount)
              : firstPage,
          direction: target > page ? 1 : -1,
        });
      setPage(target);
    },
    [turn, pageCount, page, reducedMotion, spread, firstPage],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        (event.target as HTMLElement).closest(
          "input, select, textarea, button",
        ) ||
        window.getSelection()?.toString()
      )
        return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(
          firstPage + (event.key === "ArrowRight" ? 1 : -1) * (spread ? 2 : 1),
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, firstPage, spread]);

  // Fractional line rectangles keep highlights aligned after resizing.
  function captureSelection() {
    if (turn || saving) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setPending(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const element =
      range.startContainer.parentElement?.closest<HTMLElement>(
        "[data-pdf-page]",
      );
    if (
      !element ||
      !element.contains(range.endContainer) ||
      !container.current?.contains(element)
    ) {
      setPending(null);
      return;
    }
    const bounds = element.getBoundingClientRect();
    const rectangles = Array.from(range.getClientRects())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => {
        const x = Math.max(0, (rect.left - bounds.left) / bounds.width);
        const y = Math.max(0, (rect.top - bounds.top) / bounds.height);
        return {
          x,
          y,
          width: Math.max(0, Math.min(rect.width / bounds.width, 1 - x)),
          height: Math.max(0, Math.min(rect.height / bounds.height, 1 - y)),
        };
      })
      .filter((rect) => rect.width > 0 && rect.height > 0);
    const text = selection.toString().trim();
    if (
      !text ||
      text.length > 10000 ||
      !rectangles.length ||
      rectangles.length > 500
    ) {
      setPending(null);
      return;
    }
    setPending({
      id: crypto.randomUUID(),
      page: Number(element.dataset.pdfPage),
      text,
      rectangles,
    });
  }

  async function saveHighlight(
    payload: { highlight: Highlight } | { removeHighlight: string },
  ) {
    setSaving(true);
    setStatus("");
    try {
      const result = await bookRequest<Book>(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setBook(result);
      setPending(null);
      window.getSelection()?.removeAllRanges();
      setStatus("Highlights saved.");
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Render only visible pages and the turning leaf, even in large PDFs.
  function renderPage(number: number, turning = false) {
    return (
      <div
        className="pdf-leaf"
        data-pdf-page={turning ? undefined : number}
        style={{ width: pageWidth }}
      >
        <Page
          pageNumber={number}
          width={pageWidth}
          renderTextLayer={!turning}
          renderAnnotationLayer={false}
          loading={<p className="p-8 text-black">Loading page…</p>}
          error={
            <p className="p-8 text-black">This page could not be rendered.</p>
          }
        />
        <div className="pdf-highlights" aria-hidden>
          {book?.highlights
            .filter((h) => h.page === number)
            .flatMap((h) =>
              h.rectangles.map((rect, index) => (
                <span
                  key={`${h.id}-${index}`}
                  style={{
                    left: `${rect.x * 100}%`,
                    top: `${rect.y * 100}%`,
                    width: `${rect.width * 100}%`,
                    height: `${rect.height * 100}%`,
                  }}
                />
              )),
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 pb-28 pt-6 sm:px-6">
      <Link href="/books" className="text-sm text-amber">
        ← Back to books
      </Link>
      <header className="my-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">
            {book?.title || "Opening book…"}
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Select text on a page, then choose Save highlight.
          </p>
        </div>
        <Button
          disabled={!pending || saving || !!turn}
          onClick={() => pending && saveHighlight({ highlight: pending })}
        >
          {saving ? "Saving…" : "Save highlight"}
        </Button>
      </header>
      {error && (
        <p role="alert" className="my-4 text-danger-ink">
          {error}{" "}
          <button
            className="underline"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </p>
      )}
      <p role="status" className="mb-3 min-h-5 text-sm text-ink-2">
        {status ||
          (pending
            ? `${pending.text.length} characters selected`
            : "Highlights are saved with this book. Image-only scans do not support text selection.")}
      </p>
      <div
        ref={container}
        className="reader-desk"
        onPointerUp={captureSelection}
        onKeyUp={captureSelection}
      >
        {book && width > 0 && (
          <Document
            file={`/api/books/${id}/file`}
            onLoadSuccess={({ numPages }) => {
              setPageCount(numPages);
              setPage((current) => Math.min(current, numPages));
            }}
            onLoadError={() =>
              setError(
                "Unable to open this PDF. Check the Cloudflare R2 configuration or try uploading it again.",
              )
            }
            onPassword={() =>
              setError(
                "This PDF is password protected. Upload an unlocked copy to read it here.",
              )
            }
            loading={
              <p className="p-12" role="status">
                Loading PDF…
              </p>
            }
            error={<p className="p-8">PDF unavailable.</p>}
          >
            {pageCount > 0 && (
              <div
                className="book-spread"
                style={{ width: pageWidth * (spread ? 2 : 1) }}
              >
                {renderPage(firstPage)}
                {spread &&
                  (firstPage + 1 <= pageCount ? (
                    renderPage(firstPage + 1)
                  ) : (
                    <div className="pdf-end" style={{ width: pageWidth }}>
                      End of book
                    </div>
                  ))}
                {turn && (
                  <motion.div
                    aria-hidden
                    className="turning-leaf"
                    style={{
                      width: pageWidth,
                      left: spread && turn.direction > 0 ? pageWidth : 0,
                      transformOrigin:
                        spread && turn.direction < 0
                          ? "right center"
                          : "left center",
                    }}
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: turn.direction > 0 ? -180 : 180 }}
                    transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
                    onAnimationComplete={() => setTurn(null)}
                  >
                    {renderPage(turn.from, true)}
                    <div className="page-back" />
                  </motion.div>
                )}
              </div>
            )}
          </Document>
        )}
      </div>
      <nav
        aria-label="Book pages"
        className="my-5 flex flex-wrap items-center justify-center gap-4"
      >
        <Button
          variant="outline"
          disabled={!pageCount || firstPage <= 1 || !!turn}
          onClick={() => navigate(firstPage - (spread ? 2 : 1))}
        >
          Previous
        </Button>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            navigate(Number(new FormData(event.currentTarget).get("page")));
          }}
          className="flex items-center gap-2 text-sm"
        >
          <label>
            Page{" "}
            <input
              key={page}
              name="page"
              aria-label="Go to page"
              type="number"
              min={1}
              max={pageCount || 1}
              defaultValue={page}
              required
              disabled={!pageCount || !!turn}
              className="w-20 rounded border border-line-2 bg-base px-2 py-2"
            />
          </label>
          <span>of {pageCount || "…"}</span>
          <Button variant="ghost" size="sm" disabled={!pageCount || !!turn}>
            Go
          </Button>
        </form>
        <Button
          variant="outline"
          disabled={
            !pageCount || firstPage + (spread ? 1 : 0) >= pageCount || !!turn
          }
          onClick={() => navigate(firstPage + (spread ? 2 : 1))}
        >
          Next
        </Button>
      </nav>
      {!!book?.highlights.length && (
        <section className="mx-auto mt-8 max-w-3xl">
          <h2 className="mb-4 font-display text-xl">Saved highlights</h2>
          <ul className="space-y-3">
            {book.highlights.map((highlight) => (
              <li
                key={highlight.id}
                className="flex items-start justify-between gap-4 border-l-2 border-amber bg-surface p-4"
              >
                <button
                  className="text-left"
                  onClick={() => navigate(highlight.page)}
                >
                  <span className="text-xs text-amber">
                    Page {highlight.page}
                  </span>
                  <p className="mt-1 text-sm">{highlight.text}</p>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() =>
                    saveHighlight({ removeHighlight: highlight.id })
                  }
                  aria-label={`Remove highlight: ${highlight.text.slice(0, 50)}`}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
