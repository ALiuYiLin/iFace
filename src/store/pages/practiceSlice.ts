import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getCategories, getQuestions } from '@/api'
import type { CategoryMap, Question } from '@/api'

export interface PracticeState {
  allQuestions: Question[]
  categoryMap: CategoryMap
  loading: boolean
}

const initialState: PracticeState = {
  allQuestions: [],
  categoryMap: {},
  loading: false,
}

export const fetchPracticeData = createAsyncThunk('practice/fetchData', async () => {
  const [res, cats] = await Promise.all([getQuestions({ pageSize: 1000 }), getCategories()])
  return { questions: res.data, categoryMap: cats }
})

const practiceSlice = createSlice({
  name: 'practice',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchPracticeData.pending, (state) => { state.loading = true })
    builder.addCase(fetchPracticeData.fulfilled, (state, action) => {
      state.allQuestions = action.payload.questions
      state.categoryMap = action.payload.categoryMap
      state.loading = false
    })
    builder.addCase(fetchPracticeData.rejected, (state) => { state.loading = false })
  },
})

export default practiceSlice.reducer
