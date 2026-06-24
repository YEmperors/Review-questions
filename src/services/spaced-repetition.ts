import { upsertSpacedRepetition, getSpacedRepetition } from '../db/repositories'

/**
 * SM-2 间隔重复算法
 * 根据用户答题质量计算下次复习时间
 */
export function processSpacedRepetition(questionId: number, quality: number) {
  // quality: 0-5, 0=完全忘记, 5=完美记住
  quality = Math.max(0, Math.min(5, quality))

  const existing = getSpacedRepetition(questionId)
  let easeFactor = existing?.ease_factor ?? 2.5
  let interval = existing?.interval ?? 0
  let repetitions = existing?.repetitions ?? 0

  if (quality >= 3) {
    // 答对了
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions++
  } else {
    // 答错了，重新开始
    repetitions = 0
    interval = 1
  }

  // 更新 ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  easeFactor = Math.max(1.3, easeFactor)

  // 计算下次复习日期
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  upsertSpacedRepetition({
    question_id: questionId,
    next_review: nextReview.toISOString().slice(0, 10),
    ease_factor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions
  })

  return {
    nextReview: nextReview.toISOString().slice(0, 10),
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions
  }
}

/**
 * 根据答题情况映射 quality 值
 * isCorrect: 是否正确
 * timeSpent: 答题用时（秒）
 */
export function mapQuality(isCorrect: boolean, timeSpent: number): number {
  if (!isCorrect) {
    return timeSpent > 60 ? 0 : 1  // 错了且花了很久=完全忘记，错了但快=有点印象
  }
  if (timeSpent < 5) return 5       // 很快且正确=完美
  if (timeSpent < 15) return 4      // 较快=良好
  if (timeSpent < 30) return 3      // 一般=勉强通过
  return 2                          // 正确但很慢=有困难
}
