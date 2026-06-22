import { spawn, type ChildProcess } from 'child_process'
import { createServer } from 'net'

const MAX_RETRIES = 10
const SCAN_RANGE = 1000

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(port, () => {
      server.close(() => resolve(true))
    })
    server.on('error', () => resolve(false))
  })
}

/** Scan for a free port starting from `startPort`. */
export async function findFreePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + SCAN_RANGE; port++) {
    if (await isPortFree(port)) return port
  }
  throw new Error(`No free port found in range ${startPort}-${startPort + SCAN_RANGE}`)
}

/**
 * Launch the backend child process on the given port.
 * Resolves when the backend prints `{"status":"ready",...}` to stdout.
 */
export function startBackend(port: number, backendDist: string): Promise<{ proc: ChildProcess; port: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [backendDist, `--port=${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let started = false

    const stdoutBuf: string[] = []
    proc.stdout?.on('data', (data: Buffer) => {
      stdoutBuf.push(data.toString())
      // Try to parse each line as JSON — the ready message is a single line
      const lines = data.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const msg = JSON.parse(line.trim())
          if (msg.status === 'ready' && !started) {
            started = true
            resolve({ proc, port: msg.port })
          }
        } catch {
          // Non-JSON output (console.log) — ignore
        }
      }
    })

    proc.stderr?.on('data', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString().trim())
        if (msg.error === 'EADDRINUSE') {
          // Port conflict — let the caller retry
          proc.kill()
          return
        }
      } catch {
        // Non-JSON stderr — log for debugging
        console.error('[backend stderr]', data.toString().trim())
      }
    })

    proc.on('error', (err) => {
      if (!started) reject(err)
    })

    proc.on('exit', (code) => {
      if (!started) {
        reject(new Error(`Backend exited with code ${code} on port ${port}`))
      }
    })
  })
}

/** Start backend with automatic port conflict retry. */
export async function startBackendWithRetry(
  backendDist: string,
  startPort = 3000,
  maxRetries = MAX_RETRIES,
): Promise<{ proc: ChildProcess; port: number }> {
  let port = await findFreePort(startPort)
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await startBackend(port, backendDist)
    } catch {
      // Port in use or other startup failure — try next free port
      port = await findFreePort(port + 1)
    }
  }
  throw new Error(`Failed to start backend after ${maxRetries} retries`)
}
