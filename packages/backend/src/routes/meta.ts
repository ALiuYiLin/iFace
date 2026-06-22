import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import type { MetaRow } from '../types.js'

const router = Router()

function safeJson(val: string | null): unknown {
  if (!val) return null
  try { return JSON.parse(val) } catch { return val }
}

// GET /api/meta/:key
router.get('/:key', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM meta WHERE key = ?').get(
    req.params.key,
  ) as MetaRow | undefined
  if (!row) {
    return res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'key 不存在' } })
  }
  res.json({ data: safeJson(row.value) })
})

// PUT /api/meta/:key
router.put('/:key', (req: Request, res: Response) => {
  const { key } = req.params
  const { value } = req.body as { value: unknown }
  const now = Date.now()

  db.prepare(
    `INSERT INTO meta (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, JSON.stringify(value), now)

  res.json({ data: { key, value } })
})

// DELETE /api/meta/:key
router.delete('/:key', (req: Request, res: Response) => {
  db.prepare('DELETE FROM meta WHERE key = ?').run(req.params.key)
  res.json({ data: { deletedKey: req.params.key } })
})

export default router
