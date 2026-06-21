import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getApiBaseUrl: (): Promise<string> => ipcRenderer.invoke('get-api-base-url'),
})
