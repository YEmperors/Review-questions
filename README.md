# 智能刷题 (Smart Quiz)

一个基于 Electron + React 构建的现代化桌面端智能刷题软件，致力于为你提供流畅、高效、智能的刷题体验。

## ✨ 核心特性

- **📚 多种格式导入**：支持从 Excel、JSON、TXT（甚至支持拖拽 Word 文档）快捷导入题库。
- **🤖 智能识别**：自动对题目文本进行智能断句与匹配，支持单选、多选、判断、填空、简答和编程题。
- **📊 错题统计面板**：以可视化的数据图表（折线图、饼图等）掌握自己的学习进度、高频错点以及每日学习情况。
- **🎯 多维度刷题**：提供「自由练习」和「模拟考试」模式，支持自由跳转题目与自动记录考试用时。
- **💡 AI 智能解题**：内置 AI 接口配置支持，自动对错题进行深度解析与解题思路推演。
- **🔒 本地化存储**：所有题目与数据全部利用内置 SQLite 在本地储存，保护隐私且无需网络即可随时复习。

## 🛠️ 技术栈

- **桌面框架**：[Electron](https://www.electronjs.org/)
- **前端框架**：[React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **UI 组件库**：[Ant Design](https://ant.design/)
- **本地数据库**：[sql.js](https://sql.js.org/) (SQLite)
- **图表渲染**：[Recharts](https://recharts.org/)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/YEmperors/Review-questions.git
cd Review-questions
```

### 2. 安装依赖

```bash
npm install
```

### 3. 开发模式运行

```bash
npm run dev
```

启动后会弹出 Electron 的调试窗口。

### 4. 打包安装程序 (Windows)

```bash
npm run build
```

打包完成后，可在 `release` 目录下找到 `.exe` 安装程序。

## ⚙️ 进阶配置

在软件内的“设置”页面，可以填写对应的 AI 模型 API 密钥（如 OpenAI, Gemini 等）来开启智能错题解析功能。

## 📄 开源协议

MIT License
