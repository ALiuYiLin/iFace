export {}

declare global {
  interface Window {
    electronAPI?: {
      getApiBaseUrl: () => Promise<string>
    }
  }
}
