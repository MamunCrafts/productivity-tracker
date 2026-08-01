"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Task, TaskStatus } from "@/types";
import { TaskCard } from "./TaskCard";
import { TaskForm } from "./TaskForm";
import { cn } from "@/lib/utils";

interface TaskColumnProps {
  status: TaskStatus;
  label: string;
  hint: string;
  tasks: Task[];
}

export function TaskColumn({ status, label, hint, tasks }: TaskColumnProps) {
  // The column itself is a drop target so an empty one — and the space below
  // the last card — still accepts a card.
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      className={cn(
        // Each column is a full-width panel on a phone and scroll-snaps, so you
        // swipe between three readable columns instead of squinting at three
        // narrow ones.
        "flex w-[86vw] shrink-0 snap-start flex-col rounded-xl border border-line bg-base/40 sm:w-72 lg:w-full lg:shrink"
      )}
      aria-label={`${label} column`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-2">
            {label} <span className="tnum text-ink-3">({tasks.length})</span>
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-ink-3">{hint}</p>
        </div>
        <TaskForm defaultStatus={status} compact />
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 p-3 transition-colors",
          isOver && "bg-surface/60"
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </ul>
        </SortableContext>

        {tasks.length === 0 && (
          <div
            className={cn(
              "rounded-lg border border-dashed border-line-2 px-3 py-8 text-center text-xs text-ink-3 transition-colors",
              isOver && "border-amber/60 text-ink-2"
            )}
          >
            Drop a card here
          </div>
        )}
      </div>
    </section>
  );
}
