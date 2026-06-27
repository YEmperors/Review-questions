# 🧠 Smart Quiz App (智能刷题系统)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.14-success.svg)
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

## 🚀 最新更新亮点 (v0.1.14)

1. **全新 Android 移动客户端就绪**：引入了 **Capacitor 原生包装容器**，自动将最新的 React 前端编译生成原生的 Android 原生壳应用。得益于底层的双重存储适配，APP 运行在手机上时会自动走轻量、可靠的 **IndexedDB 数据自动同步存盘方案**，100% 保证用户刷题记录的持久化。
2. **移动端响应式布局重构**：重构了系统的全局布局。当检测到窄屏环境（如手机尺寸）时，电脑端左侧边栏会自动折叠隐藏，转换为移动端标准的 **“顶部 Fixed Header + 左滑抽屉汉堡菜单 Drawer”** 模式；同时，修复了错题本和收藏夹页面在小屏尺寸下题目与题型标签重叠溢出的排版 Bug。
3. **智能乱序刷题与多场景控制**：不仅支持在刷题配置中打乱选择题的选项展示，同时在题库管理“练习选中”、错题本重做（全部/到期）、以及答题报告“重做”等多个入口增加了统一的**“练习选项配置弹窗”**，方便一键打乱题目及选项顺序。
4. **历史目录规范化去重**：修复了在 Windows 下切换自定义存储路径时因为反斜杠 `/` 与 `\`、末尾斜杠、或者路径字母大小写不一致导致历史记录下拉框中出现重复 AppData 默认路径项的缺陷。

---

## 📦 如何下载与安装

本仓库已配置好 GitHub Actions 云端自动打包流水线，您无需在本地配置复杂的 Node.js/Rust 编译环境即可获取最新版全平台客户端！

1. 进入当前 GitHub 仓库主页。
2. 点击右侧的 **Releases** 标签，或者进入顶部的 **Actions** 标签页找到最新的成功 tag 触发构建任务。
3. 根据平台下载对应的最新包：
   - **`smart-quiz-app-v0.1.14.apk`**: **安卓手机端安装包**，在手机中直接安装即可。
   - **`smart-quiz-app-portable.zip`**: 桌面版绿色免安装包，解压后双击内含的 `.exe` 即可运行。
   - **`.msi` 文件**: Windows 标准安装向导程序。
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
