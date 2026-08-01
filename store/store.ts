import { configureStore } from '@reduxjs/toolkit';
import habitReducer from './habitSlice';
import taskReducer from './taskSlice';
import { timerPersistenceMiddleware } from './timerPersistence';

export const store = configureStore({
  reducer: {
    habit: habitReducer,
    task: taskReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(timerPersistenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
