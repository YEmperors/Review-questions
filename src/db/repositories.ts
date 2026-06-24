import { Question, QuestionBank, QuizRecord, SpacedRepetition, AISettings, QuestionType } from '../types'
import dbManager from './index'

/**
 * Helper: Execute SELECT and return array of objects
 */
function selectAll<T = any>(sql: string, params?: any[]): T[] {
  const db = dbManager.getDb()
  const stmt = db.prepare(sql)
  if (params && params.length > 0) {
    stmt.bind(params)
  }
  const results: T[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return results
}

/** Helper: Execute SELECT and return first row */
function selectOne<T = any>(sql: string, params?: any[]): T | undefined {
  const results = selectAll<T>(sql, params)
  return results[0]
}

// ==================== 题库 CRUD ====================

export function getQuestionBanks(parentId: number | null = null): QuestionBank[] {
  if (parentId === null) {
    return selectAll<QuestionBank>('SELECT * FROM question_banks ORDER BY name')
  }
  return selectAll<QuestionBank>('SELECT * FROM question_banks WHERE parent_id = ? ORDER BY name', [parentId])
}

export function createQuestionBank(name: string, parentId: number | null, description?: string): number {
  const db = dbManager.getDb()
  db.run('INSERT INTO question_banks (name, parent_id, description) VALUES (?, ?, ?)', [name, parentId, description || null])
  const row = selectOne<{ id: number }>('SELECT last_insert_rowid() as id')
  dbManager.markDirty()
  return row?.id ?? 0
}

export function updateQuestionBank(id: number, name: string, parentId: number | null, description?: string): void {
  const db = dbManager.getDb()
  db.run('UPDATE question_banks SET name = ?, parent_id = ?, description = ? WHERE id = ?', [name, parentId, description || null, id])
  dbManager.markDirty()
}

/**
 * 递归收集指定题库及其所有子孙题库的 ID
 */
function collectBankIds(rootId: number): number[] {
  const ids: number[] = [rootId]
  const children = selectAll<{ id: number }>('SELECT id FROM question_banks WHERE parent_id = ?', [rootId])
  for (const child of children) {
    ids.push(...collectBankIds(child.id))
  }
  return ids
}

/**
 * 删除题库（含递归删除所有子题库及其题目）
 */
export function deleteQuestionBank(id: number): void {
  const db = dbManager.getDb()
  // 收集该题库及所有子孙题库的 ID
  const bankIds = collectBankIds(id)
  // 批量删除所有相关题目（quiz_records / spaced_repetition / favorites 通过外键 CASCADE 自动清除）
  if (bankIds.length > 0) {
    const placeholders = bankIds.map(() => '?').join(',')
    db.run(`DELETE FROM questions WHERE bank_id IN (${placeholders})`, bankIds)
    // 从叶子到根依次删除，避免外键约束冲突
    for (let i = bankIds.length - 1; i >= 0; i--) {
      db.run('DELETE FROM question_banks WHERE id = ?', [bankIds[i]])
    }
  }
  dbManager.markDirty()
}

/**
 * 删除全部题库及所有题目，并重建默认题库
 */
export function deleteAllQuestionBanks(): void {
  const db = dbManager.getDb()
  // 删除全部题目（关联的 quiz_records / spaced_repetition / favorites 通过外键 CASCADE 自动清除）
  db.run('DELETE FROM questions')
  // 重置 questions 的自增序列，下次导入题目 id 从 1 开始（整洁一致）
  db.run("DELETE FROM sqlite_sequence WHERE name='questions'")
  // 删除全部题库
  db.run('DELETE FROM question_banks')
  // 重建默认题库，保证应用始终有可用题库
  db.run("INSERT INTO question_banks (id, name, parent_id, description) VALUES (1, '默认题库', NULL, '默认的题库分类')")
  dbManager.markDirty()
}

// ==================== 题目 CRUD ====================

export function getQuestions(filters?: {
  bankId?: number
  types?: QuestionType[]
  keyword?: string
}): Question[] {
  const conditions: string[] = []
  const params: any[] = []

  if (filters?.bankId !== undefined) {
    conditions.push('bank_id = ?')
    params.push(filters.bankId)
  }
  if (filters?.types && filters.types.length > 0) {
    const placeholders = filters.types.map(() => '?').join(',')
    conditions.push(`type IN (${placeholders})`)
    params.push(...filters.types)
  } else if (filters && 'types' in filters === false) {
    // 向后兼容旧的 type 单值筛选
    // （已废弃，保留以防万一）
  }

  if (filters?.keyword) {
    conditions.push('content LIKE ?')
    params.push(`%${filters.keyword}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return selectAll<Question>(`SELECT * FROM questions ${where} ORDER BY id DESC`, params)
}

/** 向后兼容的旧版 getQuestions（单 type 筛选） */
export function getQuestionsLegacy(filters?: {
  bankId?: number
  type?: QuestionType
  keyword?: string
}): Question[] {
  if (filters?.type) {
    return getQuestions({ ...filters, types: [filters.type] })
  }
  return getQuestions(filters as any)
}

export function getQuestionById(id: number): Question | undefined {
  return selectOne<Question>('SELECT * FROM questions WHERE id = ?', [id])
}

export function getQuestionsByIds(ids: number[]): Question[] {
  if (ids.length === 0) return []
  // 分批查询，每批最多 500 个 ID，避免 SQL 过长
  const BATCH_SIZE = 500
  const results: Question[] = []
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE)
    const placeholders = batch.map(() => '?').join(',')
    const rows = selectAll<Question>(`SELECT * FROM questions WHERE id IN (${placeholders})`, batch)
    results.push(...rows)
  }
  return results
}

export function createQuestion(q: Omit<Question, 'id' | 'created_at'>): number {
  const db = dbManager.getDb()
  db.run(
    'INSERT INTO questions (type, content, options, answer, analysis, tags, bank_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [q.type, q.content, q.options, q.answer, q.analysis, q.tags, q.bank_id]
  )
  const row = selectOne<{ id: number }>('SELECT last_insert_rowid() as id')
  dbManager.markDirty()
  return row?.id ?? 0
}

export function createQuestionsBatch(questions: Omit<Question, 'id' | 'created_at'>[]): number[] {
  const db = dbManager.getDb()
  const ids: number[] = []

  db.exec('BEGIN TRANSACTION')
  try {
    for (const q of questions) {
      db.run(
        'INSERT INTO questions (type, content, options, answer, analysis, tags, bank_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [q.type, q.content, q.options, q.answer, q.analysis, q.tags, q.bank_id]
      )
      const row = selectOne<{ id: number }>('SELECT last_insert_rowid() as id')
      if (row) ids.push(row.id)
    }
    db.exec('COMMIT')
    dbManager.markDirty()
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }

  return ids
}

export function updateQuestion(q: Question): void {
  const db = dbManager.getDb()
  db.run(
    'UPDATE questions SET type=?, content=?, options=?, answer=?, analysis=?, tags=?, bank_id=? WHERE id=?',
    [q.type, q.content, q.options, q.answer, q.analysis, q.tags, q.bank_id, q.id]
  )
  dbManager.markDirty()
}

export function deleteQuestion(id: number): void {
  const db = dbManager.getDb()
  db.run('DELETE FROM questions WHERE id = ?', [id])
  dbManager.markDirty()
}

export function deleteQuestionsBatch(ids: number[]): void {
  if (ids.length === 0) return
  const db = dbManager.getDb()
  const placeholders = ids.map(() => '?').join(',')
  db.run(`DELETE FROM questions WHERE id IN (${placeholders})`, ids)
  dbManager.markDirty()
}

export function getQuestionCount(bankId?: number): number {
  if (bankId !== undefined) {
    const row = selectOne<{ c: number }>('SELECT COUNT(*) as c FROM questions WHERE bank_id = ?', [bankId])
    // sql.js 返回的数值字段可能是字符串，需强制转换
    return Number(row?.c ?? 0)
  }
  const row = selectOne<{ c: number }>('SELECT COUNT(*) as c FROM questions')
  return Number(row?.c ?? 0)
}

/** 获取所有题库的题目数量，一次查询 */
export function getAllQuestionCounts(): Record<number, number> {
  const rows = selectAll<{ bank_id: number; c: number }>(
    'SELECT bank_id, COUNT(*) as c FROM questions GROUP BY bank_id'
  )
  const result: Record<number, number> = { 0: 0 } // 0 = 全部
  for (const r of rows) {
    // sql.js 返回的数值字段实际为字符串，必须用 Number() 转换
    // 否则 += 会变成字符串拼接，导致计数显示错误（如 "53" 而非 8）
    const bankId = Number(r.bank_id)
    const count = Number(r.c)
    result[bankId] = count
    result[0] += count
  }
  return result
}

// ==================== 知识点查询 ====================

export function getKnowledgePoints(bankId?: number): string[] {
  if (bankId !== undefined) {
    const rows = selectAll<{ knowledge_point: string }>('SELECT DISTINCT knowledge_point FROM questions WHERE bank_id = ? AND knowledge_point != "" ORDER BY knowledge_point', [bankId])
    return rows.map(r => r.knowledge_point)
  }
  const rows = selectAll<{ knowledge_point: string }>('SELECT DISTINCT knowledge_point FROM questions WHERE knowledge_point != "" ORDER BY knowledge_point')
  return rows.map(r => r.knowledge_point)
}

// ==================== 答题记录 ====================

export function createQuizRecord(record: Omit<QuizRecord, 'id' | 'created_at'>): void {
  const db = dbManager.getDb()
  db.run(
    'INSERT INTO quiz_records (question_id, user_answer, is_correct, time_spent, quiz_mode) VALUES (?, ?, ?, ?, ?)',
    [record.question_id, record.user_answer, record.is_correct, record.time_spent, record.quiz_mode]
  )
  dbManager.markDirty()
}

export function getQuizRecords(questionId?: number, limit?: number): QuizRecord[] {
  if (questionId !== undefined) {
    return selectAll<QuizRecord>('SELECT * FROM quiz_records WHERE question_id = ? ORDER BY created_at DESC', [questionId])
  }
  return selectAll<QuizRecord>('SELECT * FROM quiz_records ORDER BY created_at DESC LIMIT ?', [limit || 1000])
}

/** 获取所有错题（JOIN 查询，避免 N+1） */
export function getWrongQuestionsWithQuestions(knowledgePoint?: string): (QuizRecord & { question: Question })[] {
  let sql = `
    SELECT r.*, q.type as q_type, q.content as q_content, q.options as q_options,
           q.answer as q_answer, q.analysis as q_analysis, q.difficulty as q_difficulty,
           q.knowledge_point as q_knowledge_point, q.tags as q_tags, q.bank_id as q_bank_id,
           q.created_at as q_created_at
    FROM quiz_records r
    JOIN questions q ON r.question_id = q.id
    WHERE r.is_correct = 0
  `
  const params: any[] = []

  if (knowledgePoint) {
    sql += ' AND q.knowledge_point = ?'
    params.push(knowledgePoint)
  }

  sql += ' ORDER BY r.created_at DESC'

  const rows = selectAll<any>(sql, params)

  // 去重：同一道题只显示最新的错题记录
  const seen = new Set<number>()
  const unique: (QuizRecord & { question: Question })[] = []
  for (const r of rows) {
    if (!seen.has(r.question_id)) {
      seen.add(r.question_id)
      unique.push({
        id: r.id,
        question_id: r.question_id,
        user_answer: r.user_answer,
        is_correct: r.is_correct,
        time_spent: r.time_spent,
        quiz_mode: r.quiz_mode,
        created_at: r.created_at,
        question: {
          id: r.question_id,
          type: r.q_type,
          content: r.q_content,
          options: r.q_options,
          answer: r.q_answer,
          analysis: r.q_analysis,
          tags: r.q_tags,
          bank_id: r.q_bank_id,
          created_at: r.q_created_at
        }
      })
    }
  }

  return unique
}

export function getStats(): {
  totalQuestions: number
  answeredQuestions: number
  correctCount: number
  totalRecords: number
  todayCount: number
  todayCorrect: number
  streakDays: number
  pendingCount: number
} {
  const totalQ = selectOne<{ c: number }>('SELECT COUNT(*) as c FROM questions')
  const answeredQ = selectOne<{ c: number }>('SELECT COUNT(DISTINCT question_id) as c FROM quiz_records')
  const correctR = selectOne<{ c: number }>('SELECT COUNT(*) as c FROM quiz_records WHERE is_correct = 1')
  const totalR = selectOne<{ c: number }>('SELECT COUNT(*) as c FROM quiz_records')
  const todayR = selectOne<{ c: number }>("SELECT COUNT(*) as c FROM quiz_records WHERE date(created_at) = date('now', 'localtime')")
  const todayC = selectOne<{ c: number }>("SELECT COUNT(*) as c FROM quiz_records WHERE is_correct = 1 AND date(created_at) = date('now', 'localtime')")
  const pendingR = selectOne<{ c: number }>("SELECT COUNT(*) as c FROM quiz_records WHERE is_correct = 2")

  let streakDays = 0
  const daysWithActivity = selectAll<{ d: string }>(
    "SELECT DISTINCT date(created_at) as d FROM quiz_records ORDER BY d DESC"
  )
  if (daysWithActivity.length > 0) {
    const today = new Date().toISOString().slice(0, 10)
    const hasToday = daysWithActivity[0].d === today
    let checkDate = new Date()
    if (!hasToday) {
      checkDate.setDate(checkDate.getDate() - 1)
    }
    for (const day of daysWithActivity) {
      const expected = checkDate.toISOString().slice(0, 10)
      if (day.d === expected) {
        streakDays++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
  }

  return {
    totalQuestions: Number(totalQ?.c ?? 0),
    answeredQuestions: Number(answeredQ?.c ?? 0),
    correctCount: Number(correctR?.c ?? 0),
    totalRecords: Number(totalR?.c ?? 0),
    todayCount: Number(todayR?.c ?? 0),
    todayCorrect: Number(todayC?.c ?? 0),
    streakDays,
    pendingCount: pendingR?.c ?? 0
  }
}

export function getKnowledgePointStats(): { knowledge_point: string; total: number; correct: number; rate: number }[] {
  const rows = selectAll<{ knowledge_point: string; total: number; correct: number }>(`
    SELECT q.knowledge_point,
      COUNT(*) as total,
      SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) as correct
    FROM quiz_records r
    JOIN questions q ON r.question_id = q.id
    WHERE q.knowledge_point != ''
    GROUP BY q.knowledge_point
    ORDER BY q.knowledge_point
  `)

  return rows.map(r => ({
    knowledge_point: r.knowledge_point,
    total: r.total,
    correct: r.correct,
    rate: r.total > 0 ? Math.round(r.correct / r.total * 100) : 0
  }))
}

export function getDailyStats(days: number = 30): { date: string; count: number; correct: number }[] {
  const rows = selectAll<{ date: string; count: number; correct: number }>(`
    SELECT date(created_at) as date,
      COUNT(*) as count,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
    FROM quiz_records
    WHERE created_at >= datetime('now', 'localtime', ? || ' days')
    GROUP BY date(created_at)
    ORDER BY date(created_at)
  `, [`-${days}`])

  return rows.map(r => ({
    date: r.date,
    count: r.count,
    correct: r.correct
  }))
}

// ==================== 间隔重复 ====================

export function getSpacedRepetition(questionId: number): SpacedRepetition | undefined {
  return selectOne<SpacedRepetition>('SELECT * FROM spaced_repetition WHERE question_id = ?', [questionId])
}

export function upsertSpacedRepetition(sr: Omit<SpacedRepetition, 'id'>): void {
  const db = dbManager.getDb()
  const existing = selectOne<{ id: number }>('SELECT id FROM spaced_repetition WHERE question_id = ?', [sr.question_id])
  if (existing) {
    db.run(
      'UPDATE spaced_repetition SET next_review = ?, ease_factor = ?, interval = ?, repetitions = ? WHERE question_id = ?',
      [sr.next_review, sr.ease_factor, sr.interval, sr.repetitions, sr.question_id]
    )
  } else {
    db.run(
      'INSERT INTO spaced_repetition (question_id, next_review, ease_factor, interval, repetitions) VALUES (?, ?, ?, ?, ?)',
      [sr.question_id, sr.next_review, sr.ease_factor, sr.interval, sr.repetitions]
    )
  }
  dbManager.markDirty()
}

export function getDueReviewQuestions(): number[] {
  const today = new Date().toISOString().slice(0, 10)
  const rows = selectAll<{ question_id: number }>('SELECT question_id FROM spaced_repetition WHERE next_review <= ?', [today])
  return rows.map(r => r.question_id)
}

// ==================== 收藏夹 ====================

export function getFavorites(): number[] {
  const rows = selectAll<{ question_id: number }>('SELECT question_id FROM favorites ORDER BY created_at DESC')
  return rows.map(r => r.question_id)
}

export function toggleFavorite(questionId: number): boolean {
  const db = dbManager.getDb()
  const existing = selectOne<{ id: number }>('SELECT id FROM favorites WHERE question_id = ?', [questionId])
  if (existing) {
    db.run('DELETE FROM favorites WHERE question_id = ?', [questionId])
    dbManager.markDirty()
    return false // 取消收藏
  } else {
    db.run('INSERT INTO favorites (question_id) VALUES (?)', [questionId])
    dbManager.markDirty()
    return true // 已收藏
  }
}

export function isFavorite(questionId: number): boolean {
  const row = selectOne<{ id: number }>('SELECT id FROM favorites WHERE question_id = ?', [questionId])
  return !!row
}

// ==================== 学习目标 ====================

const DEFAULT_DAILY_GOAL = 20

export function getStudyGoal(date?: string): { date: string; target_count: number } {
  const targetDate = date || new Date().toISOString().slice(0, 10)
  const row = selectOne<{ date: string; target_count: number }>(
    'SELECT date, target_count FROM study_goals WHERE date = ?', [targetDate]
  )
  return row || { date: targetDate, target_count: DEFAULT_DAILY_GOAL }
}

export function setStudyGoal(targetCount: number): void {
  const db = dbManager.getDb()
  const today = new Date().toISOString().slice(0, 10)
  db.run('INSERT OR REPLACE INTO study_goals (date, target_count) VALUES (?, ?)', [today, targetCount])
  dbManager.markDirty()
}

// ==================== AI 设置 ====================

const DEFAULT_AI_SETTINGS: AISettings = {
  id: 1,
  api_url: 'https://api.openai.com/v1/chat/completions',
  api_key: '',
  model_name: 'gpt-3.5-turbo',
  temperature: 0.7
}

export function getAISettings(): AISettings {
  return selectOne<AISettings>('SELECT * FROM ai_settings WHERE id = 1') || { ...DEFAULT_AI_SETTINGS }
}

export function updateAISettings(settings: Omit<AISettings, 'id'>): void {
  const db = dbManager.getDb()
  db.run(
    'UPDATE ai_settings SET api_url = ?, api_key = ?, model_name = ?, temperature = ? WHERE id = 1',
    [settings.api_url, settings.api_key, settings.model_name, settings.temperature]
  )
  dbManager.markDirty()
}

// ==================== 数据导出 ====================

export function exportAllQuestions(): Question[] {
  return selectAll<Question>('SELECT * FROM questions ORDER BY bank_id, id')
}

export function exportAllQuizRecords(): any[] {
  return selectAll<any>(`
    SELECT r.*, q.content as question_content, q.knowledge_point, q.type as question_type, q.difficulty as question_difficulty
    FROM quiz_records r
    JOIN questions q ON r.question_id = q.id
    ORDER BY r.created_at DESC
  `)
}
