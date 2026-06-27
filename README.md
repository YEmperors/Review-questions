# 🧠 Smart Quiz App (智能刷题系统)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.17-success.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0_Ready-ffc131.svg)
![Capacitor](https://img.shields.io/badge/Capacitor-8.0-119eff.svg)
![Vitest](https://img.shields.io/badge/Vitest-Testing-green.svg)

**Smart Quiz App** 是一款基于 **React + Ant Design** 构建，使用 **Tauri (桌面端) / Capacitor (安卓端)** 驱动的轻量级、智能化的全平台刷题助手。它不仅能帮助你整理题库、自动出题，还提供错题复习、数据分析、AI 辅助解析以及纯本地化数据安全存储。

---

## ✨ 核心特性

- 📚 **全能题库管理**：支持单选、多选、判断、填空和简答题五大题型。支持从 Word/Excel/CSV 格式快速导入。
- 📱 **一键自动扫盘导入 (移动端专属)**：打破 Android 沙盒壁垒！深度递归扫描手机的 `Download` 和 `Documents` 目录，精准挖掘出从微信、QQ 接收以及网页下载的题库文件，一键点击瞬间导入。
- 🎯 **多模式刷题**：提供自由练习模式、模拟考试模式，以及基于记忆算法（艾宾浩斯）的智能复习模式。
- 🤖 **AI 赋能解析**：做题时遇到不懂的题目，一键调用 AI 深入解析错题原因和核心知识点（支持对接 DeepSeek、Kimi、GLM 等主流大模型）。
- 📝 **科学错题本与收藏夹**：自动归档错题并提醒复习时间，支持批量管理、搜索过滤、一键清空等便捷功能。
- 💾 **数据自由管理**：首次启动或在设置页面支持 **自定义数据存储物理路径** (支持移动硬盘/U盘)，所有数据完全私有化，不上传云端，支持一键无缝迁移与物理销毁。
- ⚡ **极致性能与模块化**：采用底层按需路由加载（Route-level Code Splitting），实现极速首屏启动与丝滑做题体验。

---

## 🚀 最新更新亮点 (v0.1.17)

1. **深度侦察兵：全自动手机文档扫盘 (v0.1.16)**：将传统的“调出文件选择器让用户大海捞针”升级为底层深度文件扫描。App 现在能自动深入 `Download` / `Documents` 及微信/QQ 的私密接收目录（最高递归 3 层），帮您挖出潜藏的 `.xlsx`, `.csv`, `.docx` 题库，并带有直观动态的来源分类（如绿色“微”字标签）。
2. **极速 Android 流水线重构 (v0.1.17)**：在 Github Actions 云端流水线中彻底剥离了沉重的 Windows Tauri 编译链路（Java 17 亦被强制热升级至 Java 21 以适配最新的 AGP 8.13），现在 APK 构建速度如闪电般迅速，且依然能自动在 Release 发布产物。
3. **“钢化膜”级别的移动端响应式抗震修复 (v0.1.15)**：全面重写了底层容器样式，全局锁定 `max-width: 100vw` 并截断横向溢出。彻底治愈了手机端常犯的“页面可横向拖拽乱晃”、“表格长列撑破屏幕边界”以及“长 API 地址不换行破坏卡片布局”等灾难级体验。
4. **历史物理废弃文件抹除机制**：为了更深度的强迫症用户体验，如果在使用时“移除了某自定义存储历史记录”，App 不再只是抹去痕迹，而是会在底层真正**物理销毁**该残留的 `smart-quiz.db` 废弃数据和对应的空文件夹，实现绝对的无痕。

---

## 📦 如何下载与安装

本仓库已配置好 GitHub Actions 云端自动打包流水线，您无需在本地配置复杂的 Node.js/Rust 编译环境即可获取最新版全平台客户端！

1. 进入当前 GitHub 仓库主页。
2. 点击右侧的 **Releases** 标签，或者进入顶部的 **Actions** 标签页找到最新的成功 tag 触发构建任务。
3. 根据平台下载对应的最新包：
   - **`smart-quiz-app-v0.1.17.apk`**: **安卓手机端安装包**，在手机中直接安装即可。
   - **`smart-quiz-app-portable.zip`**: 桌面版绿色免安装包，解压后双击内含的 `.exe` 即可运行。
4. 由于未签发昂贵的企业证书，Windows 运行或手机安装时如提示未知应用警告，只需点击 **“更多信息/详细信息” -> “仍要运行/继续安装”** 即可。

**所有的学习数据和题库均安全地保存在您本地设备中（电脑物理文件或手机 IndexedDB 沙盒缓存），无需联网即可使用（AI 解析功能除外）。**

---

## 💻 本地开发与打包指南

如果您希望在本地进行二次开发或编译，请确保您的电脑上已安装 **[Node.js (>= 22)](https://nodejs.org/)**、**[Rust 工具链](https://rustup.rs/)**（用于桌面端）以及 **Android Studio**（用于移动端）。

```bash
# 1. 克隆代码
git clone https://github.com/YEmperors/Review-questions.git
cd Review-questions

# 2. 安装项目依赖
npm install

# 3. 启动本地桌面端开发窗口
npm run tauri dev

# 4. 执行单元测试
npm run test
```

### 本地编译及调试 Android 移动端

在具备安卓开发环境的电脑上执行：

```bash
# 1. 编译最新的 Web 前端代码
npm run build

# 2. 将编译好的资产同步到安卓原生代码中
npx cap sync

# 3. 在 Android Studio 中拉起原生工程，进行真机运行或打包 APK
npx cap open android
```

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
