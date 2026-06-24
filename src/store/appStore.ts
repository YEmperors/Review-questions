import { create } from 'zustand'
import { Question, QuizResult, QuizMode } from '../types'
import { checkAnswer } from '../utils/answer-checker'

interface AppState {
  // 刷题状态
  quizMode: QuizMode
  quizQuestions: Question[]
  currentIndex: number
  quizResults: QuizResult[]
  isQuizzing: boolean
  startTime: number
  timeLimit: number | null

  // 操作
  startQuiz: (questions: Question[], mode: QuizMode, timeLimit?: number) => void
  submitAnswer: (answer: string, timeSpent: number) => void
  nextQuestion: () => void
  finishQuiz: () => void
  quitQuiz: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  quizMode: 'practice',
  quizQuestions: [],
  currentIndex: 0,
  quizResults: [],
  isQuizzing: false,
  startTime: 0,
  timeLimit: null,

  startQuiz: (questions, mode, timeLimit?) => {
    set({
      quizMode: mode,
      quizQuestions: questions,
      currentIndex: 0,
      quizResults: [],
      isQuizzing: true,
      startTime: Date.now(),
      timeLimit: timeLimit ?? null
    })
  },

  submitAnswer: (answer, timeSpent) => {
    const { quizQuestions, currentIndex } = get()
    const question = quizQuestions[currentIndex]
    if (!question) return

    const answerResult = checkAnswer(question, answer)
    const isCorrect = answerResult === 'correct'
    const result: QuizResult = { question, userAnswer: answer, isCorrect, timeSpent }

    set(state => ({
      quizResults: [...state.quizResults, result]
    }))
  },

  nextQuestion: () => {
    set(state => ({
      currentIndex: state.currentIndex + 1
    }))
  },

  finishQuiz: () => {
    set({ isQuizzing: false })
  },

  quitQuiz: () => {
    set({
      isQuizzing: false,
      quizQuestions: [],
      currentIndex: 0,
      quizResults: [],
      timeLimit: null
    })
  }
}))
