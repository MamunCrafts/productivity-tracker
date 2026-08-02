"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { moveTaskAsync } from "@/store/taskSlice";
import type { TaskStatus } from "@/types";
import { COLUMNS, dropTarget, groupByStatus, isTaskStatus } from "@/lib/board";
import { ColumnSwitcher } from "./ColumnSwitcher";
import { TaskColumn } from "./TaskColumn";
import { TaskCard } from "./TaskCard";
import { TaskForm } from "./TaskForm";
import { ShimmerBoard } from "./ShimmerBoard";

export function TaskBoard() {
  const dispatch = useAppDispatch();
  const { tasks, status } = useAppSelector((state) => state.task);
  const [dragging, setDragging] = useState<string | null>(null);
  // Which column the phone is showing. Reading order, so the board opens on
  // the work that hasn't started rather than on what is already finished.
  const [visible, setVisible] = useState<TaskStatus>("Todo");

  const columns = useMemo(() => groupByStatus(tasks), [tasks]);

  const sensors = useSensors(
    // A small distance before a drag begins keeps ordinary clicks working.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On touch, a hold rather than a distance — otherwise dragging a card and
    // scrolling the column are the same gesture.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) =>
    setDragging(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === String(active.id));
    if (!activeTask) return;

    const overId = String(over.id);

    // Dropped on a column (empty space) → append. Dropped on a card → take
    // that card's place.
    let targetStatus = activeTask.status;
    let index: number;

    if (isTaskStatus(overId)) {
      targetStatus = overId;
      index = columns[targetStatus].filter((t) => t.id !== activeTask.id).length;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetStatus = overTask.status;
      const rest = columns[targetStatus].filter((t) => t.id !== activeTask.id);
      const overIndex = rest.findIndex((t) => t.id === overTask.id);
      if (overIndex === -1) return;
      // Dragging downward inside a column means landing below the card you
      // dropped onto, not above it.
      const movingDown =
        activeTask.status === targetStatus && activeTask.order < overTask.order;
      index = movingDown ? overIndex + 1 : overIndex;
    }

    const rest = columns[targetStatus].filter((t) => t.id !== activeTask.id);
    const order = dropTarget(rest, index);

    // A drop back where it started is not a move; don't spend a write on it.
    if (targetStatus === activeTask.status && order === activeTask.order) return;

    dispatch(moveTaskAsync({ id: activeTask.id, status: targetStatus, order }));
  };

  if (status === "loading") return <ShimmerBoard />;

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-2 px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-medium text-ink">
          The board is clear
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-2">
          Add the next concrete thing you have to do. Drag it across as it
          moves, and attach it to a habit if it belongs to one.
        </p>
        <div className="mt-6 flex justify-center">
          <TaskForm />
        </div>
      </div>
    );
  }

  const active = dragging ? tasks.find((t) => t.id === dragging) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      {/* A phone shows one column, chosen here. From `sm` the scroller does the
          job and this isn't rendered. */}
      <ColumnSwitcher value={visible} onChange={setVisible} columns={columns} />

      {/* Three columns don't fit a phone. Below `sm` one is shown at a time;
          from `sm` to `lg` the board is a snapping horizontal scroller with
          each column at its own width; from `lg` it is a plain three-up grid.
          The negative margin has to match the page gutter at each width or the
          scroller pushes past the viewport — `px-4` on a phone, `px-6` from
          `sm`, and nothing from `lg`, where there is no scroller left. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
        <div className="flex snap-x snap-mandatory items-start gap-4 lg:grid lg:grid-cols-3">
          {COLUMNS.map(({ status: columnStatus, label, hint }) => (
            <TaskColumn
              key={columnStatus}
              status={columnStatus}
              label={label}
              hint={hint}
              tasks={columns[columnStatus]}
              hiddenOnPhone={columnStatus !== visible}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {active ? (
          <ul className="list-none">
            <TaskCard task={active} overlay />
          </ul>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
