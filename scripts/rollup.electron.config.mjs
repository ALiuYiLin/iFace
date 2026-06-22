import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'

export default [
  {
    input: 'packages/main/src/main.ts',
    output: {
      file: 'dist-electron/main/main.js',
      format: 'esm',
      sourcemap: true,
    },
    external: ['electron', 'path', 'url'],
    plugins: [
      resolve({ preferBuiltins: true }),
      typescript({ tsconfig: 'tsconfig.main.json' }),
    ],
  },
  {
    input: 'packages/preload/src/preload.ts',
    output: {
      file: 'dist-electron/preload/preload.js',
      format: 'esm',
      sourcemap: true,
    },
    external: ['electron'],
    plugins: [
      resolve({ preferBuiltins: true }),
      typescript({ tsconfig: 'tsconfig.preload.json' }),
    ],
  },
]
