'use client';

import { useState } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { createHabit } from '@/store/habitSlice';
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
import { Plus, Check } from 'lucide-react';
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
  weekFrequency: 7,
  totalDays: 30,
  color: '#3b82f6',
};

/** A labelled group, so the form reads as three short decisions, not ten fields. */
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

export function HabitForm() {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // The two goals imply a finish date; showing it turns abstract numbers into a
  // commitment you can sanity-check before saving.
  const daysToGoal =
    form.perDayHours > 0 ? Math.ceil(form.totalHours / form.perDayHours) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    dispatch(createHabit(form));
    setOpen(false);
    setForm(EMPTY);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> New habit
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start something</DialogTitle>
          <DialogDescription>
            Name the practice and set the hours. You can log time the moment it exists.
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
              daysToGoal
                ? `At ${form.perDayHours}h a day, that's about ${daysToGoal} days of practice.`
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
                    {selected && (
                      <Check className="h-4 w-4 text-base" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>
          </Fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.title.trim()}>
              Create habit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
