import initSqlJs, { Database } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS question_banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    description TEXT,
    FOREIGN KEY (parent_id) REFERENCES question_banks(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    options TEXT,
    answer TEXT NOT NULL,
    analysis TEXT,
    difficulty INTEGER NOT NULL DEFAULT 2,
    knowledge_point TEXT NOT NULL DEFAULT '',
    tags TEXT,
    bank_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (bank_id) REFERENCES question_banks(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    user_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    time_spent INTEGER NOT NULL DEFAULT 0,
    quiz_mode TEXT NOT NULL DEFAULT 'practice',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS spaced_repetition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL UNIQUE,
    next_review TEXT NOT NULL,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval INTEGER NOT NULL DEFAULT 0,
    repetitions INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    api_url TEXT NOT NULL DEFAULT 'https://api.deepseek.com/chat/completions',
    api_key TEXT NOT NULL DEFAULT '',
    model_name TEXT NOT NULL DEFAULT 'deepseek-chat',
    temperature REAL NOT NULL DEFAULT 0.7
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE(question_id)
  );

  CREATE TABLE IF NOT EXISTS study_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    target_count INTEGER NOT NULL DEFAULT 20
  );

  INSERT OR IGNORE INTO question_banks (id, name, parent_id, description) VALUES
    (1, '默认题库', NULL, '默认的题库分类');

  INSERT OR IGNORE INTO ai_settings (id) VALUES (1);

  CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions(bank_id);
  CREATE INDEX IF NOT EXISTS idx_questions_kp ON questions(knowledge_point);
  CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
  CREATE INDEX IF NOT EXISTS idx_quiz_records_question ON quiz_records(question_id);
  CREATE INDEX IF NOT EXISTS idx_quiz_records_created ON quiz_records(created_at);
  CREATE INDEX IF NOT EXISTS idx_favorites_question ON favorites(question_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_question ON favorites(question_id);
`

// ==================== 网页端 IndexedDB Fallback ====================
const DB_STORE_NAME = 'smart-quiz-db'
const DB_KEY = 'sqlite-data'

async function getWebDbData(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_STORE_NAME, 1)
    request.onupgradeneeded = (e: any) => {
      e.target.result.createObjectStore('store')
    }
    request.onsuccess = (e: any) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('store')) {
        resolve(null)
        return
      }
      const tx = db.transaction('store', 'readonly')
      const store = tx.objectStore('store')
      const getReq = store.get(DB_KEY)
      getReq.onsuccess = () => resolve(getReq.result || null)
      getReq.onerror = () => resolve(null)
    }
    request.onerror = () => resolve(null)
  })
}

async function saveWebDbData(data: Uint8Array): Promise<boolean> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_STORE_NAME, 1)
    request.onsuccess = (e: any) => {
      const db = e.target.result
      const tx = db.transaction('store', 'readwrite')
      const store = tx.objectStore('store')
      const putReq = store.put(data, DB_KEY)
      putReq.onsuccess = () => resolve(true)
      putReq.onerror = () => resolve(false)
    }
    request.onerror = () => resolve(false)
  })
}
// ==================================================================


class DatabaseManager {
  private db: Database | null = null
  private saveTimer: ReturnType<typeof setInterval> | null = null
  private pendingSave = false
  private saving = false

  async init(): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: () => wasmUrl
    })

    const electronAPI = (window as any).electronAPI
    let savedData: Uint8Array | null = null

    if (electronAPI) {
      const buffer = await electronAPI.dbRead()
      if (buffer) {
        savedData = new Uint8Array(
          buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        )
      }
    } else {
      // 纯网页端 Fallback
      savedData = await getWebDbData()
    }

    if (savedData) {
      this.db = new SQL.Database(savedData)
    } else {
      this.db = new SQL.Database()
    }

    this.db.run('PRAGMA foreign_keys = ON;')
    this.db.run(CREATE_TABLES_SQL)
    this.scheduleSave()
  }

  getDb(): Database {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  markDirty(): void {
    this.pendingSave = true
  }

  async saveNow(): Promise<boolean> {
    if (!this.db) return false
    if (this.saving) return false // 防止并发写入
    this.saving = true
    try {
      const data = this.db.export()
      const electronAPI = (window as any).electronAPI
      if (electronAPI) {
        const result = await electronAPI.dbWrite(Buffer.from(data))
        this.pendingSave = false
        return result === true
      } else {
        // 纯网页端 Fallback
        const result = await saveWebDbData(data)
        this.pendingSave = false
        return result
      }
    } catch (err) {
      console.error('Failed to save database:', err)
      return false
    } finally {
      this.saving = false
    }
  }

  /** 同步保存 — 用于 beforeunload 等无法 await 的场景 */
  saveNowSync(): void {
    if (!this.db || this.saving) return
    try {
      const data = this.db.export()
      const electronAPI = (window as any).electronAPI
      if (electronAPI && electronAPI.dbWriteSync) {
        electronAPI.dbWriteSync(data.buffer)
      } else {
        saveWebDbData(data)
      }
    } catch (err) {
      console.error('Failed to save database (sync):', err)
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
    }
    this.saveTimer = setInterval(async () => {
      if (this.pendingSave) {
        await this.saveNow()
      }
    }, 3000)
  }

  destroy(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }
    this.db?.close()
    this.db = null
  }
}

export const dbManager = new DatabaseManager()

export default dbManager
