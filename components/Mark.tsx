/**
 * The app mark: the same ring and lit core as `app/icon.svg`, without the tile.
 *
 * The favicon needs its own dark ground because it lands on browser chrome we
 * don't control. In here the surface is known, so the mark takes
 * `currentColor` instead and follows the amber token through both themes —
 * which the favicon can't do.
 *
 * Cropped tighter than the favicon, since there's no tile to pad against, but
 * with the same internal ratios (core/ring 0.35, stroke/ring 0.39) so the two
 * read as one mark rather than two circles that happen to be amber.
 *
 * A `viewBox` of 24 matches lucide's, so this drops into the nav on the same
 * `h-4 w-4` sizing as the icons beside it.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.25"
      />
      <circle cx="12" cy="12" r="2.9" fill="currentColor" />
    </svg>
  );
}
