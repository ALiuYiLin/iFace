import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import type { OverrideRow } from '../types.js'

const router = Router()

// GET /api/answer-overrides
router.get('/', (_req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM question_answer_overrides ORDER BY question_id').all() as OverrideRow[]
  res.json({ data })
})

// GET /api/answer-overrides/:questionId
router.get('/:questionId', (req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM question_answer_overrides WHERE question_id = ?').get(req.params.questionId) as OverrideRow | undefined
  res.json({ data: data ?? null })
})

// PUT /api/answer-overrides/:questionId
router.put('/:questionId', (req: Request, res: Response) => {
  const { questionId } = req.params
  const { content, createdAt } = req.body as { content: string; createdAt?: number }
  const trimmed = (content ?? '').trim()
  const now = Date.now()

  if (!trimmed) {
    db.prepare('DELETE FROM question_answer_overrides WHERE question_id = ?').run(questionId)
    return res.json({ data: null })
  }

  const existing = db.prepare('SELECT created_at FROM question_answer_overrides WHERE question_id = ?').get(questionId) as { created_at: number } | undefined

  db.prepare(
    `INSERT INTO question_answer_overrides (question_id, content, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
  ).run(questionId, content, existing?.created_at ?? createdAt ?? now, now)

  const data = db.prepare('SELECT * FROM question_answer_overrides WHERE question_id = ?').get(questionId) as OverrideRow
  res.json({ data })
})

// POST /api/answer-overrides/bulk
router.post('/bulk', (req: Request, res: Response) => {
  const { overrides } = req.body as { overrides: Record<string, unknown>[] }
  if (!Array.isArray(overrides)) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'overrides 必须是数组' } })
  }

  const upsert = db.prepare(
    `INSERT INTO question_answer_overrides (question_id, content, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
  )
  const now = Date.now()

  const txn = db.transaction(() => {
    for (const o of overrides) {
      const content = o.content as string | undefined
      const trimmed = (content ?? '').trim()
      if (!trimmed) continue
      const questionId = o.questionId as string
      const createdAt = (o.createdAt ?? o.created_at ?? now) as number
      upsert.run(questionId, content, createdAt, now)
    }
  })
  txn()

  res.json({ data: { count: overrides.length } })
})

// DELETE /api/answer-overrides/:questionId
router.delete('/:questionId', (req: Request, res: Response) => {
  db.prepare('DELETE FROM question_answer_overrides WHERE question_id = ?').run(req.params.questionId)
  res.json({ data: { deletedId: req.params.questionId } })
})

export default router
