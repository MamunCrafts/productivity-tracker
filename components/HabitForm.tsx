'use client';

import { useState } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { createHabit, updateHabitAsync } from '@/store/habitSlice';
import { Habit } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = [
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#10b981', name: 'Green' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#8b5cf6', name: 'Purple' },
];

const EMPTY = {
  title: '',
  description: '',
  totalHours: 100,
  perDayHours: 1,
  timeSlot: 'Morning',
  weekFrequency: 5,
  totalDays: 90,
  color: '#3b82f6',
};

type FormState = typeof EMPTY;

const fromHabit = (habit: Habit): FormState => ({
  title: habit.title,
  description: habit.description ?? '',
  totalHours: habit.totalHours,
  perDayHours: habit.perDayHours,
  timeSlot: habit.timeSlot ?? '',
  weekFrequency: habit.weekFrequency || 5,
  totalDays: habit.totalDays || 90,
  color: habit.color,
});

/** A labelled group, so the form reads as three short decisions, not nine fields. */
function Fieldset({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">
        {legend}
      </legend>
      {hint && <p className="-mt-1 text-xs text-ink-3">{hint}</p>}
      {children}
    </fieldset>
  );
}

interface HabitFormProps {
  /** Omit to create; pass a habit to edit it in place. */
  habit?: Habit;
}

export function HabitForm({ habit }: HabitFormProps) {
  const dispatch = useAppDispatch();
  const isEdit = Boolean(habit);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(habit ? fromHabit(habit) : EMPTY);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // The goals imply a finish date; showing it turns abstract numbers into a
  // commitment you can sanity-check before saving.
  const weeklyHours = form.perDayHours * form.weekFrequency;
  const weeksToGoal = weeklyHours > 0 ? form.totalHours / weeklyHours : null;

  const openChange = (next: boolean) => {
    // Reopening an edit dialog should show what's currently saved, not the
    // fields as they were left after a cancel.
    if (next && habit) setForm(fromHabit(habit));
    if (!next && !habit) setForm(EMPTY);
    setOpen(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    if (habit) {
      dispatch(updateHabitAsync({ id: habit.id, patch: form }));
    } else {
      dispatch(createHabit(form));
      setForm(EMPTY);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="icon" variant="ghost" className="h-9 w-9" title="Edit habit">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit {habit?.title}</span>
          </Button>
        ) : (
          <Button className="h-8 gap-1 px-2.5 text-[11px] sm:h-10 sm:gap-2 sm:px-4 sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> New habit
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${habit?.title}` : 'Start something'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Changes apply everywhere. Your logged hours are untouched.'
              : 'Name the practice and set the hours. You can log time the moment it exists.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-7">
          <Fieldset legend="The practice">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-ink-2">
                Name
              </Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Learn React"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-ink-2">
                Note <span className="text-ink-3">(optional)</span>
              </Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Hooks, then server components"
              />
            </div>
          </Fieldset>

          <Fieldset
            legend="The commitment"
            hint={
              weeksToGoal
                ? `${form.perDayHours}h a day, ${form.weekFrequency} days a week — about ${Math.ceil(weeksToGoal)} weeks to ${form.totalHours} hours.`
                : undefined
            }
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalHours" className="text-ink-2">
                  Hours to reach
                </Label>
                <Input
                  id="totalHours"
                  type="number"
                  min="1"
                  className="font-mono tnum"
                  value={form.totalHours}
                  onChange={(e) => set('totalHours', Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perDayHours" className="text-ink-2">
                  Hours a day
                </Label>
                <Input
                  id="perDayHours"
                  type="number"
                  min="0.1"
                  step="0.1"
                  className="font-mono tnum"
                  value={form.perDayHours}
                  onChange={(e) => set('perDayHours', Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weekFrequency" className="text-ink-2">
                  Days a week
                </Label>
                <Input
                  id="weekFrequency"
                  type="number"
                  min="1"
                  max="7"
                  className="font-mono tnum"
                  value={form.weekFrequency}
                  onChange={(e) => set('weekFrequency', Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalDays" className="text-ink-2">
                  Finish within (days)
                </Label>
                <Input
                  id="totalDays"
                  type="number"
                  min="1"
                  className="font-mono tnum"
                  value={form.totalDays}
                  onChange={(e) => set('totalDays', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeSlot" className="text-ink-2">
                When you&apos;ll do it
              </Label>
              <Input
                id="timeSlot"
                value={form.timeSlot}
                onChange={(e) => set('timeSlot', e.target.value)}
                placeholder="Morning, or 10:00–12:00"
              />
            </div>
          </Fieldset>

          <Fieldset legend="Colour" hint="How this habit is marked everywhere in the app.">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => {
                const selected = form.color === color.hex;
                return (
                  <button
                    key={color.hex}
                    type="button"
                    aria-label={color.name}
                    aria-pressed={selected}
                    onClick={() => set('color', color.hex)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full transition-transform',
                      selected ? 'scale-110' : 'opacity-70 hover:opacity-100'
                    )}
                    style={{ backgroundColor: color.hex }}
                  >
                    {selected && <Check className="h-4 w-4 text-base" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </Fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => openChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.title.trim()}>
              {isEdit ? 'Save changes' : 'Create habit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
