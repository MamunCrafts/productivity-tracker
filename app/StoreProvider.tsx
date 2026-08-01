'use client';

import { useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { fetchHabits, fetchLogs, restoreTimer } from '@/store/habitSlice';
import { fetchTasks } from '@/store/taskSlice';
import { readStoredTimer } from '@/store/timerPersistence';

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Before anything else: pick a session back up if the tab was closed or
    // reloaded mid-focus. Stale sessions are dropped inside readStoredTimer.
    const stored = readStoredTimer();
    if (stored) store.dispatch(restoreTimer(stored));

    store.dispatch(fetchHabits());
    store.dispatch(fetchLogs());
    store.dispatch(fetchTasks());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
