import { Router, type Request, type Response } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import type { UserSettingRow, UserStreakRow } from '../types.js'

const router = Router()

function safeJson(val: string | null): unknown {
  if (!val) return null
  try { return JSON.parse(val) } catch { return val }
}

// GET /api/settings/:key
router.get('/:key', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM user_settings WHERE key = ?').get(
    req.params.key,
  ) as UserSettingRow | undefined
  res.json({ data: row ? safeJson(row.value) : null })
})

// PUT /api/settings/:key
router.put('/:key', (req: Request, res: Response) => {
  const { key } = req.params
  const value = (req.body as { value: unknown }).value
  db.prepare(
    `INSERT INTO user_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, JSON.stringify(value))
  res.json({ data: { key, value } })
})

// GET /api/streaks
router.get('/streaks', (_req: Request, res: Response) => {
  const data = db
    .prepare('SELECT * FROM user_streaks ORDER BY date DESC LIMIT 365')
    .all() as UserStreakRow[]
  res.json({ data })
})

// POST /api/streaks
router.post('/streaks', (req: Request, res: Response) => {
  const { date, questionsDone, currentStreak, bestStreak } = req.body as {
    date: string
    questionsDone?: number
    currentStreak?: number
    bestStreak?: number
  }
  const now = Date.now()

  db.prepare(
    `INSERT INTO user_streaks (id, date, questions_done, current_streak, best_streak, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       questions_done = excluded.questions_done,
       current_streak = excluded.current_streak,
       best_streak = excluded.best_streak,
       updated_at = excluded.updated_at`,
  ).run(uuid(), date, questionsDone ?? 1, currentStreak ?? 0, bestStreak ?? 0, now, now)

  const data = db
    .prepare('SELECT * FROM user_streaks WHERE date = ?')
    .get(date) as UserStreakRow
  res.json({ data })
})

export default router
