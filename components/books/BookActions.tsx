"use client";

import { useId, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { CategoryPicker } from "@/components/notes/CategoryPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bookRequest } from "./api";
import type { Book } from "@/types/books";
import type { Category } from "@/types";

/**
 * The two things you can do to a book that aren't reading it, and both live on
 * the shelf rather than in the reader: renaming and deleting are library work,
 * and the reader's bar is already carrying the view controls and the markers.
 *
 * Each card owns its own pair of dialogs. That is one Radix root per card,
 * which is a real cost on a very long shelf, but the alternative — one dialog
 * hoisted to the library with the "which book" held in state — is how a
 * confirm dialog ends up pointed at the wrong row after a filter changes.
 */
export function BookActions({
  book,
  categories,
  onSaved,
  onDeleted,
}: {
  book: Book;
  categories: Category[];
  onSaved: (book: Book) => void;
  onDeleted: (id: string, title: string) => void;
}) {
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState(book.title);
  const [categoryId, setCategoryId] = useState(book.categoryId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /** Reopening starts from what is stored, not from an abandoned edit. */
  function openEdit(open: boolean) {
    setEditing(open);
    setError("");
    if (open) {
      setTitle(book.title);
      setCategoryId(book.categoryId);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const saved = await bookRequest<Book>(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), categoryId }),
      });
      // The response is the stored record, so the shelf shows what was written
      // rather than what was typed.
      onSaved(saved);
      setEditing(false);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await bookRequest(`/api/books/${book.id}`, { method: "DELETE" });
      // Close first: `onDeleted` takes this card off the shelf, and with it
      // this component and the dialog inside it.
      setConfirming(false);
      onDeleted(book.id, book.title);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Above the card's own stretched link, and 70% at rest rather than
          hidden: touch has no hover, so a control gated on it isn't reachable.
          The labels collapse to their icons on a phone, where two covers share
          a 360px row and there is no width for two words as well. */}
      <div className="relative z-20 mt-1 flex items-center gap-1 opacity-70 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-2"
          onClick={() => openEdit(true)}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-2 text-danger-ink hover:text-danger-ink"
          onClick={() => {
            setError("");
            setConfirming(true);
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Delete</span>
        </Button>
      </div>

      <Dialog open={editing} onOpenChange={openEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit book</DialogTitle>
            <DialogDescription>
              The title and category are the book&rsquo;s own; the PDF, its
              pages and its highlights are untouched.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-title`}>Title</Label>
              <Input
                id={`${fieldId}-title`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-category`}>Category</Label>
              <CategoryPicker
                id={`${fieldId}-category`}
                categories={categories}
                value={categoryId}
                onChange={setCategoryId}
                rootLabel="Uncategorized"
              />
              <p className="text-xs text-ink-2">
                Categories are shared with Notes.
              </p>
            </div>
            {/* The file itself is what a title is not, so it is worth printing:
                a renamed book still came from this PDF. */}
            <p className="break-all text-xs text-ink-3">
              {book.sourceFilename} · {(book.bytes / 1024 / 1024).toFixed(1)} MB
            </p>
            {error && (
              <p role="alert" className="text-sm text-danger-ink">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => openEdit(false)}
              >
                Cancel
              </Button>
              <Button disabled={busy || !title.trim()}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirming}
        onOpenChange={(open) => {
          setConfirming(open);
          setError("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{book.title}”?</DialogTitle>
            {/* Spelled out because it is genuinely unrecoverable, and because
                two stores are involved: the record and the file in R2. Nothing
                about a book feeds analytics, which is what makes deleting it
                outright the right shape — unlike a habit, whose hours have to
                survive it. */}
            <DialogDescription>
              This deletes the book record, every highlight saved in it, and the
              PDF itself from storage. It cannot be undone — you would have to
              upload the file again.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-danger-ink">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Keep it
            </Button>
            <Button variant="destructive" disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
