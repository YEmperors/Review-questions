import React from 'react'
import { Result, Button, Typography } from 'antd'

const { Paragraph, Text } = Typography

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * 全局错误边界
 * 捕获子组件树中的渲染错误，避免整个应用白屏
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Application error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: '#f5f5f5'
        }}>
          <Result
            status="error"
            title="应用遇到了问题"
            subTitle="抱歉，程序发生了未预期的错误。您可以重试或刷新页面。"
            extra={[
              <Button type="primary" key="retry" onClick={this.handleRetry}>
                重试
              </Button>,
              <Button key="reload" onClick={this.handleReload}>
                刷新页面
              </Button>
            ]}
          >
            {this.state.error && (
              <div style={{ textAlign: 'left', background: '#fff', padding: 16, borderRadius: 8, marginTop: 16 }}>
                <Paragraph>
                  <Text strong>错误信息：</Text>
                </Paragraph>
                <Paragraph>
                  <Text code style={{ wordBreak: 'break-all' }}>
                    {this.state.error.message}
                  </Text>
                </Paragraph>
              </div>
            )}
          </Result>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
