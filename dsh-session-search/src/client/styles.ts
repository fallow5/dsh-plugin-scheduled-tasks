/**
 * Theme-aware stylesheet for the session-search palette.
 *
 * The palette is a VSCode-style quick-pick: a centered modal at the top
 * of the viewport with a search input and a results list below it.
 *
 * @module @opendsh/dsh-plugin-session-search
 */

const css = `
/* ── Overlay backdrop ─────────────────────────────────────────────────── */
.dshss-overlay{position:fixed;inset:0;z-index:9999;display:flex;justify-content:center;background:rgba(0,0,0,.25);animation:dshss-fade-in .1s ease-out}
@keyframes dshss-fade-in{0%{opacity:0}100%{opacity:1}}

/* ── Palette container ───────────────────────────────────────────────── */
.dshss-palette{box-sizing:border-box;width:min(640px,calc(100vw - 32px));margin-top:12vh;max-height:70vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:var(--dsw-shadow-lv3);overflow:hidden;animation:dshss-slide-in .12s var(--ds-ease-in-out)}
@keyframes dshss-slide-in{0%{opacity:0;transform:translateY(-8px)}100%{opacity:1;transform:translateY(0)}}

/* ── Search input row ────────────────────────────────────────────────── */
.dshss-inputRow{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dshss-searchIcon{flex:none;width:16px;height:16px;color:var(--dsw-alias-label-tertiary)}
.dshss-input{flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:inherit;font-size:15px;color:var(--dsw-alias-label-primary);padding:4px 0}
.dshss-input::placeholder{color:var(--dsw-alias-label-tertiary)}
.dshss-count{flex:none;font-size:12px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}

/* ── Results list ────────────────────────────────────────────────────── */
.dshss-results{flex:1;min-height:0;overflow-y:auto;padding:4px 0}
.dshss-result{cursor:pointer;padding:8px 16px;display:flex;flex-direction:column;gap:2px;border-left:2px solid transparent;transition:background .05s}
.dshss-result:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshss-result.dshss-active{background:var(--dsw-alias-interactive-bg-hover);border-left-color:var(--dsw-alias-state-business-primary)}
.dshss-resultRole{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.dshss-roleBadge{display:inline-flex;align-items:center;justify-content:center;height:16px;padding:0 6px;border-radius:4px;font-size:11px;font-weight:500;line-height:16px}
.dshss-roleUser{background:var(--dsw-alias-state-business-bg);color:var(--dsw-alias-state-business-primary)}
.dshss-roleAssistant{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.dshss-roleTool{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary)}
.dshss-toolName{color:var(--dsw-alias-label-tertiary);font-size:11px}
.dshss-snippet{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.dshss-highlight{background:var(--dsw-alias-state-warning-bg);color:var(--dsw-alias-state-warning-primary);border-radius:2px;padding:0 1px}

/* ── States ───────────────────────────────────────────────────────────── */
.dshss-state{padding:24px 16px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:14px}
.dshss-stateError{color:var(--dsw-alias-state-error-primary)}
.dshss-hint{padding:8px 16px;border-top:1px solid var(--dsw-alias-border-l2);font-size:11px;color:var(--dsw-alias-label-tertiary);text-align:center}
.dshss-moreResults{padding:8px 16px;font-size:12px;color:var(--dsw-alias-label-tertiary);text-align:center;border-top:1px solid var(--dsw-alias-border-l2)}

/* ── Highlight overlay on target message ──────────────────────────────── */
.dshss-highlight-target{animation:dshss-target-flash 2s ease-out}
@keyframes dshss-target-flash{0%{background:rgba(255,200,0,.15)}100%{background:transparent}}

@media (prefers-reduced-motion:reduce){
	.dshss-overlay{animation:none}
	.dshss-palette{animation:none}
	.dshss-result{transition:none}
	.dshss-highlight-target{animation:none}
}
`;

/** Inject the stylesheet once. */
export function injectStyles(): void {
	const tagId = "@opendsh/dsh-plugin-session-search/styles";
	if (typeof document === "undefined") return;
	if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`) !== null) return;
	const tag = document.createElement("style");
	tag.dataset.plugin = "@opendsh/dsh-plugin-session-search";
	tag.dataset.pluginCss = tagId;
	tag.textContent = css;
	document.head.appendChild(tag);
}
