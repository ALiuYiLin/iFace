import { Router, type Request, type Response } from 'express'
import { v4 as uuid } from 'uuid'
import fs from 'node:fs'
import path from 'node:path'
import db from '../db.js'
import config from '../config.js'
import type {
  QuestionRow,
  StudyRecordRow,
  QuestionNoteRow,
  AnnotationRow,
  OverrideRow,
  FlagRow,
  MockInterviewRow,
  JdMatchReportRow,
  CategoryRow,
  CategoryModuleRow,
  AiSessionRow,
  AiMessageRow,
  CountResult,
} from '../types.js'

const router = Router()

const BUILTIN_QUESTIONS_VERSION = '0.18.0'

interface BuiltinCategoryDef {
  category: string
  dir: string
  files: string[]
}

const BUILTIN_CATEGORIES: BuiltinCategoryDef[] = [
  { category: '前端', dir: 'frontend', files: [
    'js.json', 'react.json', 'vue.json', 'css.json', 'typescript.json',
    'network.json', 'performance.json', 'algorithm.json', 'project.json',
  ] },
  { category: 'Golang', dir: 'golang', files: [
    'basics.json', 'concurrency.json', 'memory.json', 'engineering.json', 'web.json',
  ] },
  { category: 'AI Agent', dir: 'ai-agent', files: [
    'llm.json', 'prompt.json', 'agent.json', 'rag.json', 'tools.json',
    'evaluation.json', 'engineering.json', 'application.json',
  ] },
  { category: 'Java', dir: 'java', files: [
    'basics.json', 'concurrency.json', 'jvm.json', 'spring.json',
    'network.json', 'mysql.json', 'redis.json',
  ] },
]

interface LoadResult {
  file: string
  loaded: number
  skipped: number
  errors: { index: number; message: string }[]
}

interface ValidatedQuestion {
  id: string
  module: string
  difficulty: number
  question: string
  answer: string
  tags: string[]
  source?: string
}

interface ImportImpact {
  questions: { created: number; overwritten: number }
  studyRecords: { created: number; overwritten: number }
  questionNotes: { created: number; overwritten: number }
  questionAnswerAnnotations: { created: number; overwritten: number }
  questionAnswerOverrides: { created: number; overwritten: number }
  questionFlags: { created: number; overwritten: number }
  aiSessions: { created: number; overwritten: number }
  mockInterviews: { created: number; overwritten: number }
  jdMatchReports: { created: number; overwritten: number }
}

interface MigrationResult {
  migratedQuestions: number
  migratedRecords: number
  migratedNotes: number
  migratedAnswerOverrides: number
  migratedFlags: number
  removedSources: number
  removedCategories: number
}

interface ExportData {
  formatVersion: number
  exportedAt: string
  questions: Record<string, unknown>[]
  studyRecords: Record<string, unknown>[]
  questionNotes: Record<string, unknown>[]
  questionAnswerAnnotations: Record<string, unknown>[]
  questionAnswerOverrides: Record<string, unknown>[]
  questionFlags: Record<string, unknown>[]
  mockInterviews: Record<string, unknown>[]
  jdMatchReports: Record<string, unknown>[]
  customSources: string[]
  customCategories: Record<string, unknown>
  aiSessions: Record<string, unknown>[]
}

// ─── Helpers ────────────────────────────────────

function safeJson<T>(val: string | null, fallback: T | null = null): T | null {
  if (!val) return fallback
  try { return JSON.parse(val) as T } catch { return fallback }
}

function countImpact(arr: unknown[] | undefined): { created: number; overwritten: number } {
  return { created: arr?.length ?? 0, overwritten: 0 }
}

function createEmptyMigrationResult(): MigrationResult {
  return { migratedQuestions: 0, migratedRecords: 0, migratedNotes: 0, migratedAnswerOverrides: 0, migratedFlags: 0, removedSources: 0, removedCategories: 0 }
}

