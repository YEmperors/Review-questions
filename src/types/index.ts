// 题目类型枚举
export enum QuestionType {
  SINGLE = 'single',       // 单选题
  MULTIPLE = 'multiple',   // 多选题
  JUDGE = 'judge',         // 判断题
  FILL = 'fill',           // 填空题
  SHORT_ANSWER = 'short_answer' // 简答题
}



// 题目接口
export interface Question {
  id: number
  type: QuestionType
  content: string
  options: string | null       // JSON 字符串，选择题选项数组
  answer: string               // 正确答案
  analysis: string | null      // 解析
  difficulty?: number          // 难度
  knowledge_point?: string | null // 知识点
  tags: string | null          // JSON 字符串，标签数组
  bank_id: number
  created_at: string
}

// 题库分类接口
export interface QuestionBank {
  id: number
  name: string
  parent_id: number | null
  description: string | null
}

// 答题记录接口
export interface QuizRecord {
  id: number
  question_id: number
  user_answer: string
  is_correct: number
  time_spent: number           // 秒
  quiz_mode: string            // 'practice' | 'exam' | 'review'
  created_at: string
}

// 间隔重复调度接口
export interface SpacedRepetition {
  id: number
  question_id: number
  next_review: string         // ISO 日期
  ease_factor: number          // SM-2 ease factor
  interval: number            // 天
  repetitions: number
}

// AI 设置接口
export interface AISettings {
  id: number
  api_url: string
  api_key: string
  model_name: string
  temperature: number
}

// 刷题模式
export type QuizMode = 'practice' | 'exam' | 'review' | 'smart'

// 刷题配置
export interface QuizConfig {
  mode: QuizMode
  bankId?: number
  questionCount?: number
  timeLimit?: number           // 秒
  questionTypes?: QuestionType[]
}

// 答题结果
export interface QuizResult {
  question: Question
  userAnswer: string
  isCorrect: boolean
  timeSpent: number
}
