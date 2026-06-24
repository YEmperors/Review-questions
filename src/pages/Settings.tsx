import React, { useEffect, useState } from 'react'
import {
  Card, Form, Input, InputNumber, Select, Slider, Button, Space, Typography,
  message, Divider, Alert, Tabs
} from 'antd'
import {
  SettingOutlined, ApiOutlined, DatabaseOutlined,
  SaveOutlined, CheckCircleOutlined, DownloadOutlined
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { updateAISettings, getAISettings, setStudyGoal, getStudyGoal, exportAllQuestions, exportAllQuizRecords, createQuestionsBatch, getQuestionBanks, createQuestionBank } from '../db/repositories'
import dbManager from '../db'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

const Settings: React.FC = () => {
  const [aiForm] = Form.useForm()
  const [goalForm] = Form.useForm()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    const settings = getAISettings()
    aiForm.setFieldsValue({
      api_url: settings.api_url,
      api_key: settings.api_key,
      model_name: settings.model_name,
      temperature: settings.temperature
    })
    const goal = getStudyGoal()
    goalForm.setFieldsValue({ daily_goal: goal.target_count })
  }

  const handleSaveAI = async () => {
    try {
      const values = await aiForm.validateFields()
      updateAISettings({
        api_url: values.api_url,
        api_key: values.api_key,
        model_name: values.model_name,
        temperature: values.temperature
      })
      setSaved(true)
      message.success('AI 设置已保存')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // 表单验证失败
    }
  }

  const handleTestAI = async () => {
    try {
      const values = await aiForm.validateFields()
      updateAISettings({
        api_url: values.api_url,
        api_key: values.api_key,
        model_name: values.model_name,
        temperature: values.temperature
      })

      const response = await fetch(values.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${values.api_key}`
        },
        body: JSON.stringify({
          model: values.model_name,
          temperature: values.temperature,
          messages: [
            { role: 'user', content: '请回复"连接成功"' }
          ],
          max_tokens: 20
        })
      })

      if (response.ok) {
        message.success('AI API 连接测试成功！')
      } else {
        const err = await response.text()
        message.error(`连接失败: ${response.status} - ${err.slice(0, 100)}`)
      }
    } catch (err: any) {
      message.error('连接失败: ' + err.message)
    }
  }

  const handleSaveGoal = async () => {
    try {
      const values = await goalForm.validateFields()
      setStudyGoal(values.daily_goal)
      message.success('学习目标已保存')
    } catch {
      // 表单验证失败
    }
  }

  const handleSaveNow = async () => {
    const success = await dbManager.saveNow()
    if (success) {
      message.success('数据库已保存到磁盘')
    } else {
      message.error('数据库保存失败')
    }
  }

  const handleExportQuestions = () => {
    try {
      const questions = exportAllQuestions()
      const data = questions.map(q => ({
        ID: q.id,
        题型: q.type,
        题目: q.content,
        选项: q.options ? JSON.parse(q.options).join('\n') : '',
        答案: q.answer,
        解析: q.analysis || '',
        难度: q.difficulty === 1 ? '简单' : q.difficulty === 2 ? '中等' : '困难',
        知识点: q.knowledge_point,
        标签: q.tags ? JSON.parse(q.tags).join(',') : ''
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '题目')
      XLSX.writeFile(wb, '题目导出.xlsx')
      message.success(`成功导出 ${data.length} 道题目`)
    } catch (err: any) {
      message.error('导出失败：' + err.message)
    }
  }

  const handleExportRecords = () => {
    try {
      const records = exportAllQuizRecords()
      const data = records.map((r: any) => ({
        ID: r.id,
        题目: r.question_content,
        题型: r.question_type,
        知识点: r.knowledge_point,
        我的答案: r.user_answer,
        是否正确: r.is_correct === 1 ? '正确' : r.is_correct === 2 ? '待评阅' : '错误',
        用时_秒: r.time_spent,
        模式: r.quiz_mode,
        时间: r.created_at
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '答题记录')
      XLSX.writeFile(wb, '答题记录导出.xlsx')
      message.success(`成功导出 ${data.length} 条记录`)
    } catch (err: any) {
      message.error('导出失败：' + err.message)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={3}><SettingOutlined /> 设置</Title>

      <Tabs
        items={[
          {
            key: 'ai',
            label: <span><ApiOutlined /> AI 配置</span>,
            children: (
              <Card>
                <Alert
                  message="支持 OpenAI、DeepSeek、Ollama 等 API"
                  description="请确保 API 地址和 Key 正确。使用 Ollama 本地模型时，API Key 可留空。"
                  type="info"
                  showIcon
                  style={{ marginBottom: 24 }}
                />

                <Form form={aiForm} layout="vertical">
                  <Form.Item name="api_url" label="API 地址"
                    rules={[{ required: true, message: '请输入 API 地址' }]}
                    extra="OpenAI: https://api.openai.com/v1/chat/completions | DeepSeek: https://api.deepseek.com/chat/completions | Ollama: http://localhost:11434/v1/chat/completions"
                  >
                    <Input placeholder="https://api.openai.com/v1/chat/completions" />
                  </Form.Item>

                  <Form.Item name="api_key" label="API Key"
                    extra="OpenAI/DeepSeek 填入 API Key，Ollama 本地模型可留空"
                  >
                    <Input.Password placeholder="sk-..." />
                  </Form.Item>

                  <Form.Item name="model_name" label="模型名称"
                    extra="OpenAI: gpt-3.5-turbo / gpt-4 | DeepSeek: deepseek-chat | Ollama: llama3 等"
                  >
                    <Select showSearch allowClear placeholder="选择或输入模型名称">
                      <Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Option>
                      <Option value="gpt-4">GPT-4</Option>
                      <Option value="gpt-4o">GPT-4o</Option>
                      <Option value="deepseek-chat">DeepSeek Chat</Option>
                      <Option value="deepseek-coder">DeepSeek Coder</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item name="temperature" label="Temperature（创造性）">
                    <Slider min={0} max={2} step={0.1} marks={{ 0: '精确', 1: '平衡', 2: '创造' }} />
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveAI}>
                        保存设置
                      </Button>
                      <Button onClick={handleTestAI}>
                        测试连接
                      </Button>
                      {saved && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />}
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            )
          },
          {
            key: 'goal',
            label: <span><SettingOutlined /> 学习目标</span>,
            children: (
              <Card>
                <Form form={goalForm} layout="vertical">
                  <Form.Item name="daily_goal" label="每日目标题数" rules={[{ required: true }]}>
                    <InputNumber min={1} max={500} style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveGoal}>
                      保存目标
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            )
          },
          {
            key: 'data',
            label: <span><DatabaseOutlined /> 数据管理</span>,
            children: (
              <Card>
                <Form layout="vertical">
                  <Form.Item label="数据存储">
                    <Text type="secondary">
                      数据存储在本地 SQLite 数据库中，自动每 3 秒保存一次。
                    </Text>
                  </Form.Item>

                  <Form.Item label="手动保存">
                    <Button icon={<SaveOutlined />} onClick={handleSaveNow}>
                      立即保存数据库
                    </Button>
                  </Form.Item>

                  <Divider />

                  <Form.Item label="快速体验">
                    <Space direction="vertical">
                      <Button onClick={loadSampleData}>
                        📥 导入示例题库
                      </Button>
                      <Text type="secondary">
                        导入包含各科目的示例题目，方便快速体验
                      </Text>
                    </Space>
                  </Form.Item>

                  <Divider />

                  <Form.Item label="数据导出">
                    <Space direction="vertical">
                      <Space>
                        <Button icon={<DownloadOutlined />} onClick={handleExportQuestions}>
                          导出题目 (Excel)
                        </Button>
                        <Button icon={<DownloadOutlined />} onClick={handleExportRecords}>
                          导出答题记录 (Excel)
                        </Button>
                      </Space>
                      <Text type="secondary">
                        将所有题目和答题记录导出为 Excel 文件
                      </Text>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            )
          }
        ]}
      />
    </div>
  )
}

/** 导入示例数据 */
function loadSampleData() {
  try {
    // 获取或创建示例题库
    const banks = getQuestionBanks()
    let bankId = banks.find(b => b.name === '示例题库')?.id
    
    if (!bankId) {
      bankId = createQuestionBank('示例题库', null, '系统自带的测试题目')
    }

    const sampleQuestions = [
      {
        type: 'single', content: 'HTTP 状态码 404 表示什么？',
        options: JSON.stringify(['服务器内部错误', '请求的资源未找到', '请求被拒绝', '服务不可用']),
        answer: 'B', analysis: '404 Not Found 表示服务器找不到请求的资源。',
        difficulty: 1, knowledge_point: 'HTTP协议', tags: '["基础","高频"]', bank_id: bankId
      },
      {
        type: 'single', content: 'TCP 三次握手的第二步，服务器发送的报文标志位是？',
        options: JSON.stringify(['SYN', 'ACK', 'SYN+ACK', 'FIN']),
        answer: 'C', analysis: '三次握手：客户端发SYN → 服务器发SYN+ACK → 客户端发ACK',
        difficulty: 2, knowledge_point: 'TCP协议', tags: '["网络"]', bank_id: bankId
      },
      {
        type: 'multiple', content: '以下哪些是 JavaScript 的基本数据类型？',
        options: JSON.stringify(['String', 'Number', 'Array', 'Boolean', 'Object']),
        answer: 'ABD', analysis: 'JS基本类型：String, Number, Boolean, Null, Undefined, Symbol, BigInt。Array和Object是引用类型。',
        difficulty: 2, knowledge_point: 'JavaScript', tags: '["前端","基础"]', bank_id: bankId
      },
      {
        type: 'judge', content: 'Python 中列表和元组都是可变类型。',
        options: JSON.stringify(['对', '错']),
        answer: 'B', analysis: '元组(tuple)是不可变的，列表(list)是可变的。',
        difficulty: 1, knowledge_point: 'Python', tags: '["编程"]', bank_id: bankId
      },
      {
        type: 'single', content: '在二叉搜索树中查找一个元素的平均时间复杂度是？',
        options: JSON.stringify(['O(1)', 'O(log n)', 'O(n)', 'O(n log n)']),
        answer: 'B', analysis: '二叉搜索树在平衡情况下，查找平均时间复杂度为 O(log n)。',
        difficulty: 2, knowledge_point: '数据结构', tags: '["算法"]', bank_id: bankId
      },
      {
        type: 'single', content: 'SQL 中用于删除表数据的命令是？',
        options: JSON.stringify(['DROP', 'DELETE', 'REMOVE', 'TRUNCATE']),
        answer: 'B', analysis: 'DELETE 用于删除表中的数据行。DROP 删除表本身，TRUNCATE 也是删除全部数据但更快。',
        difficulty: 1, knowledge_point: 'SQL', tags: '["数据库"]', bank_id: bankId
      },
      {
        type: 'fill', content: 'Git 中，将远程仓库的代码拉取到本地的命令是 git ____。',
        options: null,
        answer: 'pull', analysis: 'git pull 从远程仓库拉取并合并代码。',
        difficulty: 1, knowledge_point: 'Git', tags: '["工具"]', bank_id: bankId
      },
      {
        type: 'single', content: '操作系统中，进程和线程的主要区别是？',
        options: JSON.stringify(['进程更快', '线程共享进程的资源', '线程更安全', '进程不能包含线程']),
        answer: 'B', analysis: '线程是进程内的执行单元，同一进程的线程共享内存空间和资源。',
        difficulty: 2, knowledge_point: '操作系统', tags: '["基础"]', bank_id: bankId
      },
      {
        type: 'short_answer', content: '请简述什么是 RESTful API，并列举主要的 HTTP 方法。',
        options: null,
        answer: 'RESTful API 是基于 REST 架构风格的 Web API，使用 HTTP 方法进行 CRUD 操作。主要方法：GET(查询)、POST(创建)、PUT(更新)、DELETE(删除)、PATCH(部分更新)。',
        analysis: 'REST 的核心原则：无状态、统一接口、资源导向。',
        difficulty: 2, knowledge_point: 'Web开发', tags: '["后端","高频"]', bank_id: bankId
      },
      {
        type: 'single', content: '快速排序算法在最坏情况下的时间复杂度是？',
        options: JSON.stringify(['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)']),
        answer: 'C', analysis: '当每次选择的枢轴都是最大或最小值时（如已排序数组），快排退化为 O(n²)。',
        difficulty: 3, knowledge_point: '算法', tags: '["排序","高频"]', bank_id: bankId
      },
      {
        type: 'single', content: 'React 中，用于在函数组件中管理状态的 Hook 是？',
        options: JSON.stringify(['useEffect', 'useState', 'useContext', 'useReducer']),
        answer: 'B', analysis: 'useState 是 React 中最基本的 Hook，用于在函数组件中声明状态变量。',
        difficulty: 1, knowledge_point: 'React', tags: '["前端"]', bank_id: bankId
      },
      {
        type: 'judge', content: 'IPv6 地址长度为 128 位。',
        options: JSON.stringify(['对', '错']),
        answer: 'A', analysis: 'IPv4 是 32 位，IPv6 是 128 位，用 8 组十六进制数表示。',
        difficulty: 1, knowledge_point: '网络', tags: '["基础"]', bank_id: bankId
      }
    ]
    createQuestionsBatch(sampleQuestions as any)
    message.success('已导入 12 道示例题目')
  } catch (err: any) {
    message.error('导入示例数据失败：' + err.message)
  }
}

export default Settings
