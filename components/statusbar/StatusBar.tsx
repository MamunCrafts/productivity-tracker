"use client";

import { useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Cloudy,
  MapPin,
  Moon,
  Sun,
} from "lucide-react";
import { describeWeather, formatTemperature, type WeatherIcon } from "@/lib/weather";
import { formatTimeOfDay } from "@/lib/time";
import { useClock } from "@/components/statusbar/useClock";
import { usePlaceWeather } from "@/components/statusbar/usePlaceWeather";
import { LocationDialog } from "@/components/statusbar/LocationDialog";

/**
 * A thin strip under the nav: the time, the date, the weather, and where that
 * weather is. Ambient context, not a control surface — so it stays quiet
 * (`ink-3`, 12px) and never competes with the page heading below it.
 *
 * It is the one part of the shell that can't be server-rendered: the clock
 * would hydrate to a different minute, and the location lives in
 * `localStorage`, which the server can't read. Everything therefore fills in
 * after mount, and the strip holds its height from the first paint so nothing
 * below it shifts when the values land.
 */
export function StatusBar() {
  const now = useClock();
  const { place, weather, status, setManualPlace, useMyLocation } = usePlaceWeather();
  const [picking, setPicking] = useState(false);

  const conditions = weather ? describeWeather(weather.code) : null;

  return (
    <div className="border-b border-line bg-surface/40">
      {/* `h-9` is reserved whether or not anything has arrived — a strip that
          grows into place would push the whole page down after hydration. */}
      <div className="mx-auto flex h-9 max-w-7xl items-center gap-x-2 overflow-hidden px-4 text-xs text-ink-3 sm:gap-x-3 sm:px-6">
        {now && (
          <>
            {/* `tnum` so the minute changing doesn't shuffle everything to its
                right by a pixel. The hour has no leading zero, so the strip
                still shifts once a day between 9:59 am and 10:00 am — padding
                it to "09:59 am" to avoid that would look worse all day to fix
                a jump nobody is watching for. */}
            <time
              dateTime={now.toISOString()}
              className="shrink-0 font-mono tnum text-ink-2"
            >
              {formatTimeOfDay(now)}
            </time>

            <Dot />

            {/* The long date is the first thing to go on a narrow screen; the
                short one is never dropped, because a strip that shows a time
                with no day is ambiguous by the next morning. */}
            <span className="shrink-0 sm:hidden">{formatDateShort(now)}</span>
            <span className="hidden shrink-0 sm:inline">{formatDateLong(now)}</span>
          </>
        )}

        {conditions && weather && (
          <>
            <Dot />
            <span className="flex shrink-0 items-center gap-1.5">
              <WeatherGlyph icon={conditions.icon} isDay={weather.isDay} />
              <span className="font-mono tnum text-ink-2">
                {formatTemperature(weather.temperature)}
              </span>
              {/* The word is the non-icon channel: an icon alone at 14px is not
                  a label, and this one has to survive a glance. */}
              <span className="hidden sm:inline">{conditions.label}</span>
            </span>
          </>
        )}

        {/* Pushed right so the strip reads left-to-right as time → weather →
            place, with the one interactive thing at the end. */}
        <div className="ml-auto flex min-w-0 items-center">
          {status === "needs-location" || status === "failed" ? (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-ink-3 underline decoration-line-2 underline-offset-[3px] transition-colors hover:text-ink-2"
            >
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              {status === "failed" ? "Weather unavailable" : "Set location"}
            </button>
          ) : place?.name ? (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="flex min-w-0 items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-ink-2"
              aria-label={`Location: ${place.name}. Change it.`}
            >
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              {/* Truncated rather than wrapped: the strip is one line, and
                  "Chittagong Division, Bangladesh" would otherwise break it. */}
              <span className="truncate">{shortPlace(place.name)}</span>
            </button>
          ) : (
            status === "locating" && (
              <span className="shrink-0 text-ink-3">Locating…</span>
            )
          )}
        </div>
      </div>

      <LocationDialog
        open={picking}
        onOpenChange={setPicking}
        onSelect={setManualPlace}
        onUseMyLocation={useMyLocation}
        current={place}
      />
    </div>
  );
}

function Dot() {
  return (
    <span aria-hidden className="shrink-0 text-line-2">
      ·
    </span>
  );
}

/**
 * The weather glyph. Clear skies are the one condition that differs by hour —
 * a sun at 2am is wrong in a way a cloud at 2am isn't.
 */
function WeatherGlyph({ icon, isDay }: { icon: WeatherIcon; isDay: boolean }) {
  const className = "h-3.5 w-3.5 shrink-0 text-ink-2";
  switch (icon) {
    case "clear":
      return isDay ? (
        <Sun className={className} aria-hidden />
      ) : (
        <Moon className={className} aria-hidden />
      );
    case "partly":
      return <Cloud className={className} aria-hidden />;
    case "cloudy":
      return <Cloudy className={className} aria-hidden />;
    case "fog":
      return <CloudFog className={className} aria-hidden />;
    case "drizzle":
      return <CloudDrizzle className={className} aria-hidden />;
    case "rain":
      return <CloudRain className={className} aria-hidden />;
    case "snow":
      return <CloudSnow className={className} aria-hidden />;
    case "storm":
      return <CloudLightning className={className} aria-hidden />;
  }
}

const formatDateLong = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const formatDateShort = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/** The geocoder returns "Dhaka, Dhaka Division, Bangladesh"; the strip wants "Dhaka". */
function shortPlace(name: string): string {
  return name.split(",")[0].trim();
}
