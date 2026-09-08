"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import { motion, useReducedMotion } from "framer-motion";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DEFAULT_HIGHLIGHT_COLOR,
  HIGHLIGHT_COLORS,
  countsByColor,
  highlightHex,
  highlightKey,
  highlightName,
} from "@/lib/highlights";
import { bookRequest } from "./api";
import type { Book, Highlight, HighlightColor } from "@/types/books";
import "react-pdf/dist/Page/TextLayer.css";
import "./reader.css";

// Bundle the matching worker locally so reading does not depend on a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/**
 * The `pdf` object `<Document onLoadSuccess>` hands back, named off the prop
 * itself rather than reached for in react-pdf's internal type paths.
 */
type LoadedDocument = Parameters<
  NonNullable<React.ComponentProps<typeof Document>["onLoadSuccess"]>
>[0];

/** How wide a cover is stored. Two-up on a phone shelf is ~160px CSS. */
const COVER_WIDTH = 640;

/** Vendor-prefixed fullscreen, which is all Safari on a desk offers. */
type Fullscreenable = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

/**
 * Zoom stops, where **1 is always "fitted"** — whatever the current fit mode
 * worked out, not a fixed pixel width. That is what makes one control read the
 * same on a phone and on a 27-inch monitor: 100% is "as the page comes", and
 * every other stop is a multiple of it.
 *
 * It stops at 3×. Beyond that the canvas pdf.js paints is device-pixel-ratio
 * times larger again, and a retina 3× on an A4 page is already past the area
 * limit Safari puts on a single canvas — the page would simply fail to render
 * rather than render large.
 */
const ZOOM_STOPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

/** The widest leaf we will ask for, for the same canvas-area reason. */
const MAX_PAGE_WIDTH = 2400;

function fullscreenElement() {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/**
 * The marker palette as a control. One row in both views, because picking a
 * colour is the same decision whether the page fills the screen or not.
 *
 * A swatch does two things and the label says which: with text selected it
 * saves that selection in its colour, and either way it becomes the colour the
 * primary control writes next. Two steps to a highlight — select, then pick —
 * is the shape every reader app uses, and it means the colour is chosen at the
 * moment there is something to colour rather than in a settings panel.
 */
function MarkerPicker({
  value,
  pending,
  disabled,
  onPick,
}: {
  value: HighlightColor;
  pending: boolean;
  disabled: boolean;
  onPick: (color: HighlightColor) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Marker colour">
      {HIGHLIGHT_COLORS.map(({ key, name, hex }) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          aria-pressed={value === key}
          // The swatch's own colour is the only thing distinguishing it, so the
          // name has to be in the accessible label — and it changes to say what
          // pressing it will do right now.
          aria-label={
            pending ? `Highlight selection in ${name}` : `Marker colour ${name}`
          }
          title={name}
          onClick={() => onPick(key)}
          className={cn(
            // 40px on a phone clears the touch floor; the desk can be tighter.
            "h-10 w-10 rounded-full transition sm:h-8 sm:w-8",
            "disabled:cursor-not-allowed disabled:opacity-40",
            // Which one is armed is carried by border weight and size, not by
            // colour — the swatches *are* the colours, so the selected state
            // needs a channel of its own. The primary control spells the name
            // out beside them ("Highlight Green") as the third.
            value === key
              ? "scale-110 border-2 border-ink"
              : "border border-line-2 opacity-70 hover:opacity-100",
          )}
          style={{ background: hex }}
        />
      ))}
    </div>
  );
}

