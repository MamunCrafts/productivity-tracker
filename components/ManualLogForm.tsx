'use client';

import { useState } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { createLogAsync } from '@/store/habitSlice';
import { TimeLog } from '@/types';
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
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dayKey } from '@/lib/analytics';

interface ManualLogFormProps {
  habitId: string;
  habitTitle: string;
}

/** Most untimed sessions land on a round number, so offer those before the keyboard. */
const QUICK_MINUTES = [15, 30, 45, 60, 90, 120];

export function ManualLogForm({ habitId, habitTitle }: ManualLogFormProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => dayKey(new Date()));
  const [minutes, setMinutes] = useState(30);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (minutes <= 0) return;

    const log: TimeLog = {
      id: crypto.randomUUID(),
      habitId,
      startTime: new Date().toISOString(),
      endTime: null,
      durationSeconds: minutes * 60,
      date,
    };

    dispatch(createLogAsync(log));
    setOpen(false);
    setMinutes(30);
  };

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const readable =
    hours > 0 ? `${hours}h${remainder ? ` ${remainder}m` : ''}` : `${remainder}m`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-9 w-9" title="Log time">
          <Plus className="h-4 w-4" />
          <span className="sr-only">Log time for {habitTitle}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log time</DialogTitle>
          <DialogDescription>
            Add a session to <span className="text-ink">{habitTitle}</span> you
            didn&apos;t time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-ink-2">How long</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_MINUTES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMinutes(preset)}
                  aria-pressed={minutes === preset}
                  className={cn(
                    'rounded-md border px-3 py-1.5 font-mono text-sm tnum transition-colors',
                    minutes === preset
                      ? 'border-amber bg-amber/12 text-amber'
                      : 'border-line-2 text-ink-2 hover:bg-surface-2 hover:text-ink'
                  )}
                >
                  {preset >= 60 ? `${preset / 60}h` : `${preset}m`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Input
                id="minutes"
                type="number"
                min="1"
                step="1"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-28 font-mono tnum"
                aria-label="Minutes"
              />
              <span className="text-sm text-ink-3">
                minutes — logs as <span className="text-ink-2 tnum">{readable}</span>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="log-date" className="text-ink-2">
              Which day
            </Label>
            <Input
              id="log-date"
              type="date"
              max={dayKey(new Date())}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="font-mono tnum"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={minutes <= 0}>
              Log {readable}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
