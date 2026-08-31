# @opendsh/dsh-plugin-session-search

DSH web plugin: **会话内容检索** — VSCode 风格的快捷键搜索面板，在当前会话页面中搜索消息内容。

## 功能

### 1. 快捷键触发

- **Ctrl+P** (Windows/Linux) 或 **Cmd+P** (macOS) 打开搜索面板
- 面板出现在页面顶部居中位置（VSCode Quick Pick 风格）
- **Esc** 关闭面板

### 2. 会话内容搜索

- 搜索当前会话中所有消息内容（用户消息、助手消息、工具调用/结果）
- 实时搜索（200ms 防抖）
- 大小写不敏感的全文搜索
- 最多返回 50 条匹配结果

### 3. 结果展示与导航

- 每条结果显示消息角色标签（用户 / 助手 / 工具）
- 匹配文本高亮显示
- 上下文片段（匹配位置前后各 60 字符）
- **↑↓** 键在结果间导航
- **Enter** 跳转到对应消息（滚动定位 + 闪烁高亮）
- 鼠标点击直接跳转

## 架构

双面 npm 包，安装到 `web` profile：

| 层 | 文件 | 功能 |
| --- | --- | --- |
| 服务端 | `lib/index.js` | 插件入口，注册 typert 服务 |
| 服务端 | `lib/runtime.js` | typert host 服务（`ctx.sessionSearch`） |
| 服务端 | `lib/session-reader.js` | 从 session persistence 读取事件并搜索 |
| 服务端 | `lib/typert.js` | Host TYPERT face（`sessionSearch/*` endpoints） |
| 客户端 | `lib/client.js` | React 面板（快捷键 + 搜索 UI + 消息跳转） |

### 客户端 ↔ 服务端通道

使用 DSH typert 协议（与 `dsh-commands` 相同机制）：strict zod codecs 在两端验证每个参数和结果。

### 搜索流程

1. 用户按 Ctrl+P / Cmd+P → 打开搜索面板
2. 输入搜索词 → 200ms 防抖后发送到服务端
3. 服务端通过 `sessionPersistence.inspect(sessionId)` 冷读取会话事件
4. 遍历 `user/message`、`assistant/message`、`tool/call`、`tool/result` 事件
5. 大小写不敏感匹配，返回带上下文的片段
6. 用户选择结果 → 客户端通过 `[data-chat-flow-key]` 定位消息 DOM 并滚动

## 安装

```sh
dsh plugin --profile web add @opendsh/dsh-plugin-session-search
```

或从本地路径安装：

```json
{
  "dependencies": {
    "@opendsh/dsh-plugin-session-search": "link:/path/to/dsh-session-search"
  }
}
```

并在 profile 的 `package.json` → `dsh.profile.bundles` 中添加 `"@opendsh/dsh-plugin-session-search"`。

## 开发

```sh
pnpm --dir dsh-session-search typecheck   # tsc (TypeScript 7)
pnpm --dir dsh-session-search build       # tsc emit + tsdown client bundle + loader wrapper
```

修改源码后，重新 build 并重新安装 profile（`pnpm install` 会重新复制 `link:` 依赖），然后重启 `dsh web`。

## 限制

- 搜索是大小写不敏感的全文匹配
- 最多返回 50 条结果
- 搜索需要 `sessionPersistence` 服务可用
- 跳转依赖 DOM 中 `[data-chat-flow-key]` 属性定位消息节点
