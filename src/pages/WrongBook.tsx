import React, { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Tag, Space, Button, Select, Typography,
  Empty, Modal, Tooltip, Row, Col, Statistic, List
} from 'antd'
import {
  CloseCircleOutlined, RedoOutlined,
  FilterOutlined, BarChartOutlined, BulbOutlined,
  PlayCircleOutlined
} from '@ant-design/icons'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell
} from 'recharts'
import {
  getKnowledgePointStats, getDueReviewQuestions, getQuestionsByIds,
  getWrongQuestionsWithQuestions
} from '../db/repositories'
import { Question, QuizRecord } from '../types'
import { useNavigate } from 'react-router-dom'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

const typeLabels: Record<string, string> = {
  single: '单选题', multiple: '多选题', judge: '判断题',
  fill: '填空题', short_answer: '简答题', coding: '编程题'
}

const WrongBook: React.FC = () => {
  const navigate = useNavigate()
  const [wrongRecords, setWrongRecords] = useState<(QuizRecord & { question: Question })[]>([])
  const [dueQuestions, setDueQuestions] = useState<Question[]>([])
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<(QuizRecord & { question: Question }) | null>(null)
  
  const [selectedKp, setSelectedKp] = useState<string | undefined>(undefined)
  const [allKps, setAllKps] = useState<string[]>([])
  const [weakKps, setWeakKps] = useState<{ knowledge_point: string; total: number; correct: number; rate: number }[]>([])

  const loadData = useCallback(() => {
    setWrongRecords(getWrongQuestionsWithQuestions(selectedKp))
    const dueIds = getDueReviewQuestions()
    if (dueIds.length > 0) {
      setDueQuestions(getQuestionsByIds(dueIds))
    } else {
      setDueQuestions([])
    }

    const stats = getKnowledgePointStats()
    const weak = stats.filter(s => s.rate < 60).sort((a, b) => a.rate - b.rate)
    setWeakKps(weak)
    setAllKps(stats.map(s => s.knowledge_point))
  }, [selectedKp])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReviewWrong = () => {
    if (wrongRecords.length === 0) return
    const questions = wrongRecords.map(r => r.question)
    sessionStorage.setItem('quiz_config', JSON.stringify({ mode: 'review', timeLimit: null }))
    sessionStorage.setItem('quiz_questions', JSON.stringify(questions))
    navigate('/quiz')
  }

  const handleReviewDue = () => {
    if (dueQuestions.length === 0) return
    sessionStorage.setItem('quiz_config', JSON.stringify({ mode: 'review', timeLimit: null }))
    sessionStorage.setItem('quiz_questions', JSON.stringify(dueQuestions))
    navigate('/quiz')
  }

  const columns = [
    {
      title: '题目',
      render: (_: any, record: QuizRecord & { question: Question }) => (
        <Tooltip title={record.question.content}>
          <Text ellipsis style={{ maxWidth: 350, fontSize: 13, color: '#cbd5e1' }}>
            {record.question.content}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '题型', width: 80,
      render: (_: any, record: QuizRecord & { question: Question }) => (
        <Tag style={{
          background: 'rgba(99,102,241,0.12)', border: 'none',
          color: '#818cf8', borderRadius: 6, fontSize: 11,
        }}>
          {typeLabels[record.question.type]}
        </Tag>
      )
    },
    {
      title: '我的答案', dataIndex: 'user_answer', width: 100,
      render: (text: string) => (
        <Text style={{ color: '#ef4444', fontWeight: 600, fontSize: 13 }}>{text}</Text>
      )
    },
    {
      title: '正确答案', width: 100,
      render: (_: any, record: QuizRecord & { question: Question }) => (
        <Text style={{ color: '#22c55e', fontWeight: 600, fontSize: 13 }}>{record.question.answer}</Text>
      )
    },
    {
      title: '错误时间', dataIndex: 'created_at', width: 150,
      render: (text: string) => (
        <Text style={{ fontSize: 11, color: '#64748b' }}>{text}</Text>
      )
    },
    {
      title: '操作', width: 80,
      render: (_: any, record: QuizRecord & { question: Question }) => (
        <Button
          type="link"
          size="small"
          onClick={() => { setSelectedRecord(record); setDetailVisible(true) }}
          style={{ color: '#6366f1', padding: 0 }}
        >
          详情
        </Button>
      )
    }
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#e2e8f0', fontWeight: 700 }}>
            错题本 📝
          </Title>
          <Text style={{ color: '#64748b', marginTop: 4, display: 'block' }}>
            回顾错题，强化薄弱点
          </Text>
        </div>
        <Space>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={handleReviewDue}
            disabled={dueQuestions.length === 0}
            style={{ borderRadius: 8 }}
          >
            复习到期 ({dueQuestions.length})
          </Button>
          <Button
            type="primary"
            icon={<RedoOutlined />}
            onClick={handleReviewWrong}
            disabled={wrongRecords.length === 0}
            style={{
              background: wrongRecords.length > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : undefined,
              border: 'none', borderRadius: 8,
            }}
          >
            重做错题 ({wrongRecords.length})
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(30,30,46,0.9) 100%)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ef4444', fontSize: 18,
              }}>
                <CloseCircleOutlined />
              </div>
              <div>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block' }}>错题总数</Text>
                <Text style={{ color: '#ef4444', fontSize: 24, fontWeight: 700 }}>{wrongRecords.length}</Text>
                <Text style={{ color: '#64748b', fontSize: 12 }}> 题</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(30,30,46,0.9) 100%)',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(245,158,11,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#f59e0b', fontSize: 18,
              }}>
                <RedoOutlined />
              </div>
              <div>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block' }}>待复习</Text>
                <Text style={{ color: '#f59e0b', fontSize: 24, fontWeight: 700 }}>{dueQuestions.length}</Text>
                <Text style={{ color: '#64748b', fontSize: 12 }}> 题</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(30,30,46,0.9) 100%)',
              border: '1px solid rgba(99,102,241,0.15)',
            }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#818cf8', fontSize: 18,
              }}>
                <BarChartOutlined />
              </div>
              <div>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block' }}>薄弱知识点</Text>
                <Text style={{ color: '#818cf8', fontSize: 24, fontWeight: 700 }}>{weakKps.length}</Text>
                <Text style={{ color: '#64748b', fontSize: 12 }}> 个</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 薄弱点分析图 */}
      {weakKps.length > 0 && (
        <Card
          title={<span style={{ color: '#e2e8f0', fontWeight: 600 }}>⚠️ 薄弱知识点分析</span>}
          bordered={false}
          style={{ borderRadius: 14, marginBottom: 20 }}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weakKps.slice(0, 8)} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="knowledge_point" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <RTooltip
                contentStyle={{
                  background: '#252535', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, fontSize: 12,
                }}
                formatter={(value: any) => [`${value}%`, '正确率']}
              />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                {weakKps.slice(0, 8).map((entry, index) => (
                  <Cell key={index} fill={entry.rate < 40 ? '#ef4444' : entry.rate < 60 ? '#f59e0b' : '#f97316'} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 知识点筛选 + 错题列表 */}
      <Card
        bordered={false}
        style={{ borderRadius: 14 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>错题列表</span>
            <Select
              value={selectedKp}
              onChange={setSelectedKp}
              allowClear
              placeholder="按知识点筛选"
              style={{ width: 180, fontWeight: 400 }}
              size="small"
            >
              {allKps.map(kp => (
                <Option key={kp} value={kp}>{kp}</Option>
              ))}
            </Select>
          </div>
        }
      >
        {wrongRecords.length > 0 ? (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={wrongRecords}
            pagination={{
              defaultPageSize: 15,
              showSizeChanger: true,
              pageSizeOptions: ['15', '30', '50'],
              showTotal: total => `共 ${total} 题`,
              style: { marginTop: 12 }
            }}
            size="small"
            scroll={{ y: 420 }}
            style={{ marginTop: -8 }}
          />
        ) : (
          <Empty
            description={<span style={{ color: '#64748b' }}>暂无错题记录，继续加油！🎉</span>}
            style={{ padding: '40px 0' }}
          />
        )}
      </Card>

      {/* 错题详情弹窗 */}
      <Modal
        title={<span style={{ color: '#e2e8f0' }}>错题详情</span>}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedRecord && (
          <div style={{ padding: '8px 0' }}>
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              marginBottom: 16,
            }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>题目</Text>
              <Paragraph style={{ color: '#e2e8f0', margin: 0, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                {selectedRecord.question.content}
              </Paragraph>
            </div>

            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{
                  padding: '12px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 4 }}>我的答案</Text>
                  <Text strong style={{ color: '#ef4444', fontSize: 18 }}>{selectedRecord.user_answer}</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{
                  padding: '12px', borderRadius: 10,
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 4 }}>正确答案</Text>
                  <Text strong style={{ color: '#22c55e', fontSize: 18 }}>{selectedRecord.question.answer}</Text>
                </div>
              </Col>
            </Row>

            {selectedRecord.question.analysis && (
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.15)',
              }}>
                <Text style={{ color: '#818cf8', fontSize: 12, display: 'block', marginBottom: 6 }}>📖 解析</Text>
                <Paragraph style={{ color: '#cbd5e1', margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {selectedRecord.question.analysis}
                </Paragraph>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default WrongBook
