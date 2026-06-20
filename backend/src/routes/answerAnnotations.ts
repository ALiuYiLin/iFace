import { Router, type Request, type Response } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import type { AnnotationRow } from '../types.js'

const router = Router()

// GET /api/answer-annotations
router.get('/', (_req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM question_answer_annotations ORDER BY created_at').all() as AnnotationRow[]
  res.json({ data })
})

// GET /api/answer-annotations/question/:questionId
router.get('/question/:questionId', (req: Request, res: Response) => {
  const data = db.prepare(
    'SELECT * FROM question_answer_annotations WHERE question_id = ? ORDER BY created_at',
  ).all(req.params.questionId) as AnnotationRow[]
  res.json({ data })
})

// PUT /api/answer-annotations/:id
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const body = req.body as {
    questionId: string; answerHash: string; kind: string; color: string
    highlightColor?: string | null; start: number; end: number
    selectedText: string; note: string; createdAt?: number
  }
  const now = Date.now()

  const existing = db.prepare('SELECT created_at FROM question_answer_annotations WHERE id = ?').get(id) as { created_at: number } | undefined

  db.prepare(
    `INSERT INTO question_answer_annotations
      (id, question_id, answer_hash, kind, color, highlight_color,
       start_pos, end_pos, selected_text, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       answer_hash = excluded.answer_hash, kind = excluded.kind, color = excluded.color,
       highlight_color = excluded.highlight_color, start_pos = excluded.start_pos,
       end_pos = excluded.end_pos, selected_text = excluded.selected_text,
       note = excluded.note, updated_at = excluded.updated_at`,
  ).run(
    id, body.questionId, body.answerHash, body.kind, body.color, body.highlightColor ?? null,
    body.start, body.end, body.selectedText, body.note,
    existing?.created_at ?? body.createdAt ?? now, now,
  )

  const data = db.prepare('SELECT * FROM question_answer_annotations WHERE id = ?').get(id) as AnnotationRow
  res.json({ data })
})

// POST /api/answer-annotations/bulk
router.post('/bulk', (req: Request, res: Response) => {
  const { annotations } = req.body as { annotations: Record<string, unknown>[] }
  if (!Array.isArray(annotations)) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'annotations 必须是数组' } })
  }

  const upsert = db.prepare(
    `INSERT INTO question_answer_annotations
      (id, question_id, answer_hash, kind, color, highlight_color,
       start_pos, end_pos, selected_text, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       answer_hash = excluded.answer_hash, kind = excluded.kind, color = excluded.color,
       highlight_color = excluded.highlight_color, start_pos = excluded.start_pos,
       end_pos = excluded.end_pos, selected_text = excluded.selected_text,
       note = excluded.note, updated_at = excluded.updated_at`,
  )
  const now = Date.now()

  const txn = db.transaction(() => {
    for (const a of annotations) {
      upsert.run(
        a.id ?? uuid(), a.questionId, a.answerHash, a.kind, a.color,
        (a.highlightColor as string | null) ?? (a.highlight_color as string | null) ?? null,
        a.start ?? a.start_pos, a.end ?? a.end_pos,
        (a.selectedText as string) ?? (a.selected_text as string) ?? '',
        a.note as string,
        (a.createdAt as number) ?? (a.created_at as number) ?? now, now,
      )
    }
  })
  txn()

  res.json({ data: { count: annotations.length } })
})

// DELETE /api/answer-annotations/:id
router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM question_answer_annotations WHERE id = ?').run(req.params.id)
  res.json({ data: { deletedId: req.params.id } })
})

// DELETE /api/answer-annotations/question/:questionId
router.delete('/question/:questionId', (req: Request, res: Response) => {
  db.prepare('DELETE FROM question_answer_annotations WHERE question_id = ?').run(req.params.questionId)
  res.json({ data: { deletedQuestionId: req.params.questionId } })
})

export default router
