import { Router, type Request, type Response } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import type { MockInterviewRow } from '../types.js'

const router = Router()

interface MockSessionResponse {
  id: string
  title: string
  roleTitle: string
  level: string
  interviewType: string
  durationMinutes: number
  targetQuestionCount: number
  jdText: string
  resumeText: string
  resumeFileName: string | null
  plan: unknown
  turns: unknown
  status: string
  questionIndex: number
  followUpDepth: number
  model: string | null
  report: unknown
  startedAt: number | null
  completedAt: number | null
  createdAt: number
  updatedAt: number
}

function safeJson(val: string | null, fallback: unknown = null): unknown {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

function rowToSession(row: MockInterviewRow): MockSessionResponse {
  return {
    id: row.id,
    title: row.title,
    roleTitle: row.role_title,
    level: row.level,
    interviewType: row.interview_type,
    durationMinutes: row.duration_minutes,
    targetQuestionCount: row.target_question_count,
    jdText: row.jd_text,
    resumeText: row.resume_text,
    resumeFileName: row.resume_file_name,
    plan: safeJson(row.plan),
    turns: safeJson(row.turns, []),
    status: row.status,
    questionIndex: row.question_index,
    followUpDepth: row.follow_up_depth,
    model: row.model,
    report: safeJson(row.report),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// GET /api/mock-interviews
router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM mock_interviews ORDER BY updated_at DESC').all() as MockInterviewRow[]
  const data = rows.map(rowToSession)
  res.json({ data })
})

// GET /api/mock-interviews/:id
router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM mock_interviews WHERE id = ?').get(req.params.id) as MockInterviewRow | undefined
  if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '会话不存在' } })
  res.json({ data: rowToSession(row) })
})

// PUT /api/mock-interviews/:id
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const body = req.body as Partial<MockSessionResponse> & { id?: string }
  const now = Date.now()

  const existing = db.prepare('SELECT * FROM mock_interviews WHERE id = ?').get(id) as MockInterviewRow | undefined

  db.prepare(
    `INSERT INTO mock_interviews (
      id, title, role_title, level, interview_type,
      duration_minutes, target_question_count, jd_text, resume_text, resume_file_name,
      plan, turns, status, question_index, follow_up_depth, model, report,
      started_at, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, role_title = excluded.role_title,
      level = excluded.level, interview_type = excluded.interview_type,
      duration_minutes = excluded.duration_minutes,
      target_question_count = excluded.target_question_count,
      jd_text = excluded.jd_text, resume_text = excluded.resume_text,
      resume_file_name = excluded.resume_file_name,
      plan = excluded.plan, turns = excluded.turns,
      status = excluded.status, question_index = excluded.question_index,
      follow_up_depth = excluded.follow_up_depth, model = excluded.model,
      report = excluded.report,
      started_at = excluded.started_at, completed_at = excluded.completed_at,
      updated_at = excluded.updated_at`,
  ).run(
    id, body.title ?? '', body.roleTitle ?? '', body.level ?? '', body.interviewType ?? '',
    body.durationMinutes ?? 30, body.targetQuestionCount ?? 10,
    body.jdText ?? '', body.resumeText ?? '', body.resumeFileName ?? null,
    JSON.stringify(body.plan ?? null), JSON.stringify(body.turns ?? []),
    body.status ?? 'planning', body.questionIndex ?? 0,
    body.followUpDepth ?? 0, body.model ?? null,
    JSON.stringify(body.report ?? null),
    body.startedAt ?? null, body.completedAt ?? null,
    existing?.created_at ?? body.createdAt ?? now, now,
  )

  const updated = db.prepare('SELECT * FROM mock_interviews WHERE id = ?').get(id) as MockInterviewRow
  res.json({ data: rowToSession(updated) })
})

// POST /api/mock-interviews/bulk
router.post('/bulk', (req: Request, res: Response) => {
  const { sessions } = req.body as { sessions: MockSessionResponse[] }
  if (!Array.isArray(sessions)) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'sessions 必须是数组' } })
  }

  const upsert = db.prepare(
    `INSERT INTO mock_interviews (
      id, title, role_title, level, interview_type,
      duration_minutes, target_question_count, jd_text, resume_text, resume_file_name,
      plan, turns, status, question_index, follow_up_depth, model, report,
      started_at, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, role_title = excluded.role_title,
      level = excluded.level, interview_type = excluded.interview_type,
      duration_minutes = excluded.duration_minutes,
      target_question_count = excluded.target_question_count,
      jd_text = excluded.jd_text, resume_text = excluded.resume_text,
      resume_file_name = excluded.resume_file_name,
      plan = excluded.plan, turns = excluded.turns,
      status = excluded.status, question_index = excluded.question_index,
      follow_up_depth = excluded.follow_up_depth, model = excluded.model,
      report = excluded.report,
      started_at = excluded.started_at, completed_at = excluded.completed_at,
      updated_at = excluded.updated_at`,
  )
  const now = Date.now()

  const txn = db.transaction(() => {
    for (const s of sessions) {
      const existing = db.prepare('SELECT created_at FROM mock_interviews WHERE id = ?').get(s.id) as { created_at: number } | undefined
      upsert.run(
        s.id, s.title, s.roleTitle ?? '', s.level, s.interviewType,
        s.durationMinutes ?? 30, s.targetQuestionCount ?? 10,
        s.jdText ?? '', s.resumeText ?? '', s.resumeFileName ?? null,
        JSON.stringify(s.plan ?? null), JSON.stringify(s.turns ?? []),
        s.status ?? 'planning', s.questionIndex ?? 0, s.followUpDepth ?? 0, s.model ?? null,
        JSON.stringify(s.report ?? null), s.startedAt ?? null, s.completedAt ?? null,
        existing?.created_at ?? s.createdAt ?? now, now,
      )
    }
  })
  txn()

  res.json({ data: { count: sessions.length } })
})

// DELETE /api/mock-interviews/:id
router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM mock_interviews WHERE id = ?').run(req.params.id)
  res.json({ data: { deletedId: req.params.id } })
})

// DELETE /api/mock-interviews (clear all)
router.delete('/', (_req: Request, res: Response) => {
  db.prepare('DELETE FROM mock_interviews').run()
  res.json({ data: { ok: true } })
})

export default router
