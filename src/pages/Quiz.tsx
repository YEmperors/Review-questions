import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card, Button, Radio, Checkbox, Input, Tag, Typography, Space,
  Progress, Modal, Result, Divider, Tooltip, Badge
} from 'antd'
import {
  CheckCircleOutlined, CloseCircleOutlined,
  RightOutlined, SendOutlined, ClockCircleOutlined,
  BulbOutlined, RobotOutlined, TrophyOutlined,
  StarOutlined, StarFilled, LeftOutlined, KeyOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { Question, QuestionType, QuizMode, QuizResult } from '../types'
import { createQuizRecord, toggleFavorite, isFavorite } from '../db/repositories'
import { processSpacedRepetition, mapQuality } from '../services/spaced-repetition'
import { explainQuestionWithAI } from '../services/ai-service'
import { checkAnswer } from '../utils/answer-checker'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const typeLabels: Record<string, string> = {
  single: '单选题', multiple: '多选题', judge: '判断题',
  fill: '填空题', short_answer: '简答题', coding: '编程题'
}
const typeColors: Record<string, string> = {
  single: '#6366f1', multiple: '#8b5cf6', judge: '#06b6d4',
  fill: '#f59e0b', short_answer: '#22c55e', coding: '#ef4444'
}
const diffLabels: Record<number, { text: string; color: string; bg: string }> = {
  1: { text: '简单', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  2: { text: '中等', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  3: { text: '困难', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
}

const QuizPage: React.FC = () => {
  const navigate = useNavigate()

  const [mode, setMode] = useState<QuizMode>('practice')
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<(QuizResult | null)[]>([])
  const [userAnswer, setUserAnswer] = useState<string>('')
  const [showResult, setShowResult] = useState(false)
  const [startTime] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [aiExplanation, setAiExplanation] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [starred, setStarred] = useState(false)
  const questionStartRef = useRef(Date.now())

  // 提前声明，避免 useCallback 中 TDZ 引用错误
  // currentQuestion 会在每次渲染时从 questions[currentIndex] 派生
  const getCurrentQuestion = (qs: Question[], idx: number) => qs[idx]

  // 加载配置和题目
  useEffect(() => {
    try {
      const config = JSON.parse(sessionStorage.getItem('quiz_config') || '{}')
      const qs = JSON.parse(sessionStorage.getItem('quiz_questions') || '[]')
      setMode(config.mode || 'practice')
      setTimeLimit(config.timeLimit || null)
      setQuestions(qs)
      setResults(new Array(qs.length).fill(null))
    } catch {
      navigate('/quiz-setup')
    }
  }, [])

  // 计时器
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  const handleSubmit = useCallback(() => {
    const q = getCurrentQuestion(questions, currentIndex)
    if (!q || !userAnswer.trim()) return

    const ts = Math.floor((Date.now() - questionStartRef.current) / 1000)
    const answerResult = checkAnswer(q, userAnswer)

    let isCorrect = 0
    let isCorrectDisplay = false
    if (answerResult === 'correct') {
      isCorrect = 1
      isCorrectDisplay = true
    } else if (answerResult === 'pending') {
      isCorrect = 2
      isCorrectDisplay = false
    }

    const result: QuizResult = {
      question: q,
      userAnswer: userAnswer.trim(),
      isCorrect: isCorrectDisplay,
      timeSpent: ts
    }

    createQuizRecord({
      question_id: q.id,
      user_answer: userAnswer.trim(),
      is_correct: isCorrect,
      time_spent: ts,
      quiz_mode: mode
    })

    if (answerResult !== 'pending') {
      const quality = mapQuality(isCorrectDisplay, ts)
      processSpacedRepetition(q.id, quality)
    }

    setResults(prev => {
      const next = [...prev]
      next[currentIndex] = result
      return next
    })
    setShowResult(true)
  }, [questions, currentIndex, userAnswer, mode])

  const handleFinish = useCallback(() => {
    const q = getCurrentQuestion(questions, currentIndex)
    if (userAnswer.trim() && !showResult && q && !results[currentIndex]) {
      handleSubmit()
    }
    // We filter Boolean in case some questions were skipped
    sessionStorage.setItem('quiz_results', JSON.stringify(results.filter(Boolean)))
    navigate('/quiz-result')
  }, [handleSubmit, userAnswer, showResult, questions, currentIndex, results, navigate])

  // 时间到自动交卷
  useEffect(() => {
    if (timeLimit && elapsed >= timeLimit * 60 && mode === 'exam') {
      handleFinish()
    }
  }, [elapsed, timeLimit, mode, handleFinish])

  const handleJump = (idx: number) => {
    if (idx === currentIndex) return
    setCurrentIndex(idx)
    setUserAnswer(results[idx]?.userAnswer || '')
    setShowResult(!!results[idx])
    setAiExplanation('')
    questionStartRef.current = Date.now()
  }

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      handleFinish()
    } else {
      handleJump(currentIndex + 1)
    }
  }

  const handleQuit = () => {
    Modal.confirm({
      title: '确认退出',
      content: '退出后本次答题进度将丢失，确定要退出吗？',
      okText: '确认退出',
      cancelText: '继续答题',
      okButtonProps: { danger: true },
      onOk: () => navigate('/quiz-setup')
    })
  }

  const handleToggleStar = () => {
    if (!currentQuestion) return
    const newState = toggleFavorite(currentQuestion.id)
    setStarred(newState)
  }

  const handleAIExplain = async () => {
    if (!currentQuestion) return
    setAiLoading(true)
    try {
      const explanation = await explainQuestionWithAI(
        currentQuestion.content,
        currentQuestion.type,
        currentQuestion.answer,
        userAnswer
      )
      setAiExplanation(explanation)
    } catch (err: any) {
      setAiExplanation('AI 解析失败：' + err.message)
    }
    setAiLoading(false)
  }

  // 收藏状态
  useEffect(() => {
    const q = questions[currentIndex]
    if (q) {
      setStarred(isFavorite(q.id))
    }
  }, [questions, currentIndex])

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? Math.round((currentIndex / questions.length) * 100) : 0

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLInputElement
      const isInput = target?.tagName === 'INPUT' && !['radio', 'checkbox', 'button', 'submit'].includes(target.type)
      const isRadioOrCheckbox = target?.tagName === 'INPUT' && ['radio', 'checkbox'].includes(target.type)
      const isTextarea = target?.tagName === 'TEXTAREA'
      const isTyping = isInput || isTextarea

      if (showResult) {
        if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') {
          handleNext()
        }
        return
      }

      if (e.key === 'Escape') {
        handleQuit()
        return
      }

      // 星标快捷键 S
      if (e.key.toLowerCase() === 's' && !isTyping) {
        e.preventDefault()
        handleToggleStar()
      }

      // AI解释快捷键 E
      if (e.key.toLowerCase() === 'e' && !isTyping && showResult) {
        e.preventDefault()
        handleAIExplain()
      }

      // 方向键切换单选/判断题答案
      // 如果焦点在单选框本身上，放行给 Ant Design 处理，否则我们自己处理
      if (!isTyping && !isRadioOrCheckbox && currentQuestion && ['single', 'judge'].includes(currentQuestion.type) && !showResult) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault()
          const options = getOptions(currentQuestion)
          const currentIdx = userAnswer ? userAnswer.charCodeAt(0) - 65 : -1
          
          let newIdx = 0
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            newIdx = currentIdx < options.length - 1 ? currentIdx + 1 : 0
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            newIdx = currentIdx > 0 ? currentIdx - 1 : options.length - 1
          }
          setUserAnswer(String.fromCharCode(65 + newIdx))
        }
      }

      // 填空/简答题按下Enter自动聚焦输入框
      if (e.key === 'Enter' && !isTyping && currentQuestion && ['fill', 'short_answer', 'coding'].includes(currentQuestion.type) && !showResult) {
        e.preventDefault()
        document.getElementById('quiz-text-input')?.focus()
        return
      }

      // 提交答案
      if (e.key === 'Enter' && userAnswer.trim()) {
        // 在普通输入框按回车提交，在多行文本框按 Ctrl+Enter 提交
        if (!isTextarea || (isTextarea && (e.ctrlKey || e.metaKey))) {
          e.preventDefault()
          handleSubmit()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showResult, currentQuestion, userAnswer, handleSubmit, handleNext, handleQuit])

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (questions.length === 0) {
    return (
      <Result
        title="没有题目"
        subTitle="请先去题库添加题目"
        extra={<Button type="primary" onClick={() => navigate('/quiz-setup')}>返回设置</Button>}
      />
    )
  }

  const isFinished = currentIndex >= questions.length - 1 && !!results[currentIndex]
  const currentResult = showResult ? results[currentIndex] : null
  const answerStatus = currentResult
    ? (currentResult.isCorrect ? 'correct' : (checkAnswer(currentQuestion, currentResult.userAnswer) === 'pending' ? 'pending' : 'wrong'))
    : null

  const timeLimitRemaining = timeLimit ? timeLimit * 60 - elapsed : null
  const isTimeWarning = timeLimitRemaining !== null && timeLimitRemaining < 60

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* 顶部状态栏 */}
      <Card
        bordered={false}
        style={{
          marginBottom: 16,
          background: '#1e1e2e',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        bodyStyle={{ padding: '12px 20px' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Space size={12}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={handleQuit}
              style={{ color: '#94a3b8', padding: '4px 8px' }}
            >
              退出
            </Button>
            <Tag style={{
              background: `${typeColors[currentQuestion.type]}20`,
              border: `1px solid ${typeColors[currentQuestion.type]}40`,
              color: typeColors[currentQuestion.type],
              borderRadius: 6, padding: '2px 10px',
            }}>
              {typeLabels[currentQuestion.type]}
            </Tag>
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              {currentIndex + 1} / {questions.length}
            </Text>
          </Space>

          <Space size={16}>
            <Tooltip title={starred ? '取消收藏' : '收藏此题'}>
              <Button
                type="text"
                icon={starred ? <StarFilled style={{ color: '#f59e0b' }} /> : <StarOutlined />}
                onClick={handleToggleStar}
                style={{ color: '#94a3b8' }}
              />
            </Tooltip>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClockCircleOutlined style={{ color: isTimeWarning ? '#ef4444' : '#64748b' }} />
              <Text style={{
                color: isTimeWarning ? '#ef4444' : '#94a3b8',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 500,
              }}>
                {formatTime(elapsed)}
              </Text>
              {timeLimit && (
                <Text style={{ color: isTimeWarning ? '#ef4444' : '#64748b', fontSize: 12 }}>
                  / {formatTime(timeLimit * 60)}
                </Text>
              )}
            </div>
            <div style={{ width: 120 }}>
              <Progress
                percent={progress}
                size="small"
                strokeColor={{ from: '#6366f1', to: '#8b5cf6' }}
                trailColor="rgba(255,255,255,0.06)"
                showInfo={false}
              />
            </div>
          </Space>
        </div>
      </Card>

      {/* 题目卡片 */}
      <Card
        bordered={false}
        style={{
          marginBottom: 16,
          background: '#1e1e2e',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        bodyStyle={{ padding: '28px 32px' }}
      >
        {/* 题目内容 */}
        <div style={{
          fontSize: 16,
          fontWeight: 500,
          color: '#e2e8f0',
          lineHeight: 1.7,
          marginBottom: 28,
          whiteSpace: 'pre-wrap',
        }}>
          <span style={{ color: '#6366f1', fontWeight: 700, marginRight: 8 }}>
            {currentIndex + 1}.
          </span>
          {currentQuestion.content}
        </div>

        {/* 选项区域 */}
        {!showResult && (
          <div>
            {(currentQuestion.type === 'single' || currentQuestion.type === 'judge') && (
              <Radio.Group
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  {getOptions(currentQuestion).map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx)
                    const isSelected = userAnswer === letter
                    return (
                      <Radio
                        key={idx}
                        value={letter}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: `1px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                          background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                          transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          margin: 0,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 600,
                            color: isSelected ? '#fff' : '#94a3b8',
                            flexShrink: 0,
                            transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}>
                            {letter}
                          </span>
                          <span style={{ color: '#cbd5e1' }}>{opt}</span>
                        </span>
                      </Radio>
                    )
                  })}
                </Space>
              </Radio.Group>
            )}

            {currentQuestion.type === 'multiple' && (
              <Checkbox.Group
                value={userAnswer.split('').filter(Boolean)}
                onChange={vals => setUserAnswer(vals.sort().join(''))}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  {getOptions(currentQuestion).map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx)
                    const isChecked = userAnswer.includes(letter)
                    return (
                      <Checkbox
                        key={idx}
                        value={letter}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: `1px solid ${isChecked ? '#8b5cf6' : 'rgba(255,255,255,0.08)'}`,
                          background: isChecked ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)',
                          transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                          margin: 0,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: isChecked ? '#8b5cf6' : 'rgba(255,255,255,0.08)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 600,
                            color: isChecked ? '#fff' : '#94a3b8',
                            flexShrink: 0,
                            transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}>
                            {letter}
                          </span>
                          <span style={{ color: '#cbd5e1' }}>{opt}</span>
                        </span>
                      </Checkbox>
                    )
                  })}
                </Space>
              </Checkbox.Group>
            )}

            {(currentQuestion.type === 'fill' || currentQuestion.type === 'short_answer') && (
              <Input
                key={currentQuestion.id}
                id="quiz-text-input"
                autoFocus
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    handleSubmit()
                  }
                }}
                placeholder="请输入答案..."
                size="large"
                style={{
                  marginTop: 8,
                  borderRadius: 10,
                  background: '#252535',
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                }}
              />
            )}

            {currentQuestion.type === 'coding' && (
              <TextArea
                key={currentQuestion.id}
                id="quiz-text-input"
                autoFocus
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                placeholder="请编写代码..."
                rows={12}
                style={{
                  marginTop: 8,
                  borderRadius: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 13,
                  background: '#0d1117',
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                }}
              />
            )}

            <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <Text style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                <KeyOutlined />
                {currentQuestion.type === 'single' || currentQuestion.type === 'judge'
                  ? 'A/B/C/D 选择 · Enter 提交 · Esc 退出'
                  : 'Enter 提交 · Esc 退出'}
              </Text>
              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                disabled={!userAnswer.trim()}
                style={{
                  background: userAnswer.trim()
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : undefined,
                  border: 'none',
                  borderRadius: 10,
                  height: 44,
                  paddingInline: 28,
                  fontWeight: 600,
                  boxShadow: userAnswer.trim() ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                提交答案
              </Button>
            </div>
          </div>
        )}

        {/* 答题结果 */}
        {showResult && currentResult && (
          <div style={{ animation: 'fadeInUp 0.35s ease' }}>
            {/* 结果状态栏 */}
            <div style={{
              padding: '16px 20px',
              borderRadius: 12,
              background: answerStatus === 'correct'
                ? 'rgba(34,197,94,0.1)'
                : answerStatus === 'pending'
                ? 'rgba(245,158,11,0.1)'
                : 'rgba(239,68,68,0.1)',
              border: `1px solid ${
                answerStatus === 'correct' ? 'rgba(34,197,94,0.3)'
                : answerStatus === 'pending' ? 'rgba(245,158,11,0.3)'
                : 'rgba(239,68,68,0.3)'
              }`,
              marginBottom: 16,
            }}>
              <Space size={12} align="start">
                <span style={{ fontSize: 22 }}>
                  {answerStatus === 'correct' ? '✅' : answerStatus === 'pending' ? '⏳' : '❌'}
                </span>
                <div style={{ flex: 1 }}>
                  <Text strong style={{
                    fontSize: 15,
                    color: answerStatus === 'correct' ? '#22c55e' : answerStatus === 'pending' ? '#f59e0b' : '#ef4444'
                  }}>
                    {answerStatus === 'correct' ? '回答正确！' : answerStatus === 'pending' ? '待评阅（简答题/编程题）' : '回答错误'}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>
                    用时 {formatTime(currentResult.timeSpent)}
                  </Text>
                  <div style={{ marginTop: 10 }}>
                    <Text style={{ color: '#94a3b8' }}>正确答案：</Text>
                    <Text strong style={{
                      color: '#22c55e',
                      fontFamily: currentQuestion.type === 'coding' ? 'JetBrains Mono, monospace' : undefined,
                    }}>
                      {currentQuestion.answer}
                    </Text>
                  </div>
                  {currentQuestion.analysis && (
                    <div style={{
                      marginTop: 10,
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 8,
                    }}>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>📖 解析：</Text>
                      <Paragraph style={{ color: '#cbd5e1', fontSize: 13, marginTop: 4, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                        {currentQuestion.analysis}
                      </Paragraph>
                    </div>
                  )}
                </div>
              </Space>
            </div>

            {/* AI 解题 */}
            <div style={{ marginBottom: 20 }}>
              {!aiExplanation && (
                <Button
                  icon={<RobotOutlined />}
                  onClick={handleAIExplain}
                  loading={aiLoading}
                  style={{
                    borderRadius: 8,
                    background: 'rgba(99,102,241,0.1)',
                    borderColor: 'rgba(99,102,241,0.3)',
                    color: '#818cf8',
                  }}
                >
                  🤖 AI 详细解题
                </Button>
              )}
              {aiExplanation && (
                <Card
                  size="small"
                  title={<span style={{ color: '#818cf8', fontSize: 13 }}>🤖 AI 解题思路</span>}
                  bordered={false}
                  style={{
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 10,
                  }}
                >
                  <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#cbd5e1', margin: 0 }}>
                    {aiExplanation}
                  </Paragraph>
                </Card>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <Text style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                <KeyOutlined />
                {isFinished ? '' : 'Enter / → / N 下一题'}
              </Text>
              {isFinished ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<TrophyOutlined />}
                  onClick={handleFinish}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    border: 'none',
                    borderRadius: 10,
                    height: 44,
                    paddingInline: 28,
                    fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                  }}
                >
                  查看成绩
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  icon={<RightOutlined />}
                  onClick={handleNext}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none',
                    borderRadius: 10,
                    height: 44,
                    paddingInline: 28,
                    fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                  }}
                >
                  下一题
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 答题进度概览 */}
      <Card
        bordered={false}
        size="small"
        title={<span style={{ color: '#94a3b8', fontSize: 13 }}>答题进度</span>}
        style={{
          background: '#1e1e2e',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {questions.map((_, idx) => {
            const result = results[idx]
            const isCurrent = idx === currentIndex && !showResult

            let bg = 'rgba(255,255,255,0.05)'
            let color = '#64748b'
            let border = 'rgba(255,255,255,0.08)'

            if (isCurrent) {
              bg = 'rgba(99,102,241,0.2)'
              color = '#818cf8'
              border = '#6366f1'
            } else if (result) {
              const status = checkAnswer(result.question, result.userAnswer)
              if (status === 'correct') {
                bg = 'rgba(34,197,94,0.15)'
                color = '#22c55e'
                border = 'rgba(34,197,94,0.3)'
              } else if (status === 'pending') {
                bg = 'rgba(245,158,11,0.15)'
                color = '#f59e0b'
                border = 'rgba(245,158,11,0.3)'
              } else {
                bg = 'rgba(239,68,68,0.15)'
                color = '#ef4444'
                border = 'rgba(239,68,68,0.3)'
              }
            }

            return (
              <div
                key={idx}
                onClick={() => handleJump(idx)}
                style={{
                  width: 32, height: 32, borderRadius: 7,
                  background: bg,
                  border: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, color,
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
              >
                {idx + 1}
              </div>
            )
          })}
        </div>
      </Card>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ant-radio-wrapper:hover > span:first-child + span {
          color: #a5b4fc !important;
        }
        .ant-checkbox-wrapper:hover {
          background: rgba(139,92,246,0.06) !important;
        }
      `}</style>
    </div>
  )
}

function getOptions(question: Question): string[] {
  if (question.type === 'judge') {
    if (!question.options || question.options === '[]') return ['对', '错']
    try {
      const parsed = JSON.parse(question.options)
      return parsed.length > 0 ? parsed : ['对', '错']
    } catch {
      return ['对', '错']
    }
  }

  if (!question.options) return []
  try {
    return JSON.parse(question.options)
  } catch {
    return []
  }
}

export default QuizPage
