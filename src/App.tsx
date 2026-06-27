import { lazy, Suspense, useEffect, useState } from 'react'
import { ConfigProvider, theme, Spin, message, Button, Space, Typography } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import ErrorBoundary from './components/ErrorBoundary'
import dbManager from './db'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const QuestionBank = lazy(() => import('./pages/QuestionBank'))
const Quiz = lazy(() => import('./pages/Quiz'))
const QuizSetup = lazy(() => import('./pages/QuizSetup'))
const QuizResult = lazy(() => import('./pages/QuizResult'))
const WrongBook = lazy(() => import('./pages/WrongBook'))
const AIQuiz = lazy(() => import('./pages/AIQuiz'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Settings = lazy(() => import('./pages/Settings'))

const App: React.FC = () => {
  const [ready, setReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [msgApi, contextHolder] = message.useMessage()

  const [showSetup, setShowSetup] = useState(false)

  const initDb = () => {
    dbManager.init()
      .then(() => setReady(true))
      .catch((err) => {
        console.error('Database init failed:', err)
        setInitError(err.message || String(err))
        msgApi.error('数据库初始化失败')
      })
  }

  useEffect(() => {
    const isTauri = !!(window as any).__TAURI__
    const initialized = localStorage.getItem('APP_INITIALIZED')
    if (isTauri && !initialized) {
      setShowSetup(true)
    } else {
      initDb()
    }
  }, [])

  const handleSetupDefault = () => {
    localStorage.setItem('APP_INITIALIZED', '1')
    setShowSetup(false)
    initDb()
  }

  const handleSetupCustom = async () => {
    try {
      const { open } = await import('@tauri-apps/api/dialog')
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择数据保存位置'
      })
      if (selected && typeof selected === 'string') {
        localStorage.setItem('APP_DB_DIR', selected)
        localStorage.setItem('APP_INITIALIZED', '1')
        setShowSetup(false)
        initDb()
      }
    } catch (e) {
      console.error(e)
      msgApi.error('选择目录失败')
    }
  }

  const handleSetupDocDir = async () => {
    try {
      const { documentDir, join } = await import('@tauri-apps/api/path')
      const doc = await documentDir()
      const path = await join(doc, 'SmartQuizApp')
      localStorage.setItem('APP_DB_DIR', path)
      localStorage.setItem('APP_INITIALIZED', '1')
      setShowSetup(false)
      initDb()
    } catch (e) {
      console.error(e)
      msgApi.error('配置文档目录失败')
    }
  }

  // 窗口关闭前同步保存数据库
  useEffect(() => {
    const handleBeforeUnload = () => {
      dbManager.saveNowSync()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  if (!ready) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f0f14 0%, #1a1a2e 50%, #16213e 100%)',
        gap: 24
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          animation: 'pulse-glow 2s ease-in-out infinite',
          boxShadow: '0 0 40px rgba(99,102,241,0.5)'
        }}>
          🧠
        </div>
        {initError ? (
          <div style={{ color: '#ef4444', fontSize: 16, textAlign: 'center', padding: '0 20px' }}>
            <div>数据库加载失败：</div>
            <div style={{ marginTop: 8, fontFamily: 'monospace', opacity: 0.8 }}>{initError}</div>
          </div>
        ) : showSetup ? (
          <div style={{ background: '#1e1e2e', padding: 32, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', maxWidth: 450, textAlign: 'center' }}>
            <Typography.Title level={4} style={{ color: '#e2e8f0', marginTop: 0 }}>首次启动配置</Typography.Title>
            <Typography.Paragraph style={{ color: '#94a3b8', marginBottom: 24 }}>
              请选择您的刷题数据保存位置。推荐使用“文档目录”，便于日后查找、备份和迁移。
            </Typography.Paragraph>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button type="primary" onClick={handleSetupDocDir} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', width: '100%', height: 38 }}>
                使用文档目录（推荐，便于备份）
              </Button>
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <Button onClick={handleSetupDefault} style={{ flex: 1, height: 38 }}>系统默认位置</Button>
                <Button onClick={handleSetupCustom} style={{ flex: 1, height: 38 }}>自定义路径</Button>
              </div>
            </Space>
          </div>
        ) : (
          <>
            <Spin size="large" />
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>正在加载数据库...</div>
          </>
        )}
      </div>
    )
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          colorBgContainer: '#1e1e2e',
          colorBgElevated: '#252535',
          colorBgLayout: '#0f0f14',
          colorBorder: 'rgba(255,255,255,0.08)',
          colorBorderSecondary: 'rgba(255,255,255,0.05)',
          borderRadius: 10,
          borderRadiusLG: 14,
          fontSize: 14,
          colorText: '#e2e8f0',
          colorTextSecondary: '#94a3b8',
          colorTextTertiary: '#64748b',
          colorSuccess: '#22c55e',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorInfo: '#6366f1',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          boxShadowSecondary: '0 2px 12px rgba(0,0,0,0.3)',
        },
        components: {
          Menu: {
            colorItemBg: 'transparent',
            colorSubItemBg: 'transparent',
            colorItemBgSelected: 'rgba(99,102,241,0.15)',
            colorItemTextSelected: '#818cf8',
            colorActiveBarWidth: 3,
            colorActiveBarBorderSize: 0,
          },
          Card: {
            colorBgContainer: '#1e1e2e',
            boxShadowTertiary: '0 2px 12px rgba(0,0,0,0.3)',
          },
          Table: {
            colorBgContainer: '#1e1e2e',
            headerBg: '#252535',
            rowHoverBg: 'rgba(99,102,241,0.06)',
          },
          Button: {
            defaultBg: 'rgba(255,255,255,0.05)',
            defaultBorderColor: 'rgba(255,255,255,0.1)',
          },
          Input: {
            colorBgContainer: '#252535',
            activeBorderColor: '#6366f1',
          },
          Select: {
            colorBgContainer: '#252535',
            optionSelectedBg: 'rgba(99,102,241,0.2)',
          },
          Modal: {
            contentBg: '#1e1e2e',
            headerBg: '#1e1e2e',
          },
          Progress: {
            defaultColor: '#6366f1',
          },
          Tag: {
            defaultBg: 'rgba(99,102,241,0.15)',
            defaultColor: '#818cf8',
          },
          Statistic: {
            contentFontSize: 28,
          },
          Slider: {
            railBg: 'rgba(255,255,255,0.1)',
            trackBg: '#6366f1',
          },
        }
      }}
    >
      {contextHolder}
      <ErrorBoundary>
        <Router>
          <MainLayout>
            <Suspense fallback={
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
                <Spin size="large" />
              </div>
            }>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/bank" element={<QuestionBank />} />
                <Route path="/quiz-setup" element={<QuizSetup />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/quiz-result" element={<QuizResult />} />
                <Route path="/wrong-book" element={<WrongBook />} />
                <Route path="/ai-quiz" element={<AIQuiz />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>
          </MainLayout>
        </Router>
      </ErrorBoundary>
    </ConfigProvider>
  )
}

export default App
