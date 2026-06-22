import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

export default [
  {
    input: path.join(root, 'packages/main/src/main.ts'),
    output: {
      file: path.join(root, 'dist-electron/main/main.js'),
      format: 'esm',
      sourcemap: true,
    },
    external: ['electron', 'path', 'url'],
    plugins: [
      resolve({ preferBuiltins: true }),
      typescript({ tsconfig: path.join(root, 'tsconfig.main.json') }),
    ],
  },
  {
    input: path.join(root, 'packages/preload/src/preload.ts'),
    output: {
      file: path.join(root, 'dist-electron/preload/preload.js'),
      format: 'esm',
      sourcemap: true,
    },
    external: ['electron'],
    plugins: [
      resolve({ preferBuiltins: true }),
      typescript({ tsconfig: path.join(root, 'tsconfig.preload.json') }),
    ],
  },
]
