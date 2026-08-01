"use client";

import { useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createTask, updateTaskAsync } from "@/store/taskSlice";
import { Task, TaskStatus } from "@/types";
import { COLUMNS } from "@/lib/board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY = {
  title: "",
  notes: "",
  habitId: "",
  status: "Todo" as TaskStatus,
  dueDate: "",
};

type FormState = typeof EMPTY;

const fromTask = (task: Task): FormState => ({
  title: task.title,
  notes: task.notes ?? "",
  habitId: task.habitId ?? "",
  status: task.status,
  dueDate: task.dueDate ?? "",
});

interface TaskFormProps {
  /** Omit to create; pass a task to edit it in place. */
  task?: Task;
  /** Which column a new card starts in. Ignored when editing. */
  defaultStatus?: TaskStatus;
  /** Icon-only trigger, for the per-column add button. */
  compact?: boolean;
}

export function TaskForm({
  task,
  defaultStatus = "Todo",
  compact = false,
}: TaskFormProps) {
  const dispatch = useAppDispatch();
  // Filtered outside the selector, not inside it: a selector that builds a new
  // array every call re-renders this form — one per card — on every store
  // change, which during a drag is every card, every frame.
  const allHabits = useAppSelector((state) => state.habit.habits);
  // Only habits you could still work on are worth attaching a task to.
  const habits = useMemo(() => allHabits.filter((h) => !h.completed), [allHabits]);
  const isEdit = Boolean(task);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(
    task ? fromTask(task) : { ...EMPTY, status: defaultStatus }
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openChange = (next: boolean) => {
    // Reopening shows what's saved, not what was left behind after a cancel.
    if (next) setForm(task ? fromTask(task) : { ...EMPTY, status: defaultStatus });
    setOpen(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    const fields = {
      title,
      notes: form.notes.trim(),
      habitId: form.habitId || null,
      status: form.status,
      dueDate: form.dueDate || null,
    };

    if (task) {
      // Moving a card out of Done by editing it has to clear the finish stamp
      // too, or the card claims to be finished from the wrong column.
      const completedAt =
        fields.status === "Done"
          ? task.completedAt ?? new Date().toISOString()
          : null;
      dispatch(updateTaskAsync({ id: task.id, patch: { ...fields, completedAt } }));
    } else {
      dispatch(createTask(fields));
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit task">
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Edit {task?.title}</span>
          </Button>
        ) : compact ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            title={`Add to ${defaultStatus}`}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add a task to {defaultStatus}</span>
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New task
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "Add a task"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes show on the board straight away."
              : "One thing you need to get done. Attach it to a habit if it belongs to one."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-ink-2">
              Task
            </Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Finish the hooks chapter"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-notes" className="text-ink-2">
              Notes <span className="text-ink-3">(optional)</span>
            </Label>
            <textarea
              id="task-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Anything you'd forget by tomorrow"
              className="flex w-full resize-y rounded-md border border-line-2 bg-base px-3 py-2 text-base text-ink transition-colors placeholder:text-ink-3 hover:border-line-2/80 focus-visible:border-amber focus-visible:outline-none"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">
              Column
            </legend>
            <div className="flex flex-wrap gap-2">
              {COLUMNS.map((column) => {
                const selected = form.status === column.status;
                return (
                  <button
                    key={column.status}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => set("status", column.status)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-line-2 bg-surface-2 text-ink"
                        : "border-line text-ink-2 hover:bg-surface-2 hover:text-ink"
                    )}
                  >
                    {column.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-habit" className="text-ink-2">
                Habit <span className="text-ink-3">(optional)</span>
              </Label>
              <select
                id="task-habit"
                value={form.habitId}
                onChange={(e) => set("habitId", e.target.value)}
                className="h-11 w-full rounded-md border border-line-2 bg-base px-3 text-base text-ink transition-colors hover:border-line-2/80 focus-visible:border-amber focus-visible:outline-none"
              >
                <option value="">No habit</option>
                {habits.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due" className="text-ink-2">
                Due <span className="text-ink-3">(optional)</span>
              </Label>
              <Input
                id="task-due"
                type="date"
                className="font-mono tnum"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => openChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.title.trim()}>
              {isEdit ? "Save changes" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
