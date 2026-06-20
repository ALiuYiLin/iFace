import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import type { JdMatchReportRow } from '../types.js'

const router = Router()

interface JdReportResponse {
  id: string
  title: string
  roleTitle: string
  jdText: string
  resumeText: string
  resumeFileName: string | null
  markdown: string
  model: string | null
  createdAt: number
  updatedAt: number
}

function rowToReport(row: JdMatchReportRow): JdReportResponse {
  return {
    id: row.id,
    title: row.title,
    roleTitle: row.role_title,
    jdText: row.jd_text,
    resumeText: row.resume_text,
    resumeFileName: row.resume_file_name,
    markdown: row.markdown,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// GET /api/jd-match-reports
router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM jd_match_reports ORDER BY updated_at DESC').all() as JdMatchReportRow[]
  const data = rows.map(rowToReport)
  res.json({ data })
})

// PUT /api/jd-match-reports/:id
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const body = req.body as Partial<JdReportResponse>
  const now = Date.now()

  const existing = db.prepare('SELECT created_at FROM jd_match_reports WHERE id = ?').get(id) as { created_at: number } | undefined

  db.prepare(
    `INSERT INTO jd_match_reports
      (id, title, role_title, jd_text, resume_text, resume_file_name, markdown, model, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, role_title = excluded.role_title,
       jd_text = excluded.jd_text, resume_text = excluded.resume_text,
       resume_file_name = excluded.resume_file_name, markdown = excluded.markdown,
       model = excluded.model, updated_at = excluded.updated_at`,
  ).run(
    id, body.title, body.roleTitle ?? '', body.jdText ?? '', body.resumeText ?? '',
    body.resumeFileName ?? null, body.markdown ?? '', body.model ?? null,
    existing?.created_at ?? body.createdAt ?? now, now,
  )

  const data = db.prepare('SELECT * FROM jd_match_reports WHERE id = ?').get(id) as JdMatchReportRow
  res.json({ data: rowToReport(data) })
})

// POST /api/jd-match-reports/bulk
router.post('/bulk', (req: Request, res: Response) => {
  const { reports } = req.body as { reports: Record<string, unknown>[] }
  if (!Array.isArray(reports)) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'reports 必须是数组' } })
  }

  const upsert = db.prepare(
    `INSERT INTO jd_match_reports
      (id, title, role_title, jd_text, resume_text, resume_file_name, markdown, model, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, role_title = excluded.role_title,
       jd_text = excluded.jd_text, resume_text = excluded.resume_text,
       resume_file_name = excluded.resume_file_name, markdown = excluded.markdown,
       model = excluded.model, updated_at = excluded.updated_at`,
  )
  const now = Date.now()

  const txn = db.transaction(() => {
    for (const r of reports) {
      const id = r.id as string
      const title = r.title as string
      const roleTitle = (r.roleTitle ?? r.role_title ?? '') as string
      const jdText = (r.jdText ?? r.jd_text ?? '') as string
      const resumeText = (r.resumeText ?? r.resume_text ?? '') as string
      const resumeFileName = (r.resumeFileName ?? r.resume_file_name ?? null) as string | null
      const markdown = (r.markdown ?? '') as string
      const model = (r.model ?? null) as string | null
      const createdAt = (r.createdAt ?? r.created_at ?? now) as number
      const existing = db.prepare('SELECT created_at FROM jd_match_reports WHERE id = ?').get(id) as { created_at: number } | undefined
      upsert.run(id, title, roleTitle, jdText, resumeText, resumeFileName, markdown, model,
        existing?.created_at ?? createdAt, now)
    }
  })
  txn()

  res.json({ data: { count: reports.length } })
})

// DELETE /api/jd-match-reports/:id
router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM jd_match_reports WHERE id = ?').run(req.params.id)
  res.json({ data: { deletedId: req.params.id } })
})

// DELETE /api/jd-match-reports (clear all)
router.delete('/', (_req: Request, res: Response) => {
  db.prepare('DELETE FROM jd_match_reports').run()
  res.json({ data: { ok: true } })
})

export default router
