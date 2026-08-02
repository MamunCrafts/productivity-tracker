"use client";

import { useMemo, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteTaskAsync, moveTaskAsync } from "@/store/taskSlice";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { dayKey } from "@/lib/analytics";
import {
  adjacentStatus,
  columnLabel,
  dropTarget,
  groupByStatus,
} from "@/lib/board";
import { cn } from "@/lib/utils";
import { TaskForm } from "./TaskForm";

interface TaskCardProps {
  task: Task;
  /** The copy that follows the cursor: no controls, no drag listeners. */
  overlay?: boolean;
}

/**
 * A card is its own drag handle — on a phone there is no room for a grip
 * target, so the grip glyph is decoration and the whole card responds.
 * Buttons inside it stop the pointer so a tap on delete never starts a drag.
 */
export function TaskCard({ task, overlay = false }: TaskCardProps) {
  const dispatch = useAppDispatch();
  const habit = useAppSelector((state) =>
    task.habitId ? state.habit.habits.find((h) => h.id === task.habitId) : undefined
  );
  const allTasks = useAppSelector((state) => state.task.tasks);
  const [confirming, setConfirming] = useState(false);

  const back = adjacentStatus(task.status, -1);
  const forward = adjacentStatus(task.status, 1);

  /**
   * A step along the board, for the phone's move buttons. The card lands at
   * the foot of the column it arrives in — the same place a drop on a column's
   * empty space puts it, so the two ways of moving a card agree.
   */
  const step = (to: typeof back) => {
    if (!to) return;
    const list = groupByStatus(allTasks)[to].filter((t) => t.id !== task.id);
    dispatch(
      moveTaskAsync({ id: task.id, status: to, order: dropTarget(list, list.length) })
    );
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: overlay });

  const done = task.status === "Done";
  // Overdue is only meaningful for work still outstanding.
  const today = useMemo(() => dayKey(new Date()), []);
  const overdue = Boolean(task.dueDate && !done && task.dueDate < today);

  const stopDrag = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <li
      ref={overlay ? undefined : setNodeRef}
      style={
        overlay
          ? undefined
          : { transform: CSS.Transform.toString(transform), transition }
      }
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      className={cn(
        // The room for the top-right action cluster is padding on the block
        // below rather than on the card, so the phone's move row can still run
        // the full width. No `touch-none` here on purpose: the touch sensor
        // activates on a hold, so a plain swipe over a card must still scroll
        // the board.
        "group relative rounded-lg border border-line bg-surface p-3 pl-4 text-left transition-colors",
        !overlay && "cursor-grab hover:border-line-2 active:cursor-grabbing",
        // The original stays as a ghost so the column keeps its shape.
        isDragging && "opacity-40",
        overlay && "cursor-grabbing border-line-2 elev-lift",
        done && "opacity-70 hover:opacity-100"
      )}
    >
      {habit && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
          style={{ backgroundColor: habit.color }}
        />
      )}

      {/* Everything that has to clear the action cluster overhead. */}
      <div className={cn(!overlay && "pr-14")}>
        <div className="flex items-start gap-2">
          <GripVertical
            className="mt-0.5 h-4 w-4 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
          <p
            className={cn(
              "min-w-0 flex-1 break-words text-sm leading-snug text-ink",
              done && "line-through decoration-ink-3"
            )}
          >
            {task.title}
          </p>
        </div>

        {task.notes && (
          <p className="mt-1.5 line-clamp-2 pl-6 text-xs leading-relaxed text-ink-3">
            {task.notes}
          </p>
        )}

        {(habit || task.dueDate) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-6">
            {habit && (
              <span className="inline-flex max-w-full items-center gap-1.5 text-[11px] text-ink-2">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: habit.color }}
                />
                <span className="truncate">{habit.title}</span>
              </span>
            )}
            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 text-[11px] tnum",
                  overdue ? "text-danger" : "text-ink-3"
                )}
              >
                <CalendarDays className="h-3 w-3" aria-hidden />
                {format(parseISO(task.dueDate), "MMM d")}
                {overdue && <span className="sr-only">(overdue)</span>}
              </span>
            )}
          </div>
        )}
      </div>

      {/*
        Moving a card along the board, on a phone.

        Dragging is the desk gesture and it stays exactly as it was, but it
        cannot work here: the column a card is headed for is the one the
        switcher is not showing, so there is nowhere on screen to drop it. Two
        labelled steps say where the card is going, which a bare arrow doesn't,
        and the empty half is kept so "back" is always on the left and
        "forward" always on the right — the ends of the board read as ends.
      */}
      {!overlay && (
        <div
          onPointerDown={stopDrag}
          className="mt-3 flex items-center gap-2 border-t border-line pt-2 sm:hidden"
        >
          {back ? (
            <Button
              variant="ghost"
              className="h-10 flex-1 justify-start gap-1 px-2 text-xs text-ink-2"
              onClick={() => step(back)}
            >
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {columnLabel(back)}
              <span className="sr-only">
                — move {task.title} back to {columnLabel(back)}
              </span>
            </Button>
          ) : (
            <span className="flex-1" />
          )}
          {forward ? (
            <Button
              variant="ghost"
              className="h-10 flex-1 justify-end gap-1 px-2 text-xs text-ink-2"
              onClick={() => step(forward)}
            >
              {columnLabel(forward)}
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="sr-only">
                — move {task.title} on to {columnLabel(forward)}
              </span>
            </Button>
          ) : (
            <span className="flex-1" />
          )}
        </div>
      )}

      {!overlay && (
        <div
          onPointerDown={stopDrag}
          className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-70 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
        >
          <TaskForm task={task} />
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-7 w-7",
              confirming && "bg-danger/12 text-danger hover:bg-danger/20"
            )}
            title={confirming ? "Tap again to delete" : "Delete task"}
            onClick={() => {
              // No dialog for a task: it's one line of text, and a second tap
              // is enough of a guard.
              if (!confirming) {
                setConfirming(true);
                return;
              }
              dispatch(deleteTaskAsync(task.id));
            }}
            onBlur={() => setConfirming(false)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">
              {confirming ? `Confirm delete ${task.title}` : `Delete ${task.title}`}
            </span>
          </Button>
        </div>
      )}
    </li>
  );
}
