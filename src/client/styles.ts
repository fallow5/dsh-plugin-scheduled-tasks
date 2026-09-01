/**
 * Theme-aware stylesheet for the scheduled-tasks panel.
 *
 * Uses the same `--dsw-alias-*` design tokens as the shipped Cordis panel so
 * the UI follows the active light/dark theme. The CSS is injected once by the
 * client plugin body (`injectStyles`) using the same `data-plugin-css`
 * mechanism the official client bundles use.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */

/** Scoped class names referenced by the panel components. */
export const C = {
	trigger: "dshst-trigger",
	triggerRail: "dshst-trigger-rail",
	triggerLabel: "dshst-trigger-label",
	overlay: "dshst-overlay",
	card: "dshst-card",
	header: "dshst-header",
	title: "dshst-title",
	body: "dshst-body",
	footer: "dshst-footer",
	note: "dshst-note",
	row: "dshst-row",
	name: "dshst-name",
	meta: "dshst-meta",
	badge: "dshst-badge",
	badgeWarn: "dshst-badge-warn",
	badgeError: "dshst-badge-error",
	badgeSuccess: "dshst-badge-success",
	badgeDim: "dshst-badge-dim",
	btn: "dshst-btn",
	btnPrimary: "dshst-btn-primary",
	btnDanger: "dshst-btn-danger",
	input: "dshst-input",
	select: "dshst-select",
	textarea: "dshst-textarea",
	label: "dshst-label",
	error: "dshst-error",
	empty: "dshst-empty",
	output: "dshst-output",
	tabs: "dshst-tabs",
	tab: "dshst-tab",
	tabActive: "dshst-tab-active",
	tabCount: "dshst-tab-count",
	close: "dshst-close",
	slashMenu: "dshst-slash-menu",
	slashItem: "dshst-slash-item",
	slashItemActive: "dshst-slash-item-active",
	slashItemName: "dshst-slash-item-name",
	slashItemDesc: "dshst-slash-item-desc",
	skillTag: "dshst-skill-tag",
	skillTagRemove: "dshst-skill-tag-remove",
} as const;

