'use client';

import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { sortPinnedFirst } from '@/store/habitSlice';
import { ShimmerRows } from './ui/shimmer';
import { HabitCard } from './HabitCard';
import { HabitForm } from './HabitForm';
import { Habit } from '@/types';
import { ChevronRight, Search, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

function Section({
  title,
  count,
  children,
  collapsible = false,
  forceOpen = false,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  collapsible?: boolean;
  /** A search hit must never be hidden inside a collapsed section. */
  forceOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(!collapsible);
  const open = expanded || forceOpen;
  if (count === 0) return null;

  // A toggle that can't close the section would just look broken, so while
  // forceOpen holds the header goes back to being a plain label.
  return (
    <section className="space-y-3">
      {collapsible && !forceOpen ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
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

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search habits"
        aria-label="Search habits"
        className={cn('pl-9', value && 'pr-11')}
      />
      {value && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
          onClick={() => onChange('')}
          title="Clear search"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}

export function HabitList() {
  const { habits, status } = useAppSelector((state) => state.habit);
  const [query, setQuery] = useState('');

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

  // Matching the time slot too, so "morning" finds the morning block even
  // when no title mentions it.
  const q = query.trim().toLowerCase();
  const matches = (habit: Habit) =>
    !q ||
    habit.title.toLowerCase().includes(q) ||
    habit.description.toLowerCase().includes(q) ||
    habit.timeSlot.toLowerCase().includes(q);

  // Finished and paused habits stay reachable but out of the way, so the
  // working list only holds what you could actually start right now. Pinning
  // reorders within a section, never across them.
  const working: Habit[] = [];
  const paused: Habit[] = [];
  const finished: Habit[] = [];
  for (const habit of sortPinnedFirst(habits)) {
    if (!matches(habit)) continue;
    if (habit.completed) finished.push(habit);
    else if (habit.status === 'Paused') paused.push(habit);
    else working.push(habit);
  }

  const hits = working.length + paused.length + finished.length;
  const searchField = <SearchField value={query} onChange={setQuery} />;

  if (hits === 0) {
    return (
      <div className="space-y-6">
        {searchField}
        <div className="rounded-xl border border-dashed border-line-2 px-6 py-16 text-center">
          <p className="text-ink-2">
            Nothing matches <span className="text-ink">“{query.trim()}”</span>.
          </p>
          <Button variant="outline" className="mt-5" onClick={() => setQuery('')}>
            Clear search
          </Button>
        </div>
      </div>
    );
  }

  // While searching, every section opens: a hit hidden behind "Finished (2)"
  // reads as no result at all.
  const searching = q.length > 0;
  const onlyWorking = paused.length === 0 && finished.length === 0;

  return (
    <div className="space-y-6">
      {searchField}
      {onlyWorking ? (
        <ul className="space-y-3">
          {working.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </ul>
      ) : (
        <div className="space-y-10">
          <Section title="In progress" count={working.length}>
            {working.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </Section>
          <Section
            title="Paused"
            count={paused.length}
            collapsible
            forceOpen={searching}
          >
            {paused.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </Section>
          <Section
            title="Finished"
            count={finished.length}
            collapsible
            forceOpen={searching}
          >
            {finished.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}
