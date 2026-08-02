"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cityFromTimezone,
  fetchWeather,
  reverseGeocode,
  type CurrentWeather,
  type Place,
} from "@/lib/weather";

const STORAGE_KEY = "pt.location";
/** Weather barely moves inside a quarter hour, and Open-Meteo is a courtesy, not an entitlement. */
const REFRESH_MS = 15 * 60_000;

export type WeatherStatus =
  | "locating"
  | "loading"
  | "ready"
  /** Permission refused or unavailable, and nothing saved — the strip offers to be told. */
  | "needs-location"
  | "failed";

/**
 * Where you are and what it's doing there.
 *
 * The place is persisted, and a **typed** place outranks geolocation: having
 * told the app where you are, being silently relocated by a browser prompt
 * would be worse than being slightly wrong. Geolocation therefore runs only
 * when nothing is saved, which also means the permission prompt happens once
 * rather than on every load.
 */
export function usePlaceWeather() {
  const [place, setPlace] = useState<Place | null>(null);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [status, setStatus] = useState<WeatherStatus>("locating");

  const load = useCallback(async (target: Place, signal?: AbortSignal) => {
    try {
      const current = await fetchWeather(target, signal);
      if (signal?.aborted) return;
      setWeather(current);
      setStatus("ready");

      // A place resolved from coordinates may still be unnamed if reverse
      // geocoding failed at save time; the forecast's timezone names it.
      if (!target.name && current.timezone) {
        const named = { ...target, name: cityFromTimezone(current.timezone) };
        setPlace(named);
        savePlace(named);
      }
    } catch {
      if (signal?.aborted) return;
      setStatus("failed");
    }
  }, []);

  /** Called by the dialog. A typed place replaces whatever was there and sticks. */
  const setManualPlace = useCallback(
    (next: Place) => {
      savePlace(next);
      setPlace(next);
      setStatus("loading");
      void load(next);
    },
    [load]
  );

  /** Forget the saved place and ask the browser again. */
  const useMyLocation = useCallback(async () => {
    setStatus("locating");
    const coords = await requestPosition();
    if (!coords) {
      setStatus("needs-location");
      return;
    }
    const name = (await reverseGeocode(coords)) ?? "";
    const next: Place = { ...coords, name, manual: false };
    savePlace(next);
    setPlace(next);
    setStatus("loading");
    void load(next);
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();

    async function boot() {
      const stored = readPlace();
      if (stored) {
        setPlace(stored);
        setStatus("loading");
        await load(stored, controller.signal);
        return;
      }

      // Nothing saved: this is the one place the permission prompt appears.
      const coords = await requestPosition();
      if (controller.signal.aborted) return;
      if (!coords) {
        setStatus("needs-location");
        return;
      }

      const name = (await reverseGeocode(coords, controller.signal)) ?? "";
      if (controller.signal.aborted) return;

      const next: Place = { ...coords, name, manual: false };
      savePlace(next);
      setPlace(next);
      setStatus("loading");
      await load(next, controller.signal);
    }

    void boot();
    return () => controller.abort();
  }, [load]);

  /**
   * Depends on `place` rather than reading it through a ref: touching
   * `ref.current` during render fails `react-hooks/refs`, and a place changes
   * so rarely that rebuilding a fifteen-minute interval when it does costs
   * nothing.
   */
  useEffect(() => {
    if (!place) return;
    const interval = setInterval(() => void load(place), REFRESH_MS);
    return () => clearInterval(interval);
  }, [place, load]);

  return { place, weather, status, setManualPlace, useMyLocation };
}

/**
 * `getCurrentPosition` as a promise that resolves rather than rejects.
 *
 * Refusing the prompt is an ordinary outcome, not an error: the caller falls
 * back to asking for a city. The timeout matters because a denied-but-not-
 * dismissed prompt can otherwise hang indefinitely on some browsers.
 */
function requestPosition(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      { timeout: 10_000, maximumAge: 30 * 60_000 }
    );
  });
}

function readPlace(): Place | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.latitude !== "number" ||
      typeof parsed?.longitude !== "number"
    ) {
      return null;
    }
    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      name: typeof parsed.name === "string" ? parsed.name : "",
      manual: parsed.manual === true,
    };
  } catch {
    // Corrupt or unavailable storage behaves as "nothing saved" rather than
    // taking the strip down with it.
    return null;
  }
}

function savePlace(place: Place) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
  } catch {
    // Private mode, quota, disabled storage — the strip still works for this
    // session, it just won't remember. Not worth surfacing.
  }
}
