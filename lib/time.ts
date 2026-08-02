/**
 * How a time of day is written for a human, in one place.
 *
 * **Display only.** Times are still *stored* as `HH:MM` 24-hour — that is what
 * makes a day sortable as a plain string (`lib/routine.ts`) and it is the only
 * value format `<input type="time">` accepts. Nothing here touches storage;
 * these functions run at the last moment before text reaches the screen.
 *
 * It lives in its own module rather than in `lib/routine.ts` because the
 * status strip needs it too, and the strip has no business importing the
 * routine's scheduling logic to find out how to write half past two.
 */

/** Lowercase, to sit quietly next to muted text rather than shouting in caps. */
const MERIDIEM = ["am", "pm"] as const;

/**
 * `0` → `12 am`, `12` → `12 pm`.
 *
 * The two boundaries are the whole difficulty of a 12-hour clock: midnight is
 * 12 am and noon is 12 pm, and a naive `hours % 12` renders both as "0".
 */
function split(hours24: number): { hour: number; meridiem: string } {
  const meridiem = MERIDIEM[hours24 < 12 ? 0 : 1];
  const hour = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { hour, meridiem };
}

/** `"06:30"` → `"6:30 am"`. No leading zero — "06:30 am" is not how anyone writes it. */
export function to12Hour(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  // Unparseable input is handed back untouched rather than turned into a
  // confident lie about midnight.
  if (!match) return time;

  const hours24 = Number(match[1]);
  if (hours24 > 23) return time;

  const { hour, meridiem } = split(hours24);
  return `${hour}:${match[2]} ${meridiem}`;
}

/** A `Date` → `"2:32 pm"`. The status strip's clock. */
export function formatTimeOfDay(date: Date): string {
  const { hour, meridiem } = split(date.getHours());
  return `${hour}:${String(date.getMinutes()).padStart(2, "0")} ${meridiem}`;
}
