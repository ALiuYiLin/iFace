import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import type { FlagRow } from '../types.js'

const router = Router()

// GET /api/question-flags
router.get('/', (_req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM question_flags ORDER BY question_id').all() as FlagRow[]
  res.json({ data })
})

// GET /api/question-flags/:questionId
router.get('/:questionId', (req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM question_flags WHERE question_id = ?').get(req.params.questionId) as FlagRow | undefined
  res.json({ data: data ?? null })
})

// PUT /api/question-flags/:questionId/star
router.put('/:questionId/star', (req: Request, res: Response) => {
  const { questionId } = req.params
  const { starred } = req.body as { starred: boolean }
  const now = Date.now()

  const existing = db.prepare('SELECT created_at FROM question_flags WHERE question_id = ?').get(questionId) as { created_at: number } | undefined

  db.prepare(
    `INSERT INTO question_flags (question_id, starred, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET starred = excluded.starred, updated_at = excluded.updated_at`,
  ).run(questionId, starred ? 1 : 0, existing?.created_at ?? now, now)

  const data = db.prepare('SELECT * FROM question_flags WHERE question_id = ?').get(questionId) as FlagRow
  res.json({ data })
})

// POST /api/question-flags/bulk
router.post('/bulk', (req: Request, res: Response) => {
  const { flags } = req.body as { flags: Record<string, unknown>[] }
  if (!Array.isArray(flags)) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'flags 必须是数组' } })
  }

  const upsert = db.prepare(
    `INSERT INTO question_flags (question_id, starred, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET starred = excluded.starred, updated_at = excluded.updated_at`,
  )
  const now = Date.now()

  const txn = db.transaction(() => {
    for (const f of flags) {
      const questionId = f.questionId as string
      const starred = !!(f.starred as boolean | number)
      const createdAt = (f.createdAt ?? f.created_at ?? now) as number
      upsert.run(questionId, starred ? 1 : 0, createdAt, now)
    }
  })
  txn()

  res.json({ data: { count: flags.length } })
})

export default router
