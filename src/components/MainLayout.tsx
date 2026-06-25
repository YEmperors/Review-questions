import React, { useState, useEffect } from 'react'
import { Layout, Menu, Typography, Badge, Tooltip } from 'antd'
import {
  DashboardOutlined,
  DatabaseOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  RobotOutlined,
  SettingOutlined,
  StarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { getWrongQuestionsWithQuestions } from '../db/repositories'

const { Sider, Content } = Layout
const { Text } = Typography

interface MainLayoutProps {
  children: React.ReactNode
}

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '学习概览' },
  { key: '/bank', icon: <DatabaseOutlined />, label: '题库管理' },
  { key: '/quiz-setup', icon: <PlayCircleOutlined />, label: '开始刷题' },
  { key: '/wrong-book', icon: <FileTextOutlined />, label: '错题本' },
  { key: '/favorites', icon: <StarOutlined />, label: '收藏夹' },
  { key: '/ai-quiz', icon: <RobotOutlined />, label: 'AI 出题' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [wrongCount, setWrongCount] = useState(0)

  useEffect(() => {
    setWrongCount(getWrongQuestionsWithQuestions().length)
  }, [location.pathname])

  const siderStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, #13131f 0%, #0f0f1a 100%)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    position: 'relative',
    overflow: 'visible',
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#0f0f14' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={siderStyle}
        width={220}
        collapsedWidth={64}
        trigger={null}
      >
        {/* Logo Area */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          gap: 10,
          cursor: 'pointer',
          transition: 'all 0.3s',
        }} onClick={() => navigate('/dashboard')}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
            boxShadow: '0 0 20px rgba(99,102,241,0.4)',
          }}>
            🧠
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontWeight: 700,
                fontSize: 15,
                color: '#e2e8f0',
                letterSpacing: '-0.3px',
                whiteSpace: 'nowrap',
              }}>
                智能刷题
              </div>
              <div style={{ fontSize: 11, color: '#6366f1', whiteSpace: 'nowrap' }}>
                AI 学习助手
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '12px 8px',
            gap: 4,
          }}
          items={menuItems.map(item => {
            const hasWrong = item.key === '/wrong-book' && wrongCount > 0
            return {
              key: item.key,
              icon: (
                <span style={{ fontSize: 16 }}>
                  {hasWrong && collapsed ? (
                    <Badge count={wrongCount} size="small" offset={[4, -2]}>
                      {item.icon}
                    </Badge>
                  ) : item.icon}
                </span>
              ),
              label: collapsed ? null : (
                <span style={{ fontWeight: location.pathname === item.key ? 600 : 400 }}>
                  {hasWrong && !collapsed ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.label}
                      <Badge count={wrongCount} size="small" />
                    </span>
                  ) : item.label}
                </span>
              ),
              style: {
                borderRadius: 8,
                marginBottom: 2,
                height: 42,
                lineHeight: '42px',
                color: location.pathname === item.key ? '#818cf8' : '#94a3b8',
                transition: 'all 0.2s',
              }
            }
          })}
          onClick={({ key }) => navigate(key)}
        />

        {/* Bottom Controls */}
        <div style={{
          position: 'absolute',
          bottom: 48,
          left: 0,
          right: 0,
          padding: '0 8px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 8,
        }}>
          <Tooltip title={collapsed ? (collapsed ? '展开菜单' : '') : ''} placement="right">
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '10px 16px',
                cursor: 'pointer',
                borderRadius: 8,
                color: '#64748b',
                gap: 10,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              {!collapsed && <Text style={{ color: 'inherit', fontSize: 13 }}>收起菜单</Text>}
            </div>
          </Tooltip>
        </div>

        {/* Version */}
        {!collapsed && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#374151',
            fontSize: 11,
          }}>
            v1.0.0
          </div>
        )}
      </Sider>

      <Layout style={{ background: 'transparent' }}>
        <Content style={{
          margin: 0,
          padding: '24px 28px',
          overflow: 'auto',
          height: '100vh',
          background: 'transparent',
          position: 'relative',
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'fixed',
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />
          <div style={{
            position: 'fixed',
            bottom: -200,
            left: '20%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />

          <div style={{ position: 'relative', zIndex: 1, animation: 'fadeInUp 0.3s ease' }}>
            {children}
          </div>
        </Content>
      </Layout>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ant-menu-item:hover {
          background: rgba(99,102,241,0.08) !important;
          color: #a5b4fc !important;
        }
        .ant-menu-item-selected {
          background: rgba(99,102,241,0.15) !important;
        }
        .ant-card {
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .ant-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
        }
      `}</style>
    </Layout>
  )
}

export default MainLayout
