import { Task, TaskStatus, TASK_STATUSES } from "@/types";

/**
 * Pure board arithmetic, kept out of the components the same way
 * `lib/analytics.ts` keeps derivations out of the charts.
 */

export const COLUMNS: { status: TaskStatus; label: string; hint: string }[] = [
  { status: "Todo", label: "To do", hint: "Not started" },
  { status: "Doing", label: "Doing", hint: "In flight" },
  { status: "Done", label: "Done", hint: "Finished" },
];

/** Each column's cards, ascending by `order` — the order they are drawn in. */
export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const columns = Object.fromEntries(
    TASK_STATUSES.map((status) => [status, [] as Task[]])
  ) as Record<TaskStatus, Task[]>;

  for (const task of tasks) {
    // A task with an unrecognised status would otherwise vanish from the board.
    (columns[task.status] ?? columns.Todo).push(task);
  }
  for (const status of TASK_STATUSES) {
    columns[status].sort((a, b) => a.order - b.order);
  }
  return columns;
}

/**
 * The `order` for a card dropped between two neighbours. Halving the gap keeps
 * every other card untouched, so a drop is one write rather than a renumbered
 * column. Doubles give ~50 splits of the same gap before precision bites,
 * which no hand-dragged board will reach.
 */
export function orderBetween(before?: Task, after?: Task): number {
  if (!before && !after) return 0;
  if (!before) return after!.order - 1;
  if (!after) return before.order + 1;
  return (before.order + after.order) / 2;
}

/**
 * Where a drop lands: the target column plus the `order` that puts the card at
 * `index` within it. `list` must already exclude the card being moved.
 */
export function dropTarget(list: Task[], index: number): number {
  return orderBetween(list[index - 1], list[index]);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as string[]).includes(value);
}
