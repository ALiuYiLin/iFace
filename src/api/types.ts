// ─── API Response Types ─────────────────────────────

export interface ApiResponse<T> {
  data: T
}

export interface PaginatedData<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  code: string
  message: string
  status?: number
  data?: unknown
}

// ─── Question ────────────────────────────────────────

export interface Question {
  id: string
  module: string
  difficulty: 1 | 2 | 3
  question: string
  answer: string
  tags: string[]
  source?: string
  created_at?: number
  updated_at?: number
}

export interface StudyRecord {
  question_id: string
  status: 'unlearned' | 'review' | 'mastered'
  last_updated: number
  review_count: number
  created_at?: number
}

export interface QuestionNote {
  question_id: string
  content: string
  created_at: number
  updated_at: number
}

export interface QuestionNoteImage {
  id: string
  question_id: string
  name: string
  mime_type: string
  size: number
  file_path: string
  created_at: number
  updated_at: number
}

export interface QuestionAnswerAnnotation {
  id: string
  question_id: string
  answer_hash: string
  kind: 'highlight' | 'comment'
  color: 'yellow' | 'green' | 'blue' | 'pink'
  highlight_color?: string | null
  start_pos: number
  end_pos: number
  selected_text: string
  note: string
  created_at: number
  updated_at: number
}

export interface QuestionAnswerOverride {
  question_id: string
  content: string
  created_at: number
  updated_at: number
}

export interface QuestionFlag {
  question_id: string
  starred: 0 | 1
  created_at: number
  updated_at: number
}

// ─── Mock Interview ─────────────────────────────────

export interface MockInterviewSession {
  id: string
  title: string
  roleTitle: string
  level: 'junior' | 'mid' | 'senior'
  interviewType: 'technical' | 'project' | 'comprehensive'
  durationMinutes: number
  targetQuestionCount: number
  jdText: string
  resumeText: string
  resumeFileName?: string | null
  plan?: unknown
  turns: unknown[]
  status: 'planning' | 'interviewing' | 'completed'
  questionIndex: number
  followUpDepth: number
  model?: string | null
  report?: unknown
  startedAt?: number | null
  completedAt?: number | null
  createdAt: number
  updatedAt: number
}

// ─── JD Match Report ────────────────────────────────

export interface JdMatchReport {
  id: string
  title: string
  roleTitle: string
  jdText: string
  resumeText: string
  resumeFileName?: string | null
  markdown: string
  model?: string | null
  createdAt: number
  updatedAt: number
}

// ─── Categories ─────────────────────────────────────

export interface CategoryEntry {
  name: string
  modules: string[]
  builtin: boolean
  order: number
}

export type CategoryMap = Record<string, CategoryEntry>

// ─── Meta ───────────────────────────────────────────

export interface MetaEntry {
  key: string
  value: unknown
}

// ─── Export / Import ────────────────────────────────

export interface ExportData {
  formatVersion: number
  exportedAt: string
  questions: Question[]
  studyRecords: StudyRecord[]
  questionNotes: QuestionNote[]
  questionAnswerAnnotations: QuestionAnswerAnnotation[]
  questionAnswerOverrides: QuestionAnswerOverride[]
  questionFlags: QuestionFlag[]
  mockInterviews: MockInterviewSession[]
  jdMatchReports: JdMatchReport[]
  customSources: string[]
  customCategories: CategoryMap
  aiSessions: AISession[]
}

export interface AISession {
  questionId: string
  messages: { role: string; content: string }[]
  createdAt: number
  updatedAt: number
}

export interface ImportPreviewResult {
  fileName: string
  questions: Question[]
  studyRecords: StudyRecord[]
  questionNotes: QuestionNote[]
  questionAnswerAnnotations: QuestionAnswerAnnotation[]
  questionAnswerOverrides: QuestionAnswerOverride[]
  questionFlags: QuestionFlag[]
  aiSessions: AISession[]
  mockInterviews: MockInterviewSession[]
  jdMatchReports: JdMatchReport[]
  customSources: string[]
  customCategories: CategoryMap
  impact: Record<string, { created: number; overwritten: number }>
}

export interface CustomImportResult {
  source: string
  loaded: number
  errors: { index: number; message: string }[]
  warnings: string[]
}

export interface BuiltinLoadResult {
  file: string
  loaded: number
  skipped: number
  errors: { index: number; message: string }[]
}

export interface BuiltinRefreshResult {
  refreshed: boolean
}

export interface MigrationResult {
  migratedQuestions: number
  migratedRecords: number
  migratedNotes: number
  migratedAnswerOverrides: number
  migratedFlags: number
  removedSources: number
  removedCategories: number
}

// ─── AI ─────────────────────────────────────────────

export interface AIChatConfig {
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  provider?: string
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ─── User Settings ─────────────────────────────────

export interface UserStreak {
  id: string
  date: string
  questions_done: number
  current_streak: number
  best_streak: number
  created_at: number
  updated_at: number
}
