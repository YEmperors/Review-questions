# 🧠 Smart Quiz App (智能刷题系统)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.3-success.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0_Ready-ffc131.svg)
![Vitest](https://img.shields.io/badge/Vitest-Testing-green.svg)

**Smart Quiz App** 是一款基于 **Tauri + React + Ant Design** 构建的轻量级、智能化的跨平台刷题助手。它不仅能帮助你整理题库、自动出题，还提供错题复习、数据分析、AI 辅助解析以及数据本地安全存储。

---

## ✨ 核心特性

- 📚 **全能题库管理**：支持单选、多选、判断、填空和简答题五大题型。支持从 Word/Excel/CSV 格式快速导入。
- 🎯 **多模式刷题**：提供自由练习模式、模拟考试模式，以及基于记忆算法（艾宾浩斯）的智能复习模式。
- 🤖 **AI 赋能解析**：做题时遇到不懂的题目，一键调用 AI 深入解析错题原因和核心知识点（支持对接 DeepSeek、Kimi 等国产大模型）。
- 📝 **科学错题本与收藏夹**：自动归档错题并提醒复习时间，支持批量管理、搜索过滤、一键清空等便捷功能。
- 💾 **数据自由管理**：首次启动或在设置页面支持 **自定义数据存储路径**，所有数据 100% 掌握在自己手中，支持一键无缝迁移。
- ⚡ **极致性能与模块化**：采用底层按需路由加载（Route-level Code Splitting），实现极速首屏启动体验。

---

## 🚀 最新更新亮点 (v0.1.3)

1. **移动端架构就绪 (Tauri v2)**：前端核心 API 及底层 CLI 工具已升级至最新的 Tauri v2 生态，为编译发布 **Android (.apk)** 和 iOS 应用做好了底层准备。
2. **严密的自动化测试**：完善了详细的黑盒与白盒测试方案，核心“自适应抽题算法”已实现 100% 覆盖率的 Vitest 单元测试保障。
3. **更顺滑的 UI 体验**：全应用分页器位置统一，修复了错题本和题库管理在大量数据下的滚动问题，加入了一致的智能返回顶部悬浮按钮。

---

## 📦 如何下载与安装

本仓库已配置好 GitHub Actions 云端自动打包系统，您无需在本地配置任何复杂的开发环境即可获取桌面端应用！

1. 进入当前 GitHub 仓库主页。
2. 点击右侧的 **Releases** 标签，或者进入顶部的 **Actions** 标签页找到最新的成功构建任务。
3. 下载对应的安装包：
   - **`smart-quiz-app-portable.zip`**: 绿色免安装版，解压后双击 `.exe` 即可直接运行。
   - **`.msi` 文件**: 标准的 Windows 安装向导程序。
4. 由于未签发昂贵的企业级证书，Windows SmartScreen 可能会出现蓝色拦截提示，只需点击 **“更多信息” -> “仍要运行”** 即可安全使用。

**所有的学习数据和题库均安全地保存在您本地电脑中，无需联网即可使用（AI 解析功能除外）。**

---

## 💻 本地开发指南

如果您希望在本地进行二次开发或编译为移动端 APK，请确保您的电脑上已安装 **[Node.js (>= 22)](https://nodejs.org/)** 和 **[Rust 工具链](https://rustup.rs/)**（对于 Windows 用户还需要 C++ 桌面开发工作负载，移动端还需要 Android Studio）。

```bash
# 1. 克隆代码
git clone https://github.com/YEmperors/Review-questions.git
cd Review-questions

# 2. 安装前端依赖
npm install

# 3. 启动开发服务器（含热更新的 Tauri 窗口）
npm run tauri dev

# 4. 执行单元测试
npm run test
```

### 生成 Android APK (需要 Tauri v2 升级与 Android Studio)

在具备 Android 开发环境的电脑上执行：

```bash
npx tauri migrate
npx tauri android init
npx tauri android build
```

生成的 `.apk` 文件将位于 `src-tauri/gen/android/` 相关构建输出目录中。

---

## 🛠️ 技术栈

- **前端框架**: [React 18](https://reactjs.org/) + Vite
- **跨平台应用层**: [Tauri v2 API](https://v2.tauri.app/) (安全跨平台应用层)
- **UI 组件库**: [Ant Design v5](https://ant.design/)
- **测试框架**: [Vitest](https://vitest.dev/)
- **数据库**: [sql.js](https://sql.js.org/) (SQLite in WebAssembly)
- **图表与解析**: `recharts`, `xlsx`, `mammoth`

---

## 📄 开源协议

本项目遵循 **MIT** 开源协议，欢迎自由使用、修改和分发。
