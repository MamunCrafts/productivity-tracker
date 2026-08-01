import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskForm } from "@/components/tasks/TaskForm";

export default function TasksPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-14 pb-28">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-medium leading-tight text-ink">
            Board
          </h1>
          <p className="mt-2 text-ink-2">
            The concrete work behind the hours. Drag a card as it moves along.
          </p>
        </div>
        <TaskForm />
      </header>

      <TaskBoard />
    </div>
  );
}
