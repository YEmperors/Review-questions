import React, { useState } from 'react'
import {
  Card, Form, Select, InputNumber, Radio, Button, Space, Typography,
  message, Spin, Tag, Alert, List, Input
} from 'antd'
import {
  RobotOutlined, PlusOutlined, SendOutlined,
  CheckCircleOutlined, SaveOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import {
  generateQuestionWithAI, parseAIQuestions
} from '../services/ai-service'
import { createQuestionsBatch, getQuestionBanks } from '../db/repositories'
import { QuestionType } from '../types'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

const AIQuiz: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string>('')
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([])
  const [saved, setSaved] = useState(false)
  const [banks, setBanks] = useState<any[]>([])

  React.useEffect(() => {
    setBanks(getQuestionBanks())
  }, [])

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      setAiResult('')
      setParsedQuestions([])
      setSaved(false)

      try {
        const result = await generateQuestionWithAI(
          values.topic,
          values.type,
          values.count
        )
        setAiResult(result)

        const questions = parseAIQuestions(result)
        
        // 自动保存到题库
        const bankId = values.bank_id || 1
        const toInsert = questions.map(q => ({
          type: values.type,
          content: q.content || '',
          options: q.options ? JSON.stringify(q.options) : null,
          answer: typeof q.answer === 'string' ? q.answer : JSON.stringify(q.answer) || '',
          analysis: q.analysis || null,
          difficulty: 1,
          knowledge_point: '',
          tags: '["AI生成"]',
          bank_id: bankId
        }))
        
        try {
          const ids = createQuestionsBatch(toInsert as any)
          // 将生成的 ID 附加上去（虽然 UI 不一定用，但保持数据完整）
          const savedQuestions = questions.map((q, i) => ({ ...q, db_id: ids[i] }))
          setParsedQuestions(savedQuestions)
          setSaved(true)
          message.success(`成功生成并自动导入了 ${questions.length} 道题目至题库！`)
        } catch (e: any) {
          setParsedQuestions(questions)
          message.warning(`生成了 ${questions.length} 道题，但自动保存失败: ${e.message}`)
        }

      } catch (err: any) {
        message.error('AI 出题失败：' + err.message)
      }
    } catch {
      // 表单验证失败，忽略
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (parsedQuestions.length === 0) return

    try {
      const bankId = form.getFieldValue('bank_id') || 1
      const toInsert = parsedQuestions.map(q => ({
        type: form.getFieldValue('type'),
        content: q.content || '',
        options: q.options ? JSON.stringify(q.options) : null,
        answer: q.answer || '',
        analysis: q.analysis || null,
        difficulty: 1, // 已废弃，填默认值
        knowledge_point: '', // 已废弃，填默认值
        tags: '["AI生成"]',
        bank_id: bankId
      }))

      createQuestionsBatch(toInsert as any)
      setSaved(true)
      message.success(`成功保存 ${toInsert.length} 道题目到题库`)
    } catch (err: any) {
      message.error('保存失败：' + err.message)
    }
  }

  const handleStartPractice = () => {
    if (parsedQuestions.length === 0) return

    const bankId = form.getFieldValue('bank_id') || 1
    const questions = parsedQuestions.map(q => ({
      id: 0,
      type: form.getFieldValue('type'),
      content: q.content || '',
      options: q.options ? JSON.stringify(q.options) : null,
      answer: q.answer || '',
      analysis: q.analysis || null,
      difficulty: 1,
      knowledge_point: '',
      tags: '["AI生成"]',
      bank_id: bankId,
      created_at: new Date().toISOString()
    }))

    sessionStorage.setItem('quiz_config', JSON.stringify({ mode: 'practice', timeLimit: null }))
    sessionStorage.setItem('quiz_questions', JSON.stringify(questions))
    navigate('/quiz')
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={3}>🤖 AI 智能出题</Title>

      <Alert
        message="使用 AI 自动生成题目，请在设置中配置好 API Key"
        type="info"
        showIcon
        style={{ marginBottom: 16, cursor: 'pointer' }}
        onClick={() => navigate('/settings')}
      />

      <Card title="出题设置">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: 'single',
            count: 5,
            bank_id: 1
          }}
        >
          <Form.Item name="topic" label="出题主题" rules={[{ required: true, message: '请输入出题主题' }]}>
            <Input placeholder="例如：线性代数、TCP协议、光合作用" />
          </Form.Item>

          <Space size="large">
            <Form.Item name="type" label="题型" rules={[{ required: true }]}>
              <Select style={{ width: 150 }}>
                <Option value="single">单选题</Option>
                <Option value="multiple">多选题</Option>
                <Option value="judge">判断题</Option>
                <Option value="fill">填空题</Option>
                <Option value="short_answer">简答题</Option>
                <Option value="coding">编程题</Option>
              </Select>
            </Form.Item>

            <Form.Item name="count" label="生成数量" rules={[{ required: true }]}>
              <InputNumber min={1} max={20} style={{ width: 100 }} />
            </Form.Item>
          </Space>

          <Form.Item name="bank_id" label="保存到题库">
            <Select style={{ width: 200 }}>
              {banks.map((b: any) => (
                <Option key={b.id} value={b.id}>{b.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              size="large"
              icon={<RobotOutlined />}
              loading={loading}
              onClick={handleGenerate}
            >
              {loading ? 'AI 正在思考中...' : 'AI 生成题目'}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 生成结果 */}
      {parsedQuestions.length > 0 && (
        <Card
          title={`生成结果（${parsedQuestions.length} 题）`}
          style={{ marginTop: 16 }}
          extra={
            <Space>
              {!saved && (
                <Button icon={<SaveOutlined />} onClick={handleSave}>
                  保存到题库
                </Button>
              )}
              {saved && <Tag color="success"><CheckCircleOutlined /> 已保存</Tag>}
              <Button type="primary" icon={<SendOutlined />} onClick={handleStartPractice}>
                开始练习
              </Button>
            </Space>
          }
        >
          <List
            dataSource={parsedQuestions}
            renderItem={(q, idx) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <Text strong>{idx + 1}. {q.content}</Text>
                  {q.options && (
                    <div style={{ marginTop: 8 }}>
                      {q.options.map((opt: string, oi: number) => (
                        <div key={oi}><Tag>{String.fromCharCode(65 + oi)}</Tag> {opt}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <Tag color="green">答案：{q.answer}</Tag>
                  </div>
                  {q.analysis && (
                    <Paragraph type="secondary" style={{ marginTop: 4 }}>
                      解析：{q.analysis}
                    </Paragraph>
                  )}
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 原始 AI 输出 */}
      {aiResult && (
        <Card title="AI 原始输出" size="small" style={{ marginTop: 16 }}>
          <TextArea
            value={aiResult}
            rows={6}
            readOnly
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </Card>
      )}
    </div>
  )
}

export default AIQuiz
