import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import type { StudyRecordRow } from '../types.js'

const router = Router()

// GET /api/study-records
router.get('/', (_req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM study_records ORDER BY question_id').all() as StudyRecordRow[]
  res.json({ data })
})

// GET /api/study-records/:questionId
router.get('/:questionId', (req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM study_records WHERE question_id = ?').get(req.params.questionId) as StudyRecordRow | undefined
  res.json({ data: data ?? null })
})

// PUT /api/study-records/:questionId
router.put('/:questionId', (req: Request, res: Response) => {
  const { questionId } = req.params
  const { status, reviewCount, lastUpdated } = req.body as { status: string; reviewCount?: number; lastUpdated?: number }
  const now = Date.now()

  db.prepare(
    `INSERT INTO study_records (question_id, status, last_updated, review_count, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET
       status = excluded.status, last_updated = excluded.last_updated, review_count = excluded.review_count`,
  ).run(questionId, status, lastUpdated ?? now, reviewCount ?? 0, now)

  const data = db.prepare('SELECT * FROM study_records WHERE question_id = ?').get(questionId) as StudyRecordRow
  res.json({ data })
})

// POST /api/study-records/bulk
router.post('/bulk', (req: Request, res: Response) => {
  const { records } = req.body as { records: Record<string, unknown>[] }
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'records 必须是数组' } })
  }

  const upsert = db.prepare(
    `INSERT INTO study_records (question_id, status, last_updated, review_count, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET
       status = excluded.status, last_updated = excluded.last_updated, review_count = excluded.review_count`,
  )
  const now = Date.now()

  const txn = db.transaction(() => {
    for (const r of records) {
      const questionId = (r.question_id ?? r.questionId) as string
      const status = r.status as string
      const lastUpdated = (r.last_updated ?? r.lastUpdated ?? now) as number
      const reviewCount = (r.review_count ?? r.reviewCount ?? 0) as number
      upsert.run(questionId, status, lastUpdated, reviewCount, now)
    }
  })
  txn()

  res.json({ data: { count: records.length } })
})

// DELETE /api/study-records/:questionId
router.delete('/:questionId', (req: Request, res: Response) => {
  db.prepare('DELETE FROM study_records WHERE question_id = ?').run(req.params.questionId)
  res.json({ data: { deletedId: req.params.questionId } })
})

// DELETE /api/study-records (clear all)
router.delete('/', (_req: Request, res: Response) => {
  db.prepare('DELETE FROM study_records').run()
  res.json({ data: { ok: true } })
})

export default router
