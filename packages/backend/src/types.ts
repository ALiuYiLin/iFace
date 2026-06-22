// ─── Database Row Types ────────────────────────────

export interface QuestionRow {
  id: string
  module: string
  difficulty: number
  question: string
  answer: string
  tags: string
  source: string | null
  created_at: number
  updated_at: number
}

export interface StudyRecordRow {
  question_id: string
  status: string
  last_updated: number
  review_count: number
  created_at: number
}

export interface QuestionNoteRow {
  question_id: string
  content: string
  created_at: number
  updated_at: number
}

export interface QuestionNoteImageRow {
  id: string
  question_id: string
  name: string
  mime_type: string
  size: number
  file_path: string
  created_at: number
  updated_at: number
}

export interface AnnotationRow {
  id: string
  question_id: string
  answer_hash: string
  kind: string
  color: string
  highlight_color: string | null
  start_pos: number
  end_pos: number
  selected_text: string
  note: string
  created_at: number
  updated_at: number
}

export interface OverrideRow {
  question_id: string
  content: string
  created_at: number
  updated_at: number
}

export interface FlagRow {
  question_id: string
  starred: number
  created_at: number
  updated_at: number
}

export interface MockInterviewRow {
  id: string
  title: string
  role_title: string
  level: string
  interview_type: string
  duration_minutes: number
  target_question_count: number
  jd_text: string
  resume_text: string
  resume_file_name: string | null
  plan: string | null
  turns: string
  status: string
  question_index: number
  follow_up_depth: number
  model: string | null
  report: string | null
  started_at: number | null
  completed_at: number | null
  created_at: number
  updated_at: number
}

export interface JdMatchReportRow {
  id: string
  title: string
  role_title: string
  jd_text: string
  resume_text: string
  resume_file_name: string | null
  markdown: string
  model: string | null
  created_at: number
  updated_at: number
}

export interface CategoryRow {
  name: string
  builtin: number
  ord: number
  created_at: number
  updated_at: number
}

export interface CategoryModuleRow {
  category_name: string
  module_name: string
}

export interface MetaRow {
  key: string
  value: string
  updated_at: number
}

export interface CustomSourceRow {
  name: string
  created_at: number
}

export interface LoadedModuleRow {
  file_path: string
  created_at: number
}

export interface AiSessionRow {
  question_id: string
  created_at: number
  updated_at: number
}

export interface AiMessageRow {
  id: string
  question_id: string
  role: string
  content: string
  created_at: number
}

export interface UserStreakRow {
  id: string
  date: string
  questions_done: number
  current_streak: number
  best_streak: number
  created_at: number
  updated_at: number
}

export interface UserSettingRow {
  key: string
  value: string
}

export interface CountResult {
  total: number
}

// ─── Response helpers ──────────────────────────────

export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: { code: string; message: string }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
}

// ─── Mock Interview Session Shape (serialized) ─────

export interface MockInterviewTurns {
  id: string
  role: string
  kind: string
  content: string
  createdAt: number
}

export interface MockInterviewReport {
  markdown: string
  overallScore: number | null
  dimensions: { label: string; score: number; comment: string }[]
  recommendedQuestionIds: string[]
  createdAt: number
}

export interface MockInterviewPlan {
  summary: string
  focusAreas: string[]
  sections: { title: string; weight: number; intent: string }[]
  openingQuestion: string
}
