# Smart Quiz App

一个智能化的刷题与错题管理应用。支持多种题型，提供丰富的错题管理、数据统计分析以及 AI 辅助出题功能。目前支持 Web 网页端运行。

## 功能特性

- **多题型支持**：支持单选题、多选题、判断题、填空题、简答题、编程题。
- **自定义题库**：支持多级题库分类，轻松管理大量题目。
- **智能出题（AI）**：集成大语言模型，输入主题即可自动生成题目，丰富题库资源。
- **错题本管理**：自动记录错题，支持智能复习、批量重练。
- **可视化数据统计**：直观的雷达图和统计图表，随时掌握学习进度。
- **题目导入导出**：支持 Excel 格式题目批量导入、导出。

## 本地运行

环境要求：
- Node.js >= 18

```bash
# 1. 克隆代码
git clone https://github.com/YEmperors/Review-questions.git

# 2. 安装依赖
npm install

# 3. 运行开发环境
npm run dev

# 4. 构建 Web 静态文件
npm run build:web
```

## 技术栈

- React 18 + TypeScript
- Vite + Electron (可选桌面端支持)
- Ant Design
- SQLite / IndexedDB (本地数据持久化)
- ECharts (图表统计)
