import React, { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Tag, Space, Button, Select, Typography,
  Empty, Modal, Tooltip, Row, Col, Statistic, List, Popconfirm, message, FloatButton, Input, Switch
} from 'antd'
import {
  CloseCircleOutlined, RedoOutlined,
  FilterOutlined, BarChartOutlined, BulbOutlined,
  PlayCircleOutlined, DeleteOutlined, StarOutlined, SearchOutlined
} from '@ant-design/icons'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell
} from 'recharts'
import {
  getKnowledgePointStats, getDueReviewQuestions, getQuestionsByIds,
  getWrongQuestionsWithQuestions, removeQuestionFromWrongBook, debugForceDueReview, clearWrongBook,
  toggleFavorite, getFavorites
} from '../db/repositories'
import { Question, QuizRecord } from '../types'
import { useNavigate } from 'react-router-dom'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

const typeLabels: Record<string, string> = {
  single: '单选题', multiple: '多选题', judge: '判断题',
  fill: '填空题', short_answer: '简答题'
}

const WrongBook: React.FC = () => {
  const navigate = useNavigate()
  const [wrongRecords, setWrongRecords] = useState<(QuizRecord & { question: Question })[]>([])
  const [dueQuestions, setDueQuestions] = useState<Question[]>([])
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<(QuizRecord & { question: Question }) | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined)
  const [searchText, setSearchText] = useState('')
  const [weakKps, setWeakKps] = useState<{ knowledge_point: string; total: number; correct: number; rate: number }[]>([])
  const [practiceModalVisible, setPracticeModalVisible] = useState(false)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [shuffleOptions, setShuffleOptions] = useState(false)
  const [practiceType, setPracticeType] = useState<'all' | 'due' | 'selected'>('all')

  const loadData = useCallback(() => {
    setWrongRecords(getWrongQuestionsWithQuestions(selectedType, searchText))
    const dueIds = getDueReviewQuestions()
    if (dueIds.length > 0) {
      setDueQuestions(getQuestionsByIds(dueIds))
    } else {
      setDueQuestions([])
    }

    const stats = getKnowledgePointStats()
    const weak = stats.filter(s => s.rate < 60).sort((a, b) => a.rate - b.rate)
    setWeakKps(weak)
  }, [selectedType, searchText])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteRecord = (id: number) => {
    Modal.confirm({
      title: '确认移除该错题？',
      content: '移除后将不再出现在错题本中（原题库题目不受影响）。',
      okText: '确认移除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        removeQuestionFromWrongBook(id)
        loadData()
      }
    })
  }

  const handleReviewWrong = () => {
    if (wrongRecords.length === 0) return
    setPracticeType('all')
    setPracticeModalVisible(true)
  }

  const handleReviewDue = () => {
    if (dueQuestions.length === 0) return
    setPracticeType('due')
    setPracticeModalVisible(true)
  }

  const handlePracticeConfirm = () => {
    let targetQuestions: Question[] = []
    if (practiceType === 'all') {
      targetQuestions = wrongRecords.map(r => r.question)
    } else if (practiceType === 'selected') {
      targetQuestions = wrongRecords
        .filter(r => selectedRowKeys.includes(r.id))
        .map(r => r.question)
    } else {
      targetQuestions = [...dueQuestions]
    }

    if (shuffleQuestions) {
      targetQuestions = [...targetQuestions].sort(() => Math.random() - 0.5)
    }

    sessionStorage.setItem('quiz_config', JSON.stringify({
      mode: 'review',
      timeLimit: null,
      shuffleOptions: shuffleOptions
    }))
    sessionStorage.setItem('quiz_questions', JSON.stringify(targetQuestions))
    sessionStorage.removeItem('quiz_results')
    setPracticeModalVisible(false)
    navigate('/quiz')
  }

  const columns = [
    {
      title: '题目',
      ellipsis: true,
      render: (_: any, record: QuizRecord & { question: Question }) => (
        <Tooltip title={record.question.content} placement="topLeft">
          <Text ellipsis style={{ fontSize: 13, color: '#cbd5e1', display: 'block', margin: 0 }}>
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
      title: '操作', width: 120,
      render: (_: any, record: QuizRecord & { question: Question }) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            onClick={() => { setSelectedRecord(record); setDetailVisible(true) }}
            style={{ color: '#6366f1', padding: 0 }}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDeleteRecord(record.question.id)}
            style={{ padding: 0 }}
          >
            移除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#e2e8f0', fontWeight: 700 }}>
            错题本 📝
          </Title>
          <Text style={{ color: '#64748b', marginTop: 4, display: 'block' }}>
            回顾错题，强化薄弱点
          </Text>
        </div>
        <Space>
          <Popconfirm
            title="确定要清空错题本吗？"
            description="这将删除所有的错题记录和它们的复习计划，此操作不可恢复！"
            onConfirm={() => {
              clearWrongBook()
              loadData()
            }}
            okText="确定清空"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger style={{ borderRadius: 8 }} disabled={wrongRecords.length === 0}>
              清空错题本
            </Button>
          </Popconfirm>

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
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={12}>
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
        <Col xs={24} md={12}>
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
      </Row>

      {/* 知识点筛选 + 错题列表 */}
      <Card
        bordered={false}
        style={{ borderRadius: 14 }}
        title={
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, whiteSpace: 'normal', padding: '8px 0' }}>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>错题列表</span>
            <Select
              value={selectedType}
              onChange={setSelectedType}
              allowClear
              placeholder="按题型筛选"
              style={{ width: 140, fontWeight: 400 }}
              size="small"
            >
              {Object.entries(typeLabels).map(([type, label]) => (
                <Option key={type} value={type}>{label}</Option>
              ))}
            </Select>
            <Input
              prefix={<SearchOutlined style={{ color: '#64748b' }} />}
              placeholder="搜索题目内容"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
              style={{ width: 180 }}
              size="small"
            />
            {selectedRowKeys.length > 0 && (
              <Space>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  size="small"
                  onClick={() => {
                    setPracticeType('selected')
                    setPracticeModalVisible(true)
                  }}
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none' }}
                >
                  重做选中 ({selectedRowKeys.length})
                </Button>
                <Button icon={<StarOutlined />} size="small" onClick={() => {
                  const favIds = getFavorites()
                  let addedCount = 0
                  selectedRowKeys.forEach(id => {
                    const record = wrongRecords.find(r => r.id === Number(id))
                    if (record && !favIds.includes(record.question_id)) {
                      toggleFavorite(record.question_id)
                      addedCount++
                    }
                  })
                  setSelectedRowKeys([])
                  if (addedCount > 0) {
                    message.success(`成功收藏了 ${addedCount} 道错题`)
                  } else {
                    message.info('选中的错题已全部在收藏夹中')
                  }
                }}>
                  批量收藏
                </Button>
                <Popconfirm
                  title="批量移除"
                  description={`确定要移除选中的 ${selectedRowKeys.length} 道错题吗？`}
                  onConfirm={() => {
                    selectedRowKeys.forEach(id => {
                      const record = wrongRecords.find(r => r.id === Number(id))
                      if (record) removeQuestionFromWrongBook(record.question_id)
                    })
                    setSelectedRowKeys([])
                    loadData()
                    message.success(`成功移除了 ${selectedRowKeys.length} 道错题`)
                  }}
                  okText="确定"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger size="small" icon={<DeleteOutlined />}>批量移除</Button>
                </Popconfirm>
              </Space>
            )}
          </div>
        }
      >
        {wrongRecords.length > 0 ? (
          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: (newSelectedRowKeys: React.Key[]) => {
                setSelectedRowKeys(newSelectedRowKeys)
              }
            }}
            rowKey="id"
            columns={columns}
            dataSource={wrongRecords}
            pagination={{
              defaultPageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: total => `共 ${total} 条`,
              style: { marginTop: 12 }
            }}
            size="small"
            scroll={{ x: 850, y: 500 }}
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

      {/* 练习选项配置 Modal */}
      <Modal
        title={<span style={{ color: '#e2e8f0' }}>开始练习配置</span>}
        open={practiceModalVisible}
        onOk={handlePracticeConfirm}
        onCancel={() => setPracticeModalVisible(false)}
        okText="开始练习"
        cancelText="取消"
        width={360}
      >
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#e2e8f0' }}>打乱题目顺序</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>打乱所选题目的做题顺序</div>
            </div>
            <Switch
              checked={shuffleQuestions}
              onChange={setShuffleQuestions}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#e2e8f0' }}>打乱选项顺序</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>打乱选择题的选项展示顺序</div>
            </div>
            <Switch
              checked={shuffleOptions}
              onChange={setShuffleOptions}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </div>
        </div>
      </Modal>

      <FloatButton.BackTop style={{ right: '50%', transform: 'translateX(50%)', bottom: 24 }} visibilityHeight={100} target={() => document.querySelector('.ant-table-body') || window as any} />
    </div>
  )
}

export default WrongBook
