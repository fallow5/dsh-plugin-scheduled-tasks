/**
 * Injected CSS styles for the session-shares plugin.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

/** Inject the plugin's CSS into the document head. */
export function injectStyles(): void {
	const css = `
.dsh-shares-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10000;
}
.dsh-shares-dialog {
	background: var(--dsh-bg, #1a1a2e);
	border: 1px solid var(--dsh-border, #333);
	border-radius: 12px;
	width: 90%;
	max-width: 700px;
	max-height: 85vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
.dsh-shares-dialog-header {
	padding: 16px 20px;
	border-bottom: 1px solid var(--dsh-border, #333);
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.dsh-shares-dialog-header h2 {
	font-size: 16px;
	font-weight: 600;
	margin: 0;
	color: var(--dsh-text, #e0e0e0);
}
.dsh-shares-dialog-close {
	background: none;
	border: none;
	color: var(--dsh-text-dim, #888);
	font-size: 20px;
	cursor: pointer;
	padding: 4px 8px;
	border-radius: 4px;
}
.dsh-shares-dialog-close:hover { background: rgba(255,255,255,0.1); }
.dsh-shares-dialog-body {
	flex: 1;
	overflow-y: auto;
	padding: 16px 20px;
}
.dsh-shares-toolbar {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
	align-items: center;
}
.dsh-shares-toolbar button {
	padding: 4px 12px;
	font-size: 12px;
	background: var(--dsh-surface, #16213e);
	border: 1px solid var(--dsh-border, #333);
	color: var(--dsh-text, #e0e0e0);
	border-radius: 4px;
	cursor: pointer;
}
.dsh-shares-toolbar button:hover { opacity: 0.8; }
.dsh-shares-toolbar .spacer { flex: 1; }
.dsh-shares-message-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.dsh-shares-message-item {
	display: flex;
	gap: 8px;
	padding: 8px 12px;
	border-radius: 6px;
	cursor: pointer;
	align-items: flex-start;
}
.dsh-shares-message-item:hover { background: rgba(255,255,255,0.05); }
.dsh-shares-message-item.selected { background: rgba(74, 158, 255, 0.1); }
.dsh-shares-message-checkbox {
	margin-top: 3px;
	width: 16px;
	height: 16px;
	cursor: pointer;
	flex-shrink: 0;
}
.dsh-shares-message-content {
	flex: 1;
	min-width: 0;
}
.dsh-shares-message-role {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	color: var(--dsh-text-dim, #888);
	margin-bottom: 2px;
}
.dsh-shares-message-text {
	font-size: 13px;
	color: var(--dsh-text, #e0e0e0);
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 60px;
	overflow: hidden;
	text-overflow: ellipsis;
}
.dsh-shares-message-text.expanded { max-height: none; }
.dsh-shares-dialog-footer {
	padding: 16px 20px;
	border-top: 1px solid var(--dsh-border, #333);
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.dsh-shares-visibility-row {
	display: flex;
	gap: 16px;
	align-items: center;
}
.dsh-shares-visibility-row label {
	font-size: 13px;
	color: var(--dsh-text, #e0e0e0);
	display: flex;
	align-items: center;
	gap: 4px;
	cursor: pointer;
}
.dsh-shares-password-input {
	width: 100%;
	padding: 8px 12px;
	background: var(--dsh-bg, #1a1a2e);
	border: 1px solid var(--dsh-border, #333);
	border-radius: 6px;
	color: var(--dsh-text, #e0e0e0);
	font-size: 14px;
}
.dsh-shares-actions {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
}
.dsh-shares-btn {
	padding: 8px 16px;
	font-size: 14px;
	border-radius: 6px;
	cursor: pointer;
	border: 1px solid var(--dsh-border, #333);
}
.dsh-shares-btn-primary {
	background: var(--dsh-accent, #4a9eff);
	color: white;
	border: none;
}
.dsh-shares-btn-primary:hover { opacity: 0.9; }
.dsh-shares-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.dsh-shares-btn-secondary {
	background: var(--dsh-surface, #16213e);
	color: var(--dsh-text, #e0e0e0);
}
.dsh-shares-btn-secondary:hover { opacity: 0.8; }
.dsh-shares-result {
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.dsh-shares-url-row {
	display: flex;
	gap: 8px;
	align-items: center;
}
.dsh-shares-url-input {
	flex: 1;
	padding: 8px 12px;
	background: var(--dsh-bg, #1a1a2e);
	border: 1px solid var(--dsh-border, #333);
	border-radius: 6px;
	color: var(--dsh-text, #e0e0e0);
	font-size: 13px;
}
.dsh-shares-loading {
	text-align: center;
	padding: 40px;
	color: var(--dsh-text-dim, #888);
}
.dsh-shares-error {
	color: #ff6b6b;
	font-size: 13px;
	text-align: center;
	padding: 20px;
}
.dsh-shares-settings-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;
}
.dsh-shares-settings-table th,
.dsh-shares-settings-table td {
	padding: 8px 12px;
	text-align: left;
	border-bottom: 1px solid var(--dsh-border, #333);
}
.dsh-shares-settings-table th {
	font-weight: 600;
	color: var(--dsh-text-dim, #888);
	font-size: 12px;
	text-transform: uppercase;
}
.dsh-shares-settings-table td {
	color: var(--dsh-text, #e0e0e0);
}
.dsh-shares-settings-table .title-cell {
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.dsh-shares-settings-actions {
	display: flex;
	gap: 8px;
}
.dsh-shares-settings-actions button {
	padding: 4px 10px;
	font-size: 12px;
	border-radius: 4px;
	cursor: pointer;
	border: 1px solid var(--dsh-border, #333);
	background: var(--dsh-surface, #16213e);
	color: var(--dsh-text, #e0e0e0);
}
.dsh-shares-settings-actions button:hover { opacity: 0.8; }
.dsh-shares-settings-actions button.danger {
	color: #ff6b6b;
	border-color: #ff6b6b33;
}
.dsh-shares-settings-empty {
	text-align: center;
	padding: 40px;
	color: var(--dsh-text-dim, #888);
	font-size: 14px;
}
.dsh-shares-badge {
	display: inline-block;
	padding: 2px 8px;
	border-radius: 4px;
	font-size: 11px;
	font-weight: 600;
}
.dsh-shares-badge.public {
	background: rgba(74, 158, 255, 0.15);
	color: #4a9eff;
}
.dsh-shares-badge.password {
	background: rgba(255, 165, 0, 0.15);
	color: #ffa500;
}

/* ── Selection mode styles ─────────────────────────────────────────── */

/* Selectable message: add left padding for checkbox */
.dsh-shares-selectable {
	position: relative;
	padding-left: 36px !important;
	cursor: pointer;
	transition: background 0.15s;
	-webkit-user-select: none;
	user-select: none;
	-webkit-touch-callout: none;
}

/* Selected message highlight */
.dsh-shares-selectable.dsh-shares-selected {
	background: rgba(74, 158, 255, 0.12) !important;
	border-radius: 8px;
}

/* Checkbox overlay on each message */
.dsh-shares-check {
	position: absolute;
	left: 8px;
	top: 8px;
	width: 20px;
	height: 20px;
	cursor: pointer;
	accent-color: var(--dsw-alias-state-business-primary, #4a9eff);
	z-index: 5;
	margin: 0;
	flex-shrink: 0;
}

/* Floating bottom bar */
.dsh-shares-floating-bar {
	position: fixed;
	bottom: 24px;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	gap: 12px;
	background: var(--dsw-alias-bg-layer-2, #2a2a4a);
	border: 1px solid var(--dsw-alias-border-l2, #3a3a5a);
	border-radius: 12px;
	padding: 8px 12px;
	z-index: 10001;
	box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
	-webkit-backdrop-filter: blur(12px);
	backdrop-filter: blur(12px);
}

/* Exit button in floating bar */
.dsh-shares-floating-exit {
	width: 36px;
	height: 36px;
	min-width: 36px;
	border: none;
	border-radius: 8px;
	background: transparent;
	color: var(--dsw-alias-label-secondary, #a0a0b0);
	font-size: 16px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background 0.15s, color 0.15s;
}
.dsh-shares-floating-exit:hover {
	background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.08));
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

/* Selected count text */
.dsh-shares-floating-count {
	font-size: 14px;
	color: var(--dsw-alias-label-primary, #e0e0e0);
	white-space: nowrap;
	min-width: 80px;
	text-align: center;
}

/* Share button in floating bar */
.dsh-shares-floating-share {
	height: 44px;
	min-height: 44px;
	padding: 0 24px;
	border: none;
	border-radius: 10px;
	background: var(--dsw-alias-state-business-primary, #4a9eff);
	color: #fff;
	font-size: 15px;
	font-weight: 600;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: opacity 0.15s;
	-webkit-tap-highlight-color: transparent;
}
.dsh-shares-floating-share:hover {
	opacity: 0.9;
}
.dsh-shares-floating-share:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}
`;

	if (document.getElementById("dsh-session-shares-styles") !== null) return;
	const style = document.createElement("style");
	style.id = "dsh-session-shares-styles";
	style.textContent = css;
	document.head.appendChild(style);
}
