import { PageHeader, PageShell } from "@/components/PageFrame";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskForm } from "@/components/tasks/TaskForm";

export default function TasksPage() {
  return (
    <PageShell width="7xl">
      <PageHeader
        title="Board"
        lead="The concrete work behind the hours. Drag a card as it moves along."
        action={<TaskForm />}
      />

      <TaskBoard />
    </PageShell>
  );
}
