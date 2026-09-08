"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Upload } from "lucide-react";
import { CategoryPicker } from "@/components/notes/CategoryPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookActions } from "./BookActions";
import { bookRequest } from "./api";
import { uploadBook } from "./uploadBook";
import type { Book } from "@/types/books";
import type { Category } from "@/types";

// Categories are shared with Notes; uploads belong to this library.
export function BookLibrary() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadPercentage, setUploadPercentage] = useState<number | null>(0);
  const [uploadPhase, setUploadPhase] = useState<
    "uploading" | "saving" | "opening"
  >("uploading");
  const uploadController = useRef<AbortController | null>(null);

  // Cancel only the active browser upload when this page unmounts.
  useEffect(() => () => uploadController.current?.abort(), []);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([
      bookRequest<Book[]>("/api/books"),
      bookRequest<Category[]>("/api/categories"),
    ])
      .then(([items, folders]) => {
        setBooks(items);
        setCategories(folders);
      })
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false));
  }, []);

  // The server validates the PDF and keeps the R2 credentials private.
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > 100 * 1024 * 1024
    ) {
      setError("Choose a PDF up to 100 MB.");
      return;
    }
    form.set("categoryId", categoryId || "");
    if (uploadController.current) return;
    const controller = new AbortController();
    uploadController.current = controller;
    setBusy(true);
    setUploadPercentage(0);
    setUploadPhase("uploading");
    setError("");
    try {
      const result = await uploadBook(
        form,
        setUploadPercentage,
        () => setUploadPhase("saving"),
        controller.signal,
      );
      setUploadPhase("opening");
      router.push(`/books/${result.id}`);
    } catch (error) {
      if (!controller.signal.aborted) {
        setError((error as Error).message);
        setBusy(false);
      }
    } finally {
      uploadController.current = null;
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategoryBusy(true);
    setError("");
    try {
      const category = await bookRequest<Category>("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName }),
      });
      setCategories((current) => [...current, category]);
      setCategoryId(category.id);
      setCategoryName("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setCategoryBusy(false);
    }
  }

  // The row the server wrote replaces the row on the shelf, so an edit that was
  // trimmed or rejected in part shows as it was stored, not as it was typed.
  function saveBook(saved: Book) {
    setBooks((current) =>
      current.map((book) =>
        book.id === saved.id ? { ...book, ...saved } : book,
      ),
    );
    setNotice(`Saved “${saved.title}”.`);
  }

  /*
    A deleted card takes its own dialog and its own trigger with it, so Radix
    has nothing to return focus to and nothing on screen says what happened.
    The line does: it is the only report that an irreversible thing succeeded.
  */
  function forgetBook(id: string, title: string) {
    setBooks((current) => current.filter((book) => book.id !== id));
    setNotice(`Deleted “${title}” and its PDF.`);
  }

  const visibleBooks = books.filter(
    (book) =>
      (filter === "all" || (book.categoryId || "none") === filter) &&
      book.title.toLowerCase().includes(search.toLowerCase()),
  );

  // Byte progress covers transfer to the app, not the subsequent R2 save.
  const uploadStatus =
    uploadPhase === "saving"
      ? "Saving to Cloudflare R2…"
      : uploadPhase === "opening"
        ? "Upload complete. Opening book…"
        : uploadPercentage === null
          ? "Uploading PDF…"
          : `Uploading PDF… ${uploadPercentage}%`;

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-6">
        <form
          onSubmit={upload}
          className="space-y-4 rounded-xl border border-line bg-surface p-5"
        >
          <h2 className="font-display text-xl">Add a book</h2>
          <label className="block text-sm">
            PDF file
            <Input
              className="mt-2"
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
              disabled={busy}
            />
          </label>
          <p className="text-xs text-ink-2">Up to 100 MB per PDF.</p>
          <label className="block text-sm">
            Title
            <Input
              className="mt-2"
              name="title"
              maxLength={200}
              placeholder="Defaults to the file name"
              disabled={busy}
            />
          </label>
          <label className="block text-sm" htmlFor="book-category">
            Category
          </label>
          <CategoryPicker
            id="book-category"
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            rootLabel="Uncategorized"
          />
          {busy && (
            <div className="space-y-2">
              <p
                id="pdf-upload-status"
                role="status"
                className="text-sm text-ink-2"
              >
                {uploadStatus}
              </p>
              <progress
                aria-label="PDF transfer progress"
                aria-describedby="pdf-upload-status"
                max={100}
                value={
                  uploadPhase === "uploading"
                    ? (uploadPercentage ?? undefined)
                    : undefined
                }
                className="block h-2 w-full overflow-hidden rounded-full accent-amber"
              />
            </div>
          )}
          <Button type="submit" disabled={busy || loading} className="w-full">
            <Upload size={16} className="mr-2" />
            {busy
              ? uploadPhase === "uploading"
                ? "Uploading…"
                : uploadPhase === "saving"
                  ? "Saving…"
                  : "Opening…"
              : "Upload PDF"}
          </Button>
        </form>
        <form onSubmit={addCategory} className="space-y-3">
          <label className="text-sm" htmlFor="new-category">
            New category
          </label>
          <Input
            id="new-category"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Category name"
            required
            maxLength={100}
          />
          <Button
            variant="outline"
            disabled={categoryBusy || !categoryName.trim()}
          >
            {categoryBusy ? "Creating…" : "Create category"}
          </Button>
          <p className="text-xs text-ink-2">
            Categories are shared with Notes.
          </p>
        </form>
      </aside>
      <section className="min-w-0 space-y-5" aria-label="PDF library">
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-danger p-3 text-sm text-danger-ink"
          >
            {error}
          </p>
        )}
        <p role="status" className="min-h-5 text-sm text-ink-2">
          {notice}
        </p>
        <div className="flex flex-wrap gap-3">
          <Input
            aria-label="Search books"
            placeholder="Find a book…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-40 flex-1"
          />
          <select
            aria-label="Filter by category"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            // `text-ink` because a bare form control takes the browser's ink,
            // not the page's, and 16px on a phone or iOS zooms in on focus and
            // stays there — the same pair every hand-rolled select here carries.
            className="max-w-full rounded-md border border-line-2 bg-base px-3 py-2 text-base text-ink sm:text-sm"
          >
            <option value="all">All categories</option>
            <option value="none">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p role="status">Loading your library…</p>
        ) : visibleBooks.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto mb-4 h-10 w-10 text-amber" />
            <h2 className="font-display text-2xl">
              {books.length
                ? "No matching books"
                : "Your reading shelf starts here"}
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              {books.length
                ? "Try another title or category."
                : "Upload a PDF to open it and save your first highlight."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleBooks.map((book) => (
              <article
                key={book.id}
                className="group relative flex flex-col overflow-hidden rounded-r-lg border border-line bg-surface transition-shadow focus-within:shadow-xl hover:shadow-xl"
              >
                <div className="relative flex min-h-48 flex-col justify-between border-l-8 border-amber-deep bg-surface-2 p-6 shadow-[inset_6px_0_10px_-6px_#000]">
                  <BookOpen size={24} className="text-amber" />
                  <h2 className="mt-6 break-words font-display text-2xl group-hover:text-amber">
                    {book.title}
                  </h2>
                </div>
                <div className="flex-1 space-y-2 p-4 text-xs text-ink-2">
                  <p>
                    {categories.find(
                      (category) => category.id === book.categoryId,
                    )?.name || "Uncategorized"}
                  </p>
                  <p>
                    {(book.bytes / 1024 / 1024).toFixed(1)} MB ·{" "}
                    {book.currentPage > 1
                      ? `Continue on page ${book.currentPage}`
                      : "Open book"}
                  </p>
                </div>
                {/*
                  The link is stretched over the card instead of being the card,
                  so the cover still opens the book while the row underneath
                  stays operable: an `<a>` cannot contain buttons — nesting
                  interactive elements is invalid and takes keyboard and screen
                  reader behaviour with it. The actions sit above this overlay
                  on `z-20`.
                */}
                <Link
                  href={`/books/${book.id}`}
                  className="absolute inset-0 z-10 rounded-r-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                >
                  <span className="sr-only">Open {book.title}</span>
                </Link>
                <BookActions
                  book={book}
                  categories={categories}
                  onSaved={saveBook}
                  onDeleted={forgetBook}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
