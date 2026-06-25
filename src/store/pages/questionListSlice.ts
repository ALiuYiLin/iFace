import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getCategories, getQuestionFlags, getQuestionNotes, getQuestions } from '@/api'
import type { CategoryMap, Question, QuestionNote } from '@/api'

export interface QuestionListState {
  allQuestions: Question[]
  categoryMap: CategoryMap
  questionNotes: QuestionNote[]
  starredIds: string[]
  loading: boolean
}

const initialState: QuestionListState = {
  allQuestions: [],
  categoryMap: {},
  questionNotes: [],
  starredIds: [],
  loading: false,
}

export const fetchQuestionList = createAsyncThunk('questionList/fetch', async () => {
  const [res, cats, notes, flags] = await Promise.all([
    getQuestions({ pageSize: 1000 }),
    getCategories(),
    getQuestionNotes(),
    getQuestionFlags(),
  ])
  return {
    questions: res.data,
    categoryMap: cats,
    questionNotes: notes,
    starredIds: flags.filter((f) => !!f.starred).map((f) => f.question_id),
  }
})

const questionListSlice = createSlice({
  name: 'questionList',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchQuestionList.pending, (state) => { state.loading = true })
    builder.addCase(fetchQuestionList.fulfilled, (state, action) => {
      state.allQuestions = action.payload.questions
      state.categoryMap = action.payload.categoryMap
      state.questionNotes = action.payload.questionNotes
      state.starredIds = action.payload.starredIds
      state.loading = false
    })
    builder.addCase(fetchQuestionList.rejected, (state) => { state.loading = false })
  },
})

export default questionListSlice.reducer
