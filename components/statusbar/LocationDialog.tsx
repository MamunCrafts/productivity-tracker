"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { searchPlaces, type Place } from "@/lib/weather";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The manual way in, and the only way if the browser prompt was refused.
 *
 * Search rather than a free-text field, because the forecast needs coordinates
 * and a typed string isn't one — Open-Meteo's geocoder turns "dhaka" into a
 * point, and picking from results means the name shown is the name of the
 * place actually being forecast.
 */
export function LocationDialog({
  open,
  onOpenChange,
  onSelect,
  onUseMyLocation,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (place: Place) => void;
  onUseMyLocation: () => void;
  current: Place | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the newest search may write results; a slow early request must not
  // land on top of a fast later one.
  const latest = useRef(0);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    const token = ++latest.current;
    const controller = new AbortController();

    /**
     * Everything, including clearing a too-short query, happens inside the
     * timeout — a synchronous `setState` in an effect body fails
     * `react-hooks/set-state-in-effect`, and this is already debounced anyway:
     * a request per keystroke would be rude to a free service and would
     * flicker the list on the way to a word.
     */
    const timer = setTimeout(async () => {
      if (trimmed.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      setError(null);
      try {
        const found = await searchPlaces(trimmed, controller.signal);
        if (token !== latest.current) return;
        setResults(found);
      } catch {
        if (token !== latest.current || controller.signal.aborted) return;
        setError("Search failed. Check your connection and try again.");
      } finally {
        if (token === latest.current) setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const openChange = (next: boolean) => {
    if (next) {
      setQuery("");
      setResults([]);
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Location</DialogTitle>
          <DialogDescription>
            Used for the weather in the top strip. Saved in this browser only —
            it is never sent to the app&apos;s own server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              onUseMyLocation();
              onOpenChange(false);
            }}
          >
            <LocateFixed className="h-4 w-4" aria-hidden />
            Use my current location
          </Button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="text-xs text-ink-3">or search</span>
            <span className="h-px flex-1 bg-line" aria-hidden />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location-search">City</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
                aria-hidden
              />
              <Input
                id="location-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Dhaka"
                autoFocus
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </div>

          {/* `aria-live` so a result count arriving after the typing stops is
              announced rather than only drawn. */}
          <div aria-live="polite" className="min-h-[2rem]">
            {searching && <p className="text-sm text-ink-3">Searching…</p>}

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}

            {!searching && !error && query.trim().length >= 2 && results.length === 0 && (
              <p className="text-sm text-ink-3">No places found.</p>
            )}

            {results.length > 0 && (
              <ul className="space-y-1">
                {results.map((place) => (
                  <li key={`${place.latitude},${place.longitude}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(place);
                        onOpenChange(false);
                      }}
                      className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      {place.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {current?.name && (
            <p className="text-xs text-ink-3">
              Currently showing {current.name}.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
