import { Question, QuestionType } from '../types'

/**
 * 判断答案是否正确
 * 集中管理答题判对逻辑，避免多处重复实现
 */
export function checkAnswer(question: Question, userAnswer: string): 'correct' | 'wrong' | 'pending' {
  const ua = userAnswer.trim().toUpperCase()
  const ca = question.answer.trim().toUpperCase()

  if (!ua) return 'pending'

  switch (question.type) {
    case QuestionType.SINGLE:
    case QuestionType.JUDGE:
      return ua === ca ? 'correct' : 'wrong'

    case QuestionType.MULTIPLE:
      // 多选题：排序无关
      return ua.split('').sort().join('') === ca.split('').sort().join('') ? 'correct' : 'wrong'

    case QuestionType.FILL:
      // 填空题：支持多个答案用 | 分隔
      return ca.split('|').map(a => a.trim()).some(a => a.toUpperCase() === ua) ? 'correct' : 'wrong'

    case QuestionType.SHORT_ANSWER:
    case QuestionType.CODING:
      // 简答题和编程题标记为"待评阅"，不自动判定正确/错误
      // 避免污染正确率统计
      return 'pending'

    default:
      return 'wrong'
  }
}
