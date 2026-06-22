import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { startBackendWithRetry } from './backend.js'
import type { ChildProcess } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isDev = !app.isPackaged

let backendProc: ChildProcess | null = null
let backendPort = 3000

function getApiBaseUrl(): string {
  return isDev ? '/api' : `http://localhost:${backendPort}/api`
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'iFace · 面试刷题助手',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

ipcMain.handle('get-api-base-url', () => getApiBaseUrl())

app.whenReady().then(async () => {
  if (isDev) {
    // In dev mode, backend dist is in the workspace packages directory
    const backendDist = path.join(__dirname, '../../packages/backend/dist/index.js')
    try {
      const result = await startBackendWithRetry(backendDist, 3000)
      backendProc = result.proc
      backendPort = result.port
      console.log(`[Main] Backend started on port ${backendPort}`)
    } catch (err) {
      console.error('[Main] Failed to start backend:', err)
      app.quit()
      return
    }
  }

  createWindow()
})

app.on('before-quit', () => {
  if (backendProc) {
    backendProc.kill('SIGTERM')
    backendProc = null
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
