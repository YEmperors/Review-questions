import { getQuestions, getDueReviewQuestions, getKnowledgePointStats, getWrongQuestionsWithQuestions } from '../db/repositories'
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

  // 获取各种需要优先推荐的题目数据
  const dueIds = new Set(getDueReviewQuestions())
  
  const wrongRecords = getWrongQuestionsWithQuestions()
  const wrongIds = new Set(wrongRecords.map(r => r.question_id))
  
  const kpStats = getKnowledgePointStats()
  // 正确率低于 60% 的知识点视为薄弱点
  const weakKps = new Set(kpStats.filter(k => k.rate < 60).map(k => k.knowledge_point))

  // 给每道题打分
  const scored = allQuestions.map(q => {
    let score = Math.random() * 2 // 基础随机分 (0~2)，保证每次题库不完全相同
    
    // 如果是到期需要复习的题目，大幅增加权重
    if (dueIds.has(q.id)) {
      score += 15
    }
    
    // 如果是错题，增加权重
    if (wrongIds.has(q.id)) {
      score += 8
    }
    
    // 如果属于薄弱知识点，增加权重
    if (q.knowledge_point && weakKps.has(q.knowledge_point)) {
      score += 5
    }
    
    return { question: q, score }
  })

  // 按权重降序排序，取前 count 道
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map(s => s.question)
}
