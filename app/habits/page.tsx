import { HabitForm } from "@/components/HabitForm";
import { HabitList } from "@/components/HabitList";
import { TodayLine } from "@/components/TodayLine";

export default function HabitsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-14 pb-28">
      <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-medium leading-tight text-ink">
            Practice
          </h1>
          <TodayLine />
        </div>
        <HabitForm />
      </header>

      <HabitList />
    </div>
  );
}
