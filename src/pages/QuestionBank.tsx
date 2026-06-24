import React, { useEffect, useState } from 'react'
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, Space,
  Upload, message, Popconfirm, Row, Col, Typography, Radio
} from 'antd'
import {
  PlusOutlined, UploadOutlined, DeleteOutlined, EditOutlined,
  DatabaseOutlined, DownloadOutlined, StarOutlined, StarFilled
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
import {
  getQuestionBanks, getQuestions, createQuestion, createQuestionsBatch,
  updateQuestion, deleteQuestion, deleteQuestionsBatch, createQuestionBank, deleteQuestionBank,
  getAllQuestionCounts, getKnowledgePoints, toggleFavorite, getFavorites
} from '../db/repositories'
import { Question, QuestionBank, QuestionType, Difficulty } from '../types'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const typeLabels: Record<string, string> = {
  single: '单选题', multiple: '多选题', judge: '判断题',
  fill: '填空题', short_answer: '简答题', coding: '编程题'
}
const diffLabels: Record<number, { text: string; color: string }> = {
  1: { text: '简单', color: 'green' },
  2: { text: '中等', color: 'blue' },
  3: { text: '困难', color: 'red' }
}

const QuestionBankPage: React.FC = () => {
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedBank, setSelectedBank] = useState<number | undefined>(undefined)
  const [knowledgePoints, setKnowledgePoints] = useState<string[]>([])
  const [bankCounts, setBankCounts] = useState<Record<number, number>>({ 0: 0 })
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [bankModalVisible, setBankModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [bankForm] = Form.useForm()
  const [filterType, setFilterType] = useState<string | undefined>(undefined)
  const [filterKp, setFilterKp] = useState<string | undefined>(undefined)
  const [favSet, setFavSet] = useState<Set<number>>(new Set())
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const refreshFavorites = () => {
    setFavSet(new Set(getFavorites()))
  }

  const loadBanks = () => {
    setBanks(getQuestionBanks())
    setBankCounts(getAllQuestionCounts())
  }

  const loadQuestions = () => {
    const types = filterType ? [filterType as QuestionType] : undefined
    setQuestions(getQuestions({
      bankId: selectedBank,
      types,
      knowledgePoint: filterKp
    }))
    setKnowledgePoints(getKnowledgePoints(selectedBank))
    setBankCounts(getAllQuestionCounts())
  }

  useEffect(() => {
    loadBanks()
  }, [])

  useEffect(() => {
    loadQuestions()
  }, [selectedBank, filterType, filterKp])

  // ==================== 题库分类管理 ====================
  const handleAddBank = () => {
    bankForm.validateFields().then(values => {
      try {
        createQuestionBank(values.name, null, values.description)
        loadBanks()
        setBankModalVisible(false)
        bankForm.resetFields()
        message.success('题库创建成功')
      } catch (err) {
        message.error('创建题库失败')
      }
    })
  }

  const handleDeleteBank = (id: number) => {
    try {
      deleteQuestionBank(id)
      if (selectedBank === id) setSelectedBank(undefined)
      loadBanks()
      message.success('题库已删除')
    } catch (err) {
      message.error('删除题库失败')
    }
  }

  // ==================== 题目 CRUD ====================
  const handleAddQuestion = () => {
    setEditingQuestion(null)
    form.resetFields()
    form.setFieldsValue({ type: 'single', difficulty: 2, bank_id: selectedBank || 1 })
    setEditModalVisible(true)
  }

  const handleEditQuestion = (record: Question) => {
    setEditingQuestion(record)
    const options = record.options ? JSON.parse(record.options) : []
    const tags = record.tags ? JSON.parse(record.tags) : []
    form.setFieldsValue({
      ...record,
      options_text: Array.isArray(options) ? options.join('\n') : '',
      tags_text: Array.isArray(tags) ? tags.join(',') : ''
    })
    setEditModalVisible(true)
  }

  const handleSaveQuestion = () => {
    form.validateFields().then(values => {
      try {
        const options = values.type === 'single' || values.type === 'multiple' || values.type === 'judge'
          ? JSON.stringify(values.options_text?.split('\n').filter(Boolean) || [])
          : null
        const tags = values.tags_text ? JSON.stringify(values.tags_text.split(',').map((t: string) => t.trim()).filter(Boolean)) : null

        const qData = {
          type: values.type,
          content: values.content,
          options,
          answer: values.answer,
          analysis: values.analysis || null,
          difficulty: values.difficulty,
          knowledge_point: values.knowledge_point,
          tags,
          bank_id: values.bank_id || 1
        }

        if (editingQuestion) {
          updateQuestion({ ...qData, id: editingQuestion.id, created_at: editingQuestion.created_at } as Question)
          message.success('题目已更新')
        } else {
          createQuestion(qData)
          message.success('题目已添加')
        }

        setEditModalVisible(false)
        form.resetFields()
        loadQuestions()
      } catch (err) {
        message.error('保存题目失败')
      }
    })
  }

  const handleDeleteQuestion = (id: number) => {
    try {
      deleteQuestion(id)
      message.success('题目已删除')
      loadQuestions()
    } catch (err) {
      message.error('删除题目失败')
    }
  }

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return
    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedRowKeys.length} 道题目吗？此操作不可恢复。`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        try {
          deleteQuestionsBatch(selectedRowKeys as number[])
          message.success('批量删除成功')
          setSelectedRowKeys([])
          loadQuestions()
        } catch (err) {
          message.error('批量删除失败')
        }
      }
    })
  }

  // ==================== 文件导入 ====================
  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        let jsonData: any[]

        if (file.name.endsWith('.json')) {
          jsonData = JSON.parse(data as string)
        } else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(data, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          jsonData = XLSX.utils.sheet_to_json(sheet)
        } else {
          message.error('不支持的文件格式')
          return
        }

        // 映射导入数据
        const questionsToInsert = jsonData.map((row: any) => {
          const rawOptions = row.options || row.选项
          let parsedOptions: string[] = []

          if (Array.isArray(rawOptions)) {
            parsedOptions = rawOptions
          } else if (typeof rawOptions === 'string') {
            // 支持换行符 \n 或竖线 | 分割
            parsedOptions = rawOptions.split(/[\n|]/).map(s => s.trim()).filter(Boolean)
            // 自动移除用户在 Excel 中手打的 A. B. C. 等标号前缀，避免与系统自带前缀重复
            parsedOptions = parsedOptions.map(opt => opt.replace(/^[A-Z][.、:]\s*/i, ''))
          }

          const options = parsedOptions.length > 0 ? JSON.stringify(parsedOptions) : null

          return {
            type: mapImportType(row.type || row.题型 || 'single'),
            content: row.content || row.题目 || '',
            options,
            answer: String(row.answer || row.答案 || ''),
            analysis: row.analysis || row.解析 || null,
            difficulty: Number(row.difficulty || row.难度 || 2),
            knowledge_point: row.knowledge_point || row.知识点 || '',
            tags: null,
            bank_id: selectedBank || 1
          }
        }).filter(q => q.content)

        if (questionsToInsert.length > 0) {
          createQuestionsBatch(questionsToInsert)
          message.success(`成功导入 ${questionsToInsert.length} 道题目`)
          loadQuestions()
        } else {
          message.warning('未找到有效题目数据')
        }
      } catch (err) {
        console.error(err)
        message.error('文件解析失败')
      } finally {
        setImportModalVisible(false)
      }
    }
    reader.onerror = () => {
      message.error('文件读取失败')
      setImportModalVisible(false)
    }
    reader.readAsArrayBuffer(file)
    return false
  }

  const mapImportType = (type: string): QuestionType => {
    const map: Record<string, QuestionType> = {
      '单选': QuestionType.SINGLE, '单选题': QuestionType.SINGLE, 'single': QuestionType.SINGLE,
      '多选': QuestionType.MULTIPLE, '多选题': QuestionType.MULTIPLE, 'multiple': QuestionType.MULTIPLE,
      '判断': QuestionType.JUDGE, '判断题': QuestionType.JUDGE, 'judge': QuestionType.JUDGE,
      '填空': QuestionType.FILL, '填空题': QuestionType.FILL, 'fill': QuestionType.FILL,
      '简答': QuestionType.SHORT_ANSWER, '简答题': QuestionType.SHORT_ANSWER, 'short_answer': QuestionType.SHORT_ANSWER,
      '编程': QuestionType.CODING, '编程题': QuestionType.CODING, 'coding': QuestionType.CODING,
    }
    return map[type] || QuestionType.SINGLE
  }

  // ==================== 导出模板 ====================
  const handleExportTemplate = () => {
    try {
      const template = [
        { 题型: 'single', 题目: '1+1等于几？', 选项: 'A.1\nB.2\nC.3\nD.4', 答案: 'B', 解析: '1+1=2', 难度: 1, 知识点: '基础数学' },
        { 题型: 'judge', 题目: '地球是圆的', 选项: '对\n错', 答案: '对', 解析: '地球是近似球体', 难度: 1, 知识点: '地理' },
      ]
      const ws = XLSX.utils.json_to_sheet(template)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '题目模板')
      XLSX.writeFile(wb, '刷题导入模板.xlsx')
      message.success('模板已下载')
    } catch (err) {
      message.error('导出模板失败')
    }
  }

  // ==================== 当前题目类型 ====================
  const currentType = Form.useWatch('type', form)

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '题目', dataIndex: 'content', ellipsis: true, width: 300 },
    {
      title: '题型', dataIndex: 'type', width: 80,
      render: (type: string) => <Tag color="blue">{typeLabels[type] || type}</Tag>
    },
    {
      title: '难度', dataIndex: 'difficulty', width: 70,
      render: (d: number) => <Tag color={diffLabels[d]?.color}>{diffLabels[d]?.text}</Tag>
    },
    { title: '知识点', dataIndex: 'knowledge_point', width: 120 },
    { title: '正确答案', dataIndex: 'answer', width: 100, ellipsis: true },
    {
      title: '操作', width: 120,
      render: (_: any, record: Question) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditQuestion(record)} />
          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteQuestion(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Title level={3}>📚 题库管理</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card size="small" title="题库分类">
            <Space wrap>
              <Tag
                color={!selectedBank ? 'blue' : 'default'}
                style={{ cursor: 'pointer', padding: '4px 12px' }}
                onClick={() => setSelectedBank(undefined)}
              >
                全部 ({bankCounts[0] ?? 0})
              </Tag>
              {banks.map(bank => (
                <span key={bank.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Tag
                    color={selectedBank === bank.id ? 'blue' : 'default'}
                    style={{ cursor: 'pointer', padding: '4px 12px' }}
                    onClick={() => setSelectedBank(bank.id)}
                  >
                    {bank.name} ({bankCounts[bank.id] ?? 0})
                  </Tag>
                  <Popconfirm title={`删除题库"${bank.name}"？`} onConfirm={() => handleDeleteBank(bank.id)}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </span>
              ))}
              <Button type="dashed" size="small" icon={<PlusOutlined />}
                onClick={() => { bankForm.resetFields(); setBankModalVisible(true) }}>
                新建题库
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="导入导出">
            <Space>
              <Button icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)}>导入题目</Button>
              <Button icon={<DownloadOutlined />} onClick={handleExportTemplate}>下载模板</Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Text>题型：</Text>
          <Select
            value={filterType}
            onChange={setFilterType}
            allowClear
            placeholder="全部"
            style={{ width: 120 }}
          >
            <Option value="single">单选题</Option>
            <Option value="multiple">多选题</Option>
            <Option value="judge">判断题</Option>
            <Option value="fill">填空题</Option>
            <Option value="short_answer">简答题</Option>
            <Option value="coding">编程题</Option>
          </Select>
          <Text style={{ marginLeft: 16 }}>知识点：</Text>
          <Select
            value={filterKp}
            onChange={setFilterKp}
            allowClear
            placeholder="全部"
            style={{ width: 150 }}
          >
            {knowledgePoints.map(kp => (
              <Option key={kp} value={kp}>{kp}</Option>
            ))}
          </Select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {selectedRowKeys.length > 0 && (
              <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddQuestion}>
              添加题目
            </Button>
          </div>
        </Space>
      </Card>

      {/* 题目列表 */}
      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: newSelectedRowKeys => setSelectedRowKeys(newSelectedRowKeys),
        }}
        rowKey="id"
        columns={columns}
        dataSource={questions}
        pagination={{ pageSize: 20, showTotal: total => `共 ${total} 题` }}
        size="small"
        scroll={{ y: 500 }}
      />

      {/* 新建题库弹窗 */}
      <Modal
        title="新建题库"
        open={bankModalVisible}
        onOk={handleAddBank}
        onCancel={() => setBankModalVisible(false)}
        okText="创建"
      >
        <Form form={bankForm} layout="vertical">
          <Form.Item name="name" label="题库名称" rules={[{ required: true, message: '请输入题库名称' }]}>
            <Input placeholder="例如：数据结构" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="可选描述" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加/编辑题目弹窗 */}
      <Modal
        title={editingQuestion ? '编辑题目' : '添加题目'}
        open={editModalVisible}
        onOk={handleSaveQuestion}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ type: 'single', difficulty: 2 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="type" label="题型" rules={[{ required: true }]}>
                <Select>
                  <Option value="single">单选题</Option>
                  <Option value="multiple">多选题</Option>
                  <Option value="judge">判断题</Option>
                  <Option value="fill">填空题</Option>
                  <Option value="short_answer">简答题</Option>
                  <Option value="coding">编程题</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="difficulty" label="难度" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value={1}>简单</Radio>
                  <Radio value={2}>中等</Radio>
                  <Radio value={3}>困难</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bank_id" label="所属题库">
                <Select>
                  {banks.map(b => <Option key={b.id} value={b.id}>{b.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="knowledge_point" label="知识点" rules={[{ required: true, message: '请输入知识点' }]}>
            <Input placeholder="例如：二叉树遍历" />
          </Form.Item>

          <Form.Item name="content" label="题目内容" rules={[{ required: true, message: '请输入题目' }]}>
            <TextArea rows={3} placeholder="题目内容" />
          </Form.Item>

          {(currentType === 'single' || currentType === 'multiple' || currentType === 'judge') && (
            <Form.Item name="options_text" label="选项（每行一个）">
              <TextArea rows={4} placeholder={"A. 选项一\nB. 选项二\nC. 选项三\nD. 选项四"} />
            </Form.Item>
          )}

          <Form.Item name="answer" label="正确答案" rules={[{ required: true, message: '请输入答案' }]}>
            <Input placeholder={
              currentType === 'single' ? '例如：B' :
              currentType === 'multiple' ? '例如：ABC' :
              currentType === 'judge' ? '对/错' :
              '输入答案'
            } />
          </Form.Item>

          <Form.Item name="analysis" label="解析">
            <TextArea rows={3} placeholder="可选：题目解析" />
          </Form.Item>

          <Form.Item name="tags_text" label="标签（逗号分隔）">
            <Input placeholder="例如：重点,易错" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入弹窗 */}
      <Modal
        title="导入题目"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>支持以下格式：</Text>
          <ul>
            <li><b>Excel (.xlsx / .xls)</b></li>
            <li><b>CSV (.csv)</b></li>
            <li><b>JSON (.json)</b></li>
          </ul>
          <Text>字段映射：题型、题目(content)、选项(options)、答案(answer)、解析(analysis)、难度(difficulty)、知识点(knowledge_point)</Text>
          <Upload.Dragger
            accept=".xlsx,.xls,.csv,.json"
            beforeUpload={handleImport}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon"><DatabaseOutlined /></p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          </Upload.Dragger>
          <Button type="link" onClick={handleExportTemplate}>
            <DownloadOutlined /> 下载导入模板
          </Button>
        </Space>
      </Modal>
    </div>
  )
}

export default QuestionBankPage
