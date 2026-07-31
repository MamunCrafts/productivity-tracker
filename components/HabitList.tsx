'use client';

import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { ShimmerRows } from './ui/shimmer';
import { HabitCard } from './HabitCard';
import { HabitForm } from './HabitForm';
import { Habit } from '@/types';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function Section({
  title,
  count,
  children,
  collapsible = false,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  if (count === 0) return null;

  return (
    <section className="space-y-3">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-ink-3 hover:text-ink-2"
        >
          <ChevronRight
            className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')}
          />
          {title}
          <span className="tnum">({count})</span>
        </button>
      ) : (
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">
          {title} <span className="tnum">({count})</span>
        </h2>
      )}
      {open && <ul className="space-y-3">{children}</ul>}
    </section>
  );
}

export function HabitList() {
  const { habits, status } = useAppSelector((state) => state.habit);

  if (status === 'loading') {
    return <ShimmerRows count={4} />;
  }

  if (habits.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-2 px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-medium text-ink">
          Nothing on the bench yet
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-2">
          Add the thing you want to get good at, set the hours it deserves, and
          start logging them.
        </p>
        <div className="mt-6 flex justify-center">
          <HabitForm />
        </div>
      </div>
    );
  }

  // Finished and paused habits stay reachable but out of the way, so the
  // working list only holds what you could actually start right now.
  const working: Habit[] = [];
  const paused: Habit[] = [];
  const finished: Habit[] = [];
  for (const habit of habits) {
    if (habit.completed) finished.push(habit);
    else if (habit.status === 'Paused') paused.push(habit);
    else working.push(habit);
  }

  const onlyWorking = paused.length === 0 && finished.length === 0;

  return (
    <div className="space-y-10">
      {onlyWorking ? (
        <ul className="space-y-3">
          {working.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </ul>
      ) : (
        <>
          <Section title="In progress" count={working.length}>
            {working.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </Section>
          <Section title="Paused" count={paused.length} collapsible>
            {paused.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </Section>
          <Section title="Finished" count={finished.length} collapsible>
            {finished.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}
