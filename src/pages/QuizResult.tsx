import React, { useState, useEffect } from 'react'
import {
  Card, Button, Typography, Space, Tag, Empty, Row, Col, Statistic,
  Progress, List, Modal
} from 'antd'
import {
  CheckCircleOutlined, CloseCircleOutlined, BulbOutlined,
  TrophyOutlined, ReloadOutlined, HomeOutlined, EditOutlined,
  ClockCircleOutlined, StarOutlined, StarFilled, FireOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, Legend
} from 'recharts'
import { QuizResult, Question } from '../types'
import { checkAnswer } from '../utils/answer-checker'
import { toggleFavorite, isFavorite } from '../db/repositories'

const { Title, Text, Paragraph } = Typography

const typeLabels: Record<string, string> = {
  single: '单选题', multiple: '多选题', judge: '判断题',
  fill: '填空题', short_answer: '简答题', coding: '编程题'
}

const modeLabels: Record<string, string> = {
  practice: '自由练习', exam: '模拟考试', review: '复习模式', smart: '智能推荐'
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

const QuizResultPage: React.FC = () => {
  const navigate = useNavigate()
  const [results, setResults] = useState<QuizResult[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [mode, setMode] = useState<string>('practice')
  const [wrongDetailVisible, setWrongDetailVisible] = useState(false)
  const [selectedWrong, setSelectedWrong] = useState<QuizResult | null>(null)
  const [favoriteMap, setFavoriteMap] = useState<Record<number, boolean>>({})

  useEffect(() => {
    try {
      const r = JSON.parse(sessionStorage.getItem('quiz_results') || '[]')
      const q = JSON.parse(sessionStorage.getItem('quiz_questions') || '[]')
      const config = JSON.parse(sessionStorage.getItem('quiz_config') || '{}')
      setResults(r)
      setQuestions(q)
      setMode(config.mode || 'practice')

      const favMap: Record<number, boolean> = {}
      for (const item of r) {
        if (item.question?.id) {
          favMap[item.question.id] = isFavorite(item.question.id)
        }
      }
      setFavoriteMap(favMap)
    } catch {
      navigate('/quiz-setup')
    }
  }, [])

  if (results.length === 0) {
    return (
      <Card bordered={false} style={{ borderRadius: 14, textAlign: 'center' }}>
        <Empty description={<span style={{ color: '#64748b' }}>没有答题记录</span>}>
          <Button type="primary" onClick={() => navigate('/quiz-setup')}>去刷题</Button>
        </Empty>
      </Card>
    )
  }

  const totalCount = results.length
  const correctCount = results.filter(r => checkAnswer(r.question, r.userAnswer) === 'correct').length
  const wrongCount = results.filter(r => checkAnswer(r.question, r.userAnswer) === 'wrong').length
  const pendingCount = results.filter(r => checkAnswer(r.question, r.userAnswer) === 'pending').length
  const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0)
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

  const pieData = [
    { name: '正确', value: correctCount, color: '#22c55e' },
    { name: '错误', value: wrongCount, color: '#ef4444' },
    ...(pendingCount > 0 ? [{ name: '待评阅', value: pendingCount, color: '#f59e0b' }] : [])
  ].filter(d => d.value > 0)

  const wrongResults = results.filter(r => checkAnswer(r.question, r.userAnswer) === 'wrong')

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}分${s}秒` : `${s}秒`
  }

  const handleRetry = () => {
    if (questions.length === 0) return
    sessionStorage.setItem('quiz_config', JSON.stringify({ mode, timeLimit: null }))
    sessionStorage.removeItem('quiz_results')
    navigate('/quiz')
  }

  const handleRetryWrong = () => {
    if (wrongResults.length === 0) return
    const wrongQuestions = wrongResults.map(r => r.question)
    sessionStorage.setItem('quiz_config', JSON.stringify({ mode: 'review', timeLimit: null }))
    sessionStorage.setItem('quiz_questions', JSON.stringify(wrongQuestions))
    sessionStorage.removeItem('quiz_results')
    navigate('/quiz')
  }

  const handleToggleFav = (questionId: number) => {
    const newState = toggleFavorite(questionId)
    setFavoriteMap(prev => ({ ...prev, [questionId]: newState }))
  }

  // 评价等级
  const getGrade = () => {
    if (accuracy >= 95) return { text: '完美！', emoji: '🏆', color: '#f59e0b', desc: '你太厉害了！' }
    if (accuracy >= 85) return { text: '优秀！', emoji: '🌟', color: '#22c55e', desc: '继续保持！' }
    if (accuracy >= 70) return { text: '良好', emoji: '👍', color: '#6366f1', desc: '做得不错' }
    if (accuracy >= 55) return { text: '继续加油', emoji: '💪', color: '#f59e0b', desc: '还需努力' }
    return { text: '需要加油', emoji: '📖', color: '#ef4444', desc: '多做练习' }
  }
  const grade = getGrade()

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#252535', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px 12px', fontSize: 12,
        }}>
          <div style={{ color: payload[0].payload.color }}>
            {payload[0].name}: {payload[0].value} 题
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#e2e8f0', fontWeight: 700 }}>
          答题报告 🏆
        </Title>
        <Text style={{ color: '#64748b', marginTop: 4, display: 'block' }}>
          {modeLabels[mode] || mode} · {totalCount} 道题
        </Text>
      </div>

      {/* 总览成绩卡片 */}
      <Card
        bordered={false}
        style={{
          marginBottom: 20,
          background: `linear-gradient(135deg, ${grade.color}15 0%, #1e1e2e 60%)`,
          border: `1px solid ${grade.color}25`,
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
        }}
        bodyStyle={{ padding: '32px 36px' }}
      >
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 200, height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${grade.color}15, transparent)`,
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 8 }}>{grade.emoji}</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: grade.color, lineHeight: 1 }}>
              {accuracy}%
            </div>
            <div style={{ color: grade.color, fontWeight: 600, marginTop: 6 }}>{grade.text}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{grade.desc}</div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#94a3b8' }}>正确率</Text>
                <Text style={{ color: grade.color, fontWeight: 600 }}>{accuracy}%</Text>
              </div>
              <Progress
                percent={accuracy}
                strokeColor={grade.color}
                trailColor="rgba(255,255,255,0.06)"
                showInfo={false}
                strokeWidth={8}
              />
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(34,197,94,0.08)', borderRadius: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{correctCount}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>答对</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(239,68,68,0.08)', borderRadius: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{wrongCount}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>答错</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(100,116,139,0.08)', borderRadius: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#94a3b8' }}>{formatTime(totalTime)}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>总用时</div>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </Card>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        {/* 答题分布饼图 */}
        <Col span={24}>
          <Card
            title={<span style={{ color: '#e2e8f0', fontWeight: 600 }}>📊 答题分布</span>}
            bordered={false}
            style={{ borderRadius: 14, height: '100%' }}
          >
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <RTooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无数据" style={{ height: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
            )}
          </Card>
        </Col>
      </Row>

      {/* 错题回顾 */}
      {wrongResults.length > 0 && (
        <Card
          title={
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
              ❌ 错题回顾
              <Tag style={{
                marginLeft: 8, background: 'rgba(239,68,68,0.15)',
                border: 'none', color: '#ef4444', borderRadius: 6,
              }}>
                {wrongResults.length} 题
              </Tag>
            </span>
          }
          bordered={false}
          style={{ borderRadius: 14, marginBottom: 20 }}
          bodyStyle={{ padding: '0 24px 16px' }}
        >
          <List
            size="small"
            dataSource={wrongResults}
            renderItem={(item, idx) => (
              <List.Item
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
                actions={[
                  <Button
                    key="fav"
                    type="text"
                    icon={favoriteMap[item.question.id]
                      ? <StarFilled style={{ color: '#f59e0b' }} />
                      : <StarOutlined style={{ color: '#64748b' }} />
                    }
                    onClick={() => handleToggleFav(item.question.id)}
                    style={{ padding: '4px 8px' }}
                  />,
                  <Button
                    key="detail"
                    type="link"
                    size="small"
                    onClick={() => { setSelectedWrong(item); setWrongDetailVisible(true) }}
                    style={{ color: '#6366f1', padding: '4px 0' }}
                  >
                    详情
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Text ellipsis style={{ maxWidth: 480, fontSize: 13, color: '#cbd5e1' }}>
                      <span style={{ color: '#ef4444', fontWeight: 600, marginRight: 6 }}>{idx + 1}.</span>
                      {item.question.content}
                    </Text>
                  }
                  description={
                    <Space size={8} style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: '#ef4444' }}>
                        我的: {item.userAnswer}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>→</Text>
                      <Text style={{ fontSize: 11, color: '#22c55e' }}>
                        正确: {item.question.answer}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 操作按钮 */}
      <Card
        bordered={false}
        style={{
          borderRadius: 14,
          background: '#1e1e2e',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Space wrap size={12}>
          <Button
            type="primary"
            size="large"
            icon={<ReloadOutlined />}
            onClick={handleRetry}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: 10, height: 44,
              paddingInline: 24, fontWeight: 600,
            }}
          >
            再做一次
          </Button>
          {wrongResults.length > 0 && (
            <Button
              size="large"
              icon={<EditOutlined />}
              onClick={handleRetryWrong}
              style={{
                borderRadius: 10, height: 44, paddingInline: 24,
                borderColor: '#ef4444', color: '#ef4444',
                background: 'rgba(239,68,68,0.08)',
              }}
            >
              重做错题 ({wrongResults.length})
            </Button>
          )}
          <Button
            size="large"
            icon={<HomeOutlined />}
            onClick={() => navigate('/dashboard')}
            style={{ borderRadius: 10, height: 44, paddingInline: 24 }}
          >
            返回首页
          </Button>
        </Space>
      </Card>

      {/* 错题详情弹窗 */}
      <Modal
        title={<span style={{ color: '#e2e8f0' }}>错题详情</span>}
        open={wrongDetailVisible}
        onCancel={() => setWrongDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedWrong && (
          <div style={{ padding: '8px 0' }}>
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              marginBottom: 16,
            }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>题目</Text>
              <Paragraph style={{ color: '#e2e8f0', margin: 0, fontSize: 14 }}>
                {selectedWrong.question.content}
              </Paragraph>
            </div>

            {(selectedWrong.question.type === 'single' || selectedWrong.question.type === 'multiple' || selectedWrong.question.type === 'judge') && (
              <div style={{ marginBottom: 16 }}>
                {getOptions(selectedWrong.question).map((opt: string, i: number) => (
                  <div key={i} style={{
                    padding: '8px 14px', marginBottom: 6, borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#cbd5e1', fontSize: 13,
                  }}>
                    <span style={{
                      marginRight: 10, fontWeight: 700,
                      color: String.fromCharCode(65 + i) === selectedWrong.question.answer.toUpperCase()
                        ? '#22c55e' : '#64748b',
                    }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </div>
                ))}
              </div>
            )}

            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{
                  padding: '12px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 4 }}>我的答案</Text>
                  <Text strong style={{ color: '#ef4444', fontSize: 16 }}>{selectedWrong.userAnswer}</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{
                  padding: '12px', borderRadius: 10,
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 4 }}>正确答案</Text>
                  <Text strong style={{ color: '#22c55e', fontSize: 16 }}>{selectedWrong.question.answer}</Text>
                </div>
              </Col>
            </Row>

            {selectedWrong.question.analysis && (
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.15)',
              }}>
                <Text style={{ color: '#818cf8', fontSize: 12, display: 'block', marginBottom: 6 }}>📖 解析</Text>
                <Paragraph style={{ color: '#cbd5e1', margin: 0, fontSize: 13 }}>
                  {selectedWrong.question.analysis}
                </Paragraph>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default QuizResultPage
