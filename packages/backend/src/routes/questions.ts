import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import type { QuestionRow, FlagRow, QuestionNoteRow, CountResult } from '../types.js'

const router = Router()

interface BuiltinCategory {
  category: string
  files: string[]
}

const BUILTIN_CATEGORIES: BuiltinCategory[] = [
  { category: '前端', files: [
    'frontend/js.json', 'frontend/react.json', 'frontend/vue.json', 'frontend/css.json',
    'frontend/typescript.json', 'frontend/network.json', 'frontend/performance.json',
    'frontend/algorithm.json', 'frontend/project.json',
  ] },
  { category: 'Golang', files: [
    'golang/basics.json', 'golang/concurrency.json', 'golang/memory.json',
    'golang/engineering.json', 'golang/web.json',
  ] },
  { category: 'AI Agent', files: [
    'ai-agent/llm.json', 'ai-agent/prompt.json', 'ai-agent/agent.json', 'ai-agent/rag.json',
    'ai-agent/tools.json', 'ai-agent/evaluation.json', 'ai-agent/engineering.json',
    'ai-agent/application.json',
  ] },
  { category: 'Java', files: [
    'java/basics.json', 'java/concurrency.json', 'java/jvm.json', 'java/spring.json',
    'java/network.json', 'java/mysql.json', 'java/redis.json',
  ] },
]

// ─── Helpers ─────────────────────────────────────────

function parseTags(raw: string | null): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) as string[] } catch { return [] }
}

function formatQuestion(q: QuestionRow) {
  return { ...q, tags: parseTags(q.tags) }
}

// GET /api/questions
router.get('/', (req: Request, res: Response) => {
  const { module: mod, difficulty, source, search, page = '1', pageSize = '100' } = req.query as Record<string, string | undefined>
  const conditions: string[] = []
  const params: unknown[] = []

  if (mod) { conditions.push('module = ?'); params.push(mod) }
  if (difficulty) { conditions.push('difficulty = ?'); params.push(Number(difficulty)) }
  if (source) { conditions.push('source = ?'); params.push(source) }
  if (search) {
    conditions.push('(question LIKE ? OR tags LIKE ? OR module LIKE ? OR source LIKE ?)')
    const q = `%${search}%`
    params.push(q, q, q, q)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const pageNum = Math.max(1, Number(page))
  const limit = Math.min(1000, Number(pageSize))
  const offset = (pageNum - 1) * limit

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM questions ${where}`).get(...params) as CountResult
  const data = db.prepare(`SELECT * FROM questions ${where} ORDER BY id LIMIT ? OFFSET ?`).all(...params, limit, offset) as QuestionRow[]

  res.json({ data: data.map(formatQuestion), total, page: pageNum, pageSize: limit })
})

// GET /api/questions/count
router.get('/count', (_req: Request, res: Response) => {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM questions').get() as CountResult
  res.json({ data: total })
})

// GET /api/questions/starred-ids
router.get('/starred-ids', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT question_id FROM question_flags WHERE starred = 1').all() as FlagRow[]
  res.json({ data: rows.map(r => r.question_id) })
})

// GET /api/questions/ids-with-content
router.get('/ids-with-content', (_req: Request, res: Response) => {
  const rows = db.prepare("SELECT question_id FROM question_notes WHERE TRIM(content) != ''").all() as QuestionNoteRow[]
  res.json({ data: rows.map(r => r.question_id) })
})

// GET /api/questions/module/:module
router.get('/module/:module', (req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM questions WHERE module = ? ORDER BY id').all(req.params.module) as QuestionRow[]
  res.json({ data: data.map(formatQuestion) })
})

// GET /api/questions/builtin-files
router.get('/builtin-files', (_req: Request, res: Response) => {
  res.json({ data: BUILTIN_CATEGORIES.flatMap(c => c.files) })
})

// GET /api/questions/:id
router.get('/:id', (req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as QuestionRow | undefined
  if (!data) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '题目不存在' } })
  res.json({ data: formatQuestion(data) })
})

// POST /api/questions/bulk
router.post('/bulk', (req: Request, res: Response) => {
  const { questions } = req.body as { questions: Record<string, unknown>[] }
  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'questions 必须是数组' } })
  }

  const insert = db.prepare(
    `INSERT OR REPLACE INTO questions (id, module, difficulty, question, answer, tags, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const now = Date.now()

  const txn = db.transaction(() => {
    for (const q of questions) {
      const tags = Array.isArray(q.tags) ? q.tags as string[] : []
      insert.run(
        q.id, q.module, q.difficulty, q.question, q.answer,
        JSON.stringify(tags), (q.source as string | null) ?? null,
        (q.createdAt as number) ?? (q.created_at as number) ?? now, now,
      )
    }
  })
  txn()

  res.json({ data: { count: questions.length } })
})

// DELETE /api/questions/source/:source
router.delete('/source/:source', (req: Request, res: Response) => {
  const { source } = req.params
  const txn = db.transaction(() => {
    const ids = (db.prepare('SELECT id FROM questions WHERE source = ?').all(source) as { id: string }[]).map(r => r.id)
    if (ids.length === 0) return 0

    const placeholders = ids.map(() => '?').join(',')
    db.prepare(`DELETE FROM question_flags WHERE question_id IN (${placeholders})`).run(...ids)
    db.prepare(`DELETE FROM question_answer_overrides WHERE question_id IN (${placeholders})`).run(...ids)
    db.prepare(`DELETE FROM question_notes WHERE question_id IN (${placeholders})`).run(...ids)
    db.prepare(`DELETE FROM study_records WHERE question_id IN (${placeholders})`).run(...ids)
    db.prepare(`DELETE FROM question_answer_annotations WHERE question_id IN (${placeholders})`).run(...ids)
    db.prepare(`DELETE FROM ai_messages WHERE question_id IN (${placeholders})`).run(...ids)
    db.prepare(`DELETE FROM ai_sessions WHERE question_id IN (${placeholders})`).run(...ids)
    db.prepare('DELETE FROM questions WHERE source = ?').run(source)
    db.prepare('DELETE FROM custom_sources WHERE name = ?').run(source)
    return ids.length
  })

  const deletedCount = txn()
  res.json({ data: { deletedCount, removedSource: source } })
})

// DELETE /api/questions/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const existing = db.prepare('SELECT id FROM questions WHERE id = ?').get(id) as { id: string } | undefined
  if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '题目不存在' } })

  const txn = db.transaction(() => {
    db.prepare('DELETE FROM question_flags WHERE question_id = ?').run(id)
    db.prepare('DELETE FROM question_answer_overrides WHERE question_id = ?').run(id)
    db.prepare('DELETE FROM question_notes WHERE question_id = ?').run(id)
    db.prepare('DELETE FROM study_records WHERE question_id = ?').run(id)
    db.prepare('DELETE FROM question_answer_annotations WHERE question_id = ?').run(id)
    db.prepare('DELETE FROM ai_messages WHERE question_id = ?').run(id)
    db.prepare('DELETE FROM ai_sessions WHERE question_id = ?').run(id)
    db.prepare('DELETE FROM questions WHERE id = ?').run(id)
  })
  txn()

  res.json({ data: { deletedId: id } })
})

export default router
