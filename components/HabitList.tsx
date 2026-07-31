'use client';

import { useAppSelector } from '@/store/hooks';
import { ShimmerRows } from './ui/shimmer';
import { HabitCard } from './HabitCard';
import { HabitForm } from './HabitForm';

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

  // A single column: one habit per line, so choosing what to work on is a
  // short vertical read rather than a scan across a grid.
  return (
    <ul className="space-y-3">
      {habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} />
      ))}
    </ul>
  );
}
