"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { MAX_NOTE_BYTES } from "@/lib/noteView";
import { cn } from "@/lib/utils";

const ACCEPTED = /\.(md|markdown|mdown|mkd|txt)$/i;

export interface ReadFile {
  filename: string;
  raw: string;
}

/**
 * "Upload" is a misnomer here: the file is read to text in the browser and
 * only its contents are ever sent. There is no file endpoint, no multipart
 * body, and nothing written to disk — which is also why this works the same
 * whether the markdown was dropped, picked, or typed.
 */
export function NoteDropzone({
  onFiles,
  compact = false,
}: {
  onFiles: (files: ReadFile[]) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function read(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);

    const accepted: ReadFile[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(fileList)) {
      if (!ACCEPTED.test(file.name)) {
        rejected.push(`${file.name} (not a markdown file)`);
        continue;
      }
      // Checked before the read, so an oversized file fails instantly rather
      // than after megabytes have been decoded.
      if (file.size > MAX_NOTE_BYTES) {
        rejected.push(`${file.name} (over 1 MB)`);
        continue;
      }
      accepted.push({ filename: file.name, raw: await file.text() });
    }

    if (rejected.length) setError(`Skipped ${rejected.join(", ")}`);
    if (accepted.length) onFiles(accepted);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void read(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border border-dashed transition-colors",
          compact ? "px-4 py-4" : "px-6 py-10 sm:py-14",
          over ? "border-amber bg-amber/[0.06]" : "border-line-2 bg-surface/60"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-4",
            compact ? "justify-between" : "flex-col text-center"
          )}
        >
          <div className={cn(compact && "flex min-w-0 items-center gap-3")}>
            <FileUp
              className={cn(
                "shrink-0 text-ink-3",
                compact ? "h-4 w-4" : "mx-auto h-7 w-7"
              )}
              aria-hidden
            />
            <div className={cn(!compact && "mt-3")}>
              <p className={cn("text-ink", compact ? "text-sm" : "text-base")}>
                {compact ? "Add more files" : "Drop markdown files here"}
              </p>
              {!compact && (
                <p className="mt-1 text-sm text-ink-2">
                  Nothing is saved until you review it. Up to 1&nbsp;MB per file.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "shrink-0 rounded-md border border-line-2 px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2",
              !compact && "mt-4"
            )}
          >
            Choose files
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".md,.markdown,.mdown,.mkd,.txt,text/markdown"
          multiple
          className="sr-only"
          onChange={(e) => {
            void read(e.target.files);
            // Reset so picking the same file twice still fires a change.
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
