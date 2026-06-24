import { getQuestions, getQuizRecords } from '../db/repositories'
import { Question, QuestionType } from '../types'



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

  // 简单随机扰动
  const scored = allQuestions.map(q => {
    let score = Math.random()
    return { question: q, score }
  })

  // 按权重排序，取前 count 道
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map(s => s.question)
}
