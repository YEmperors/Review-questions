import { getAISettings } from '../db/repositories'
import { QuestionType } from '../types'

/**
 * AI 服务 - 出题与解题
 */
export async function callAI(prompt: string): Promise<string> {
  const settings = getAISettings()
  if (!settings.api_key) {
    throw new Error('请先在设置中配置 AI API Key')
  }

  const response = await fetch(settings.api_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.api_key}`
    },
    body: JSON.stringify({
      model: settings.model_name,
      temperature: settings.temperature,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的出题助手和解题导师。请严格按照要求的格式输出，使用中文回答。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`AI API 请求失败: ${response.status} - ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * AI 出题
 */
export async function generateQuestionWithAI(
  topic: string,
  type: QuestionType,
  count: number = 1
): Promise<string> {
  const typeNames: Record<QuestionType, string> = {
    [QuestionType.SINGLE]: '单选题',
    [QuestionType.MULTIPLE]: '多选题',
    [QuestionType.JUDGE]: '判断题',
    [QuestionType.FILL]: '填空题',
    [QuestionType.SHORT_ANSWER]: '简答题',
    [QuestionType.CODING]: '编程题'
  }

  const prompt = `请生成 ${count} 道"${topic}"相关的${typeNames[type]}。

请严格按照以下JSON格式输出（数组），不要输出其他内容：
[
  {
    "content": "题目内容",
    "options": ["A选项", "B选项", "C选项", "D选项"],
    "answer": "正确答案（选择题填选项字母如A，多选题如AB，判断题填对/错，填空题填答案，简答题填要点）",
    "analysis": "详细解析"
  }
]

注意：
- 判断题options填["对","错"]
- 填空题和简答题options为null
- 编程题options为null，answer中包含代码和解题思路
- 确保答案准确无误`

  return callAI(prompt)
}

/**
 * AI 解题
 */
export async function explainQuestionWithAI(
  questionContent: string,
  questionType: QuestionType,
  correctAnswer: string,
  userAnswer?: string
): Promise<string> {
  const prompt = `请详细解答以下${questionType}题：

题目：${questionContent}
正确答案：${correctAnswer}
${userAnswer ? `我的答案：${userAnswer}` : ''}

请提供：
1. 详细解题过程和思路
2. 相关知识点的解释
${userAnswer !== correctAnswer ? '3. 分析我的答案哪里出了问题' : ''}
4. 举一反三的类似题目思路`

  return callAI(prompt)
}

/**
 * 解析 AI 返回的 JSON 题目
 */
export function parseAIQuestions(jsonStr: string): any[] {
  // 尝试提取 JSON 部分
  const jsonMatch = jsonStr.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('AI 返回的内容中未找到有效的 JSON 数组')
  }
  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('解析 AI 返回的 JSON 失败')
  }
}
