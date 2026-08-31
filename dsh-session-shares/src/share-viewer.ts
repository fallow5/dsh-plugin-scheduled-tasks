/**
 * Share viewer: public HTTP route handler that serves shared session pages.
 *
 * Registers `/share/` prefix route on `ctx.webServer`. The route serves:
 * - `GET /share/:token` → the viewer HTML page
 * - `POST /share/:token/api` → JSON API for the shared data (with password check)
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { getRenderedMessages, type RenderedMessage } from "./session-reader.js";
import { toView, verifyPassword } from "./store.js";
import type { ShareRecord } from "./types.js";
import type { SharesStore } from "./store.js";

/** Minimal webServer service face. */
interface WebServerLike {
	register(route: { kind: "exact" | "prefix"; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }): () => void;
}

/** Minimal workspace-registry face for resolving project paths. */
interface WorkspaceRegistryLike {
	resolveByPath?(path: string): Promise<{ path: string } | undefined>;
}

/** Read the request body as a string. */
function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		req.on("error", reject);
	});
}

/** Send a JSON response. */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
	const json = JSON.stringify(body);
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Content-Length": Buffer.byteLength(json),
	});
	res.end(json);
}

/** Escape HTML text content. */
function escHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/** The share viewer page HTML (self-contained, DSH-style dark theme). */
function viewerHtml(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shared Session</title>
<style>
/* ── DSH CSS variable values (dark theme) ─────────────────────────── */
:root {
	--dsw-alias-bg-base: #1a1a2e;
	--dsw-alias-bg-layer-1: #23233a;
	--dsw-alias-bg-layer-2: #2a2a4a;
	--dsw-alias-label-primary: #e0e0e0;
	--dsw-alias-label-secondary: #a0a0b0;
	--dsw-alias-label-tertiary: #707080;
	--dsw-alias-border-l2: #3a3a5a;
	--dsw-alias-interactive-bg-hover: rgba(255,255,255,0.08);
	--dsw-alias-state-business-primary: #4a9eff;

	--code-bg: #0d1117;
	--code-border: #30363d;
	--error: #ff6b6b;
	--radius: 8px;
	--radius-sm: 6px;
	--radius-lg: 12px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
	background: var(--dsw-alias-bg-base);
	color: var(--dsw-alias-label-primary);
	line-height: 1.6;
	font-size: 14px;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

/* ── Header bar ────────────────────────────────────────────────────── */
.header {
	background: var(--dsw-alias-bg-layer-1);
	border-bottom: 1px solid var(--dsw-alias-border-l2);
	padding: 16px 24px;
	position: sticky;
	top: 0;
	z-index: 10;
}
.header h1 {
	font-size: 15px;
	font-weight: 600;
	color: var(--dsw-alias-label-primary);
}
.header .meta {
	font-size: 12px;
	color: var(--dsw-alias-label-tertiary);
	margin-top: 4px;
}

/* ── Conversation container ────────────────────────────────────────── */
.container {
	max-width: 860px;
	margin: 0 auto;
	padding: 24px 16px 80px;
}

/* ── Message turn (user / assistant / tool) ─────────────────────────── */
.message {
	margin-bottom: 20px;
}

/* User message: right-aligned bubble */
.message.user {
	display: flex;
	justify-content: flex-end;
}
.message.user .message-bubble {
	background: var(--dsw-alias-state-business-primary);
	color: #fff;
	border-radius: var(--radius-lg) var(--radius-lg) 4px var(--radius-lg);
	padding: 10px 16px;
	max-width: 80%;
	font-size: 14px;
	line-height: 1.6;
	word-break: break-word;
	white-space: pre-wrap;
}

/* Assistant message: full-width with left accent */
.message.assistant {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.message.assistant .message-role {
	font-size: 12px;
	font-weight: 600;
	color: var(--dsw-alias-label-secondary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	padding: 0 4px;
}
.message.assistant .message-body {
	background: var(--dsw-alias-bg-layer-1);
	border: 1px solid var(--dsw-alias-border-l2);
	border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px;
	padding: 14px 18px;
	font-size: 14px;
	line-height: 1.7;
	color: var(--dsw-alias-label-primary);
	overflow: hidden;
}

/* Tool call/result: collapsible panel */
.message.tool {
	display: flex;
	flex-direction: column;
	gap: 2px;
}
.tool-panel {
	background: var(--dsw-alias-bg-layer-1);
	border: 1px solid var(--dsw-alias-border-l2);
	border-radius: var(--radius-sm);
	overflow: hidden;
}
.tool-panel-header {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	cursor: pointer;
	user-select: none;
	font-size: 13px;
	color: var(--dsw-alias-label-secondary);
	transition: background 0.15s;
}
.tool-panel-header:hover {
	background: var(--dsw-alias-interactive-bg-hover);
}
.tool-panel-header .tool-icon {
	font-size: 14px;
	flex-shrink: 0;
}
.tool-panel-header .tool-name {
	font-weight: 600;
	color: var(--dsw-alias-state-business-primary);
}
.tool-panel-header .tool-chevron {
	margin-left: auto;
	font-size: 10px;
	color: var(--dsw-alias-label-tertiary);
	transition: transform 0.2s;
}
.tool-panel.collapsed .tool-chevron {
	transform: rotate(-90deg);
}
.tool-panel-body {
	padding: 8px 12px;
	font-size: 13px;
	color: var(--dsw-alias-label-secondary);
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 400px;
	overflow-y: auto;
	border-top: 1px solid var(--dsw-alias-border-l2);
}
.tool-panel.collapsed .tool-panel-body {
	display: none;
}
.tool-panel-body.error {
	color: var(--error);
}

/* ── Markdown rendering inside assistant body ──────────────────────── */
.message-body p {
	margin: 8px 0;
}
.message-body p:first-child {
	margin-top: 0;
}
.message-body p:last-child {
	margin-bottom: 0;
}
.message-body ul, .message-body ol {
	margin: 8px 0;
	padding-left: 24px;
}
.message-body li {
	margin: 4px 0;
}
.message-body h1, .message-body h2, .message-body h3 {
	margin: 16px 0 8px;
	font-weight: 600;
}
.message-body h1 { font-size: 1.3em; }
.message-body h2 { font-size: 1.15em; }
.message-body h3 { font-size: 1em; }
.message-body a {
	color: var(--dsw-alias-state-business-primary);
	text-decoration: none;
}
.message-body a:hover {
	text-decoration: underline;
}
.message-body blockquote {
	border-left: 3px solid var(--dsw-alias-border-l2);
	padding: 4px 12px;
	margin: 8px 0;
	color: var(--dsw-alias-label-secondary);
	background: rgba(255,255,255,0.02);
	border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.message-body table {
	border-collapse: collapse;
	margin: 8px 0;
	width: 100%;
	font-size: 13px;
}
.message-body th, .message-body td {
	border: 1px solid var(--dsw-alias-border-l2);
	padding: 6px 12px;
	text-align: left;
}
.message-body th {
	background: var(--dsw-alias-bg-layer-2);
	font-weight: 600;
}

/* ── Code blocks ───────────────────────────────────────────────────── */
.message-body pre,
.message-bubble pre {
	background: var(--code-bg);
	border: 1px solid var(--code-border);
	border-radius: var(--radius-sm);
	padding: 12px 14px;
	overflow-x: auto;
	margin: 8px 0;
	font-size: 13px;
	line-height: 1.5;
}
.message-body code,
.message-bubble code {
	font-family: "SF Mono", Monaco, "Cascadia Code", "Fira Code", monospace;
	font-size: 0.9em;
}
.message-body :not(pre) > code,
.message-bubble :not(pre) > code {
	background: var(--dsw-alias-bg-layer-2);
	padding: 2px 6px;
	border-radius: 4px;
	color: var(--dsw-alias-state-business-primary);
}

/* ── Reasoning blocks ──────────────────────────────────────────────── */
.reasoning {
	color: var(--dsw-alias-label-tertiary);
	font-style: italic;
	border-left: 2px solid var(--dsw-alias-border-l2);
	padding: 8px 12px;
	margin: 8px 0;
	font-size: 13px;
	background: rgba(255,255,255,0.02);
	border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

/* ── Password prompt ───────────────────────────────────────────────── */
.password-prompt {
	max-width: 400px;
	margin: 80px auto;
	background: var(--dsw-alias-bg-layer-1);
	border: 1px solid var(--dsw-alias-border-l2);
	border-radius: var(--radius-lg);
	padding: 32px;
	text-align: center;
}
.password-prompt h2 {
	font-size: 18px;
	margin-bottom: 16px;
	color: var(--dsw-alias-label-primary);
}
.password-prompt input {
	width: 100%;
	padding: 10px 14px;
	background: var(--dsw-alias-bg-base);
	border: 1px solid var(--dsw-alias-border-l2);
	border-radius: var(--radius-sm);
	color: var(--dsw-alias-label-primary);
	font-size: 14px;
	margin-bottom: 12px;
	outline: none;
	transition: border-color 0.15s;
}
.password-prompt input:focus {
	border-color: var(--dsw-alias-state-business-primary);
}
.password-prompt button {
	width: 100%;
	padding: 10px;
	background: var(--dsw-alias-state-business-primary);
	border: none;
	border-radius: var(--radius-sm);
	color: #fff;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: opacity 0.15s;
}
.password-prompt button:hover {
	opacity: 0.9;
}
.password-prompt .error {
	color: var(--error);
	font-size: 13px;
	margin-top: 8px;
	min-height: 18px;
}

/* ── Loading / not-found states ────────────────────────────────────── */
.loading {
	text-align: center;
	padding: 60px;
	color: var(--dsw-alias-label-tertiary);
}
.not-found {
	text-align: center;
	padding: 60px;
	color: var(--dsw-alias-label-tertiary);
}
.not-found h2 {
	font-size: 18px;
	margin-bottom: 8px;
	color: var(--dsw-alias-label-primary);
}

/* ── Scrollbar styling ─────────────────────────────────────────────── */
::-webkit-scrollbar {
	width: 8px;
	height: 8px;
}
::-webkit-scrollbar-track {
	background: transparent;
}
::-webkit-scrollbar-thumb {
	background: var(--dsw-alias-border-l2);
	border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
	background: var(--dsw-alias-label-tertiary);
}
</style>
</head>
<body>
<div id="app"><div class="loading">Loading…</div></div>
<script>
(function() {
	var token = window.location.pathname.split("/").pop();
	var app = document.getElementById("app");

	function renderPasswordPrompt() {
		app.innerHTML = '<div class="password-prompt">' +
			'<h2>🔒 Password Required</h2>' +
			'<input type="password" id="pw-input" placeholder="Enter password" />' +
			'<button id="pw-btn">View Share</button>' +
			'<div class="error" id="pw-err"></div>' +
			'</div>';
		var input = document.getElementById("pw-input");
		var btn = document.getElementById("pw-btn");
		input.focus();
		function submit() {
			var pw = input.value;
			fetch("/share/" + token + "/api", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: pw })
			}).then(function(r) { return r.json(); }).then(function(data) {
				if (data.error) {
					document.getElementById("pw-err").textContent = data.error;
				} else {
					renderMessages(data);
				}
			}).catch(function() {
				document.getElementById("pw-err").textContent = "Network error";
			});
		}
		btn.onclick = submit;
		input.onkeydown = function(e) { if (e.key === "Enter") submit(); };
	}

	function escHtml(text) {
		var d = document.createElement("div");
		d.textContent = text;
		return d.innerHTML;
	}

	function renderMarkdown(text) {
		var html = escHtml(text);
		// Fenced code blocks
		html = html.replace(/\`\`\`(\w*)\n?([\s\S]*?)\`\`\`/g, function(m, lang, code) {
			return '<pre><code>' + code.replace(/\n$/, '') + '</code></pre>';
		});
		// Inline code
		html = html.replace(/\`([^\`]+)\`/g, function(m, code) {
			return '<code>' + code + '</code>';
		});
		// Bold
		html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
		// Headers
		html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
		html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
		html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
		// Blockquote
		html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
		// Lists
		html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
		html = html.replace(/(<li>[\s\S]*?<\/li>)/g, function(m) { return '<ul>' + m + '</ul>'; });
		// Paragraphs
		html = html.replace(/\n\n/g, '</p><p>');
		html = '<p>' + html + '</p>';
		html = html.replace(/<p><\/p>/g, '');
		// Fix block-level elements wrapped in <p>
		html = html.replace(/<p>(<h[1-3]>)/g, '$1');
		html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1');
		html = html.replace(/<p>(<pre>)/g, '$1');
		html = html.replace(/(<\/pre>)<\/p>/g, '$1');
		html = html.replace(/<p>(<ul>)/g, '$1');
		html = html.replace(/(<\/ul>)<\/p>/g, '$1');
		html = html.replace(/<p>(<blockquote>)/g, '$1');
		html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
		return html;
	}

	function renderBlock(block) {
		if (block.type === "text") {
			return '<div class="message-body">' + renderMarkdown(block.text || "") + '</div>';
		}
		if (block.type === "reasoning") {
			return '<div class="reasoning">' + escHtml(block.text || "") + '</div>';
		}
		if (block.type === "tool-call") {
			return '<div class="tool-panel collapsed">' +
				'<div class="tool-panel-header" onclick="this.parentElement.classList.toggle(\'collapsed\')">' +
				'<span class="tool-icon">🔧</span>' +
				'<span class="tool-name">' + escHtml(block.toolName || "tool") + '</span>' +
				'<span class="tool-chevron">▼</span>' +
				'</div>' +
				'<div class="tool-panel-body">' + escHtml(block.toolArgs || "") + '</div>' +
				'</div>';
		}
		if (block.type === "tool-result") {
			var cls = block.isError ? "tool-panel-body error" : "tool-panel-body";
			var text = block.text || "";
			var truncated = text.length > 2000 ? text.slice(0, 2000) + "…" : text;
			return '<div class="tool-panel collapsed">' +
				'<div class="tool-panel-header" onclick="this.parentElement.classList.toggle(\'collapsed\')">' +
				'<span class="tool-icon">' + (block.isError ? "❌" : "↳") + '</span>' +
				'<span class="tool-name">Result</span>' +
				'<span class="tool-chevron">▼</span>' +
				'</div>' +
				'<div class="' + cls + '">' + escHtml(truncated) + '</div>' +
				'</div>';
		}
		if (block.type === "image") {
			return '<div class="tool-panel">' +
				'<div class="tool-panel-header">' +
				'<span class="tool-icon">🖼</span>' +
				'<span class="tool-name">Image</span>' +
				'</div>' +
				'</div>';
		}
		return "";
	}

	function renderMessages(data) {
		var messages = data.messages || [];
		if (messages.length === 0) {
			app.innerHTML = '<div class="not-found"><h2>No messages</h2><p>This share has no visible messages.</p></div>';
			return;
		}
		var html = '<div class="header"><h1>' + escHtml(data.title || "Shared Session") + '</h1>';
		html += '<div class="meta">Shared on ' + new Date(data.createdAt).toLocaleString() + '</div></div>';
		html += '<div class="container">';
		for (var i = 0; i < messages.length; i++) {
			var msg = messages[i];
			var role = msg.role;
			html += '<div class="message ' + role + '">';
			if (role === "user") {
				// User: render as a bubble
				var userText = "";
				for (var j = 0; j < msg.blocks.length; j++) {
					if (msg.blocks[j].type === "text") userText += msg.blocks[j].text;
				}
				html += '<div class="message-bubble">' + renderMarkdown(userText || "") + '</div>';
			} else if (role === "assistant") {
				// Assistant: role label + body
				html += '<div class="message-role">Assistant</div>';
				for (var j = 0; j < msg.blocks.length; j++) {
					html += renderBlock(msg.blocks[j]);
				}
			} else {
				// Tool: collapsible panels
				for (var j = 0; j < msg.blocks.length; j++) {
					html += renderBlock(msg.blocks[j]);
				}
			}
			html += '</div>';
		}
		html += '</div>';
		app.innerHTML = html;
	}

	fetch("/share/" + token + "/api", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({})
	}).then(function(r) { return r.json(); }).then(function(data) {
		if (data.needsPassword) {
			renderPasswordPrompt();
		} else if (data.error) {
			app.innerHTML = '<div class="not-found"><h2>' + escHtml(data.error) + '</h2></div>';
		} else {
			renderMessages(data);
		}
	}).catch(function() {
		app.innerHTML = '<div class="not-found"><h2>Failed to load</h2></div>';
	});
})();
</script>
</body>
</html>`;
}

/** Minimal context face with webServer and get. */
interface ContextWithWebServer {
	webServer: WebServerLike;
	get(name: "sessionPersistence"): unknown;
}

/** Register the share viewer HTTP route. */
export function registerShareViewer(ctx: ContextWithWebServer, store: SharesStore): (() => void) | undefined {
	const webServer = ctx.webServer;
	if (webServer === undefined) return undefined;

	const handler = async (req: IncomingMessage, res: ServerResponse) => {
		const url = new URL(req.url ?? "/", "http://x");
		const path = url.pathname;

		// Parse the token from the path: /share/:token or /share/:token/api
		const parts = path.split("/").filter(Boolean); // ["share", token, ...?]
		if (parts.length < 2 || parts[0] !== "share") {
			sendJson(res, 404, { error: "not found" });
			return;
		}
		const token = parts[1];
		const isApi = parts.length >= 3 && parts[2] === "api";

		const record = store.get(token);
		if (record === undefined) {
			if (isApi) {
				sendJson(res, 404, { error: "share not found" });
			} else {
				res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
				res.end('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not Found</title></head><body style="background:#1a1a2e;color:#888;font-family:sans-serif;text-align:center;padding:60px"><h2>Share not found</h2><p>This share may have been deleted.</p></body></html>');
			}
			return;
		}

		if (isApi) {
			await handleApiRequest(ctx, req, res, record);
			return;
		}

		// Serve the viewer HTML page
		res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
		res.end(viewerHtml());
	};

	return webServer.register({ kind: "prefix", path: "/share", handler });
}

/** Handle the API request for shared data. */
async function handleApiRequest(
	ctx: ContextWithWebServer,
	req: IncomingMessage,
	res: ServerResponse,
	record: ShareRecord,
): Promise<void> {
	// Check password if needed
	if (record.visibility === "password" && record.passwordHash !== undefined) {
		const body = await readBody(req);
		let password = "";
		try {
			const parsed = JSON.parse(body) as { password?: string };
			password = parsed.password ?? "";
		} catch {
			sendJson(res, 400, { error: "invalid request body" });
			return;
		}
		if (!verifyPassword(password, record.passwordHash)) {
			if (password.length === 0) {
				sendJson(res, 200, { needsPassword: true });
			} else {
				sendJson(res, 200, { needsPassword: true, error: "incorrect password" });
			}
			return;
		}
	}

	// Read the session events and render
	const messages = await getRenderedMessages(ctx, record.sessionId, record.selectedSeqs, record.maxSeq);
	const view = toView(record);
	sendJson(res, 200, {
		title: view.title,
		createdAt: view.createdAt,
		messages: messages.map((m) => ({
			seq: m.seq,
			time: m.time,
			role: m.role,
			...(m.toolName !== undefined ? { toolName: m.toolName } : {}),
			blocks: m.blocks,
		})),
	});
}
