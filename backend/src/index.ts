import express from 'express'
import cors from 'cors'
import config from './config.js'
import routes from './routes/index.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const app = express()

app.use(cors({ origin: config.corsOrigins }))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/api', routes)
app.use('/files', express.static(config.uploadDir))

app.use(notFound)
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`[iFace Backend] Running on http://localhost:${config.port}`)
  console.log(`[iFace Backend] API base: http://localhost:${config.port}/api`)
})
