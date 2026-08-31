/**
 * Locale dictionaries for the session-search palette.
 *
 * @module @opendsh/dsh-plugin-session-search
 */

export const en = {
	placeholder: "Search in conversation…",
	searching: "Searching…",
	noResults: "No matches found",
	error: "Search failed",
	hint: "↑↓ to navigate, Enter to jump, Esc to close",
	roleUser: "User",
	roleAssistant: "Assistant",
	roleTool: "Tool",
	moreResults: "More results available (showing first 50)",
	results: "{count} matches",
} as const;

export type SessionSearchKey = keyof typeof en;

export const zh = {
	placeholder: "在对话中搜索…",
	searching: "搜索中…",
	noResults: "未找到匹配项",
	error: "搜索失败",
	hint: "↑↓ 导航，Enter 跳转，Esc 关闭",
	roleUser: "用户",
	roleAssistant: "助手",
	roleTool: "工具",
	moreResults: "更多结果（仅显示前 50 条）",
	results: "{count} 个匹配",
} as const;
