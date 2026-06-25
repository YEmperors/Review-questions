# 🧠 Smart Quiz App (智能刷题桌面版)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-success.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![Tauri](https://img.shields.io/badge/Tauri-1.5-ffc131.svg)

**Smart Quiz App** 是一款基于 **Tauri + React + Ant Design** 构建的轻量级、智能化的桌面端刷题助手。它不仅能帮助你整理题库、自动出题，还提供错题复习、数据分析以及 AI 辅助解析功能。

---

## ✨ 核心特性

- 📚 **全能题库管理**：支持单选、多选、判断、填空、简答和编程题六大题型。支持从 Word/Excel/CSV/JSON/TXT 等格式一键批量导入。
- 🎯 **多模式刷题**：提供自由练习模式、模拟考试模式，以及基于记忆算法的复习模式。
- 🤖 **AI 赋能解析**：做题时遇到不懂的题目，一键调用 AI 深入解析错题原因和核心知识点。
- 📉 **数据可视化概览**：首页提供折线图等详细的学习进度分析，直观展示做题数量、正确率及薄弱知识点。
- 📝 **科学错题本**：自动归档错题并提醒复习时间，精准攻克学习薄弱环节。
- ⚡ **极致性能 (Tauri)**：抛弃了沉重的 Electron，采用基于 Rust 的 Tauri，内存占用极小，启动秒开，提供独立绿色的免安装包体验。

---

## 📦 如何下载与安装

本仓库已配置好 GitHub Actions 云端自动打包系统，您无需在本地配置任何复杂的开发环境即可获取应用！

1. 进入当前 GitHub 仓库主页。
2. 点击右侧的 **Releases** 标签，或者进入顶部的 **Actions** 标签页找到最新的成功构建任务。
3. 下载对应的安装包：
   - **`smart-quiz-app-portable-exe`**: 绿色免安装版，解压后双击 `.exe` 即可直接运行。
   - **`.msi` 文件**: 标准的 Windows 安装向导程序。
4. 由于未签发昂贵的企业级证书，Windows SmartScreen 可能会出现蓝色拦截提示，只需点击 **“更多信息” -> “仍要运行”** 即可安全使用。

**所有的学习数据和题库均安全地保存在您本地电脑中，无需联网即可使用（AI 解析功能除外）。**

---

## 🚀 本地开发指南

如果您希望在本地进行二次开发或构建，请确保您的电脑上已安装 **[Node.js (>= 22)](https://nodejs.org/)** 和 **[Rust 工具链](https://rustup.rs/)**（对于 Windows 用户还需要 C++ 桌面开发工作负载）。

```bash
# 1. 克隆代码
git clone https://github.com/YEmperors/Review-questions.git
cd Review-questions

# 2. 安装前端依赖
npm install

# 3. 启动开发服务器（含热更新的 Tauri 窗口）
npm run tauri dev
```

### 生产环境构建

如果您在本地已配置好完整的 Rust + MSVC 环境，可以运行以下命令手动打包安装程序：

```bash
npm run build
```
生成的独立 `.exe` 以及 `.msi` 安装包将位于 `src-tauri/target/release/` 以及其下的 `bundle/` 目录中。

---

## 🛠️ 技术栈

- **前端框架**: [React 18](https://reactjs.org/) + Vite
- **跨平台桌面层**: [Tauri](https://tauri.app/) (基于 Rust 构建的安全跨平台应用层)
- **UI 组件库**: [Ant Design](https://ant.design/)
- **图表渲染**: [Recharts](https://recharts.org/)
- **文件解析**: `xlsx`, `mammoth` (Word 解析)
- **数据持久化**: Tauri 原生 FS API

---

## 📄 开源协议

本项目遵循 **MIT** 开源协议，欢迎自由使用、修改和分发。
