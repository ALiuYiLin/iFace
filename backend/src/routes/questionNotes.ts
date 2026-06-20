import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import type { QuestionNoteRow } from '../types.js'

const router = Router()

// GET /api/question-notes
router.get('/', (_req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM question_notes ORDER BY question_id').all() as QuestionNoteRow[]
  res.json({ data })
})

// GET /api/question-notes/:questionId
router.get('/:questionId', (req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM question_notes WHERE question_id = ?').get(req.params.questionId) as QuestionNoteRow | undefined
  res.json({ data: data ?? null })
})

// PUT /api/question-notes/:questionId
router.put('/:questionId', (req: Request, res: Response) => {
  const { questionId } = req.params
  const { content, createdAt } = req.body as { content: string; createdAt?: number }
  const trimmed = (content ?? '').trim()
  const now = Date.now()

  if (!trimmed) {
    db.prepare('DELETE FROM question_notes WHERE question_id = ?').run(questionId)
    return res.json({ data: null })
  }

  const existing = db.prepare('SELECT created_at FROM question_notes WHERE question_id = ?').get(questionId) as { created_at: number } | undefined

  db.prepare(
    `INSERT INTO question_notes (question_id, content, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
  ).run(questionId, content, existing?.created_at ?? createdAt ?? now, now)

  const data = db.prepare('SELECT * FROM question_notes WHERE question_id = ?').get(questionId) as QuestionNoteRow
  res.json({ data })
})

// POST /api/question-notes/bulk
router.post('/bulk', (req: Request, res: Response) => {
  const { notes } = req.body as { notes: Record<string, unknown>[] }
  if (!Array.isArray(notes)) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'notes 必须是数组' } })
  }

  const upsert = db.prepare(
    `INSERT INTO question_notes (question_id, content, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
  )
  const now = Date.now()

  const txn = db.transaction(() => {
    for (const n of notes) {
      const content = n.content as string | undefined
      const trimmed = (content ?? '').trim()
      if (trimmed) {
        const questionId = (n.questionId ?? n.question_id) as string
        const createdAt = (n.createdAt ?? n.created_at ?? now) as number
        const updatedAt = (n.updatedAt ?? n.updated_at ?? now) as number
        upsert.run(questionId, content, createdAt, updatedAt)
      }
    }
  })
  txn()

  res.json({ data: { count: notes.length } })
})

// POST /api/question-notes/:questionId/append
router.post('/:questionId/append', (req: Request, res: Response) => {
  const { questionId } = req.params
  const { content } = req.body as { content: string }
  if (!content?.trim()) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'content 不能为空' } })
  }

  const now = Date.now()
  const existing = db.prepare('SELECT * FROM question_notes WHERE question_id = ?').get(questionId) as QuestionNoteRow | undefined

  const prevContent = existing?.content?.trim() ?? ''
  const nextContent = prevContent ? `${prevContent}\n\n${content.trim()}` : content.trim()
  const createdAt = existing?.created_at ?? now

  db.prepare(
    `INSERT INTO question_notes (question_id, content, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
  ).run(questionId, nextContent, createdAt, now)

  const data = db.prepare('SELECT * FROM question_notes WHERE question_id = ?').get(questionId) as QuestionNoteRow
  res.json({ data })
})

// DELETE /api/question-notes/:questionId
router.delete('/:questionId', (req: Request, res: Response) => {
  db.prepare('DELETE FROM question_notes WHERE question_id = ?').run(req.params.questionId)
  res.json({ data: { deletedId: req.params.questionId } })
})

export default router
