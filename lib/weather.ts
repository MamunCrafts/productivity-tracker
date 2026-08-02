/**
 * Weather, from Open-Meteo.
 *
 * Chosen because it needs no API key and no account: a key would have to live
 * in `.env` alongside `DATABASE_URL` and `AUTH_SECRET`, and this is a strip at
 * the top of a page, not a feature worth another required secret. Both hosts
 * below are called **from the browser**, so nothing here runs on the server and
 * no request of ours carries the coordinates.
 *
 * Two services, deliberately:
 * - `api.open-meteo.com` for the forecast, and `geocoding-api.open-meteo.com`
 *   to turn a typed city into coordinates.
 * - `api.bigdatacloud.net` to turn coordinates back into a place name. Its
 *   `reverse-geocode-client` endpoint is built for exactly this — free, no key,
 *   CORS-open. If it fails the strip falls back to the timezone's city, which
 *   the forecast response already carries, so a name is never simply missing.
 */

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface Place extends Coords {
  name: string;
  /** True when the user typed it, which is what stops geolocation overwriting it. */
  manual: boolean;
}

export interface CurrentWeather {
  temperature: number;
  /** WMO code. Interpreted by `describeWeather`, never shown raw. */
  code: number;
  isDay: boolean;
  /** IANA zone the forecast resolved to, e.g. `Asia/Dhaka`. Used as a fallback place name. */
  timezone: string;
}

/**
 * WMO 4677 weather codes, grouped.
 *
 * Grouped rather than listed one by one because the distinction between
 * "slight" and "moderate" drizzle is not one a status strip should try to
 * carry — the label has to survive at 11px next to a temperature.
 */
const WEATHER_CODES: { codes: number[]; label: string; icon: WeatherIcon }[] = [
  { codes: [0], label: "Clear", icon: "clear" },
  { codes: [1, 2], label: "Partly cloudy", icon: "partly" },
  { codes: [3], label: "Overcast", icon: "cloudy" },
  { codes: [45, 48], label: "Fog", icon: "fog" },
  { codes: [51, 53, 55, 56, 57], label: "Drizzle", icon: "drizzle" },
  { codes: [61, 63, 65, 66, 67], label: "Rain", icon: "rain" },
  { codes: [80, 81, 82], label: "Showers", icon: "rain" },
  { codes: [71, 73, 75, 77, 85, 86], label: "Snow", icon: "snow" },
  { codes: [95, 96, 99], label: "Thunderstorm", icon: "storm" },
];

export type WeatherIcon =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

/** An unknown code becomes "Unknown" rather than throwing — the strip is decoration, not a gate. */
export function describeWeather(code: number): { label: string; icon: WeatherIcon } {
  const match = WEATHER_CODES.find((entry) => entry.codes.includes(code));
  return match ?? { label: "Unknown", icon: "cloudy" };
}

/** Rounded to whole degrees: a status strip implying tenths of a degree is lying about its precision. */
export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)}°C`;
}

/** `Asia/Dhaka` → `Dhaka`. The fallback when reverse geocoding is unavailable. */
export function cityFromTimezone(timezone: string): string {
  const last = timezone.split("/").pop() ?? timezone;
  return last.replace(/_/g, " ");
}

/** Coordinates are rounded before they leave the browser — four decimals is ~11m, ample for weather. */
const round = (value: number) => Math.round(value * 10_000) / 10_000;

export async function fetchWeather(
  coords: Coords,
  signal?: AbortSignal
): Promise<CurrentWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${round(coords.latitude)}&longitude=${round(coords.longitude)}` +
    `&current=temperature_2m,is_day,weather_code&timezone=auto`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Weather request failed");
  const data = await response.json();

  const current = data?.current;
  if (!current || typeof current.temperature_2m !== "number") {
    throw new Error("Weather response was not usable");
  }

  return {
    temperature: current.temperature_2m,
    code: Number(current.weather_code ?? 0),
    isDay: current.is_day !== 0,
    timezone: typeof data.timezone === "string" ? data.timezone : "",
  };
}

/** Coordinates → a place name. Returns null rather than throwing; the caller has a fallback. */
export async function reverseGeocode(
  coords: Coords,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${round(coords.latitude)}&longitude=${round(coords.longitude)}` +
      `&localityLanguage=en`;

    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const data = await response.json();

    // City first, then the progressively broader fields, because a rural
    // reading has no city but does have a district.
    const name =
      data?.city || data?.locality || data?.principalSubdivision || data?.countryName;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}

/** A typed city → coordinates. Empty array when nothing matches, so the form can say so. */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal
): Promise<Place[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(trimmed)}&count=5&language=en&format=json`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Place search failed");
  const data = await response.json();

  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map(
    (result: {
      name: string;
      latitude: number;
      longitude: number;
      admin1?: string;
      country?: string;
    }): Place => ({
      // Qualified, because "Springfield" alone is not an answer.
      name: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
      latitude: result.latitude,
      longitude: result.longitude,
      manual: true,
    })
  );
}
