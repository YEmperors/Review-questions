import React, { useState, useEffect } from 'react'
import {
  Card, Form, Select, Button, InputNumber, Radio,
  Space, Typography, Row, Col, Tag, message, Divider
} from 'antd'
import {
  ThunderboltOutlined, ExperimentOutlined, RedoOutlined,
  RobotOutlined, PlayCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getQuestionBanks, getQuestions, getQuestionCount, getKnowledgePoints, getDueReviewQuestions, getQuestionsByIds } from '../db/repositories'
import { getSmartQuestions } from '../services/adaptive-difficulty'
import { QuestionType, QuizMode } from '../types'

const { Title, Text } = Typography
const { Option } = Select

const modeConfig = [
  {
    value: 'practice',
    icon: <ExperimentOutlined />,
    label: '自由练习',
    desc: '按条件筛选，随时查看答案',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(30,30,46,0.5) 100%)',
  },
  {
    value: 'exam',
    icon: <ThunderboltOutlined />,
    label: '模拟考试',
    desc: '限时作答，最后统一评分',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(30,30,46,0.5) 100%)',
  },
  {
    value: 'review',
    icon: <RedoOutlined />,
    label: '复习模式',
    desc: '间隔重复算法，智能安排复习',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(30,30,46,0.5) 100%)',
  },
  {
    value: 'smart',
    icon: <RobotOutlined />,
    label: '智能推荐',
    desc: 'AI 分析薄弱点，自动推荐题目',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(30,30,46,0.5) 100%)',
  },
]

