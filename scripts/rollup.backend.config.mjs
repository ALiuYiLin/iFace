import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

export default {
  input: path.join(root, 'packages/backend/src/index.ts'),
  output: {
    file: path.join(root, 'packages/backend/dist/index.js'),
    format: 'esm',
    sourcemap: true,
  },
  external: [
    'express',
    'cors',
    'better-sqlite3',
    'multer',
    'uuid',
    /^node:/,
  ],
  plugins: [
    resolve({ preferBuiltins: true }),
    typescript({ tsconfig: path.join(root, 'tsconfig.backend.json') }),
  ],
}
