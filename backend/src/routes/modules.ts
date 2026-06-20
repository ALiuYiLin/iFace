import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import type { LoadedModuleRow, CustomSourceRow } from '../types.js'

const router = Router()

// GET /api/modules/loaded
router.get('/loaded', (_req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT file_path FROM loaded_modules ORDER BY file_path')
    .all() as LoadedModuleRow[]
  res.json({ data: rows.map((r) => r.file_path) })
})

// POST /api/modules/loaded
router.post('/loaded', (req: Request, res: Response) => {
  const { file } = req.body as { file: string }
  if (!file) {
    return res
      .status(400)
      .json({ error: { code: 'INVALID_PARAM', message: 'file 不能为空' } })
  }
  const now = Date.now()
  db.prepare(
    'INSERT OR IGNORE INTO loaded_modules (file_path, created_at) VALUES (?, ?)',
  ).run(file, now)
  res.json({ data: { file } })
})

// GET /api/modules/active
router.get('/active', (_req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT DISTINCT module FROM questions ORDER BY module')
    .all() as { module: string }[]
  res.json({ data: rows.map((r) => r.module) })
})

// GET /api/sources/custom
router.get('/custom', (_req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT name FROM custom_sources ORDER BY name')
    .all() as CustomSourceRow[]
  res.json({ data: rows.map((r) => r.name) })
})

// POST /api/sources/custom
router.post('/custom', (req: Request, res: Response) => {
  const { source } = req.body as { source: string }
  if (!source) {
    return res
      .status(400)
      .json({ error: { code: 'INVALID_PARAM', message: 'source 不能为空' } })
  }
  const now = Date.now()
  db.prepare(
    'INSERT OR IGNORE INTO custom_sources (name, created_at) VALUES (?, ?)',
  ).run(source, now)
  res.json({ data: { source } })
})

// DELETE /api/sources/custom/:source
router.delete('/custom/:source', (req: Request, res: Response) => {
  db.prepare('DELETE FROM custom_sources WHERE name = ?').run(req.params.source)
  res.json({ data: { deletedSource: req.params.source } })
})

export default router
