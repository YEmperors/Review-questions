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
    case QuestionType.SINGLE: {
      const cleanUa = ua.replace(/[^A-Z0-9]/g, '')
      const caLetterMatch = ca.match(/[A-Z]/)
      const cleanCa = caLetterMatch ? caLetterMatch[0] : ca.replace(/[^A-Z0-9]/g, '')
      return cleanUa === cleanCa || ua === ca ? 'correct' : 'wrong'
    }

    case QuestionType.JUDGE: {
      const trueValues = ['对', '正确', '是', 'TRUE', 'T', '✓', 'A']
      const falseValues = ['错', '错误', '否', 'FALSE', 'F', '✗', 'B']

      let uaText = ua
      if (ua === 'A' || ua === 'B') {
        try {
          const opts = JSON.parse(question.options || '[]')
          const idx = ua.charCodeAt(0) - 65
          if (opts[idx]) {
            uaText = String(opts[idx]).toUpperCase().trim()
          }
        } catch {}
      }

      const isUaTrue = trueValues.includes(uaText) || trueValues.includes(ua)
      const isCaTrue = trueValues.includes(ca)
      const isUaFalse = falseValues.includes(uaText) || falseValues.includes(ua)
      const isCaFalse = falseValues.includes(ca)

      if ((isUaTrue || isUaFalse) && (isCaTrue || isCaFalse)) {
        return (isUaTrue === isCaTrue) ? 'correct' : 'wrong'
      }

      return uaText === ca || ua === ca ? 'correct' : 'wrong'
    }

    case QuestionType.MULTIPLE: {
      // 多选题：排序无关，且去除可能存在的逗号、空格等分隔符
      const cleanUa = ua.replace(/[^A-Z0-9]/g, '').split('').sort().join('')
      const cleanCa = ca.replace(/[^A-Z0-9]/g, '').split('').sort().join('')
      return cleanUa === cleanCa ? 'correct' : 'wrong'
    }

    case QuestionType.FILL:
      // 填空题：支持多个答案用 | 分隔
      return ca.split('|').map(a => a.trim()).some(a => a.toUpperCase() === ua) ? 'correct' : 'wrong'

    case QuestionType.SHORT_ANSWER:
      // 简答题标记为"待评阅"，不自动判定正确/错误
      // 避免污染正确率统计
      return 'pending'

    default:
      return 'wrong'
  }
}