function validateQuestions(raw: unknown[]): { valid: ValidatedQuestion[]; errors: { index: number; message: string }[] } {
  const valid: ValidatedQuestion[] = []
  const errors: { index: number; message: string }[] = []
  const items = Array.isArray(raw) ? raw : []

  for (let i = 0; i < items.length; i++) {
    const q = items[i] as Record<string, unknown>
    if (typeof q.id !== 'string' || !q.id) { errors.push({ index: i, message: '缺少 id' }); continue }
    if (typeof q.module !== 'string' || !q.module) { errors.push({ index: i, message: '缺少 module' }); continue }
    if (![1, 2, 3].includes(q.difficulty as number)) { errors.push({ index: i, message: 'difficulty 必须是 1/2/3' }); continue }
    if (typeof q.question !== 'string' || !(q.question as string).trim()) { errors.push({ index: i, message: '缺少 question' }); continue }
    if (typeof q.answer !== 'string' || !(q.answer as string).trim()) { errors.push({ index: i, message: '缺少 answer' }); continue }
    valid.push({
      id: q.id as string,
      module: q.module as string,
      difficulty: q.difficulty as number,
      question: q.question as string,
      answer: q.answer as string,
      tags: Array.isArray(q.tags) ? q.tags as string[] : [],
      source: q.source as string | undefined,
    })
  }
  return { valid, errors }
}

function deriveCategoryName(sourceName: string): string {
  const base = sourceName.replace(/\.(json|md)$/i, '').replace(/[-_]/g, ' ').trim()
  return base.replace(/\b\w/g, c => c.toUpperCase())
}

