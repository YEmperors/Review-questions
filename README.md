# Smart Quiz App (智能刷题神器) 🚀

![React](https://img.shields.io/badge/React-18.x-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Electron](https://img.shields.io/badge/Electron-33.x-lightgrey?logo=electron)
![Vite](https://img.shields.io/badge/Vite-6.x-purple?logo=vite)
![SQLite](https://img.shields.io/badge/SQLite-Local-blue)

[![Download](https://img.shields.io/badge/Download-Latest_Release-success?style=for-the-badge&logo=github)](https://github.com/YEmperors/Review-questions/releases)

**Smart Quiz App** 是一款专为高效学习和备考打造的跨平台桌面应用。它支持海量题库管理、多格式题目一键导入、AI 智能出题、错题本以及可视化数据统计。基于本地 SQLite 数据库构建，保证您的数据隐私与绝对安全，完全离线可用（AI 联想除外）！

🎉 **立即下载体验：** 请前往 [Releases 页面](https://github.com/YEmperors/Review-questions/releases) 获取最新版 Windows 安装包（`.exe`）。

---

## ✨ 核心特性

- **📚 强大的题库管理**
  - 支持创建、编辑、删除题库。
  - 题目打标签、支持收藏，精准管理个人弱点。
  
- **⚡️ 智能题目导入引擎 (通吃五大格式)**
  - 支持直接拖拽导入 **Word (.docx)**、**Excel (.xlsx/.xls)**、**CSV**、**JSON**、**TXT** 文件。
  - **超强智能推断**：导入题目时如果不写明题型，系统会通过业界领先的“纯英文字母提取算法”自动为您精准识别并分类成**单选题**、**多选题**、**判断题**、**填空题**或**简答题**。多选题选项哪怕写成 `A|B|C|D` 或 `A、B` 都能被完美识别！

- **🤖 AI 辅助出题**
  - 无需自己手动录题，只要输入一个主题（如“前端 React 核心原理”），AI 将自动生成带选项和详细解析的优质题目，并一键导入您的题库。
  
- **🎯 专注的沉浸式练习体验**
  - 高效的抽题、练习与纠错模式。
  - **自动错题本**：答错的题目自动加入错题本，支持对错题进行反复练习与定期清空。

- **📊 学习数据可视化**
  - 直观展示您的刷题数量、正确率以及各题库的练习进度。

---

## 🛠 技术栈

- **前端 UI**：React 18 + TypeScript + Ant Design 5
- **状态管理**：Zustand
- **桌面端封装**：Electron
- **构建工具**：Vite
- **本地数据库**：sql.js (SQLite3 WebAssembly 引擎，完全本地存储，速度极快)
- **文档解析引擎**：mammoth (解析 Word)、xlsx (解析 Excel/CSV)
- **打包工具**：electron-builder (支持自定义安装路径，生成标准安装向导)

---

## 📦 本地开发指南

### 环境要求

- [Node.js](https://nodejs.org/) (建议 v18+)
- npm 或 yarn

### 运行步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/smart-quiz-app.git
   cd smart-quiz-app
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发环境**
   ```bash
   npm run dev
   ```
   > 这将同时启动 Vite 前端服务和 Electron 桌面端进程。

4. **打包构建**
   ```bash
   # 生成 Windows 安装包 (.exe)
   npm run build
   ```
   > 打包后的安装程序将生成在 `release` 目录下。双击运行即可体验标准的分步安装向导。

---

## 📁 导入格式说明

应用内置了极其强悍的自动解析与题型推断引擎，支持五大主流文件格式一键拖拽导入。如果您想自己整理题目导入，可以点击软件内导入界面的 **“下载模板”** 获取原生 `.docx`、`.xlsx`、`.csv` 或 `.txt` 模板。

### 1. 表格格式 (Excel `.xlsx` / CSV `.csv`)
表格格式要求使用特定的列名（支持中文或英文字段名，软件会自动识别）：
- **必须字段**：`题目` (或 `content`)、`答案` (或 `answer`)
- **可选字段**：`题型` (或 `type`)、`选项` (或 `options`)、`解析` (或 `analysis`)

| 题型 (可选) | 题目 (必填) | 选项 (仅选择题填) | 答案 (必填) | 解析 (可选) |
| :--- | :--- | :--- | :--- | :--- |
| 单选题 | 1+1等于几？ | A. 1<br>B. 2<br>C. 3<br>D. 4 | B | 基础数学运算。 |
| 多选题 | 以下哪些是水果？ | A. 苹果<br>B. 西红柿<br>C. 香蕉<br>D. 黄瓜 | A\|C | 西红柿是蔬菜，不是水果。 |
| (留空) | 地球是圆的 | | 对 | 地球是近似球体。 |
| (留空) | 中国的首都是___。| | 北京 | |
| (留空) | 请简述光合作用的过程。| | 植物利用光能将二氧化碳... | |

> **💡 智能推断**：如果您在表格中不写“题型”列，应用会根据**选项是否存在**以及**答案的纯字母组合规则**自动推断出该题是单选、多选、判断、填空还是简答题。

### 2. JSON 格式 (`.json`)
JSON 导入的数据结构与表格列名完全对应，是一个包含对象的数组格式。
```json
[
  {
    "题型": "单选题",
    "题目": "1+1等于几？",
    "选项": "A.1\nB.2\nC.3\nD.4",
    "答案": "B",
    "解析": "基础数学运算"
  }
]
```

### 3. 纯文本格式 (Word `.docx` / TXT `.txt`)
纯文本格式采用极简的自然书写习惯，题目与题目之间只需用**空行**隔开即可。内置引擎支持容错识别。

```txt
1. 【单选题】1+1等于几？
A. 1
B. 2
C. 3
D. 4
答案：B
解析：基础数学运算。

2. 以下哪些是水果？
A. 苹果
B. 西红柿
C. 香蕉
D. 黄瓜
答案：A|C
解析：西红柿是蔬菜，不是水果。

3. 地球是圆的
答案：对

4. 中国的首都是___。
答案：北京
```

---

## 🤝 贡献指南

欢迎提交 Pull Request 或者 Issue！如果您在体验过程中遇到了什么问题，或者有什么神奇的想法，随时反馈给我们。

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 协议。欢迎自由地使用、修改和分发。
