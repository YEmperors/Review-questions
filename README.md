# 🧠 智能刷题应用 (Smart Quiz App)

一款基于 **Electron + React + Vite** 构建的现代化、跨平台、高性能的桌面端离线刷题神器。专为需要高频刷题、整理错题、复习备考的用户设计。

## ✨ 核心特性 (Features)

*   ⚡ **极速离线运行**：采用底层的 WebAssembly SQLite (sql.js) 实现全本地化存储，几万道题目也能毫秒级检索，**彻底告别网络延迟和断网焦虑**。
*   📦 **海量题型支持**：完美支持 **单选题、多选题、判断题、填空题、简答题、编程题** 等 6 种主流题型。
*   🚀 **极致安装包体积**：经过深度架构重构与构建优化，剔除了无用的依赖包，将桌面端核心应用包从传统的 `100MB+` 极限压缩至 **`3.5MB`** 左右，启动如闪电。
*   📊 **数据统计大盘**：内置炫酷的数据看板 (Dashboard)，可视化展示你的答题正确率、知识点掌握程度与刷题进度。
*   📑 **题库无缝导入**：支持从 `.xlsx` / `.xls` (Excel)、`.csv` 以及 `.json` 一键批量导入你的私有题库。内置模板文件，格式规范且高度容错（自动识别选项、自动去除手打前缀标号）。
*   🗑️ **高效的题目管理**：支持题目的增删改查，以及对垃圾题目进行多选「一键批量删除」。
*   🌓 **现代 UI 与深色模式**：基于 Ant Design 的优雅组件库搭建，响应式布局。
*   🧠 **错题本与自适应复习**：答错的题目自动进入专属错题本，辅助你针对薄弱环节进行复习。

## 🛠️ 技术栈 (Tech Stack)

*   **框架**：[Electron](https://www.electronjs.org/) + [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **构建工具**：[Vite](https://vitejs.dev/) + [electron-builder](https://www.electron.build/)
*   **UI 库**：[Ant Design v5](https://ant.design/)
*   **状态管理**：[Zustand](https://zustand-demo.pmnd.rs/)
*   **数据库**：[sql.js (WebAssembly)](https://sql.js.org/)
*   **图表**：[Recharts](https://recharts.org/)

## 🚀 快速上手 (Getting Started)

### 1. 环境准备
确保你的电脑上已经安装了 [Node.js](https://nodejs.org/) (推荐 v18+ 版本)。

### 2. 克隆项目与安装依赖
```bash
# 1. 克隆仓库
git clone https://github.com/YEmperors/Review-questions.git

# 2. 进入项目目录
cd Review-questions

# 3. 安装依赖包
npm install
```

### 3. 开发环境运行
```bash
npm run dev
```
运行后，会自动打开一个包含调试工具的桌面端窗口。所有前端代码（`src/`）与主进程代码（`electron/`）都支持热更新 (HMR)。

### 4. 生产环境打包 (构建 exe 安装程序)
```bash
npm run build
```
执行完毕后，你可以在 `release/` 目录下找到打包好的 `smart-quiz-app Setup 1.0.0.exe` 安装文件。

## 📁 题库导入指南
如果你需要大批量导入题库，请参考项目根目录下 `templates/` 文件夹中的模板文件。

### 1. Excel / CSV 表格格式要求
支持通过识别列头自动映射数据。标准支持的列头包含：`题型`、`题目`、`选项`、`答案`、`解析`、`难度`、`知识点`。
*在“选项”列中，可使用 `Alt+Enter` 换行或直接用 `|` 分割多个选项。*

| 题型 (type) | 题目 (content) | 选项 (options) | 答案 (answer) | 解析 (analysis) | 难度 (1-3) | 知识点 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **单选题** | 地球是太阳系中的第几大行星？ | 水星<br>金星<br>地球<br>火星 | C | 按离太阳由近及远的顺序是水星、金星、地球... | 1 | 天文基础 |
| **多选题** | 以下哪些属于前端开发框架？ | Vue<br>React<br>Angular<br>Django | A,B,C | Django属于Python后端框架。 | 2 | Web前端 |
| **判断题** | 计算机中，1个字节等于8个位(bit)。 | 对<br>错 | A | 1 Byte = 8 bits，所以是正确的。 | 1 | 计算机基础 |
| **填空题** | 水的化学式是 _____。 | *(留空即可)* | H2O | 注意大小写字母。 | 1 | 化学常识 |
| **简答题** | 请简述什么是面向对象编程？ | *(留空即可)* | 是一种将数据和处理数据的方法封装成对象... | 关键词需包含封装、继承、多态。 | 2 | 软件工程 |
| **编程题** | 使用 JS 实现冒泡排序算法。 | *(留空即可)* | `function bubbleSort(arr) {...}` | 注意时间复杂度控制在 O(n^2)。 | 3 | 数据结构 |

### 2. JSON 格式要求
针对开发者，支持标准对象数组的批量导入：

```json
[
  {
    "type": "single",
    "content": "世界上最高的山峰是？",
    "options": ["乔戈里峰", "珠穆朗玛峰", "干城章嘉峰", "洛子峰"],
    "answer": "B",
    "analysis": "珠穆朗玛峰海拔8848.86米。",
    "difficulty": 1,
    "knowledge_point": "地理"
  },
  {
    "type": "fill",
    "content": "光在真空中的传播速度大约是 _____ 万公里每秒。",
    "options": [],
    "answer": "30",
    "analysis": "光速 c ≈ 299,792.458 km/s。",
    "difficulty": 2,
    "knowledge_point": "物理"
  }
]
```

## 🤝 贡献与反馈
如果你在使用过程中遇到任何 Bug，或者对应用的功能有新的期望（如加入智能艾宾浩斯复习算法等），欢迎提交 Issue 或 Pull Request！

## 📄 许可协议 (License)
本项目基于 MIT 协议开源。
