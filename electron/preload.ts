import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  dbRead: () => ipcRenderer.invoke('db-read'),
  dbWrite: (data: Buffer) => ipcRenderer.invoke('db-write'),
  dbWriteSync: (data: ArrayBuffer) => ipcRenderer.send('db-write-sync', data),
  dbGetPath: () => ipcRenderer.invoke('db-get-path')
})
