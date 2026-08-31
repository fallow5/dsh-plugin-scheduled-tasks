# @opendsh/dsh-plugin-session-shares

DSH web plugin: **会话分享** — 选择性分享会话消息，支持密码/公开可见性，设置中管理分享。

## 功能

### 1. 会话记录选择性分享

- 在会话右键菜单中添加「分享」选项
- 弹出分享对话框，显示会话中所有消息（用户 / 助手 / 工具）
- 支持**不连续选择**消息（复选框，可任意勾选）
- 保留原始样式渲染（Markdown、代码块、工具调用等）
- 分享时冻结当前时间点（`maxSeq`），**新回复在老分享中不可见**

### 2. 设置中的分享管理

- 在设置面板添加「会话分享管理」section
- 列出所有分享（标题、可见性、创建时间）
- 可取消分享（撤销公开访问，链接立即失效）
- 可打开分享链接

### 3. 密码 / 公开分享

- 创建分享时可选择「公开」或「密码保护」
- 密码使用 SHA-256 哈希存储
- 密码保护的分享需要输入密码才能查看
- 使用 `timingSafeEqual` 防止时序攻击

## 架构

双面 npm 包，安装到 `web` profile：

| 层 | 文件 | 功能 |
| --- | --- | --- |
| 服务端 | `lib/index.js` | 插件入口，注册 storage domain + typert + HTTP 路由 |
| 服务端 | `lib/store.js` | 分享记录的持久化存储（`session_shares` domain） |
| 服务端 | `lib/runtime.js` | typert host 服务（`ctx.shares`） |
| 服务端 | `lib/share-viewer.js` | 公开 HTTP 路由 `/share/:token` |
| 服务端 | `lib/session-reader.js` | 从 session persistence 读取事件并渲染 |
| 服务端 | `lib/typert.js` | Host TYPERT face（`shares/*` endpoints） |
| 客户端 | `lib/client.js` | React 面板（右键菜单 + 设置 section + 分享对话框） |

### 客户端 ↔ 服务端通道

使用 DSH typert 协议（与 `dsh-commands` 相同机制）：strict zod codecs 在两端验证每个参数和结果。

## 安装

```sh
dsh plugin --profile web add @opendsh/dsh-plugin-session-shares
```

或从本地路径安装：

```json
{
  "dependencies": {
    "@opendsh/dsh-plugin-session-shares": "link:/path/to/dsh-session-shares"
  }
}
```

并在 profile 的 `package.json` → `dsh.profile.bundles` 中添加 `"@opendsh/dsh-plugin-session-shares"`。

## 开发

```sh
pnpm --dir dsh-session-shares typecheck   # tsc (TypeScript 7)
pnpm --dir dsh-session-shares build       # tsc emit + tsdown client bundle + loader wrapper
```

修改源码后，重新 build 并重新安装 profile（`pnpm install` 会重新复制 `link:` 依赖），然后重启 `dsh web`。

## 技术细节

### 路由注册

`/share` 前缀路由注册到 `ctx.webServer`：

```js
ctx.webServer.register({ kind: "prefix", path: "/share", handler });
```

> **注意**：前缀路径必须是 `/share`（不带尾部斜杠）。webServer 的前缀匹配逻辑是 `pathname.startsWith(`${prefix}/`)`，如果 prefix 自带尾部斜杠（`/share/`）会导致双斜杠匹配失败。

### 消息冻结机制

创建分享时记录当前会话的 `maxSeq`（事件日志长度）。查看分享时只渲染 `seq <= maxSeq` 且在 `selectedSeqs` 中的事件。这保证了：
- 分享后新回复在老分享中不可见
- 只能看到已选择的消息

### Session 读取

通过 `ctx.get("sessionPersistence").inspect(sessionId)` 冷读取会话事件，不创建 live session。支持：
- `user/message` — 用户消息
- `assistant/message` — 助手消息
- `tool/call` — 工具调用
- `tool/result` — 工具结果

### 分享查看页面

自包含的 HTML 页面，暗色主题，支持：
- Markdown 渲染（代码块、标题、列表、引用、链接）
- 工具调用/结果展示
- 密码输入（密码保护的分享）
- 响应式布局

### 依赖

- `@deepseek-ai/dsh-storage-domain` — 持久化存储
- `@deepseek-ai/dsh-typert-protocol` — typert RPC
- `@deepseek-ai/dsh-session` — 会话事件类型
- `react` / `react-dom` — 客户端 UI
- `zod` — schema 验证

## 文件结构

```
dsh-session-shares/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── tsdown.config.ts
├── cordis.patch.yml
├── scripts/
│   └── wrap-client.mjs
└── src/
    ├── index.ts              # 插件入口
    ├── domain.ts             # storage domain 声明
    ├── store.ts              # 分享记录存储
    ├── runtime.ts            # typert host 服务
    ├── typert.ts             # Host TYPERT face
    ├── schemas.ts            # zod schemas
    ├── types.ts              # 类型声明
    ├── session-reader.ts     # 会话事件读取与渲染
    ├── share-viewer.ts       # 公开 HTTP 路由
    └── client/
        ├── index.ts          # 客户端入口
        ├── locales.ts        # 中英文 locale
        ├── styles.ts         # CSS 样式
        ├── remote.ts         # 客户端 remote 接口
        ├── typert-remote.ts  # 客户端 TYPERT face
        ├── ShareDialog.tsx   # 分享对话框
        └── SharesSettings.tsx # 设置中的分享管理
```

## 限制

- 分享查看页面是独立 HTML，不依赖 DSH 客户端
- 密码哈希使用 SHA-256（无加盐，适合轻量场景）
- 消息渲染是简化版 Markdown（不支持完整 Markdown 语法）
- 分享链接需要 DSH web 服务运行才能访问
