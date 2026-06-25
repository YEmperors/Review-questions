import React, { useEffect, useState } from 'react'
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, Space,
  Upload, message, Popconfirm, Row, Col, Typography, Radio, Dropdown, FloatButton
} from 'antd'
import type { MenuProps } from 'antd'
import {
  PlusOutlined, UploadOutlined, DeleteOutlined, EditOutlined,
  DatabaseOutlined, DownloadOutlined, StarOutlined, StarFilled, PlayCircleOutlined, SearchOutlined
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { useNavigate } from 'react-router-dom'
import {
  getQuestionBanks, getQuestions, createQuestion, createQuestionsBatch,
  updateQuestion, deleteQuestion, deleteQuestionsBatch, createQuestionBank, deleteQuestionBank,
  deleteAllQuestionBanks, getAllQuestionCounts, getKnowledgePoints, toggleFavorite, getFavorites
} from '../db/repositories'
import { Question, QuestionType, QuestionBank } from '../types'
import { exportFile } from '../utils/fileExport'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const typeLabels: Record<string, string> = {
  single: '单选题', multiple: '多选题', judge: '判断题',
  fill: '填空题', short_answer: '简答题'
}
const diffLabels: Record<number, { text: string; color: string }> = {
  1: { text: '简单', color: 'green' },
  2: { text: '中等', color: 'blue' },
  3: { text: '困难', color: 'red' }
}

const QuestionBankPage: React.FC = () => {
  const navigate = useNavigate()
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
  const [searchText, setSearchText] = useState('')
  const [favSet, setFavSet] = useState<Set<number>>(new Set())
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [importBankId, setImportBankId] = useState<number>(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = React.useRef(0)

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
      keyword: searchText
    }))
    setKnowledgePoints(getKnowledgePoints(selectedBank))
    setBankCounts(getAllQuestionCounts())
  }

  useEffect(() => {
    loadBanks()
  }, [])

  useEffect(() => {
    loadQuestions()
    setSelectedRowKeys([])
  }, [selectedBank, filterType, searchText])

  // 当题目列表发生变化时（如删除题目、清空题库），自动剔除已经被删除的选中项
  useEffect(() => {
    if (questions.length === 0) {
      if (selectedRowKeys.length > 0) setSelectedRowKeys([])
    } else {
      const currentIds = new Set(questions.map(q => q.id))
      setSelectedRowKeys(prev => prev.filter(key => currentIds.has(key as number)))
    }
  }, [questions])

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
      if (id === 1) {
        // 对于默认题库，只删除其中的题目，不删除题库本身
        const qs = getQuestions({ bankId: id })
        if (qs.length > 0) {
          deleteQuestionsBatch(qs.map(q => q.id))
        }
        message.success('默认题库中的题目已清空')
        setSelectedRowKeys([])
      } else {
        deleteQuestionBank(id)
        if (selectedBank === id) setSelectedBank(undefined)
        setSelectedRowKeys([])
        message.success('题库已删除')
      }
      loadBanks()
      loadQuestions()
    } catch (err) {
      message.error(id === 1 ? '清空题目失败' : '删除题库失败')
    }
  }

  const handleDeleteAllBanks = () => {
    try {
      deleteAllQuestionBanks()
      setSelectedBank(undefined)
      loadBanks()
      loadQuestions()
      message.success('已清空全部题库')
    } catch (err) {
      message.error('清空失败')
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
      setSelectedRowKeys(prev => prev.filter(k => k !== id))
      loadQuestions()
    } catch (err) {
      message.error('删除题目失败')
    }
  }

  const handlePracticeSelected = () => {
    if (selectedRowKeys.length === 0) return
    const selectedQuestions = questions.filter(q => selectedRowKeys.includes(q.id))
    sessionStorage.setItem('quiz_config', JSON.stringify({ mode: 'practice', timeLimit: null }))
    sessionStorage.setItem('quiz_questions', JSON.stringify(selectedQuestions))
    sessionStorage.removeItem('quiz_results')
    navigate('/quiz')
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

  // ==================== TXT 解析器 ====================
  /**
   * 解析 txt 格式的题目文本
   * 支持格式：
   *   1.题目内容（支持多行）
   *   A.选项一  B.选项二  C.选项三  D.选项四
   *   答案：A（或 答案: ABC 多选）
   *   解析：可选
   */
  const parseTxtQuestions = (text: string): any[] => {
    const results: any[] = []
    // 统一换行符
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalized.split('\n')

    // 按题号切割题块：行首为 数字 + .、．。）) 开头
    const blocks: string[][] = []
    let cur: string[] = []
    for (const line of lines) {
      if (/^\d+[.、．。）)】]\s*\S/.test(line.trim()) && cur.length > 0) {
        blocks.push(cur)
        cur = [line]
      } else {
        cur.push(line)
      }
    }
    if (cur.length > 0) blocks.push(cur)

    for (const block of blocks) {
      const bLines = block.map(l => l.trim()).filter(Boolean)
      if (bLines.length === 0) continue

      // 第一行 = 题目内容（去掉题号前缀）
      const rawContent = bLines[0].replace(/^\d+[.、．。）)】]\s*/, '').trim()
      if (!rawContent) continue

      let explicitType: QuestionType | null = null
      
      // 检查标题中是否显式声明了题型，如 【多选题】或 (填空题)
      const typeMatch = rawContent.match(/[【\[(（](单选|单选题|多选|多选题|判断|判断题|填空|填空题|问答|问答题|简答|简答题)[】\])）]/)
      if (typeMatch) {
        const tStr = typeMatch[1]
        if (tStr.includes('单选')) explicitType = QuestionType.SINGLE
        else if (tStr.includes('多选')) explicitType = QuestionType.MULTIPLE
        else if (tStr.includes('判断')) explicitType = QuestionType.JUDGE
        else if (tStr.includes('填空')) explicitType = QuestionType.FILL
        else if (tStr.includes('问答') || tStr.includes('简答')) explicitType = QuestionType.SHORT_ANSWER
      }

      const options: string[] = []
      let answer = ''
      let analysis = ''
      let knowledgePoint = ''
      let difficulty = 2
      const contentLines = [rawContent]

      for (let i = 1; i < bLines.length; i++) {
        const line = bLines[i]

        // 选项行：A. A、 A: (A) A) 等，去除了单纯的空格匹配以防将普通英文句子（如 I am... A boy...）误判为选项
        const optMatch = line.match(/^(?:\(|（)?([A-Za-z])[.、：:\)）]\s*(.+)/)
        if (optMatch) {
          options.push(optMatch[2].trim())
          continue
        }

        // 答案行
        const ansMatch = line.match(/^(?:答案|正确答案|参考答案)[：:]\s*(.+)/)
        if (ansMatch) { answer = ansMatch[1].trim(); continue }

        // 解析行
        const anaMatch = line.match(/^(?:解析|解题思路|分析|答案解析|详解)[：:]\s*(.+)/)
        if (anaMatch) { analysis = anaMatch[1].trim(); continue }

        // 知识点行
        const kpMatch = line.match(/^(?:知识点|考点)[：:]\s*(.+)/)
        if (kpMatch) { knowledgePoint = kpMatch[1].trim(); continue }

        // 难度行
        const diffMatch = line.match(/^(?:难度)[：:]\s*(.+)/)
        if (diffMatch) {
          const d = diffMatch[1].trim()
          difficulty = d === '简单' || d === '1' ? 1 : d === '困难' || d === '3' ? 3 : 2
          continue
        }

        // 题型行（显式指定）
        const tMatch = line.match(/^(?:题型)[：:]\s*(.+)/)
        if (tMatch) {
          const tStr = tMatch[1].trim()
          if (tStr.includes('单选')) explicitType = QuestionType.SINGLE
          else if (tStr.includes('多选')) explicitType = QuestionType.MULTIPLE
          else if (tStr.includes('判断')) explicitType = QuestionType.JUDGE
          else if (tStr.includes('填空')) explicitType = QuestionType.FILL
          else if (tStr.includes('问答') || tStr.includes('简答')) explicitType = QuestionType.SHORT_ANSWER
          continue
        }

        // 无选项且还未遇到答案 → 续行（多行题目）
        if (options.length === 0 && !answer) {
          contentLines.push(line)
        }
      }

      let content = contentLines.join('\n')

      // 自动推断题型
      let type: QuestionType = QuestionType.SINGLE
      if (explicitType) {
        type = explicitType
      } else if (options.length >= 2) {
        const upperAns = answer.trim().toUpperCase()
        // 提取其中所有的纯英文字母（无视任何中文、括号、标点）
        const englishLetters = upperAns.replace(/[^A-Z]/g, '')
        // 判断是否提取出的字母全是 A-J、且至少两个、且无重复
        const isMultipleOpts = /^[A-J]{2,}$/.test(englishLetters) && new Set(englishLetters).size === englishLetters.length

        // 简答题的答案通常很长
        if (answer.length > 8 && englishLetters.length === 0) {
          type = QuestionType.SHORT_ANSWER
        } else {
          type = isMultipleOpts ? QuestionType.MULTIPLE : QuestionType.SINGLE
        }
      } else {
        const lowerAns = answer.toLowerCase()
        if (['对', '错', '正确', '错误', 'true', 'false', '是', '否', '✓', '✗'].includes(lowerAns)) {
          type = QuestionType.JUDGE
        } else if (content.includes('___') || content.includes('____') || content.includes('（　）') || content.includes('( )') || content.includes('()') || content.includes('__')) {
          type = QuestionType.FILL
        } else if (answer.trim().length > 0) {
          const isSubjective = answer.trim().length > 20 || 
            /谈谈|简述|论述|为什么|如何|怎样|理解|评价|分析|名词解释|简答/.test(content)
          type = isSubjective ? QuestionType.SHORT_ANSWER : QuestionType.FILL
        } else {
          // 无选项且无答案，归为简答/问答题
          type = QuestionType.SHORT_ANSWER
        }
      }

      if (type === QuestionType.SHORT_ANSWER && options.length > 0) {
        // 如果是简答题但误把带字母的段落提取成了选项，就把它们拼接回题目内容，并清空 options
        content = content + '\n' + options.map((opt, i) => String.fromCharCode(65 + i) + '. ' + opt).join('\n')
        options.length = 0
      }

      results.push({
        type,
        content,
        options: options.length > 0 ? JSON.stringify(options) : null,
        answer,
        analysis: analysis || null,
        difficulty,
        knowledge_point: knowledgePoint,
        tags: null,
        bank_id: importBankId
      })
    }
    return results
  }

  // ==================== 文件导入 ====================
  const handleImport = async (file: File) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        if (!data) return

        let questionsToInsert: any[] = []

        if (file.name.endsWith('.docx')) {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer: data as ArrayBuffer })
            const text = result.value
            questionsToInsert = parseTxtQuestions(text).map(q => ({ ...q, bank_id: importBankId }))
          } catch (err) {
            message.error('Word文档解析失败')
            return
          }
        } else if (file.name.endsWith('.txt')) {
          questionsToInsert = parseTxtQuestions(data as string).map(q => ({ ...q, bank_id: importBankId }))
        } else {
          let jsonData: any[]
          if (file.name.endsWith('.json')) {
            jsonData = JSON.parse(data as string)
          } else if (file.name.endsWith('.csv')) {
            const workbook = XLSX.read(data, { type: 'string' })
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            jsonData = XLSX.utils.sheet_to_json(sheet)
          } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const workbook = XLSX.read(data, { type: 'array' })
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            jsonData = XLSX.utils.sheet_to_json(sheet)
          } else {
            message.error('不支持的文件格式')
            return
          }
          // 映射表格数据
          questionsToInsert = jsonData.map((row: any) => {
            const rawOptions = row.options || row.选项
            let parsedOptions: string[] = []
            if (Array.isArray(rawOptions)) {
              parsedOptions = rawOptions
            } else if (typeof rawOptions === 'string') {
              parsedOptions = rawOptions.split(/[\n|]/).map((s: string) => s.trim()).filter(Boolean)
              parsedOptions = parsedOptions.map(opt => opt.replace(/^[A-Z][.、:]\s*/i, ''))
            }

            const content = row.content || row.题目 || ''
            const answer = String(row.answer || row.答案 || '')
            const typeStr = row.type || row.题型 || ''

            // 智能推断题型（如果表格没写“题型”列）
            let inferredType = QuestionType.SINGLE
            if (typeStr) {
              inferredType = mapImportType(typeStr)
            } else if (parsedOptions.length > 0) {
              // 提取纯英文字母
              const englishLetters = answer.trim().toUpperCase().replace(/[^A-Z]/g, '')
              const isMultipleOpts = /^[A-J]{2,}$/.test(englishLetters) && new Set(englishLetters.split('')).size === englishLetters.length

              inferredType = isMultipleOpts ? QuestionType.MULTIPLE : QuestionType.SINGLE
            } else {
              const lowerAns = answer.toLowerCase()
              if (['对', '错', '正确', '错误', 'true', 'false', '是', '否', '✓', '✗'].includes(lowerAns)) {
                inferredType = QuestionType.JUDGE
              } else if (content.includes('___') || content.includes('____') || content.includes('（　）') || content.includes('( )') || content.includes('()') || content.includes('__')) {
                inferredType = QuestionType.FILL
              } else if (answer.trim().length > 0) {
                const isSubjective = answer.trim().length > 20 || 
                  /谈谈|简述|论述|为什么|如何|怎样|理解|评价|分析|名词解释|简答/.test(content)
                inferredType = isSubjective ? QuestionType.SHORT_ANSWER : QuestionType.FILL
              } else {
                inferredType = QuestionType.SHORT_ANSWER
              }
            }

            return {
              type: inferredType,
              content: content,
              options: parsedOptions.length > 0 ? JSON.stringify(parsedOptions) : null,
              answer: answer,
              analysis: row.analysis || row.解析 || null,
              tags: null,
              bank_id: importBankId
            }
          }).filter((q: any) => q.content)
        }

        if (questionsToInsert.length > 0) {
          createQuestionsBatch(questionsToInsert)
          message.success(`成功导入 ${questionsToInsert.length} 道题目`)
          loadQuestions()
        } else {
          message.warning('未找到有效题目数据，请检查文件格式')
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

    const isTextFormat = file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.json')
    if (isTextFormat) {
      reader.readAsText(file, 'utf-8')
    } else {
      reader.readAsArrayBuffer(file)
    }
    return false
  }

  const mapImportType = (type: string): QuestionType => {
    const map: Record<string, QuestionType> = {
      '单选': QuestionType.SINGLE, '单选题': QuestionType.SINGLE, 'single': QuestionType.SINGLE,
      '多选': QuestionType.MULTIPLE, '多选题': QuestionType.MULTIPLE, 'multiple': QuestionType.MULTIPLE,
      '判断': QuestionType.JUDGE, '判断题': QuestionType.JUDGE, 'judge': QuestionType.JUDGE,
      '填空': QuestionType.FILL, '填空题': QuestionType.FILL, 'fill': QuestionType.FILL,
      '简答': QuestionType.SHORT_ANSWER, '简答题': QuestionType.SHORT_ANSWER, 'short_answer': QuestionType.SHORT_ANSWER
    }
    return map[type] || QuestionType.SINGLE
  }

  // ==================== 导出模板 ====================
  const tableTemplateData = [
    { 题型: '单选题', 题目: '1+1等于几？', 选项: 'A.1\nB.2\nC.3\nD.4', 答案: 'B', 解析: '1+1=2' },
    { 题型: '多选题', 题目: '以下哪些是水果？', 选项: 'A.苹果\nB.西红柿\nC.香蕉\nD.黄瓜', 答案: 'A|C', 解析: '苹果和香蕉是水果' },
    { 题型: '判断题', 题目: '地球是圆的', 选项: '', 答案: '对', 解析: '地球是近似球体' },
    { 题型: '填空题', 题目: '中国的首都是___。', 选项: '', 答案: '北京', 解析: '' },
    { 题型: '简答题', 题目: '请简述光合作用的过程。', 选项: '', 答案: '植物利用光能将二氧化碳和水转化为有机物，并释放氧气。', 解析: '' },
  ]

  const handleExportExcel = async () => {
    try {
      const ws = XLSX.utils.json_to_sheet(tableTemplateData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '题目模板')
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      await exportFile('导入模板_Excel.xlsx', new Uint8Array(excelBuffer), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    } catch (err) {
      message.error('导出失败')
    }
  }

  const handleExportCsv = async () => {
    try {
      const ws = XLSX.utils.json_to_sheet(tableTemplateData)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const buffer = new TextEncoder().encode('\ufeff' + csv)
      await exportFile('导入模板_CSV.csv', buffer, 'text/csv;charset=utf-8;')
    } catch (err) {
      message.error('导出失败')
    }
  }

  const handleExportTxt = async () => {
    try {
      const txtContent = `1. 【单选题】1+1等于几？
A. 1
B. 2
C. 3
D. 4
答案：B
解析：基础数学运算。

2. 以下哪些是水果？
题型：多选题
A. 苹果
B. 西红柿
C. 香蕉
D. 黄瓜
答案：AC
解析：西红柿是蔬菜，不是水果。

3. 地球是圆的（判断题）
答案：对

4. 中国的首都是___。
答案：北京

5. 请简述光合作用的过程。
题型：简答题
答案：植物利用光能将二氧化碳和水转化为有机物，并释放氧气。`
      const buffer = new TextEncoder().encode(txtContent)
      await exportFile('导入模板_TXT.txt', buffer, 'text/plain;charset=utf-8;')
    } catch (err) {
      message.error('导出失败')
    }
  }

  const handleExportWord = async () => {
    try {
      const txtContent = `1. 【单选题】1+1等于几？
A. 1
B. 2
C. 3
D. 4
答案：B
解析：基础数学运算。

2. 以下哪些是水果？
题型：多选题
A. 苹果
B. 西红柿
C. 香蕉
D. 黄瓜
答案：AC
解析：西红柿是蔬菜，不是水果。

3. 地球是圆的（判断题）
答案：对

4. 中国的首都是___。
答案：北京

5. 请简述光合作用的过程。
题型：简答题
答案：植物利用光能将二氧化碳和水转化为有机物，并释放氧气。`
      const doc = new Document({
        sections: [{
          properties: {},
          children: txtContent.split('\n').map(line => new Paragraph({
            children: [new TextRun(line)]
          }))
        }]
      })
      const blob = await Packer.toBlob(doc)
      const buffer = await blob.arrayBuffer()
      await exportFile('导入模板_Word.docx', new Uint8Array(buffer), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    } catch (err) {
      message.error('导出 Word 失败')
    }
  }

  const exportMenuItems: MenuProps['items'] = [
    { key: 'word', label: 'Word 模板 (.docx)', onClick: handleExportWord },
    { key: 'excel', label: 'Excel 模板 (.xlsx)', onClick: handleExportExcel },
    { key: 'csv', label: 'CSV 模板 (.csv)', onClick: handleExportCsv },
    { key: 'txt', label: 'TXT 模板 (.txt)', onClick: handleExportTxt },
  ]

  // ==================== 当前题目类型 ====================
  const currentType = Form.useWatch('type', form)

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '题目', dataIndex: 'content', ellipsis: true, width: 300 },
    {
      title: '题型', dataIndex: 'type', width: 80,
      render: (type: string) => <Tag color="blue">{typeLabels[type] || type}</Tag>
    },
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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      const isSupported = /\.(xlsx|xls|csv|json|txt|docx)$/i.test(file.name)
      if (isSupported) {
        setImportBankId(selectedBank ?? (banks[0]?.id ?? 1))
        handleImport(file)
      } else {
        message.error('不支持的文件格式，请上传 Word, Excel, CSV, JSON 或 TXT 文件')
      }
    }
  }

  return (
    <div 
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver} 
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ minHeight: '100%', position: 'relative' }}
    >
      {isDragging && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(22, 119, 255, 0.1)',
          border: '2px dashed #1677ff',
          borderRadius: 8,
          zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{ textAlign: 'center', color: '#1677ff' }}>
            <DatabaseOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <Title level={4} style={{ color: '#1677ff', margin: 0 }}>松开鼠标立即导入题库</Title>
            <Text style={{ color: '#1677ff' }}>当前将导入至：{selectedBank ? banks.find(b => b.id === selectedBank)?.name : '默认题库'}</Text>
          </div>
        </div>
      )}
      <Title level={3}>📚 题库管理</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card size="small" title="题库分类">
            <Space wrap>
              <span className="bank-tag-item">
                <Tag
                  color={!selectedBank ? 'blue' : 'default'}
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                  onClick={() => setSelectedBank(undefined)}
                >
                  全部 ({bankCounts[0] ?? 0})
                </Tag>
                <span className="bank-tag-action">
                  <Popconfirm
                    title={`删除全部 ${bankCounts[0] ?? 0} 道题目？`}
                    description={`将清空全部 ${banks.length} 个题库内的所有 ${bankCounts[0] ?? 0} 道题目，此操作不可恢复！`}
                    okText="确认清空"
                    okButtonProps={{ danger: true }}
                    cancelText="取消"
                    onConfirm={handleDeleteAllBanks}
                    disabled={(bankCounts[0] ?? 0) === 0 && banks.length === 0}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={(bankCounts[0] ?? 0) === 0 && banks.length === 0}
                      title={`删除全部 ${bankCounts[0] ?? 0} 道题目`}
                    />
                  </Popconfirm>
                </span>
              </span>
              {banks.map(bank => (
                <span key={bank.id} className="bank-tag-item">
                  <Tag
                    color={selectedBank === bank.id ? 'blue' : 'default'}
                    style={{ cursor: 'pointer', padding: '4px 12px' }}
                    onClick={() => setSelectedBank(bank.id)}
                  >
                    {bank.name} ({bankCounts[bank.id] ?? 0})
                  </Tag>
                  <span className="bank-tag-action">
                    <Popconfirm
                      title={bank.id === 1 ? `清空题库「${bank.name}」？` : `删除题库「${bank.name}」？`}
                      description={bank.id === 1 ? `将清空该题库内的所有题目，但题库本身会保留，此操作不可恢复。` : `该题库内所有题目（含子题库题目）将一并删除，此操作不可恢复。`}
                      okText={bank.id === 1 ? "确认清空" : "确认删除"}
                      okButtonProps={{ danger: true }}
                      cancelText="取消"
                      onConfirm={() => handleDeleteBank(bank.id)}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </span>
                </span>
              ))}
              <Button type="dashed" size="small" icon={<PlusOutlined />}
                onClick={() => { bankForm.resetFields(); setBankModalVisible(true) }}>
                新建题库
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="导入导出">
            <Space>
              <Button icon={<UploadOutlined />} onClick={() => {
                setImportBankId(selectedBank ?? (banks[0]?.id ?? 1))
                setImportModalVisible(true)
              }}>导入题目</Button>
              <Dropdown menu={{ items: exportMenuItems }}>
                <Button icon={<DownloadOutlined />}>下载模板</Button>
              </Dropdown>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
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
          </Select>
          <Input
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            placeholder="搜索题目内容"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
            style={{ width: 200 }}
          />

          </Space>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {selectedRowKeys.length > 0 && (
              <Space>
                <Button type="primary" style={{ background: '#10b981', borderColor: '#10b981' }} icon={<PlayCircleOutlined />} onClick={handlePracticeSelected}>
                  练习选中 ({selectedRowKeys.length})
                </Button>
                <Button icon={<StarOutlined />} onClick={() => {
                  const favIds = getFavorites()
                  let addedCount = 0
                  selectedRowKeys.forEach(id => {
                    if (!favIds.includes(Number(id))) {
                      toggleFavorite(Number(id))
                      addedCount++
                    }
                  })
                  setSelectedRowKeys([])
                  if (addedCount > 0) {
                    message.success(`成功收藏了 ${addedCount} 道题目`)
                  } else {
                    message.info('选中的题目已全部在收藏夹中')
                  }
                }}>
                  批量收藏
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                  批量删除 ({selectedRowKeys.length})
                </Button>
              </Space>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddQuestion}>
              添加题目
            </Button>
          </div>
        </div>
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
        pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: total => `共 ${total} 条` }}
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
        <Form form={form} layout="vertical" initialValues={{ type: 'single' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="type" label="题型" rules={[{ required: true }]}>
                <Select>
                  <Option value="single">单选题</Option>
                  <Option value="multiple">多选题</Option>
                  <Option value="judge">判断题</Option>
                  <Option value="fill">填空题</Option>
                  <Option value="short_answer">简答题</Option>
                </Select>
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
        width={680}
      >
        {/* 题库选择 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Text style={{ whiteSpace: 'nowrap', fontSize: 13 }}>导入至题库：</Text>
          <Select value={importBankId} onChange={setImportBankId} style={{ flex: 1 }} placeholder="请选择题库" size="small">
            {banks.map(b => <Option key={b.id} value={b.id}>{b.name}</Option>)}
          </Select>
        </div>

        {/* 左右两列 */}
        <Row gutter={12}>
          {/* 左：格式说明 */}
          <Col span={13}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>支持格式</div>
            {/* Excel / CSV / JSON */}
            <div style={{ background: '#fafafa', border: '1px solid #e8e8e8', borderLeft: '3px solid #1677ff', borderRadius: 6, padding: '8px 10px', marginBottom: 8, fontSize: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1677ff', marginBottom: 4 }}>📊 Excel / CSV / JSON</div>
              <div style={{ color: '#555', lineHeight: 1.6 }}>
                列名（中英均可）：<br />
                题型&nbsp;/&nbsp;type &nbsp;·&nbsp; 题目&nbsp;/&nbsp;content<br />
                选项&nbsp;/&nbsp;options &nbsp;·&nbsp; 答案&nbsp;/&nbsp;answer<br />
                解析&nbsp;/&nbsp;analysis
              </div>
            </div>
            {/* Word / TXT */}
            <div style={{ background: '#fafafa', border: '1px solid #e8e8e8', borderLeft: '3px solid #52c41a', borderRadius: 6, padding: '8px 10px', fontSize: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#389e0d', marginBottom: 4 }}>📄 Word / TXT （按编号分题）</div>
              <pre style={{
                background: '#f0f0f0', borderRadius: 4, padding: '6px 8px',
                fontSize: 11, margin: '0 0 4px', lineHeight: 1.6, color: '#333',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all'
              }}>{`1.题目内容
A.选项一  B.选项二
C.选项三  D.选项四
答案：A   解析：可省略

2.判断题示例
答案：对

3.1+1=___
答案：2`}</pre>
              <div style={{ color: '#888', lineHeight: 1.5, marginTop: 4 }}>
                支持在题目中显式声明：<b>1.【多选题】..</b> 或换行写 <b>题型：问答题</b><br />
                <b>未声明时自动推断：</b><br />
                • 有选项：智能提取纯英文字母，若仅包含A-J且≥2个无重复，则为多选，否则单选。<br />
                • 无选项：答案对/错→判断 &nbsp;·&nbsp; 含___→填空 &nbsp;·&nbsp; 其它→问答
              </div>
            </div>
          </Col>

          {/* 右：上传区 */}
          <Col span={11}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>上传文件</div>
            <Upload.Dragger
              accept=".xlsx,.xls,.csv,.json,.txt,.docx"
              beforeUpload={handleImport}
              showUploadList={false}
              style={{ borderRadius: 8 }}
              height={160}
            >
              <div style={{ padding: '12px 0' }}>
                <DatabaseOutlined style={{ fontSize: 24, color: '#1677ff', display: 'block', marginBottom: 6 }} />
                <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 3px', color: '#333' }}>点击或拖拽文件上传</p>
                <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Word · Excel · CSV · JSON · TXT</p>
              </div>
            </Upload.Dragger>
            <Dropdown menu={{ items: exportMenuItems }} placement="bottomCenter">
              <Button
                type="link"
                size="small"
                style={{ marginTop: 8, padding: 0, fontSize: 12 }}
              >
                <DownloadOutlined /> 下载导入模板
              </Button>
            </Dropdown>
          </Col>
        </Row>
      </Modal>

      <FloatButton.BackTop style={{ right: '50%', transform: 'translateX(50%)', bottom: 24 }} visibilityHeight={100} target={() => document.querySelector('.ant-table-body') || window as any} />
    </div>
  )
}

export default QuestionBankPage
