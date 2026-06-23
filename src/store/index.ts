import { configureStore } from '@reduxjs/toolkit'
import studyReducer from './slices/studySlice'
import aiReducer from './slices/aiSlice'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    study: studyReducer,
    ai: aiReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
