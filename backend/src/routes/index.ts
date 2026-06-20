import { Router, type Request, type Response } from 'express'
import questionsRouter from './questions.js'
import studyRecordsRouter from './studyRecords.js'
import questionNotesRouter from './questionNotes.js'
import noteImagesRouter from './noteImages.js'
import answerAnnotationsRouter from './answerAnnotations.js'
import answerOverridesRouter from './answerOverrides.js'
import questionFlagsRouter from './questionFlags.js'
import mockInterviewsRouter from './mockInterviews.js'
import jdMatchReportsRouter from './jdMatchReports.js'
import categoriesRouter from './categories.js'
import metaRouter from './meta.js'
import modulesRouter from './modules.js'
import importExportRouter from './importExport.js'
import settingsRouter from './settings.js'
import aiRouter from './ai.js'

const router = Router()

router.use('/questions', questionsRouter)
router.use('/study-records', studyRecordsRouter)
router.use('/question-notes', questionNotesRouter)
router.use('/question-note-images', noteImagesRouter)
router.use('/answer-annotations', answerAnnotationsRouter)
router.use('/answer-overrides', answerOverridesRouter)
router.use('/question-flags', questionFlagsRouter)
router.use('/mock-interviews', mockInterviewsRouter)
router.use('/jd-match-reports', jdMatchReportsRouter)
router.use('/categories', categoriesRouter)
router.use('/meta', metaRouter)
router.use('/modules', modulesRouter)
router.use('/sources', modulesRouter)
router.use('/settings', settingsRouter)
router.use('/streaks', settingsRouter)

// Import / Export / Builtin / Reset
router.use('', importExportRouter)

// AI
router.use('/ai', aiRouter)

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

export default router
