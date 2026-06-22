import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

interface Config {
  port: number
  dbPath: string
  uploadDir: string
  corsOrigins: string
}

function parsePort(): number {
  const arg = process.argv.find(a => a.startsWith('--port='))
  if (arg) return parseInt(arg.split('=')[1], 10)
  if (process.env.PORT) return parseInt(process.env.PORT, 10)
  return 3000
}

const config: Config = {
  port: parsePort(),
  dbPath: process.env.DB_PATH ?? path.join(root, 'data', 'iface.db'),
  uploadDir: process.env.UPLOAD_DIR ?? path.join(root, 'uploads'),
  corsOrigins: process.env.CORS_ORIGINS ?? '*',
}

export default config