const css = `
.dshst-trigger{box-sizing:border-box;cursor:pointer;flex:1 0 auto;min-width:0;height:42px;color:var(--dsw-alias-label-primary);background:0 0;border:none;border-radius:12px;align-items:center;gap:8px;margin:4px -2px;padding:0 10px 0 8px;font-family:inherit;font-size:14px;line-height:22px;display:flex;overflow:hidden}
.dshst-trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshst-trigger-rail{border-radius:50%;justify-content:center;gap:0;width:36px;height:36px;margin:8px 0 10px;padding:0;flex:none}
.dshst-trigger-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dshst-overlay{display:flex;flex-direction:column;overflow:hidden;width:100%;height:100%;min-width:0;min-height:0}
.dshst-card{box-sizing:border-box;background:transparent;flex:1;width:100%;max-width:100%;height:100%;min-height:0;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);display:flex;flex-direction:column;overflow:hidden}
.dshst-header{box-sizing:border-box;flex:none;justify-content:space-between;align-items:center;gap:8px;min-height:52px;margin:8px 10px 0;padding:7px 14px;display:flex;border:1px solid var(--dsw-alias-border-l2);border-radius:14px 14px 11px 11px;background:var(--dsw-alias-bg-layer-2)}
.dshst-title{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:500;line-height:24px;margin:0;flex:1}
.dshst-body{flex:1;min-height:0;margin:8px 10px 10px;padding:12px 16px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;border:1px solid var(--dsw-alias-border-l2);border-radius:11px;background:var(--dsw-alias-bg-layer-2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}
.dshst-footer{box-sizing:border-box;flex:none;padding:0 10px 8px}
.dshst-note{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}
.dshst-row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:12px;align-items:center;gap:8px;padding:8px 10px;display:flex}
.dshst-name{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:14px;font-weight:500;line-height:22px;overflow:hidden}
.dshst-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dshst-badge{background:var(--dsw-alias-button-ghost-active-fill);color:var(--dsw-alias-label-caption);height:20px;border-radius:10px;flex:none;align-items:center;padding:0 6px;font-size:11px;line-height:20px;display:inline-flex}
.dshst-badge-warn{background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-label)}
.dshst-badge-error{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.dshst-badge-success{background:var(--dsw-alias-state-success-tertiary);color:var(--dsw-alias-state-success-primary)}
.dshst-badge-dim{background:var(--dsw-alias-button-ghost-active-fill);color:var(--dsw-alias-label-caption)}
.dshst-btn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:12px;line-height:24px;cursor:pointer;background:0 0;border-radius:999px;flex:none;padding:0 10px}
.dshst-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dshst-btn:disabled{opacity:.4;cursor:default}
.dshst-btn-primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-button-primary-dimmed)}
.dshst-btn-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.dshst-btn-danger{color:var(--dsw-alias-state-error-primary)}
.dshst-close{cursor:pointer;width:30px;height:30px;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid transparent;border-radius:9px;justify-content:center;align-items:center;padding:0;display:inline-flex;flex:none;-webkit-tap-highlight-color:transparent;transition:color 140ms ease,background 140ms ease,border-color 140ms ease,transform 140ms ease}
.dshst-close:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dshst-close:active{transform:scale(.96)}
.dshst-close>svg{display:block;pointer-events:none}
.dshst-input,.dshst-textarea{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:6px 10px;width:100%;font-size:14px;line-height:22px}
.dshst-select{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center;background-size:12px 12px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:6px 32px 6px 10px;width:100%;font-size:14px;line-height:22px;cursor:pointer;appearance:none}
.dshst-select:focus{border-color:var(--dsw-alias-brand-primary);outline:none}
.dshst-select:disabled{opacity:.6;cursor:default}
.dshst-textarea{min-height:96px;resize:vertical;font-family:var(--dsh-font-mono,monospace)}
.dshst-label{color:var(--dsw-alias-label-caption);font-size:12px;line-height:18px}
.dshst-error{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger);border-radius:8px;padding:8px 12px;font-size:12px;line-height:18px}
.dshst-empty{color:var(--dsw-alias-label-tertiary);font-size:14px;text-align:center;padding:32px 12px}
.dshst-output{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:pre-wrap;word-break:break-word;margin:4px 0 0;font-family:var(--dsh-font-mono,monospace)}
.dshst-tabs{box-sizing:border-box;display:flex;gap:4px;flex:none;overflow-x:auto;padding:0;scrollbar-width:none}
.dshst-tabs::-webkit-scrollbar{display:none}
.dshst-tab{border:none;background:0 0;color:var(--dsw-alias-label-primary);border-radius:12px;cursor:pointer;flex:none;align-items:center;gap:8px;padding:9px 16px 9px 12px;font-family:inherit;font-size:14px;font-weight:400;line-height:22px;display:inline-flex;white-space:nowrap}
.dshst-tab:hover{background:var(--dsw-specific-sidebar-nav-item-hover,var(--dsw-alias-interactive-bg-hover))}
.dshst-tab-active{background:var(--dsw-specific-sidebar-nav-item-active,var(--dsw-alias-interactive-bg-selected,var(--dsw-alias-interactive-bg-hover)))}
.dshst-tab-active:hover{background:var(--dsw-specific-sidebar-nav-item-active,var(--dsw-alias-interactive-bg-selected,var(--dsw-alias-interactive-bg-hover)))}
.dshst-tab-count{opacity:.62}
.dshst-tab-active .dshst-tab-count{opacity:.78}
.dshst-slash-menu{position:absolute;z-index:10;left:0;right:0;top:100%;margin-top:4px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;box-shadow:var(--dsw-shadow-lv2);max-height:240px;overflow-y:auto;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}
.dshst-slash-item{display:flex;flex-direction:column;gap:2px;width:100%;text-align:left;border:none;background:0 0;cursor:pointer;padding:8px 12px;font-family:inherit}
.dshst-slash-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshst-slash-item-active{display:flex;flex-direction:column;gap:2px;width:100%;text-align:left;border:none;background:var(--dsw-alias-interactive-bg-hover);cursor:pointer;padding:8px 12px;font-family:inherit}
.dshst-slash-item-name{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:18px}
.dshst-slash-item-desc{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshst-skill-tag{display:inline-flex;align-items:center;gap:4px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-radius:6px;padding:2px 8px;font-size:12px;line-height:18px;font-family:var(--dsh-font-mono,monospace)}
.dshst-skill-tag-remove{border:none;background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:14px;line-height:14px;padding:0;margin:0;display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%}
.dshst-skill-tag-remove:hover{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger)}
/* ── mobile responsive ─────────────────────────────────────────────────
   On narrow screens (phones, small tablets) the 800px card becomes a
   near-full-screen sheet with tighter padding so the form stays usable. */
@media(max-width:640px){
.dshst-header{padding:12px 12px 6px 8px;height:48px}
.dshst-body{padding:0 12px 12px;gap:6px}
.dshst-footer{padding:0 12px 12px}
.dshst-row{flex-wrap:wrap;gap:4px;padding:8px}
.dshst-name{white-space:normal;overflow:visible;text-overflow:clip}
.dshst-tabs{gap:2px}
.dshst-tab{padding:9px 12px 9px 8px}
.dshst-input,.dshst-select,.dshst-textarea{font-size:16px;line-height:24px}
.dshst-textarea{min-height:72px}
}
/* ── coexistence override ───────────────────────────────────────────────
   The @lemoncat7/dsh-knowledge plugin registers its trigger in the same
   sidebar.footer.action list slot with width:calc(100% + 8px); flex:none,
   which monopolises the row and pushes every other trigger off-screen.
   Override it to share the row fairly when both plugins are present, and
   align its height/padding with the native sidebar trigger style so the
   two buttons look consistent. The rail variant keeps its fixed 36px icon. */
.dsh-knowledge-trigger{width:auto!important;flex:1 0 auto!important;margin:4px -2px!important;height:42px!important;padding:0 10px 0 8px!important}
.dsh-knowledge-trigger--rail{width:36px!important;height:36px!important;flex:none!important}
`;

/** Inject the stylesheet once (idempotent), mirroring the official CSS-module mechanism. */
export function injectStyles(): void {
	if (typeof document === "undefined") return;
	const tagId = "@opendsh/dsh-plugin-scheduled-tasks/panel.css";
	if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`) !== null) return;
	const tag = document.createElement("style");
	tag.dataset.plugin = "@opendsh/dsh-plugin-scheduled-tasks";
	tag.dataset.pluginCss = tagId;
	tag.textContent = css;
	document.head.appendChild(tag);
}
