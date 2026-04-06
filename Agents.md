# ChatBot

## 总体目标

## 通过前端技术 + 后端技术 + Agent 工程技术，完成一个简单的 chatbot 对话应用。

## chatbot 是跨平台的，主要功能包含以下内容

要求：

1. **支持自定义**API URL 和 API key : API 协议为OpenAI Chat / Responses API 和 Anthropic Messages API

2. **支持对话的历史管理**，比如查看历史对话、新建对话等

3. **流式输出** — 实时渲染，支持 Markdown / 代码高亮 / Mermaid 图表 / HTML 预览

4. **支持对话中断** - 支持用户主动取消单次对话

5. **深度推理** — 支持模型的 reasoning_content 和 `<think>` 标签

6. **支持调用工具** — 支持工具的调用，比如 chatbot 可以搜索查询当日天气等

7. **响应式** — 桌面 / 手机端自适应布局

8. 文件解析

9. 上下文压缩

10. **对话置顶** 

11. **Token 用量** 

12. **消息编辑** 

13. 对话记录导出

14. **白色/暗色模式** 

15. **数据、配置备份**

    

## 技术栈



| 层级     | 技术                                  |
| -------- | ------------------------------------- |
| 跨端框架 | Tauri 2 (Rust)                        |
| 前端框架 | React 19 · Vite                       |
| 路由     | react-router-dom                      |
| 状态管理 | Zustand                               |
| 数据库   | tauri-plugin-sql (SQLite)             |
| 样式     | TailwindCSS v4 · shadcn/ui · Radix UI |
| AI       | 支持 SSE                              |
| 渲染     | react-markdown · Mermaid · KaTeX      |
| 动画     | Framer Motion                         |
|          |                                       |

前端 UI 设计在 stitch mcp 读取：projects/401038115940495175 Modern AI Chat UI

代码可以参考/Users/gyc/Code/ChatBot-main