import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getQuestions } from '@/api'
import type { Question } from '@/api'

export interface WeakPointsState {
  allQuestions: Question[]
  loading: boolean
}

const initialState: WeakPointsState = {
  allQuestions: [],
  loading: false,
}

export const fetchWeakPointsData = createAsyncThunk('weakPoints/fetch', async () => {
  const res = await getQuestions({ pageSize: 1000 })
  return res.data
})

const weakPointsSlice = createSlice({
  name: 'weakPoints',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchWeakPointsData.pending, (state) => { state.loading = true })
    builder.addCase(fetchWeakPointsData.fulfilled, (state, action) => {
      state.allQuestions = action.payload
      state.loading = false
    })
    builder.addCase(fetchWeakPointsData.rejected, (state) => { state.loading = false })
  },
})

export default weakPointsSlice.reducer
