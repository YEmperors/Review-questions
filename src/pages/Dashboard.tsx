import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Typography, List, Tag, Empty, Skeleton, Progress, Button, Space } from 'antd'
import {
  CheckCircleOutlined,
  BookOutlined,
  FireOutlined,
  TrophyOutlined,
  CalendarOutlined,
  BulbOutlined,
  AimOutlined,
  RocketOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Legend, Area, AreaChart
} from 'recharts'
import { getStats, getDailyStats, getKnowledgePointStats, getDueReviewQuestions, getQuestionsByIds, getStudyGoal } from '../db/repositories'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

// 统计卡片组件
const StatCard: React.FC<{
  title: string
  value: number | string
  suffix?: string
  icon: React.ReactNode
  color: string
  bgColor: string
  trend?: string
}> = ({ title, value, suffix, icon, color, bgColor, trend }) => (
  <Card
    bordered={false}
    style={{
      background: `linear-gradient(135deg, ${bgColor} 0%, rgba(30,30,46,0.8) 100%)`,
      height: '100%',
      width: '100%',
      flex: 1,
      borderRadius: 16,
    }}
    bodyStyle={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    className="stat-card"
  >
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 80, height: 80,
      background: `radial-gradient(circle at top right, ${color}20, transparent)`,
      borderRadius: '0 16px 0 100%',
    }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
      <div>
        <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>{title}</Text>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.1 }}>{value}</span>
          {suffix && <span style={{ fontSize: 13, color: '#94a3b8' }}>{suffix}</span>}
        </div>
        {trend && <Text style={{ color, fontSize: 12, marginTop: 6, display: 'block' }}>{trend}</Text>}
      </div>
      <div className="stat-icon" style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, fontSize: 20, flexShrink: 0,
      }}>
        {icon}
      </div>
    </div>
  </Card>
)

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [dailyData, setDailyData] = useState<any[]>([])
  const [kpData, setKpData] = useState<any[]>([])
  const [dueQuestions, setDueQuestions] = useState<any[]>([])
  const [goal, setGoal] = useState<{ target_count: number }>({ target_count: 20 })

  useEffect(() => {
    refresh()
  }, [])

  const refresh = () => {
    setLoading(true)
    try {
      const s = getStats()
      setStats(s)
      setDailyData(getDailyStats(14))
      setKpData(getKnowledgePointStats())
      setGoal(getStudyGoal())

      const dueIds = getDueReviewQuestions()
      if (dueIds.length > 0) {
        setDueQuestions(getQuestionsByIds(dueIds).slice(0, 5))
      } else {
        setDueQuestions([])
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 24 }} />
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {[1,2,3,4].map(i => (
            <Col xs={24} sm={12} md={12} lg={6} key={i}>
              <Card><Skeleton active paragraph={{ rows: 1 }} /></Card>
            </Col>
          ))}
        </Row>
        <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
      </div>
    )
  }

  if (!stats) return null

  const accuracy = stats.totalRecords > 0
    ? Math.round(stats.correctCount / stats.totalRecords * 100)
    : 0

  const goalProgress = goal.target_count > 0
    ? Math.min(100, Math.round((stats.todayCount / goal.target_count) * 100))
    : 0
  const goalAchieved = stats.todayCount >= goal.target_count

  const weakKps = kpData.filter(kp => kp.rate < 60 && kp.total >= 3).sort((a, b) => a.rate - b.rate)

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#252535',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
        }}>
          <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
          {payload.map((p: any, i: number) => (
            <div key={i} style={{ color: p.color }}>
              {p.name}: {p.value}
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="animate-float-up">
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#e2e8f0', fontWeight: 700 }}>
            学习概览 📊
          </Title>
          <Text style={{ color: '#64748b', marginTop: 4, display: 'block', fontSize: 13 }}>
            {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<RocketOutlined />}
          onClick={() => navigate('/quiz-setup')}
          className="gradient-btn"
          style={{
            backgroundImage: 'linear-gradient(to right, #6366f1 0%, #8b5cf6 51%, #6366f1 100%)',
            border: 'none',
            borderRadius: 12,
            height: 40,
            padding: '0 24px',
            fontSize: 15,
            fontWeight: 600,
            boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
          }}
        >
          开始刷题
        </Button>
      </div>

      {/* 今日目标 */}
      <div className="animate-delay-1 animate-float-up" style={{ animationFillMode: 'both' }}>
      <Card
        bordered={false}
        className="glass-card"
        style={{
          marginBottom: 20,
          borderRadius: 16,
          background: goalAchieved
            ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(30,30,46,0.7) 100%)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(30,30,46,0.7) 100%)',
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: goalAchieved ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>
              {goalAchieved ? '🎉' : '🎯'}
            </div>
            <div>
              <Text strong style={{ fontSize: 15, color: '#e2e8f0' }}>
                {goalAchieved ? '今日目标已达成！' : '今日学习目标'}
              </Text>
              <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>
                已完成 <span style={{ color: goalAchieved ? '#22c55e' : '#818cf8', fontWeight: 600 }}>{stats.todayCount}</span> / {goal.target_count} 题
              </div>
            </div>
          </div>
          <div style={{ flex: 1, maxWidth: 320 }}>
            <Progress
              percent={goalProgress}
              status={goalAchieved ? 'success' : 'active'}
              strokeColor={goalAchieved ? '#22c55e' : { from: '#6366f1', to: '#8b5cf6' }}
              trailColor="rgba(255,255,255,0.06)"
              format={percent => <span style={{ color: goalAchieved ? '#22c55e' : '#818cf8' }}>{percent}%</span>}
            />
          </div>
        </div>
      </Card>
      </div>

      {/* 统计卡片 */}
      <div className="animate-delay-2 animate-float-up" style={{ animationFillMode: 'both' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 20, display: 'flex' }}>
        <Col xs={24} sm={12} md={12} lg={6} style={{ display: 'flex' }}>
          <StatCard
            title="题库总量"
            value={stats.totalQuestions}
            suffix="题"
            icon={<BookOutlined />}
            color="#6366f1"
            bgColor="rgba(99,102,241,0.08)"
          />
        </Col>
        <Col xs={24} sm={12} md={12} lg={6} style={{ display: 'flex' }}>
          <StatCard
            title="已答题目"
            value={stats.answeredQuestions}
            suffix={`题 (${accuracy}%)`}
            icon={<CheckCircleOutlined />}
            color="#22c55e"
            bgColor="rgba(34,197,94,0.08)"
            trend={`正确率 ${accuracy}%`}
          />
        </Col>
        <Col xs={24} sm={12} md={12} lg={6} style={{ display: 'flex' }}>
          <StatCard
            title="今日答题"
            value={stats.todayCount}
            suffix="题"
            icon={<CalendarOutlined />}
            color="#f59e0b"
            bgColor="rgba(245,158,11,0.08)"
          />
        </Col>
        <Col xs={24} sm={12} md={12} lg={6} style={{ display: 'flex' }}>
          <StatCard
            title="连续学习"
            value={stats.streakDays}
            suffix="天"
            icon={<FireOutlined />}
            color={stats.streakDays >= 7 ? '#ef4444' : '#f59e0b'}
            bgColor={stats.streakDays >= 7 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'}
            trend={stats.streakDays >= 7 ? '🔥 连续一周！' : stats.streakDays > 0 ? '坚持下去！' : ''}
          />
        </Col>
      </Row>
      </div>

      <div className="animate-delay-3 animate-float-up" style={{ animationFillMode: 'both' }}>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {/* 答题趋势图 */}
        <Col span={24}>
          <Card
            title={<span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15 }}>📈 近14天答题趋势</span>}
            bordered={false}
            className="glass-card"
            style={{ height: '100%', borderRadius: 16 }}
            bodyStyle={{ paddingTop: 8, paddingBottom: 16 }}
          >
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="correctGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#countGrad)" name="答题数" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="correct" stroke="#22c55e" fill="url(#correctGrad)" name="正确数" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={<span style={{ color: '#64748b' }}>暂无答题记录</span>} style={{ height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
            )}
          </Card>
        </Col>

        {/* 雷达图已移除 */}
      </Row>

      <Row gutter={16}>
        {/* 待复习题目 */}
        {dueQuestions.length > 0 && (
          <Col span={24}>
            <Card
              title={<span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15 }}>🔄 待复习题目</span>}
              bordered={false}
              className="glass-card"
              style={{ borderRadius: 16 }}
              bodyStyle={{ padding: '8px 20px 16px' }}
              extra={
                <Button
                  type="link"
                  size="small"
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigate('/wrong-book')}
                  style={{ color: '#6366f1' }}
                >
                  查看全部
                </Button>
              }
            >
              <List
                size="small"
                dataSource={dueQuestions}
                renderItem={(item: any) => (
                  <List.Item style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'rgba(245,158,11,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#f59e0b', fontSize: 14, flexShrink: 0,
                        }}>
                          <BulbOutlined />
                        </div>
                      }
                      title={
                        <Text ellipsis style={{ maxWidth: 280, fontSize: 13, color: '#cbd5e1' }}>
                          {item.content}
                        </Text>
                      }
                      description={null}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}

        {/* 薄弱点提示已移除 */}


      </Row>
      </div>
    </div>
  )
}

export default Dashboard
