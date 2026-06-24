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
如果你需要大批量导入题库，请参考项目根目录下 `templates/` 文件夹中的模板文件：
*   `example_template.xlsx`：推荐格式，支持在单元格内通过 `Alt + Enter` 回车换行来隔开各个选项。
*   `example_template.csv`：基础的表格数据文件。
*   `example_template.json`：针对开发者的标准 JSON 数据结构。

## 🤝 贡献与反馈
如果你在使用过程中遇到任何 Bug，或者对应用的功能有新的期望（如加入智能艾宾浩斯复习算法等），欢迎提交 Issue 或 Pull Request！

## 📄 许可协议 (License)
本项目基于 MIT 协议开源。
