import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getCategories, getQuestionNotes, getQuestions } from '@/api'
import type { CategoryMap, Question, QuestionNote } from '@/api'

export interface DashboardState {
  allQuestions: Question[]
  categoryMap: CategoryMap
  questionNotes: QuestionNote[]
  loading: boolean
}

const initialState: DashboardState = {
  allQuestions: [],
  categoryMap: {},
  questionNotes: [],
  loading: false,
}

export const fetchDashboard = createAsyncThunk('dashboard/fetch', async () => {
  const [res, cats, notes] = await Promise.all([
    getQuestions({ pageSize: 1000 }),
    getCategories(),
    getQuestionNotes(),
  ])
  return { questions: res.data, categoryMap: cats, questionNotes: notes }
})

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchDashboard.pending, (state) => { state.loading = true })
    builder.addCase(fetchDashboard.fulfilled, (state, action) => {
      state.allQuestions = action.payload.questions
      state.categoryMap = action.payload.categoryMap
      state.questionNotes = action.payload.questionNotes
      state.loading = false
    })
    builder.addCase(fetchDashboard.rejected, (state) => { state.loading = false })
  },
})

export default dashboardSlice.reducer
