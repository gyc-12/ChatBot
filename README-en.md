<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="100" alt="ChatBot Logo" />
</p>

<h1 align="center">ChatBot</h1>

<p align="center">
  A local-first, cross-platform AI chat app focused on two core flows: <strong>Chat + Settings</strong>.
</p>

<p align="center">
  <code>Tauri 2</code> · <code>React 19</code> · <code>SQLite</code> · <code>MCP</code> · <code>Desktop + Mobile</code>
</p>

<p align="center">
  <a href="README.md">中文</a> · English
</p>

## Overview

ChatBot is a multi-platform AI chat application for desktop and mobile.

This version has been streamlined from an earlier experimental shape into a clearer product structure:

- Chat covers conversation, history, model switching, rich content rendering, and tool calling
- Settings covers Provider, models, MCP servers, and data management
- Desktop uses a two-pane layout
- Mobile uses a more native-like two-level navigation model

The current UI centers on chat and settings. Features like persona and voice are not the main focus of the primary interface in this version.

---

## Current Core Capabilities

### 1. Chat Experience

- Focused single-conversation AI chat interface
- Create conversation, search history, switch history, delete conversation
- Collapsible sidebar on desktop
- Mobile adaptations for keyboard, bottom safe area, and tab switching

### 2. Model and Provider Configuration

- Supports OpenAI Chat / Responses API
- Supports Anthropic Messages API
- Custom API Base URL, API Key, and request headers
- Manage Provider and model list in settings
- Switch active model during conversation

### 3. MCP Tool Integration

- Supports connecting external tools via Model Context Protocol
- Supports both remote SSE and desktop-local Stdio
- Manage MCP servers, headers, tool list, and connection status in settings

### 4. Rich Rendering and Long-Content Support

- Streaming output
- Markdown rendering
- Code highlighting
- Mermaid diagrams
- HTML preview
- Reasoning content and <think> tag rendering

### 5. Data and Local-First

- Conversation persistence
- Settings persistence
- Local backup and import
- Export conversations
- Local SQLite storage, no self-hosted cloud backend required

## UI Structure

### Desktop

- Left pane for conversation history and shortcuts
- Right pane for chat area or settings area
- Settings uses a workstation pattern: left navigation + right detail

### Mobile

- Bottom tabs include Chat and Settings
- Settings home shows all configuration sections
- Tap an item to enter second-level detail pages
- MCP and forms are reorganized for mobile interactions

---

## Tech Stack

| Layer | Technology |
|------|------|
| Cross-platform | Tauri 2 (Rust) |
| Frontend | React 19 · Vite |
| Routing | react-router-dom |
| State | Zustand |
| Database | tauri-plugin-sql (SQLite) |
| Styling | TailwindCSS v4 · shadcn/ui · Radix UI |
| Protocol | OpenAI Compatible API · Anthropic Messages · MCP |
| Rendering | react-markdown · Mermaid · KaTeX · Shiki |
| Animation | Framer Motion |

---

## Local Development

### Prerequisites

- Node.js 18+
- Rust toolchain
- System dependencies required by Tauri 2
- Xcode (for iOS / macOS builds)
- Android Studio + Android SDK (for Android builds)

Reference:

- [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Install dependencies

```bash
npm install
```

### Start Web development

```bash
npm run dev
```

### Start Tauri desktop development

```bash
npm run tauri dev
```

## Build

### Desktop

```bash
npm run tauri build
```

By default, desktop installer artifacts are generated, such as .app / .dmg on macOS.

### iOS

Simulator build:

```bash
npx tauri ios build --target aarch64-sim --ci
```

Real-device build or archive usually requires Apple signing and team configuration.

### Android

Initialize Android project first:

```bash
npx tauri android init
```

Then build:

```bash
npx tauri android build --apk --aab --ci
```

Android build requires Android SDK command-line tools installed locally.

## Project Structure

```text
ChatBot/
├── src/
│   ├── components/
│   │   ├── desktop/           # Desktop layout and interactions
│   │   ├── mobile/            # Mobile layout and navigation
│   │   ├── shared/            # Shared chat/input/message rendering components
│   │   └── ui/                # Base UI components
│   ├── pages/
│   │   └── settings/          # Settings and sub-pages
│   ├── services/              # AI, MCP, backup/export, file handling
│   ├── stores/                # Zustand state management
│   ├── storage/               # Local persistence
│   ├── i18n/                  # Chinese/English i18n
│   └── lib/                   # Shared utility functions
├── src-tauri/
│   ├── src/                   # Rust backend
│   ├── capabilities/          # Tauri capability declarations
│   ├── icons/                 # App icons
│   └── tauri.conf.json        # Tauri configuration
├── public/                    # Static assets
└── stitch_modern_ai_chat_ui/  # Referenced Stitch UI design sources
```

## Data and Privacy

- Chat records, settings, and MCP configuration are stored locally first
- No self-hosted cloud service is required by this project
- API keys you provide are used to call your selected AI provider
- Whether data is sent to third-party model services depends on your provider configuration

## Good Fit Scenarios

- Build a local-first AI chat client
- Manage multiple providers and models in one place
- Use MCP tools during conversations
- Maintain a consistent desktop + mobile experience
- Use this project as an evolving Tauri 2 + React 19 AI app template

## License

[MIT](LICENSE)
