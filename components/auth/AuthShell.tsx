"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/Mark";

/**
 * The frame both sign-in screens share.
 *
 * Set in the lamp pool the root layout already casts, so these pages belong to
 * the same room as the rest of the app without adding any light of their own —
 * amber stays reserved for the one primary action, which here is the button.
 *
 * `onSubmit` returns a message to show, or null to mean "you're in". On null
 * this navigates with a **full page load** rather than `router.replace`: the
 * root layout reads the session on the server, and a client-side transition
 * would leave it holding the pre-sign-in render.
 */
export function AuthShell({
  title,
  lede,
  submitLabel,
  pendingLabel,
  children,
  onSubmit,
  switchPrompt,
  switchLabel,
  switchHref,
}: {
  title: string;
  lede: string;
  submitLabel: string;
  pendingLabel: string;
  children: React.ReactNode;
  onSubmit: (form: FormData) => Promise<string | null>;
  switchPrompt: string;
  switchLabel: string;
  switchHref: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[26rem]">
        {/* Also the way back: with the nav hidden these screens would
            otherwise be a dead end. */}
        <Link
          href="/"
          className="mx-auto flex w-fit items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2 transition-colors hover:text-ink"
        >
          <Mark className="h-3.5 w-3.5 text-amber" />
          Productivity Tracker
        </Link>

        <div className="mt-8 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <h1 className="font-display text-2xl font-medium leading-tight text-ink">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{lede}</p>

          <form
            className="mt-7 space-y-4"
            onSubmit={async (e) => {
              // Never a real submit: a GET navigation would put the password in
              // the URL. The browser still enforces required and minlength.
              e.preventDefault();
              if (pending) return;

              const form = new FormData(e.currentTarget);
              setError(null);
              setPending(true);

              try {
                const message = await onSubmit(form);
                if (message) {
                  setError(message);
                  setPending(false);
                  return;
                }
                // Left pending on success — the page is about to be replaced,
                // and re-enabling the button would invite a second submit.
                window.location.assign("/");
              } catch {
                setError("Something went wrong. Try again.");
                setPending(false);
              }
            }}
          >
            <fieldset disabled={pending} className="space-y-4">
              {children}
            </fieldset>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" className="mt-2 w-full" disabled={pending}>
              {pending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {pending ? pendingLabel : submitLabel}
            </Button>
          </form>

          {/* The same fading rule the colophon closes on. */}
          <div
            aria-hidden
            className="mt-7 h-px bg-gradient-to-r from-transparent via-line to-transparent"
          />

          <p className="mt-5 text-center text-sm text-ink-2">
            {switchPrompt}{" "}
            <Link
              href={switchHref}
              className="text-ink underline decoration-line-2 underline-offset-[3px] transition-colors hover:decoration-ink-2"
            >
              {switchLabel}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Label above field, one per row. `ink-2` rather than the fainter `ink-3`:
 * a field label has to be read, and ink-3 sits at 3:1 — fine for a separator
 * glyph, under AA for small text.
 */
export function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs uppercase tracking-wider text-ink-2"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
