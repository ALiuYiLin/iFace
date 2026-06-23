import { configureStore } from '@reduxjs/toolkit'
import studyReducer from './slices/studySlice'
import aiReducer from './slices/aiSlice'
import authReducer from './slices/authSlice'
import questionDetailReducer from './pages/questionDetailSlice'
import dashboardReducer from './pages/dashboardSlice'
import practiceReducer from './pages/practiceSlice'
import questionListReducer from './pages/questionListSlice'
import weakPointsReducer from './pages/weakPointsSlice'

export const store = configureStore({
  reducer: {
    study: studyReducer,
    ai: aiReducer,
    auth: authReducer,
    questionDetail: questionDetailReducer,
    dashboard: dashboardReducer,
    practice: practiceReducer,
    questionList: questionListReducer,
    weakPoints: weakPointsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
