import type { InkStroke } from "@/types/books";

export const MAX_INK_POINTS = 4000;
export const INK_COLORS = ["#18181b", "#dc2626", "#2563eb", "#15803d"];

export function isInkStroke(value: unknown): value is InkStroke {
  if (!value || typeof value !== "object") return false;
  const stroke = value as InkStroke;
  return (
    typeof stroke.id === "string" && stroke.id.length > 0 && stroke.id.length <= 100 &&
    Number.isInteger(stroke.page) && stroke.page > 0 && stroke.page <= 100000 &&
    typeof stroke.color === "string" && /^#[0-9a-f]{6}$/i.test(stroke.color) &&
    Number.isFinite(stroke.width) && stroke.width >= 0.0005 && stroke.width <= 0.02 &&
    Array.isArray(stroke.points) && stroke.points.length > 0 &&
    stroke.points.length <= MAX_INK_POINTS &&
    stroke.points.every((point) => point && [point.x, point.y, point.pressure].every(
      (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1,
    ))
  );
}
