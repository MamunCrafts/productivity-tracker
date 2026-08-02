import { HabitForm } from "@/components/HabitForm";
import { HabitList } from "@/components/HabitList";
import { PageHeader, PageShell } from "@/components/PageFrame";
import { TodayLine } from "@/components/TodayLine";

export default function HabitsPage() {
  return (
    <PageShell width="5xl">
      <PageHeader
        title="Practice"
        lead={<TodayLine />}
        action={<HabitForm />}
        className="sm:mb-12"
      />

      <HabitList />
    </PageShell>
  );
}
