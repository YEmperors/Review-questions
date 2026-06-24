import { getQuestions, getQuizRecords } from '../db/repositories'
import { Question, Difficulty, QuestionType } from '../types'

/**
 * 自适应难度算法
 * 根据用户近期正确率推荐合适的难度
 */
export function getRecommendedDifficulty(): Difficulty {
  const recentRecords = getQuizRecords(undefined, 50)
  if (recentRecords.length < 5) return Difficulty.MEDIUM

  const recent = recentRecords.slice(0, 20)
  const correctCount = recent.filter(r => r.is_correct === 1).length
  const rate = correctCount / recent.length

  if (rate >= 0.9) return Difficulty.HARD
  if (rate >= 0.7) return Difficulty.MEDIUM
  return Difficulty.EASY
}

/**
 * 智能选题
 * 根据用户历史表现，综合考虑难度、间隔重复和薄弱点来推荐题目
 */
export function getSmartQuestions(
  bankId?: number,
  count: number = 10,
  preferredTypes?: QuestionType[]
): Question[] {
  const allQuestions = getQuestions({
    bankId,
    types: preferredTypes
  })

  if (allQuestions.length === 0) return []

  // 获取各知识点的正确率
  const records = getQuizRecords()
  const kpStats: Record<string, { total: number; correct: number }> = {}
  for (const r of records) {
    const q = allQuestions.find(qq => qq.id === r.question_id)
    if (!q) continue
    if (!kpStats[q.knowledge_point]) {
      kpStats[q.knowledge_point] = { total: 0, correct: 0 }
    }
    kpStats[q.knowledge_point].total++
    if (r.is_correct === 1) kpStats[q.knowledge_point].correct++
  }

  // 为每道题计算推荐权重
  const scored = allQuestions.map(q => {
    let score = 0
    const stats = kpStats[q.knowledge_point]

    // 薄弱点优先：正确率越低权重越高
    if (stats && stats.total >= 3) {
      const rate = stats.correct / stats.total
      score += (1 - rate) * 3
    } else {
      score += 1
    }

    // 难度适配：推荐与当前水平匹配的难度
    const recommendedDiff = getRecommendedDifficulty()
    const diffDelta = Math.abs(q.difficulty - recommendedDiff)
    score += Math.max(0, (3 - diffDelta))

    // 随机扰动避免每次一样
    score += Math.random() * 0.5

    return { question: q, score }
  })

  // 按权重排序，取前 count 道
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map(s => s.question)
}