export default function BookReader({ id }: { id: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Width ÷ height of the page on screen, so full page view can fit the whole
  // leaf rather than only its width. Read off the PDF, since a landscape scan
  // and A4 portrait need different budgets.
  const [ratio, setRatio] = useState(0.7727);
  const [pending, setPending] = useState<Highlight | null>(null);
  const [color, setColor] = useState<HighlightColor>(DEFAULT_HIGHLIGHT_COLOR);
  const [filter, setFilter] = useState<HighlightColor | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [full, setFull] = useState(false);
  const [zoom, setZoom] = useState(1);
  // Two ways to spend the space, and the reader picks: fit the whole leaf, or
  // spend the full width on it and scroll. On the landscape pages this book
  // turned out to hold, the first leaves bands of desk above and below and the
  // type comes out small, so the choice has to be the reader's, not a rule.
  const [fitWidth, setFitWidth] = useState(false);
  // "auto" until the reader says otherwise — see `spread` for what it decides.
  const [pages, setPages] = useState<"auto" | "one" | "two">("auto");
  const [turn, setTurn] = useState<{ from: number; direction: number } | null>(
    null,
  );
  const pageFieldId = useId();
  const coverAttempted = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const spreadable = size.width >= 760;
  /*
    A landscape leaf is already a two-column layout — a slide, a deck, a
    landscape report — so a second one beside it is really a four-column spread,
    and that is what makes the type small however much room the desk has. Two-up
    is the default only for a portrait page, where two leaves side by side still
    fill the height; either way the toggle overrides it, which is why `pages`
    starts at "auto" rather than at a boolean.
  */
  const spread =
    spreadable && (pages === "auto" ? ratio <= 1 : pages === "two");
  // The width one leaf has to itself, and — in full page view only — the height
  // the viewport has left for it, put in the same units through the page ratio.
  const widthBudget = (size.width - (full ? 8 : 32)) / (spread ? 2 : 1);
  const heightBudget =
    full && size.height > 0 ? (size.height - 8) * ratio : Infinity;
  /*
    Zoom 1 is the fitted size, so what "fitted" means is the only decision here.
    Fitting the width spends everything on the measure and lets the desk scroll;
    fitting the page keeps the whole leaf on screen, which is what full page
    view opens at. Windowed and unzoomed, 560px stays the comfortable measure —
    but asking for fit-width or a zoom stop is an explicit instruction and
    overrides it, or the control would look broken.
  */
  const fitted = fitWidth
    ? widthBudget
    : Math.min(widthBudget, heightBudget, full ? Infinity : 560);
  const pageWidth = Math.min(
    MAX_PAGE_WIDTH,
    Math.max(150, Math.floor(fitted * zoom)),
  );
  const firstPage = spread ? page - ((page - 1) % 2) : page;
  // Full page view runs the page row a step smaller; `Input` has no size
  // variants, so its height is spelled out to match whichever the buttons use.
  const navSize = full ? "sm" : "default";
  const navHeight = full ? "h-9" : "h-10";
  const highlights = book?.highlights ?? [];
  const counts = countsByColor(highlights);
  const shown = filter
    ? highlights.filter((h) => highlightKey(h.color) === filter)
    : highlights;

  useEffect(() => {
    bookRequest<Book>(`/api/books/${id}`)
      .then((result) => {
        setBook(result);
        setPage(result.currentPage);
      })
      .catch((error) => setError(error.message));
  }, [id]);

  // The desk's own box is the budget: windowed its height is content-driven and
  // ignored, and in full page view it is the flex child that gets the leftover
  // viewport, so measuring it needs no viewport arithmetic of its own.
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) =>
      setSize({
        width: entries[0].contentRect.width,
        height: entries[0].contentRect.height,
      }),
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

  /**
   * The layer is the feature and native fullscreen is a bonus on top of it:
   * iOS Safari refuses to fullscreen anything but a video, so a reader that
   * only called `requestFullscreen` would do nothing at all on a phone. The
   * request is fired and forgotten — if it throws, the layer is already up.
   */
  const toggleFull = useCallback((next: boolean) => {
    setFull(next);
    const node = shell.current as Fullscreenable | null;
    const doc = document as FullscreenDocument;
    try {
      if (next) {
        void (
          node?.requestFullscreen?.({ navigationUI: "hide" }) ??
          node?.webkitRequestFullscreen?.()
        );
      } else if (fullscreenElement()) {
        void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      }
    } catch {
      // Element fullscreen is unavailable; the layer covers the viewport anyway.
    }
  }, []);

  // Leaving native fullscreen — Esc, F11, the OS — has to close the layer with
  // it, or the page is left covered by a view the browser thinks it has exited.
  useEffect(() => {
    const onChange = () => {
      if (!fullscreenElement()) setFull(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  /** Step to the neighbouring stop, so the control can never land off-scale. */
  const stepZoom = useCallback((direction: number) => {
    setZoom((current) => {
      const index = ZOOM_STOPS.findIndex((stop) => stop >= current - 0.001);
      const next = (index === -1 ? ZOOM_STOPS.length - 1 : index) + direction;
      return ZOOM_STOPS[Math.max(0, Math.min(ZOOM_STOPS.length - 1, next))];
    });
  }, []);

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
      // Esc is only ours when the layer is up without native fullscreen behind
      // it; otherwise the browser closes fullscreen and the change event does.
      if (event.key === "Escape" && full && !fullscreenElement())
        toggleFull(false);
      if (event.key === "f" || event.key === "F") toggleFull(!full);
      // The three the browser itself uses for page zoom, applied to the leaf
      // instead — a reader reaches for them without being told.
      if (event.key === "+" || event.key === "=") stepZoom(1);
      if (event.key === "-" || event.key === "_") stepZoom(-1);
      if (event.key === "0") setZoom(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, firstPage, spread, full, toggleFull, stepZoom]);

  /**
   * Render page 1 to a JPEG and store it as the book's cover, once, the first
   * time a book without one is opened.
   *
   * This is the client's job because this is the client that has already paid
   * for it: the worker is warm, the document is parsed, and rasterizing one
   * page more costs a few hundred milliseconds off the main thread. Doing it
   * server-side would mean a canvas implementation in the deployment — a native
   * dependency for a thumbnail. It is also why no backfill is needed: every
   * book that predates covers gets one on its next read.
   *
   * Every failure is swallowed on purpose. A cover is decoration; a book that
   * cannot produce one still has to open.
   */
  async function captureCover(pdf: LoadedDocument) {
    if (coverAttempted.current || !book || book.hasCover) return;
    coverAttempted.current = true;
    try {
      const first = await pdf.getPage(1);
      const unscaled = first.getViewport({ scale: 1 });
      // Never upscale a small page into a blurry larger JPEG.
      const scale = Math.min(1.5, COVER_WIDTH / unscaled.width);
      const viewport = first.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await first.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.72),
      );
      canvas.width = 0;
      canvas.height = 0;
      if (!blob) return;
      await bookRequest(`/api/books/${id}/cover`, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      setBook((current) =>
        current ? { ...current, hasCover: true } : current,
      );
    } catch {
      // Decoration only — see above.
    }
  }

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
    payload:
      | { highlight: Highlight }
      | { removeHighlight: string }
      | { recolor: { id: string; color: HighlightColor } },
    done: string,
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
      setStatus(done);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  /** Save the selection in `next`, and keep that colour for the ones after it. */
  function pickColor(next: HighlightColor) {
    setColor(next);
    if (pending && !saving && !turn)
      saveHighlight(
        { highlight: { ...pending, color: next } },
        `Highlighted in ${highlightName(next)}.`,
      );
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
          onLoadSuccess={(loaded) => {
            // react-pdf hands back the page's own dimensions with any rotation
            // already applied, so a landscape leaf reports landscape. Held to
            // three decimals: the value feeds the width the page is then
            // rendered at, and re-measuring must not walk it.
            if (turning) return;
            const next = loaded.originalWidth / loaded.originalHeight;
            setRatio((current) =>
              Math.abs(current - next) < 0.001 ? current : next,
            );
          }}
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
                  style={
                    {
                      left: `${rect.x * 100}%`,
                      top: `${rect.y * 100}%`,
                      width: `${rect.width * 100}%`,
                      height: `${rect.height * 100}%`,
                      // Read by `.pdf-highlights span` in reader.css.
                      "--mark": highlightHex(h.color),
                    } as React.CSSProperties
                  }
                />
              )),
            )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={shell}
      className={cn(
        full ? "reader-full" : "mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6",
      )}
    >
      {!full && (
        <Link href="/books" className="text-sm text-amber">
          ← Back to books
        </Link>
      )}
      <header
        className={cn(
          "flex flex-wrap items-center gap-3",
          full ? "shrink-0" : "my-5 justify-between gap-4",
        )}
      >
        <div className={cn("min-w-0", full && "flex-1")}>
          <h1
            className={cn(
              "font-display",
              full ? "truncate text-base" : "text-2xl",
            )}
          >
            {book?.title || "Opening book…"}
          </h1>
          {!full && (
            <p className="mt-1 text-sm text-ink-2">
              Select text on a page, then pick a marker colour to save it.
            </p>
          )}
        </div>
        {/* Two groups, and the gap between them is the distinction: how the
            page is shown, then what gets done to it. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-line-2">
            <button
              type="button"
              aria-label="Zoom out"
              title="Zoom out"
              disabled={zoom <= ZOOM_STOPS[0]}
              onClick={() => stepZoom(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-l-md text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-40"
            >
              <ZoomOut className="h-4 w-4" aria-hidden />
            </button>
            {/* The readout is the way back: one press returns the leaf to the
                fitted size, which is the only zoom level the layout guarantees
                is fully on screen. `tnum` so the digits don't shuffle. */}
            <button
              type="button"
              onClick={() => setZoom(1)}
              disabled={zoom === 1}
              aria-label="Reset zoom to fit"
              title="Reset zoom to fit"
              className="h-9 min-w-14 border-x border-line-2 px-1 font-mono text-xs tnum text-ink-2 hover:bg-surface-2 hover:text-ink disabled:hover:bg-transparent"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              disabled={zoom >= ZOOM_STOPS[ZOOM_STOPS.length - 1]}
              onClick={() => stepZoom(1)}
              className="flex h-9 w-9 items-center justify-center rounded-r-md text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-40"
            >
              <ZoomIn className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {/* Switching what "fitted" means has to put the reader back on it,
              or the button appears to do nothing at any zoom above 1. */}
          <Button
            variant="outline"
            size="sm"
            aria-pressed={fitWidth}
            className={cn(fitWidth && "border-amber text-amber")}
            onClick={() => {
              setFitWidth(!fitWidth);
              setZoom(1);
            }}
          >
            Fit width
          </Button>
          {spreadable && (
            <Button
              variant="outline"
              size="sm"
              aria-pressed={spread}
              className={cn(spread && "border-amber text-amber")}
              onClick={() => {
                setPages(spread ? "one" : "two");
                setZoom(1);
              }}
            >
              Two pages
            </Button>
          )}
          {/* The one control that is in both views, in the same place, because
              the way out of full page view has to be as findable as the way in. */}
          <Button
            variant="outline"
            size="sm"
            // `Button`'s base has no icon gap of its own.
            className="gap-2"
            aria-pressed={full}
            onClick={() => toggleFull(!full)}
          >
            {full ? (
              <Minimize2 className="h-4 w-4" aria-hidden />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden />
            )}
            <span className={cn(full && "sr-only sm:not-sr-only")}>
              {full ? "Exit full page" : "Full page"}
            </span>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MarkerPicker
            value={color}
            pending={!!pending}
            disabled={saving || !!turn}
            onPick={pickColor}
          />
          <Button
            disabled={!pending || saving || !!turn}
            size={full ? "sm" : "default"}
            // Full page on a phone: pressing a swatch saves, so this would only
            // wrap onto a second row and take height off the page.
            className={cn(full && "hidden sm:inline-flex")}
            onClick={() =>
              pending &&
              saveHighlight(
                { highlight: { ...pending, color } },
                `Highlighted in ${highlightName(color)}.`,
              )
            }
          >
            {saving ? "Saving…" : `Highlight ${highlightName(color)}`}
          </Button>
        </div>
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
      <p
        role="status"
        className={cn(
          "text-ink-2",
          full ? "shrink-0 truncate text-xs" : "mb-3 min-h-5 text-sm",
        )}
      >
        {status ||
          (pending
            ? `${pending.text.length} characters selected — pick a colour`
            : full
              ? "Esc leaves full page view."
              : "Highlights are saved with this book. Image-only scans do not support text selection.")}
      </p>
      <div
        ref={container}
        className="reader-desk"
        onPointerUp={captureSelection}
        onKeyUp={captureSelection}
      >
        {book && size.width > 0 && (
          <Document
            file={`/api/books/${id}/file`}
            onLoadSuccess={(pdf) => {
              setPageCount(pdf.numPages);
              setPage((current) => Math.min(current, pdf.numPages));
              void captureCover(pdf);
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
      {/*
        One row, one baseline. Every control in it is the same height — the
        buttons through `navSize`, the field through `navHeight` — and the label
        sits *beside* the field with `htmlFor` rather than wrapping it: a label
        that wraps a taller input lands its own text on that input's baseline,
        which is what left "Page" floating above the box.
      */}
      <nav
        aria-label="Book pages"
        className={cn(
          "flex flex-wrap items-center justify-center gap-x-3 gap-y-2",
          full ? "shrink-0" : "my-5",
        )}
      >
        <Button
          variant="outline"
          size={navSize}
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
          <label htmlFor={pageFieldId} className="text-ink-2">
            Page
          </label>
          {/* The app's own field rather than a hand-rolled one: a bare `input`
              inherits no colour from the page, so the browser's default ink is
              what paints the number — and on this surface that was invisible.
              `Input` carries `text-ink` with the rest of the field's tokens.

              The spinners come off because Previous and Next are the step
              controls, and a pair of arrows inside the box only pushes a
              centred number off centre. */}
          <Input
            key={page}
            id={pageFieldId}
            name="page"
            type="number"
            inputMode="numeric"
            min={1}
            max={pageCount || 1}
            defaultValue={page}
            required
            disabled={!pageCount || !!turn}
            className={cn(
              "w-16 px-2 text-center tnum",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              navHeight,
            )}
          />
          <span className="whitespace-nowrap text-ink-2 tnum">
            of {pageCount || "…"}
          </span>
          <Button
            variant="ghost"
            size={navSize}
            disabled={!pageCount || !!turn}
          >
            Go
          </Button>
        </form>
        <Button
          variant="outline"
          size={navSize}
          disabled={
            !pageCount || firstPage + (spread ? 1 : 0) >= pageCount || !!turn
          }
          onClick={() => navigate(firstPage + (spread ? 2 : 1))}
        >
          Next
        </Button>
      </nav>
      {!full && !!highlights.length && (
        <section className="mx-auto mt-8 max-w-3xl">
          <h2 className="mb-4 font-display text-xl">Saved highlights</h2>
          {/* Only worth a filter once there is more than one colour to filter
              by — and the row can only offer colours that are actually on the
              shelf, the same rule `tagCounts` holds the note filter to. */}
          {counts.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setFilter(null)}
                aria-pressed={!filter}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  filter
                    ? "border-line-2 text-ink-2"
                    : "border-amber text-amber",
                )}
              >
                All {highlights.length}
              </button>
              {counts.map(({ key, name, hex, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(filter === key ? null : key)}
                  aria-pressed={filter === key}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                    filter === key
                      ? "border-amber text-amber"
                      : "border-line-2 text-ink-2",
                  )}
                >
                  <span
                    aria-hidden
                    className="h-3 w-3 rounded-full"
                    style={{ background: hex }}
                  />
                  {name} {count}
                </button>
              ))}
            </div>
          )}
          <ul className="space-y-3">
            {shown.map((highlight) => (
              <li
                key={highlight.id}
                className="border-l-2 bg-surface p-4"
                // The mark's own colour is the rail, so the list reads the same
                // way the page does rather than by name alone.
                style={{ borderLeftColor: highlightHex(highlight.color) }}
              >
                <button
                  className="block w-full text-left"
                  onClick={() => navigate(highlight.page)}
                >
                  <span className="text-xs text-amber">
                    Page {highlight.page}
                  </span>
                  <p className="mt-1 text-sm">{highlight.text}</p>
                </button>
                {/* Recolouring is one write on one array element, so a mark can
                    change meaning without being re-selected on the page. Touch
                    has no hover, hence 70% at rest rather than hidden. */}
                <div className="mt-3 flex items-center justify-between gap-3 opacity-70 transition-opacity focus-within:opacity-100 hover:opacity-100">
                  <div className="flex items-center gap-1.5">
                    {HIGHLIGHT_COLORS.map(({ key, name, hex }) => (
                      <button
                        key={key}
                        disabled={saving}
                        aria-pressed={highlightKey(highlight.color) === key}
                        aria-label={`Recolour to ${name}`}
                        title={name}
                        onClick={() =>
                          highlightKey(highlight.color) !== key &&
                          saveHighlight(
                            { recolor: { id: highlight.id, color: key } },
                            `Recoloured to ${name}.`,
                          )
                        }
                        className={cn(
                          "h-7 w-7 rounded-full transition disabled:cursor-not-allowed",
                          highlightKey(highlight.color) === key
                            ? "scale-110 border-2 border-ink"
                            : "border border-line-2",
                        )}
                        style={{ background: hex }}
                      />
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() =>
                      saveHighlight(
                        { removeHighlight: highlight.id },
                        "Highlight removed.",
                      )
                    }
                    aria-label={`Remove highlight: ${highlight.text.slice(0, 50)}`}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
