import { Router, type Request, type Response } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import path from 'node:path'
import fs from 'node:fs'
import config from '../config.js'
import multer from 'multer'
import type { QuestionNoteImageRow } from '../types.js'

const router = Router()

const noteImagesDir = path.join(config.uploadDir, 'note-images')
if (!fs.existsSync(noteImagesDir)) fs.mkdirSync(noteImagesDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, noteImagesDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    cb(null, `${uuid()}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

// GET /api/question-note-images/:questionId
router.get('/:questionId', (req: Request, res: Response) => {
  const data = db.prepare('SELECT * FROM question_note_images WHERE question_id = ? ORDER BY created_at')
    .all(req.params.questionId) as QuestionNoteImageRow[]
  res.json({ data })
})

// POST /api/question-note-images
router.post('/', upload.single('file'), (req: Request, res: Response) => {
  const { questionId, name, mimeType } = req.body as Record<string, string>

  if (req.file) {
    const id = uuid()
    const now = Date.now()
    const filePath = `note-images/${req.file.filename}`

    db.prepare(
      `INSERT INTO question_note_images (id, question_id, name, mime_type, size, file_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, questionId, req.file.originalname, req.file.mimetype, req.file.size, filePath, now, now)

    const data = db.prepare('SELECT * FROM question_note_images WHERE id = ?').get(id) as QuestionNoteImageRow
    return res.status(201).json({ data })
  }

  // Upload via JSON with base64 dataUrl
  const { id, dataUrl } = req.body as Record<string, string>
  if (!dataUrl) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: '缺少 file 或 dataUrl' } })
  }

  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!matches) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'dataUrl 格式无效' } })
  }

  const mime = mimeType ?? matches[1]
  const ext = mime.split('/')[1] ?? 'png'
  const fileName = `${id ?? uuid()}.${ext}`
  const filePath = `note-images/${fileName}`
  const buffer = Buffer.from(matches[2], 'base64')
  const now = Date.now()
  const noteId = id ?? uuid()

  fs.writeFileSync(path.join(noteImagesDir, fileName), buffer)

  db.prepare(
    `INSERT INTO question_note_images (id, question_id, name, mime_type, size, file_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(noteId, questionId, name ?? fileName, mime, buffer.length, filePath, now, now)

  const data = db.prepare('SELECT * FROM question_note_images WHERE id = ?').get(noteId) as QuestionNoteImageRow
  res.status(201).json({ data })
})

// POST /api/question-note-images/question/:questionId/cleanup
router.post('/question/:questionId/cleanup', (req: Request, res: Response) => {
  const { questionId } = req.params
  const { keepIds } = req.body as { keepIds?: string[] }
  const keep = new Set(keepIds ?? [])

  const all = db.prepare('SELECT * FROM question_note_images WHERE question_id = ?')
    .all(questionId) as QuestionNoteImageRow[]
  const toDelete = all.filter(img => !keep.has(img.id))

  const txn = db.transaction(() => {
    for (const img of toDelete) {
      const fullPath = path.join(config.uploadDir, img.file_path)
      try { fs.unlinkSync(fullPath) } catch { /* ignore */ }
      db.prepare('DELETE FROM question_note_images WHERE id = ?').run(img.id)
    }
  })
  txn()

  res.json({ data: { deletedCount: toDelete.length } })
})

// DELETE /api/question-note-images/question/:questionId
router.delete('/question/:questionId', (req: Request, res: Response) => {
  const { questionId } = req.params
  const images = db.prepare('SELECT * FROM question_note_images WHERE question_id = ?')
    .all(questionId) as QuestionNoteImageRow[]

  const txn = db.transaction(() => {
    for (const img of images) {
      const fullPath = path.join(config.uploadDir, img.file_path)
      try { fs.unlinkSync(fullPath) } catch { /* ignore */ }
      db.prepare('DELETE FROM question_note_images WHERE id = ?').run(img.id)
    }
  })
  txn()

  res.json({ data: { deletedCount: images.length } })
})

export default router
