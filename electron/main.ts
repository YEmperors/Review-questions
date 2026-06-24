import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import zlib from 'zlib'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '智能刷题',
    show: false, // 优化启动：等渲染完成后再显示，避免白屏闪烁
    backgroundColor: '#1e1e2e', // 设置为深色背景以匹配主题色
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 优化启动：内容准备就绪后再显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 开发环境加载 vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// IPC: 读写文件（用于数据库持久化）
const dbPath = path.join(app.getPath('userData'), 'smart-quiz.db')

ipcMain.handle('db-read', () => {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath)
      // Check for GZIP magic number (0x1f 0x8b)
      if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
        return zlib.gunzipSync(data)
      }
      return data
    }
    return null
  } catch (err) {
    console.error('Failed to read database:', err)
    return null
  }
})

ipcMain.handle('db-write', (_event, data: Buffer) => {
  try {
    const compressed = zlib.gzipSync(data)
    fs.writeFileSync(dbPath, compressed)
    return true
  } catch (err) {
    console.error('Failed to write database:', err)
    return false
  }
})

// 同步写入 — 用于 beforeunload 确保数据不丢失
ipcMain.on('db-write-sync', (_event, data: Buffer) => {
  try {
    const compressed = zlib.gzipSync(data)
    fs.writeFileSync(dbPath, compressed)
  } catch (err) {
    console.error('Failed to write database (sync):', err)
  }
})

ipcMain.handle('db-get-path', () => {
  return dbPath
})
