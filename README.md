<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="100" alt="ChatBot Logo" />
</p>

<h1 align="center">ChatBot</h1>

<p align="center">
  一个本地优先、跨平台的 AI Chat 应用，当前聚焦 <strong>聊天 + 设置</strong> 两条主线。
</p>

<p align="center">
  <code>Tauri 2</code> · <code>React 19</code> · <code>SQLite</code> · <code>MCP</code> · <code>Desktop + Mobile</code>
</p>

<p align="center">
  中文 · <a href="README-en.md">English</a>
</p>

## 项目简介

ChatBot 是一个面向桌面端和移动端的多平台 AI 对话应用。

这一版项目已经从早期的复杂实验形态收敛到更清晰的产品结构：

- 聊天页负责对话、历史记录、模型切换、富文本渲染与工具调用
- 设置页负责 Provider、模型、MCP 服务器、数据管理等核心配置
- 桌面端使用左右分栏布局
- 移动端使用更贴近原生应用的两层导航结构

当前 UI 以聊天和设置为核心。角色、语音等能力暂不作为主界面重点展示。

## 当前核心能力

### 1. 聊天体验

- 单会话聚焦的 AI 对话界面
- 新建会话、搜索历史、切换历史、删除会话
- 桌面端支持折叠侧栏
- 移动端针对键盘、底部安全区和导航切换做了适配

### 2. 模型与 Provider 配置

- 支持 OpenAI Chat / Responses API
- 支持 Anthropic Messages API
- 可自定义 API Base URL、API Key、请求 Header
- 可在设置中维护 Provider 与模型列表
- 对话过程中可切换当前模型

### 3. MCP 工具集成

- 支持通过 Model Context Protocol 连接外部工具
- 支持远程 SSE 与桌面端本地 Stdio 两种方式
- 可在设置中管理 MCP 服务器、Header、工具列表与连接状态

### 4. 富文本与长内容渲染

- 流式输出
- Markdown 渲染
- 代码高亮
- Mermaid 图表
- HTML 预览
- 推理内容与 `<think>` 标签展示

### 5. 数据与本地优先

- 聊天记录持久化
- 设置持久化
- 本地备份与导入
- 导出会话内容
- 本地 SQLite 存储，不依赖自建云端服务

## 界面结构

### 桌面端

- 左侧为历史会话与快捷入口
- 右侧为聊天区或设置区
- 设置页为左侧导航 + 右侧详情的工作台结构

### 移动端

- 底部保留聊天与设置两个主入口
- 设置首页展示所有配置项
- 点击设置项后进入二级详情页
- MCP 页面与表单页按移动端交互重新组织

## 技术栈

| 层级 | 技术 |
|------|------|
| 跨端框架 | Tauri 2 (Rust) |
| 前端框架 | React 19 · Vite |
| 路由 | react-router-dom |
| 状态管理 | Zustand |
| 数据库 | tauri-plugin-sql (SQLite) |
| 样式 | TailwindCSS v4 · shadcn/ui · Radix UI |
| 协议 | OpenAI Compatible API · Anthropic Messages · MCP |
| 渲染 | react-markdown · Mermaid · KaTeX · Shiki |
| 动画 | Framer Motion |

## 本地开发

### 前置条件

- Node.js 18+
- Rust 工具链
- Tauri 2 所需系统依赖
- Xcode（iOS / macOS 构建）
- Android Studio + Android SDK（Android 构建）

参考：

- [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/)

### 安装依赖

```bash
npm install
```

### 启动 Web 开发环境

```bash
npm run dev
```

### 启动 Tauri 桌面开发环境

```bash
npm run tauri dev
```

## 构建

### Desktop

```bash
npm run tauri build
```

默认会生成桌面端安装产物，例如 macOS 下的 `.app` / `.dmg`。

### iOS

模拟器构建：

```bash
npx tauri ios build --target aarch64-sim --ci
```

真机构建或归档通常需要 Apple 签名与开发团队配置。

### Android

首次需要先初始化 Android 工程：

```bash
npx tauri android init
```

然后构建：

```bash
npx tauri android build --apk --aab --ci
```

Android 构建依赖本机已安装 Android SDK command-line tools。

## 项目结构

```text
ChatBot/
├── src/
│   ├── components/
│   │   ├── desktop/           # 桌面端布局与交互
│   │   ├── mobile/            # 移动端布局与导航
│   │   ├── shared/            # 聊天区、输入区、消息渲染等共享组件
│   │   └── ui/                # 基础 UI 组件
│   ├── pages/
│   │   └── settings/          # 设置页与各设置子页面
│   ├── services/              # AI、MCP、备份导出、文件处理
│   ├── stores/                # Zustand 状态管理
│   ├── storage/               # 本地持久化
│   ├── i18n/                  # 中英文国际化
│   └── lib/                   # 通用工具函数
├── src-tauri/
│   ├── src/                   # Rust 后端
│   ├── capabilities/          # Tauri 权限声明
│   ├── icons/                 # 应用图标
│   └── tauri.conf.json        # Tauri 配置
├── public/                    # 静态资源
└── stitch_modern_ai_chat_ui/  # 本项目参考的 Stitch UI 设计稿
```

## 数据与隐私

- 聊天记录、设置、MCP 配置等数据优先保存在本地
- 不依赖项目自建云端服务
- 你填写的 API Key 会用于请求你选择的 AI Provider
- 是否发送到第三方模型服务，取决于你的 Provider 配置

## 适合这个项目的场景

- 搭建一个本地优先的 AI 对话客户端
- 统一管理不同 Provider 与模型
- 在对话中接入 MCP 工具
- 同时维护桌面端和移动端的统一体验
- 作为 Tauri 2 + React 19 AI 应用的工程模板继续演进

## 许可证

[MIT](LICENSE)
