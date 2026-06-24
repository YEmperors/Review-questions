import React, { useEffect, useState } from 'react'
import {
  Card, Table, Tag, Space, Button, Select, Typography,
  Empty, Modal, message, Popconfirm, Row, Col, Input
} from 'antd'
import {
  StarFilled, DeleteOutlined, SendOutlined, SearchOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import {
  getFavorites, getQuestionsByIds, toggleFavorite
} from '../db/repositories'
import { Question } from '../types'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

const typeLabels: Record<string, string> = {
  single: '单选题', multiple: '多选题', judge: '判断题',
  fill: '填空题', short_answer: '简答题', coding: '编程题'
}
const typeColors: Record<string, string> = {
  single: '#6366f1', multiple: '#8b5cf6', judge: '#06b6d4',
  fill: '#f59e0b', short_answer: '#22c55e', coding: '#ef4444'
}
const diffLabels: Record<number, { text: string; color: string }> = {
  1: { text: '简单', color: '#22c55e' },
  2: { text: '中等', color: '#f59e0b' },
  3: { text: '困难', color: '#ef4444' }
}

const Favorites: React.FC = () => {
  const navigate = useNavigate()
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [knowledgePoints, setKnowledgePoints] = useState<string[]>([])
  const [filterKp, setFilterKp] = useState<string | undefined>(undefined)
  const [searchText, setSearchText] = useState('')
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)

  const loadData = () => {
    const favIds = getFavorites()
    const favQuestions = getQuestionsByIds(favIds)
    setAllQuestions(favQuestions)

    const kps = new Set<string>()
    favQuestions.forEach(q => { if (q.knowledge_point) kps.add(q.knowledge_point) })
    setKnowledgePoints(Array.from(kps).sort())

    applyFilter(favQuestions, filterKp, searchText)
  }

  const applyFilter = (qs: Question[], kp?: string, search?: string) => {
    let filtered = qs
    if (kp) filtered = filtered.filter(q => q.knowledge_point === kp)
    if (search) filtered = filtered.filter(q =>
      q.content.toLowerCase().includes(search.toLowerCase()) ||
      q.knowledge_point.toLowerCase().includes(search.toLowerCase())
    )
    setQuestions(filtered)
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilter(allQuestions, filterKp, searchText)
  }, [filterKp, searchText, allQuestions])

  const handleRemoveFavorite = (id: number) => {
    toggleFavorite(id)
    message.success('已取消收藏')
    loadData()
  }

  const handleStartPractice = () => {
    if (questions.length === 0) return
    sessionStorage.setItem('quiz_config', JSON.stringify({ mode: 'practice', timeLimit: null }))
    sessionStorage.setItem('quiz_questions', JSON.stringify(questions))
    sessionStorage.removeItem('quiz_results')
    navigate('/quiz')
  }

  const columns = [
    {
      title: '题目',
      render: (_: unknown, record: Question) => (
        <Text ellipsis style={{ maxWidth: 360, fontSize: 13, color: '#cbd5e1' }}>
          {record.content}
        </Text>
      ),
    },

    {
      title: '题型', dataIndex: 'type', width: 85,
      render: (type: string) => (
        <Tag style={{
          background: `${typeColors[type] || '#6366f1'}18`,
          border: `1px solid ${typeColors[type] || '#6366f1'}35`,
          color: typeColors[type] || '#818cf8',
          borderRadius: 6, fontSize: 11, margin: 0,
        }}>
          {typeLabels[type] || type}
        </Tag>
      )
    },
    {
      title: '难度', dataIndex: 'difficulty', width: 70,
      render: (d: number) => (
        <Tag style={{
          background: `${diffLabels[d]?.color}18`,
          border: 'none', color: diffLabels[d]?.color,
          borderRadius: 6, fontSize: 11, margin: 0,
        }}>
          {diffLabels[d]?.text}
        </Tag>
      )
    },
    {
      title: '知识点', dataIndex: 'knowledge_point', width: 120,
      render: (kp: string) => (
        <Text style={{ fontSize: 12, color: '#94a3b8' }}>{kp}</Text>
      )
    },
    {
      title: '答案', dataIndex: 'answer', width: 90, ellipsis: true,
      render: (a: string) => (
        <Text style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>{a}</Text>
      )
    },
    {
      title: '操作', width: 130,
      render: (_: any, record: Question) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            onClick={() => { setSelectedQuestion(record); setDetailVisible(true) }}
            style={{ color: '#6366f1', padding: '0 8px' }}
          >
            详情
          </Button>
          <Popconfirm
            title="取消收藏？"
            onConfirm={() => handleRemoveFavorite(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<StarFilled style={{ color: '#f59e0b' }} />}
              title="取消收藏"
              style={{ padding: '0 8px' }}
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#e2e8f0', fontWeight: 700 }}>
            收藏夹 ⭐
          </Title>
          <Text style={{ color: '#64748b', marginTop: 4, display: 'block' }}>
            已收藏 {allQuestions.length} 道题目
          </Text>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<SendOutlined />}
          onClick={handleStartPractice}
          disabled={questions.length === 0}
          style={{
            background: questions.length > 0 ? 'linear-gradient(135deg, #f59e0b, #f97316)' : undefined,
            border: 'none', borderRadius: 10, height: 44,
            fontWeight: 600,
            boxShadow: questions.length > 0 ? '0 4px 16px rgba(245,158,11,0.35)' : 'none',
          }}
        >
          练习收藏题 ({questions.length})
        </Button>
      </div>

      {/* 筛选栏 */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12, marginBottom: 16,
          background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.06)',
        }}
        bodyStyle={{ padding: '14px 20px' }}
      >
        <Space size={16} wrap>
          <Input
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            placeholder="搜索题目..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
            style={{ width: 220, borderRadius: 8 }}
          />
          <Select
            value={filterKp}
            onChange={setFilterKp}
            allowClear
            placeholder="知识点筛选"
            style={{ width: 180 }}
          >
            {knowledgePoints.map(kp => (
              <Option key={kp} value={kp}>{kp}</Option>
            ))}
          </Select>
          {(filterKp || searchText) && (
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              筛选结果: {questions.length} 题
            </Text>
          )}
        </Space>
      </Card>

      {/* 题目列表 */}
      {allQuestions.length === 0 ? (
        <Card
          bordered={false}
          style={{
            borderRadius: 14, textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(30,30,46,0.95) 100%)',
            border: '1px solid rgba(245,158,11,0.12)',
          }}
          bodyStyle={{ padding: '60px 24px' }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>⭐</div>
          <Title level={4} style={{ color: '#e2e8f0', margin: 0 }}>还没有收藏的题目</Title>
          <Text style={{ color: '#64748b', display: 'block', margin: '8px 0 24px' }}>
            在刷题过程中点击⭐收藏标志来保存感兴趣的题目
          </Text>
          <Space>
            <Button
              onClick={() => navigate('/bank')}
              style={{ borderRadius: 8 }}
            >
              去题库看看
            </Button>
            <Button
              type="primary"
              onClick={() => navigate('/quiz-setup')}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', borderRadius: 8,
              }}
            >
              开始刷题
            </Button>
          </Space>
        </Card>
      ) : (
        <Card
          bordered={false}
          style={{ borderRadius: 14, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.06)' }}
          bodyStyle={{ padding: '0 0 8px' }}
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={questions}
            pagination={{
              pageSize: 15,
              showTotal: total => `共 ${total} 题`,
              style: { padding: '12px 20px 0' }
            }}
            size="small"
            scroll={{ y: 500 }}
            locale={{ emptyText: <Empty description={<span style={{ color: '#64748b' }}>没有符合条件的题目</span>} /> }}
          />
        </Card>
      )}

      {/* 题目详情弹窗 */}
      <Modal
        title={<span style={{ color: '#e2e8f0' }}>题目详情</span>}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedQuestion && (
          <div style={{ padding: '8px 0' }}>
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Tag style={{
                  background: `${typeColors[selectedQuestion.type] || '#6366f1'}18`,
                  border: 'none', color: typeColors[selectedQuestion.type] || '#818cf8',
                  borderRadius: 6, fontSize: 11, margin: 0,
                }}>
                  {typeLabels[selectedQuestion.type]}
                </Tag>
                <Tag style={{
                  background: `${diffLabels[selectedQuestion.difficulty]?.color}18`,
                  border: 'none', color: diffLabels[selectedQuestion.difficulty]?.color,
                  borderRadius: 6, fontSize: 11, margin: 0,
                }}>
                  {diffLabels[selectedQuestion.difficulty]?.text}
                </Tag>
              </div>
              <Paragraph style={{ color: '#e2e8f0', margin: 0, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                {selectedQuestion.content}
              </Paragraph>
            </div>

            {selectedQuestion.options && (
              <div style={{ marginBottom: 16 }}>
                {JSON.parse(selectedQuestion.options).map((opt: string, i: number) => {
                  const letter = String.fromCharCode(65 + i)
                  const isAnswer = selectedQuestion.answer.toUpperCase().includes(letter)
                  return (
                    <div key={i} style={{
                      padding: '8px 14px', marginBottom: 6, borderRadius: 8,
                      background: isAnswer ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isAnswer ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}`,
                      color: '#cbd5e1', fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: isAnswer ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                        color: isAnswer ? '#22c55e' : '#64748b', flexShrink: 0,
                      }}>
                        {letter}
                      </span>
                      {opt}
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              marginBottom: 16,
            }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>✅ 正确答案</Text>
              <Text strong style={{ color: '#22c55e', fontSize: 16 }}>{selectedQuestion.answer}</Text>
            </div>

            {selectedQuestion.analysis && (
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.15)',
              }}>
                <Text style={{ color: '#818cf8', fontSize: 12, display: 'block', marginBottom: 6 }}>📖 解析</Text>
                <Paragraph style={{ color: '#cbd5e1', margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {selectedQuestion.analysis}
                </Paragraph>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Favorites
