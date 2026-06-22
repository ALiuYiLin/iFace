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

const server = app.listen(config.port, () => {
  // JSON startup protocol — main process reads this from stdout
  process.stdout.write(JSON.stringify({ status: 'ready', port: config.port }) + '\n')
  console.log(`[iFace Backend] Running on http://localhost:${config.port}`)
  console.log(`[iFace Backend] API base: http://localhost:${config.port}/api`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    process.stderr.write(JSON.stringify({ error: 'EADDRINUSE', port: config.port }) + '\n')
    process.exit(1)
  }
  throw err
})

process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})
