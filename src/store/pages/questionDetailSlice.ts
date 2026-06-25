import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getQuestion, getQuestions } from '@/api'
import type { Question } from '@/api'

export interface QuestionDetailState {
  question: Question | undefined
  allQuestions: Question[]
  loading: boolean
  allLoading: boolean
}

const initialState: QuestionDetailState = {
  question: undefined,
  allQuestions: [],
  loading: false,
  allLoading: false,
}

export const fetchQuestion = createAsyncThunk(
  'questionDetail/fetchQuestion',
  async (id: string) => {
    const data = await getQuestion(id)
    return data
  },
)

export const fetchAllQuestions = createAsyncThunk(
  'questionDetail/fetchAllQuestions',
  async () => {
    const res = await getQuestions({ pageSize: 1000 })
    return res.data
  },
)

const questionDetailSlice = createSlice({
  name: 'questionDetail',
  initialState,
  reducers: {
    clearQuestion(state) {
      state.question = undefined
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuestion.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchQuestion.fulfilled, (state, action) => {
        state.question = action.payload
        state.loading = false
      })
      .addCase(fetchQuestion.rejected, (state) => {
        state.loading = false
      })
      .addCase(fetchAllQuestions.pending, (state) => {
        state.allLoading = true
      })
      .addCase(fetchAllQuestions.fulfilled, (state, action) => {
        state.allQuestions = action.payload
        state.allLoading = false
      })
      .addCase(fetchAllQuestions.rejected, (state) => {
        state.allLoading = false
      })
  },
})

export const { clearQuestion } = questionDetailSlice.actions
export default questionDetailSlice.reducer