const QuizSetup: React.FC = () => {
  const navigate = useNavigate()
  const [banks, setBanks] = useState<any[]>([])
  const [knowledgePoints, setKnowledgePoints] = useState<string[]>([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [selectedMode, setSelectedMode] = useState<string>('practice')
  const [form] = Form.useForm()

  useEffect(() => {
    setBanks(getQuestionBanks())
    setTotalQuestions(getQuestionCount())
  }, [])

  const handleBankChange = (bankId?: number) => {
    form.setFieldsValue({ knowledgePoint: undefined })
    setKnowledgePoints(getKnowledgePoints(bankId))
    setTotalQuestions(getQuestionCount(bankId))
  }

  const handleStart = () => {
    form.validateFields().then(values => {
      const mode = values.mode as QuizMode
      let questions: any[]

      if (mode === 'smart') {
        questions = getSmartQuestions(
          values.bankId,
          values.questionCount || 20,
          values.questionTypes
        )
      } else if (mode === 'review') {
        const dueIds = getDueReviewQuestions()
        let dueQuestions = getQuestionsByIds(dueIds)
        
        if (values.bankId) {
          dueQuestions = dueQuestions.filter(q => q.bank_id === values.bankId)
        }
        if (values.questionTypes && values.questionTypes.length > 0) {
          dueQuestions = dueQuestions.filter(q => values.questionTypes.includes(q.type))
        }
        
        questions = dueQuestions
        if (values.questionCount && questions.length > values.questionCount) {
          questions = questions.sort(() => Math.random() - 0.5).slice(0, values.questionCount)
        }
      } else {
        const questionTypes = values.questionTypes as QuestionType[] | undefined
        questions = getQuestions({
          bankId: values.bankId,
          types: questionTypes && questionTypes.length > 0 ? questionTypes : undefined
        })

        if (values.questionCount && questions.length > values.questionCount) {
          questions = questions.sort(() => Math.random() - 0.5).slice(0, values.questionCount)
        }
      }

      if (questions.length === 0) {
        message.warning('没有找到符合条件的题目，请调整筛选条件')
        return
      }

      sessionStorage.setItem('quiz_config', JSON.stringify({
        mode,
        timeLimit: values.timeLimit || null
      }))
      sessionStorage.setItem('quiz_questions', JSON.stringify(questions))
      sessionStorage.removeItem('quiz_results')

      navigate('/quiz')
    })
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Title level={2} style={{ margin: 0, color: '#e2e8f0', fontWeight: 700 }}>
          开始刷题 🎯
        </Title>
        <Text style={{ color: '#64748b', marginTop: 4, display: 'block' }}>
          选择刷题模式和范围，开始你的学习之旅
        </Text>
      </div>

      {/* 刷题模式选择 */}
      <div style={{ marginBottom: 20 }}>
        <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 12 }}>
          选择刷题模式
        </Text>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ mode: 'practice', questionCount: 20 }}
          onValuesChange={(changed) => {
            if (changed.mode) {
              setSelectedMode(changed.mode)
              if (changed.mode === 'exam') {
                form.setFieldsValue({ timeLimit: 60 })
              } else {
                form.setFieldsValue({ timeLimit: null })
              }
            }
          }}
        >
          <Form.Item name="mode" noStyle>
            <Radio.Group style={{ width: '100%' }}>
              <Row gutter={12}>
                {modeConfig.map(cfg => (
                  <Col xs={24} sm={12} key={cfg.value} style={{ marginBottom: 12 }}>
                    <Radio
                      value={cfg.value}
                      style={{ display: 'block', width: '100%', margin: 0 }}
                    >
                      <div style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: selectedMode === cfg.value ? cfg.gradient : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${selectedMode === cfg.value ? `${cfg.color}40` : 'rgba(255,255,255,0.08)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: `${cfg.color}20`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: cfg.color, fontSize: 18, flexShrink: 0,
                        }}>
                          {cfg.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>
                            {cfg.label}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {cfg.desc}
                          </div>
                        </div>
                      </div>
                    </Radio>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </Form.Item>

          <Card
            bordered={false}
            style={{
              background: '#1e1e2e',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              marginTop: 4,
            }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 16 }}>
              筛选范围
            </Text>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="bankId" label={<span style={{ color: '#94a3b8' }}>题库</span>} style={{ marginBottom: 16 }}>
                  <Select
                    allowClear
                    placeholder="全部题库"
                    onChange={handleBankChange}
                    style={{ borderRadius: 8 }}
                  >
                    {banks.map(b => (
                      <Option key={b.id} value={b.id}>{b.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={12} md={8}>
                <Form.Item name="questionCount" label={<span style={{ color: '#94a3b8' }}>题目数量</span>} style={{ marginBottom: 16 }}>
                  <InputNumber
                    min={1} max={200} style={{ width: '100%', borderRadius: 8 }}
                    placeholder="20"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item name="timeLimit" label={<span style={{ color: '#94a3b8' }}>时限（分钟）</span>} style={{ marginBottom: 16 }}>
                  <InputNumber
                    min={1} max={300} style={{ width: '100%', borderRadius: 8 }}
                    placeholder="不限时"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="questionTypes" label={<span style={{ color: '#94a3b8' }}>题型筛选</span>} style={{ marginBottom: 20 }}>
              <Select mode="multiple" allowClear placeholder="全部题型" style={{ borderRadius: 8 }}>
                <Option value="single">📝 单选题</Option>
                <Option value="multiple">☑️ 多选题</Option>
                <Option value="judge">⚖️ 判断题</Option>
                <Option value="fill">✏️ 填空题</Option>
                <Option value="short_answer">📄 简答题</Option>
                <Option value="coding">💻 编程题</Option>
              </Select>
            </Form.Item>

            <Divider style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '0 0 20px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <InfoCircleOutlined style={{ color: '#64748b' }} />
                <Text style={{ color: '#64748b', fontSize: 13 }}>
                  符合条件约{' '}
                  <span style={{
                    color: '#818cf8', fontWeight: 600, fontSize: 16,
                    padding: '1px 8px',
                    background: 'rgba(99,102,241,0.15)',
                    borderRadius: 6,
                  }}>
                    {totalQuestions}
                  </span>
                  {' '}题
                </Text>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleStart}
                disabled={totalQuestions === 0}
                style={{
                  background: totalQuestions > 0
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : undefined,
                  border: 'none',
                  borderRadius: 10,
                  height: 46,
                  paddingInline: 32,
                  fontWeight: 700,
                  fontSize: 15,
                  boxShadow: totalQuestions > 0 ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                开始刷题 →
              </Button>
            </div>
          </Card>
        </Form>
      </div>
    </div>
  )
}

export default QuizSetup