function loadAllBuiltinModules(force = false): LoadResult[] {
  const results: LoadResult[] = []
  const now = Date.now()

  for (const cat of BUILTIN_CATEGORIES) {
    for (const file of cat.files) {
      const filePath = `questions/${cat.dir}/${file}`
      const alreadyLoaded = !force && db.prepare('SELECT * FROM loaded_modules WHERE file_path = ?').get(filePath)

      try {
        const jsonPath = path.join(config.uploadDir, '..', 'public', filePath)
        const altPath = path.join(config.uploadDir, '../../public', filePath)
        const resolvedPath = fs.existsSync(jsonPath) ? jsonPath : altPath

        if (!fs.existsSync(resolvedPath)) {
          results.push({ file: filePath, loaded: 0, skipped: 0, errors: [{ index: -1, message: '文件不存在' }] })
          continue
        }

        const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8')) as unknown[]
        const questions = Array.isArray(raw) ? raw : ((raw as Record<string, unknown>).questions as unknown[]) ?? []

        const { valid, errors } = validateQuestions(questions)
        if (valid.length === 0) {
          results.push({ file: filePath, loaded: 0, skipped: questions.length, errors })
          continue
        }

        const insert = db.prepare(
          `INSERT OR REPLACE INTO questions (id, module, difficulty, question, answer, tags, source, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )

        const insertTxn = db.transaction(() => {
          for (const q of valid) {
            insert.run(q.id, q.module, q.difficulty, q.question, q.answer,
              JSON.stringify(q.tags ?? []), q.source ?? null, now, now)
          }
          if (!alreadyLoaded) {
            db.prepare('INSERT OR IGNORE INTO loaded_modules (file_path, created_at) VALUES (?, ?)').run(filePath, now)
          }
        })
        insertTxn()

        results.push({ file: filePath, loaded: valid.length, skipped: questions.length - valid.length, errors })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ file: filePath, loaded: 0, skipped: 0, errors: [{ index: -1, message: msg }] })
      }
    }
  }

  return results
}

// ─── Export All Data ───────────────────────────────

router.get('/export', (_req: Request, res: Response) => {
  const questions = db.prepare('SELECT * FROM questions ORDER BY id').all() as QuestionRow[]
  const studyRecords = db.prepare('SELECT * FROM study_records ORDER BY question_id').all() as StudyRecordRow[]
  const questionNotes = db.prepare('SELECT * FROM question_notes ORDER BY question_id').all() as QuestionNoteRow[]
  const qaAnnotations = db.prepare('SELECT * FROM question_answer_annotations ORDER BY id').all() as AnnotationRow[]
  const qaOverrides = db.prepare('SELECT * FROM question_answer_overrides ORDER BY question_id').all() as OverrideRow[]
  const qFlags = db.prepare('SELECT * FROM question_flags ORDER BY question_id').all() as FlagRow[]
  const mockInterviews = db.prepare('SELECT * FROM mock_interviews ORDER BY id').all() as MockInterviewRow[]
  const jdReports = db.prepare('SELECT * FROM jd_match_reports ORDER BY id').all() as JdMatchReportRow[]

  const customSourcesRows = db.prepare('SELECT name FROM custom_sources ORDER BY name').all() as { name: string }[]
  const customSourcesList = customSourcesRows.map(r => r.name)

  const cats = db.prepare('SELECT * FROM categories WHERE builtin = 0 ORDER BY name').all() as CategoryRow[]
  const catModules = db.prepare('SELECT * FROM category_modules ORDER BY category_name, module_name').all() as CategoryModuleRow[]
  const modMap: Record<string, string[]> = {}
  for (const m of catModules) {
    if (!modMap[m.category_name]) modMap[m.category_name] = []
    modMap[m.category_name].push(m.module_name)
  }
  const customCategories: Record<string, { name: string; modules: string[]; builtin: boolean; order: number }> = {}
  for (const c of cats) {
    customCategories[c.name] = { name: c.name, modules: modMap[c.name] ?? [], builtin: false, order: c.ord }
  }

  const formatQuestions = questions.map(q => ({
    id: q.id, module: q.module, difficulty: q.difficulty,
    question: q.question, answer: q.answer, tags: safeJson<string[]>(q.tags, []), source: q.source ?? undefined,
  }))
  const formatRecords = studyRecords.map(r => ({ questionId: r.question_id, status: r.status, lastUpdated: r.last_updated, reviewCount: r.review_count }))
  const formatNotes = questionNotes.map(n => ({ questionId: n.question_id, content: n.content, createdAt: n.created_at, updatedAt: n.updated_at }))
  const formatAnnotations = qaAnnotations.map(a => ({
    id: a.id, questionId: a.question_id, answerHash: a.answer_hash,
    kind: a.kind, color: a.color, highlightColor: a.highlight_color,
    start: a.start_pos, end: a.end_pos, selectedText: a.selected_text, note: a.note,
    createdAt: a.created_at, updatedAt: a.updated_at,
  }))
  const formatOverrides = qaOverrides.map(o => ({ questionId: o.question_id, content: o.content, createdAt: o.created_at, updatedAt: o.updated_at }))
  const formatFlags = qFlags.map(f => ({ questionId: f.question_id, starred: !!f.starred, createdAt: f.created_at, updatedAt: f.updated_at }))
  const formatMockInterviews = mockInterviews.map(rowToSession)
  const formatJdReports = jdReports.map(r => ({
    id: r.id, title: r.title, roleTitle: r.role_title, jdText: r.jd_text,
    resumeText: r.resume_text, resumeFileName: r.resume_file_name, markdown: r.markdown,
    model: r.model, createdAt: r.created_at, updatedAt: r.updated_at,
  }))

  const aiSessionsRows = db.prepare('SELECT * FROM ai_sessions ORDER BY question_id').all() as AiSessionRow[]
  const aiMessagesRows = db.prepare('SELECT * FROM ai_messages ORDER BY question_id, created_at').all() as AiMessageRow[]
  const msgMap: Record<string, { role: string; content: string }[]> = {}
  for (const m of aiMessagesRows) {
    if (!msgMap[m.question_id]) msgMap[m.question_id] = []
    msgMap[m.question_id].push({ role: m.role, content: m.content })
  }
  const aiSessions = aiSessionsRows.map(s => ({
    questionId: s.question_id,
    messages: msgMap[s.question_id] ?? [],
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }))

  const exportData: ExportData = {
    formatVersion: 8,
    exportedAt: new Date().toISOString(),
    questions: formatQuestions as unknown as Record<string, unknown>[],
    studyRecords: formatRecords as unknown as Record<string, unknown>[],
    questionNotes: formatNotes as unknown as Record<string, unknown>[],
    questionAnswerAnnotations: formatAnnotations as unknown as Record<string, unknown>[],
    questionAnswerOverrides: formatOverrides as unknown as Record<string, unknown>[],
    questionFlags: formatFlags as unknown as Record<string, unknown>[],
    mockInterviews: formatMockInterviews as unknown as Record<string, unknown>[],
    jdMatchReports: formatJdReports as unknown as Record<string, unknown>[],
    customSources: customSourcesList,
    customCategories: customCategories as unknown as Record<string, unknown>,
    aiSessions: aiSessions as unknown as Record<string, unknown>[],
  }

  res.json({ data: exportData })
})

// ─── Import Preview ─────────────────────────────

router.post('/import/preview', (req: Request, res: Response) => {
  const data = req.body as Record<string, unknown[] | undefined>
  const impact: ImportImpact = {
    questions: countImpact(data.questions),
    studyRecords: countImpact(data.studyRecords),
    questionNotes: countImpact(data.questionNotes),
    questionAnswerAnnotations: countImpact(data.questionAnswerAnnotations),
    questionAnswerOverrides: countImpact(data.questionAnswerOverrides),
    questionFlags: countImpact(data.questionFlags),
    aiSessions: countImpact(data.aiSessions),
    mockInterviews: countImpact(data.mockInterviews),
    jdMatchReports: countImpact(data.jdMatchReports),
  }

  res.json({ data: { ...data, impact } })
})

// ─── Import (full backup) ──────────────────────

router.post('/import', (req: Request, res: Response) => {
  const data = req.body as Record<string, unknown>
  const now = Date.now()

  const txn = db.transaction(() => {
    const qs = data.questions as Record<string, unknown>[] | undefined
    if (Array.isArray(qs)) {
      const insert = db.prepare(
        `INSERT OR REPLACE INTO questions (id, module, difficulty, question, answer, tags, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const q of qs) {
        insert.run(q.id, q.module, q.difficulty, q.question, q.answer,
          JSON.stringify((q.tags as string[]) ?? []), (q.source as string) ?? null, (q.createdAt as number) ?? now, now)
      }
    }

    const recs = data.studyRecords as Record<string, unknown>[] | undefined
    if (Array.isArray(recs)) {
      const insert = db.prepare(
        `INSERT OR REPLACE INTO study_records (question_id, status, last_updated, review_count, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      for (const r of recs) {
        insert.run(r.questionId, r.status, r.lastUpdated, r.reviewCount ?? 0, now)
      }
    }

    const notes = data.questionNotes as Record<string, unknown>[] | undefined
    if (Array.isArray(notes)) {
      const insert = db.prepare(
        `INSERT OR REPLACE INTO question_notes (question_id, content, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      for (const n of notes) {
        if ((n.content as string)?.trim()) {
          insert.run(n.questionId, n.content, (n.createdAt as number) ?? now, (n.updatedAt as number) ?? now)
        }
      }
    }

    const anns = data.questionAnswerAnnotations as Record<string, unknown>[] | undefined
    if (Array.isArray(anns)) {
      const insert = db.prepare(
        `INSERT OR REPLACE INTO question_answer_annotations
          (id, question_id, answer_hash, kind, color, highlight_color,
           start_pos, end_pos, selected_text, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const a of anns) {
        insert.run((a.id as string) ?? uuid(), a.questionId, a.answerHash, a.kind, a.color,
          (a.highlightColor as string) ?? null, a.start, a.end, a.selectedText, a.note,
          (a.createdAt as number) ?? now, now)
      }
    }

    const ovs = data.questionAnswerOverrides as Record<string, unknown>[] | undefined
    if (Array.isArray(ovs)) {
      const insert = db.prepare(
        `INSERT OR REPLACE INTO question_answer_overrides (question_id, content, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      for (const o of ovs) {
        if ((o.content as string)?.trim()) {
          insert.run(o.questionId, o.content, (o.createdAt as number) ?? now, now)
        }
      }
    }

    const fls = data.questionFlags as Record<string, unknown>[] | undefined
    if (Array.isArray(fls)) {
      const insert = db.prepare(
        `INSERT OR REPLACE INTO question_flags (question_id, starred, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      for (const f of fls) {
        insert.run(f.questionId, f.starred ? 1 : 0, (f.createdAt as number) ?? now, now)
      }
    }

    const ais = data.aiSessions as Record<string, unknown>[] | undefined
    if (Array.isArray(ais)) {
      for (const s of ais) {
        db.prepare(
          `INSERT OR REPLACE INTO ai_sessions (question_id, created_at, updated_at)
           VALUES (?, ?, ?)`,
        ).run(s.questionId, (s.createdAt as number) ?? now, (s.updatedAt as number) ?? now)
        db.prepare('DELETE FROM ai_messages WHERE question_id = ?').run(s.questionId)
        const msgs = s.messages as { role: string; content: string }[] | undefined
        if (Array.isArray(msgs)) {
          const insMsg = db.prepare('INSERT INTO ai_messages (id, question_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
          for (const m of msgs) {
            insMsg.run(uuid(), s.questionId, m.role, m.content, now)
          }
        }
      }
    }

    const mocks = data.mockInterviews as Record<string, unknown>[] | undefined
    if (Array.isArray(mocks)) {
      const insert = db.prepare(
        `INSERT OR REPLACE INTO mock_interviews
          (id, title, role_title, level, interview_type,
           duration_minutes, target_question_count, jd_text, resume_text, resume_file_name,
           plan, turns, status, question_index, follow_up_depth, model, report,
           started_at, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const s of mocks) {
        insert.run(s.id, s.title, s.roleTitle ?? '', s.level, s.interviewType,
          s.durationMinutes ?? 30, s.targetQuestionCount ?? 10,
          s.jdText ?? '', s.resumeText ?? '', s.resumeFileName ?? null,
          JSON.stringify(s.plan ?? null), JSON.stringify(s.turns ?? []),
          s.status ?? 'planning', s.questionIndex ?? 0, s.followUpDepth ?? 0, s.model ?? null,
          JSON.stringify(s.report ?? null), s.startedAt ?? null, s.completedAt ?? null,
          (s.createdAt as number) ?? now, now)
      }
    }

    const jds = data.jdMatchReports as Record<string, unknown>[] | undefined
    if (Array.isArray(jds)) {
      const insert = db.prepare(
        `INSERT OR REPLACE INTO jd_match_reports
          (id, title, role_title, jd_text, resume_text, resume_file_name, markdown, model, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const r of jds) {
        insert.run(r.id, r.title, r.roleTitle ?? '', r.jdText ?? '', r.resumeText ?? '',
          r.resumeFileName ?? null, r.markdown ?? '', r.model ?? null, (r.createdAt as number) ?? now, now)
      }
    }

    const ccats = data.customCategories as Record<string, { builtin?: boolean; order?: number; modules?: string[] }> | undefined
    if (ccats && typeof ccats === 'object') {
      for (const [name, entry] of Object.entries(ccats)) {
        if (entry.builtin) continue
        db.prepare('INSERT OR REPLACE INTO categories (name, builtin, ord, created_at, updated_at) VALUES (?, 0, ?, ?, ?)')
          .run(name, entry.order ?? 0, now, now)
        db.prepare('DELETE FROM category_modules WHERE category_name = ?').run(name)
        if (Array.isArray(entry.modules)) {
          const insMod = db.prepare('INSERT INTO category_modules (category_name, module_name) VALUES (?, ?)')
          for (const mod of entry.modules) {
            insMod.run(name, mod)
          }
        }
      }
    }

    const csources = data.customSources as string[] | undefined
    if (Array.isArray(csources)) {
      const insert = db.prepare('INSERT OR IGNORE INTO custom_sources (name, created_at) VALUES (?, ?)')
      for (const s of csources) {
        insert.run(s, now)
      }
    }
  })
  txn()

  res.json({ data: { ok: true } })
})

// ─── Import custom questions (user import) ──────

router.post('/import/custom-questions', (req: Request, res: Response) => {
  const body = req.body as { data: unknown[]; sourceName: string; categoryName?: string }
  const { data: rawData, sourceName, categoryName } = body
  if (!rawData || !sourceName) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: '缺少 data 或 sourceName' } })
  }

  const { valid, errors } = validateQuestions(rawData as unknown[])
  if (valid.length === 0) {
    return res.json({ data: { source: sourceName, loaded: 0, errors, warnings: [] as string[] } })
  }

  const warnings: string[] = []
  const now = Date.now()

  const txn = db.transaction(() => {
    for (const q of valid) {
      const stampedId = q.id.startsWith(`custom_${sourceName}_`) ? q.id : `custom_${sourceName}_${q.id}`
      const existing = db.prepare('SELECT id FROM questions WHERE id = ?').get(stampedId) as { id: string } | undefined
      if (existing) warnings.push(`题目 ID "${stampedId}" 已存在，将被覆盖`)

      db.prepare(
        `INSERT OR REPLACE INTO questions (id, module, difficulty, question, answer, tags, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(stampedId, q.module, q.difficulty, q.question, q.answer, JSON.stringify(q.tags ?? []), sourceName, now, now)
    }

    const uniqueModules = [...new Set(valid.map(q => q.module))]
    const resolvedCategory = (categoryName ?? deriveCategoryName(sourceName)).trim()

    const cat = db.prepare('SELECT * FROM categories WHERE name = ?').get(resolvedCategory) as CategoryRow | undefined
    if (!cat) {
      const allCats = db.prepare('SELECT COUNT(*) AS cnt FROM categories').get() as { cnt: number }
      db.prepare('INSERT INTO categories (name, builtin, ord, created_at, updated_at) VALUES (?, 0, ?, ?, ?)')
        .run(resolvedCategory, allCats.cnt, now, now)
    }
    for (const mod of uniqueModules) {
      db.prepare('INSERT OR IGNORE INTO category_modules (category_name, module_name) VALUES (?, ?)').run(resolvedCategory, mod)
    }

    db.prepare('INSERT OR IGNORE INTO custom_sources (name, created_at) VALUES (?, ?)').run(sourceName, now)
  })
  txn()

  res.json({ data: { source: sourceName, loaded: valid.length, errors, warnings } })
})

// ─── Built-in question loading ──────────────────

router.post('/questions/builtin/load', (req: Request, res: Response) => {
  const { force } = (req.body ?? {}) as { force?: boolean }
  const results = loadAllBuiltinModules(force)
  res.json({ data: results })
})

router.post('/questions/builtin/refresh', (_req: Request, res: Response) => {
  const current = db.prepare("SELECT value FROM meta WHERE key = 'builtin_questions_version'").get() as { value: string } | undefined
  const currentVersion = current ? safeJson<string>(current.value) : null
  const refreshed = currentVersion !== BUILTIN_QUESTIONS_VERSION

  if (refreshed) {
    loadAllBuiltinModules(true)
    db.prepare(
      `INSERT INTO meta (key, value, updated_at) VALUES ('builtin_questions_version', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).run(JSON.stringify(BUILTIN_QUESTIONS_VERSION), Date.now())
  }

  res.json({ data: { refreshed } })
})

router.post('/questions/builtin/migrate', (_req: Request, res: Response) => {
  const migrated = db.prepare("SELECT value FROM meta WHERE key = 'builtin_replacement_migration'").get() as { value: string } | undefined
  const already = migrated ? safeJson<string>(migrated.value) : null

  if (already === BUILTIN_QUESTIONS_VERSION) {
    return res.json({ data: createEmptyMigrationResult() })
  }

  db.prepare(
    `INSERT INTO meta (key, value, updated_at) VALUES ('builtin_replacement_migration', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(JSON.stringify(BUILTIN_QUESTIONS_VERSION), Date.now())

  res.json({ data: createEmptyMigrationResult() })
})

// POST /api/reset
router.post('/reset', (_req: Request, res: Response) => {
  const tables = [
    'questions', 'study_records', 'question_notes', 'question_note_images',
    'question_answer_annotations', 'question_answer_overrides', 'question_flags',
    'mock_interviews', 'jd_match_reports', 'categories', 'category_modules',
    'custom_sources', 'loaded_modules', 'ai_sessions', 'ai_messages',
    'user_streaks', 'user_settings', 'meta',
  ]

  const txn = db.transaction(() => {
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run()
    }
  })
  txn()

  res.json({ data: { ok: true } })
})

// ─── Row format helpers ────────────────────

function rowToSession(row: MockInterviewRow): Record<string, unknown> {
  return {
    id: row.id, title: row.title, roleTitle: row.role_title,
    level: row.level, interviewType: row.interview_type,
    durationMinutes: row.duration_minutes, targetQuestionCount: row.target_question_count,
    jdText: row.jd_text, resumeText: row.resume_text, resumeFileName: row.resume_file_name,
    plan: safeJson(row.plan), turns: safeJson(row.turns, []),
    status: row.status, questionIndex: row.question_index,
    followUpDepth: row.follow_up_depth, model: row.model,
    report: safeJson(row.report),
    startedAt: row.started_at, completedAt: row.completed_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

export default router
