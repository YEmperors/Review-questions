import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSmartQuestions } from './adaptive-difficulty'
import * as repositories from '../db/repositories'
import { Question } from '../types'

// Mock the repositories
vi.mock('../db/repositories', () => ({
  getQuestions: vi.fn(),
  getDueReviewQuestions: vi.fn(),
  getWrongQuestionsWithQuestions: vi.fn(),
  getKnowledgePointStats: vi.fn()
}))

describe('Adaptive Difficulty Algorithm - getSmartQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty array if no questions match filter', () => {
    vi.mocked(repositories.getQuestions).mockReturnValue([])
    const result = getSmartQuestions()
    expect(result).toEqual([])
  })

  it('should return exact number of questions requested', () => {
    const mockQuestions = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      content: `Q${i}`,
      knowledge_point: 'KP1',
      difficulty: 1,
      type: 'single',
      options: '',
      answer: ''
    } as Question))

    vi.mocked(repositories.getQuestions).mockReturnValue(mockQuestions)
    vi.mocked(repositories.getDueReviewQuestions).mockReturnValue([])
    vi.mocked(repositories.getWrongQuestionsWithQuestions).mockReturnValue([])
    vi.mocked(repositories.getKnowledgePointStats).mockReturnValue([])

    const result = getSmartQuestions(undefined, 5)
    expect(result.length).toBe(5)
  })

  it('should prioritize due review questions', () => {
    const mockQuestions = [
      { id: 1, content: 'Normal' },
      { id: 2, content: 'Due' },
      { id: 3, content: 'Normal 2' }
    ] as Question[]

    vi.mocked(repositories.getQuestions).mockReturnValue(mockQuestions)
    vi.mocked(repositories.getDueReviewQuestions).mockReturnValue([2]) // ID 2 is due
    vi.mocked(repositories.getWrongQuestionsWithQuestions).mockReturnValue([])
    vi.mocked(repositories.getKnowledgePointStats).mockReturnValue([])

    const result = getSmartQuestions(undefined, 1)
    expect(result[0].id).toBe(2)
  })

  it('should prioritize wrong questions and weak knowledge points over normal questions', () => {
    const mockQuestions = [
      { id: 1, content: 'Normal', knowledge_point: 'Strong' },
      { id: 2, content: 'Wrong', knowledge_point: 'Strong' },
      { id: 3, content: 'Weak KP', knowledge_point: 'Weak' }
    ] as Question[]

    vi.mocked(repositories.getQuestions).mockReturnValue(mockQuestions)
    vi.mocked(repositories.getDueReviewQuestions).mockReturnValue([])
    
    // ID 2 is a wrong question
    vi.mocked(repositories.getWrongQuestionsWithQuestions).mockReturnValue([{
      question_id: 2, user_answer: 'wrong', is_correct: 0, id: 1, time_spent: 0, quiz_mode: 'practice', created_at: '',
      question: mockQuestions[1]
    }])
    
    // 'Weak' KP has 50% success rate
    vi.mocked(repositories.getKnowledgePointStats).mockReturnValue([
      { knowledge_point: 'Strong', correct: 10, total: 10, rate: 100 },
      { knowledge_point: 'Weak', correct: 5, total: 10, rate: 50 }
    ])

    const result = getSmartQuestions(undefined, 2)
    const resultIds = result.map(q => q.id)
    
    // IDs 2 and 3 should be prioritized over ID 1
    expect(resultIds).toContain(2)
    expect(resultIds).toContain(3)
    expect(resultIds).not.toContain(1)
  })
})
