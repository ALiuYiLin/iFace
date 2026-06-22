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

const config: Config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  dbPath: process.env.DB_PATH ?? path.join(root, 'data', 'iface.db'),
  uploadDir: process.env.UPLOAD_DIR ?? path.join(root, 'uploads'),
  corsOrigins: process.env.CORS_ORIGINS ?? '*',
}

export default config
