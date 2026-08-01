import { Shimmer } from "@/components/ui/shimmer";
import { COLUMNS } from "@/lib/board";

/** Same silhouette as the loaded board, so nothing shifts when tasks land. */
export function ShimmerBoard() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="-mx-6 overflow-x-auto px-6 pb-2 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <div className="flex items-start gap-4 lg:grid lg:grid-cols-3">
        {COLUMNS.map((column, columnIndex) => (
          <div
            key={column.status}
            className="w-[86vw] shrink-0 rounded-xl border border-line bg-base/40 sm:w-72 lg:w-full lg:shrink"
          >
            <div className="border-b border-line px-4 py-3">
              <Shimmer className="h-3 w-20 rounded" delay={columnIndex * 120} />
              <Shimmer
                className="mt-2 h-2.5 w-14 rounded"
                delay={columnIndex * 120 + 60}
              />
            </div>
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 - columnIndex }).map((_, cardIndex) => (
                <div
                  key={cardIndex}
                  className="rounded-lg border border-line bg-surface p-3"
                >
                  <Shimmer
                    className="h-3.5 w-4/5 rounded"
                    delay={columnIndex * 120 + cardIndex * 140}
                  />
                  <Shimmer
                    className="mt-2.5 h-2.5 w-1/2 rounded"
                    delay={columnIndex * 120 + cardIndex * 140 + 70}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading tasks</span>
    </div>
  );
}
