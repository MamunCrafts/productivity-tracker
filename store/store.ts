import { configureStore } from '@reduxjs/toolkit';
import habitReducer from './habitSlice';
import taskReducer from './taskSlice';
import noteReducer from './noteSlice';
import routineReducer from './routineSlice';
import { timerPersistenceMiddleware } from './timerPersistence';

export const store = configureStore({
  reducer: {
    habit: habitReducer,
    task: taskReducer,
    note: noteReducer,
    routine: routineReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(timerPersistenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
