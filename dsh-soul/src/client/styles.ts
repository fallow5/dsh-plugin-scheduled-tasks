/**
 * Injected CSS styles for the soul settings panel.
 *
 * Uses DSH native design-system CSS variables (--dsw-alias-*) so the
 * panel inherits the host theme automatically — no custom color tokens.
 *
 * @module @opendsh/dsh-soul
 */

const STYLE_ID = "dsh-soul-styles";

/** Inject the soul panel styles once. */
export function injectStyles(): void {
	if (document.getElementById(STYLE_ID) !== null) return;
	const style = document.createElement("style");
	style.id = STYLE_ID;
	style.textContent = `
/* ════════════════════════════════════════════════════════════════════
 *  Panel root
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-panel {
	font-family: inherit;
	color: var(--dsw-alias-label-primary, #e0e0e0);
	max-width: 640px;
	margin: 0 auto;
	padding: 8px 0 32px;
}

.dsh-soul-panel * { box-sizing: border-box; }

/* ════════════════════════════════════════════════════════════════════
 *  Header
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-header {
	text-align: center;
	margin-bottom: 24px;
}

.dsh-soul-avatar {
	font-size: 48px;
	line-height: 1;
	margin-bottom: 8px;
}

.dsh-soul-title {
	font-size: 24px;
	font-weight: 700;
	line-height: 32px;
	margin: 0 0 4px;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

.dsh-soul-subtitle {
	font-size: 14px;
	line-height: 22px;
	color: var(--dsw-alias-label-secondary, #a0a0b0);
	margin: 0;
}

.dsh-soul-tagline {
	font-size: 13px;
	line-height: 20px;
	color: var(--dsw-alias-brand-primary, #4a9eff);
	margin: 8px 0 0;
	font-style: italic;
}

/* ════════════════════════════════════════════════════════════════════
 *  Sections / cards  (match DSH elevated-surface pattern)
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-section {
	background: var(--dsw-alias-bg-layer-2, #1e1e2e);
	border: 1px solid var(--dsw-alias-border-inverted, rgba(255,255,255,0.06));
	border-radius: 12px;
	padding: 20px;
	margin-bottom: 16px;
}

.dsh-soul-section-title {
	font-size: 16px;
	font-weight: 600;
	line-height: 24px;
	margin: 0 0 4px;
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

.dsh-soul-section-hint {
	font-size: 12px;
	line-height: 18px;
	color: var(--dsw-alias-label-tertiary, #888);
	margin: 0 0 16px;
}

/* ════════════════════════════════════════════════════════════════════
 *  Toggle row + switch
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-toggle-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 16px;
	background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.06));
	border-radius: 10px;
	margin-bottom: 16px;
}

.dsh-soul-toggle-label {
	font-size: 14px;
	font-weight: 500;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

.dsh-soul-toggle-hint {
	font-size: 12px;
	line-height: 18px;
	color: var(--dsw-alias-label-tertiary, #888);
	margin-top: 2px;
}

.dsh-soul-switch {
	position: relative;
	width: 44px;
	height: 24px;
	border-radius: 12px;
	background: var(--dsw-alias-border-l2, #3a3a4a);
	cursor: pointer;
	transition: background 0.2s;
	flex-shrink: 0;
}

.dsh-soul-switch.on {
	background: var(--dsw-alias-button-primary-fill, #4a9eff);
}

.dsh-soul-switch-knob {
	position: absolute;
	top: 3px;
	left: 3px;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	background: #fff;
	transition: transform 0.2s;
}

.dsh-soul-switch.on .dsh-soul-switch-knob {
	transform: translateX(20px);
}

/* Small switch variant (used in personality auto-evolution) */
.dsh-soul-switch-sm {
	width: 36px;
	height: 20px;
	border-radius: 10px;
}

.dsh-soul-switch-sm .dsh-soul-switch-knob {
	width: 14px;
	height: 14px;
	top: 3px;
}

.dsh-soul-switch-sm.on .dsh-soul-switch-knob {
	transform: translateX(16px);
}

/* ════════════════════════════════════════════════════════════════════
 *  Form elements  (match DSH Input.module.css pattern)
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-field {
	margin-bottom: 14px;
}

.dsh-soul-field:last-child { margin-bottom: 0; }

.dsh-soul-label {
	display: block;
	font-size: 12px;
	font-weight: 500;
	line-height: 18px;
	color: var(--dsw-alias-label-secondary, #a0a0b0);
	margin-bottom: 4px;
}

.dsh-soul-input,
.dsh-soul-textarea,
.dsh-soul-select {
	width: 100%;
	padding: 8px 12px;
	border-radius: 8px;
	border: 1px solid var(--dsw-alias-border-l2, #3a3a4a);
	background: var(--dsw-alias-bg-layer-1, #1a1a2e);
	color: var(--dsw-alias-label-primary, #e0e0e0);
	font-size: 14px;
	line-height: 22px;
	font-family: inherit;
	outline: none;
	transition: border-color 0.15s;
}

.dsh-soul-input::placeholder,
.dsh-soul-textarea::placeholder {
	color: var(--dsw-alias-label-dimmed, #666);
}

.dsh-soul-input:focus,
.dsh-soul-textarea:focus,
.dsh-soul-select:focus {
	border-color: var(--dsw-alias-brand-primary, #4a9eff);
}

.dsh-soul-input:disabled,
.dsh-soul-textarea:disabled,
.dsh-soul-select:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.dsh-soul-textarea {
	resize: vertical;
	min-height: 60px;
}

/* Native select — DSH settings-models pattern (appearance:none + SVG chevron) */
.dsh-soul-select {
	appearance: none;
	-webkit-appearance: none;
	padding-right: 32px;
	cursor: pointer;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-size: 12px 12px;
	background-position: right 12px center;
}

.dsh-soul-select:disabled {
	opacity: 0.6;
	cursor: default;
}

/* ════════════════════════════════════════════════════════════════════
 *  Row layout
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-row {
	display: flex;
	gap: 12px;
}

.dsh-soul-row > * { flex: 1; }

.dsh-soul-row-mb {
	margin-bottom: 8px;
}

.dsh-soul-btn-row {
	display: flex;
	gap: 8px;
}

/* ════════════════════════════════════════════════════════════════════
 *  Buttons  (match DSH Button.module.css — capsule geometry)
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	padding: 0 14px;
	height: 36px;
	border: none;
	border-radius: 18px;
	background: var(--dsw-alias-button-primary-fill, #4a9eff);
	color: var(--dsw-alias-label-primary-foreground, #fff);
	font-size: 14px;
	line-height: 22px;
	font-weight: 500;
	font-family: inherit;
	cursor: pointer;
	transition: background 0.15s;
}

.dsh-soul-btn:hover:not(:disabled) {
	background: var(--dsw-alias-button-primary-hover, #3a8ee8);
}

.dsh-soul-btn:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.dsh-soul-btn-ghost {
	background: transparent;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

.dsh-soul-btn-ghost:hover:not(:disabled) {
	background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.08));
}

.dsh-soul-btn-outline {
	border: 1px solid var(--dsw-alias-border-l2, #3a3a4a);
	background: transparent;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

.dsh-soul-btn-outline:hover:not(:disabled) {
	background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.08));
}

.dsh-soul-btn-sm {
	height: 28px;
	padding: 0 10px;
	font-size: 12px;
	line-height: 18px;
	border-radius: 14px;
}

.dsh-soul-btn-danger {
	border: 1px solid var(--dsw-alias-state-error-primary, #ff6b6b);
	background: transparent;
	color: var(--dsw-alias-state-error-primary, #ff6b6b);
}

.dsh-soul-btn-danger:hover:not(:disabled) {
	background: var(--dsw-alias-state-danger-bg, rgba(255,107,107,0.1));
}

/* ════════════════════════════════════════════════════════════════════
 *  Tags
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-bottom: 8px;
}

.dsh-soul-tag {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	height: 24px;
	padding: 0 8px;
	border-radius: 12px;
	background: var(--dsw-alias-bg-layer-2, #2a2a3a);
	color: var(--dsw-alias-label-secondary, #a0a0b0);
	font-size: 12px;
	line-height: 18px;
}

.dsh-soul-tag-remove {
	cursor: pointer;
	opacity: 0.6;
	font-size: 14px;
	line-height: 1;
}

.dsh-soul-tag-remove:hover { opacity: 1; }

/* ════════════════════════════════════════════════════════════════════
 *  Preferences
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-pref-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-radius: 8px;
	background: var(--dsw-alias-bg-layer-1, #1a1a2e);
	margin-bottom: 6px;
	font-size: 13px;
}

.dsh-soul-pref-cat {
	font-weight: 600;
	color: var(--dsw-alias-label-primary, #e0e0e0);
	min-width: 60px;
}

.dsh-soul-pref-key {
	color: var(--dsw-alias-label-secondary, #a0a0b0);
	min-width: 80px;
}

.dsh-soul-pref-val {
	flex: 1;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

.dsh-soul-pref-conf {
	font-size: 11px;
	color: var(--dsw-alias-label-tertiary, #888);
	min-width: 32px;
	text-align: right;
}

.dsh-soul-pref-form {
	margin-top: 12px;
}

/* ════════════════════════════════════════════════════════════════════
 *  Empty state
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-empty {
	text-align: center;
	padding: 24px;
	color: var(--dsw-alias-label-tertiary, #888);
	font-size: 13px;
}

/* ════════════════════════════════════════════════════════════════════
 *  Growth / insights
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-stage-center {
	text-align: center;
	margin-bottom: 16px;
}

.dsh-soul-stage-emoji {
	font-size: 32px;
	line-height: 1;
	margin-bottom: 4px;
}

.dsh-soul-stage-name {
	font-size: 18px;
	font-weight: 700;
	line-height: 24px;
	color: var(--dsw-alias-brand-primary, #4a9eff);
}

.dsh-soul-stage-xp {
	font-size: 12px;
	line-height: 18px;
	color: var(--dsw-alias-label-tertiary, #888);
	margin-top: 4px;
}

.dsh-soul-familiarity-bar {
	width: 100%;
	height: 8px;
	border-radius: 4px;
	background: var(--dsw-alias-border-l2, #3a3a4a);
	overflow: hidden;
	margin: 8px 0 16px;
}

.dsh-soul-familiarity-fill {
	height: 100%;
	border-radius: 4px;
	background: var(--dsw-alias-button-primary-fill, #4a9eff);
	transition: width 0.5s;
}

.dsh-soul-insights {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: 12px;
	margin-bottom: 16px;
}

.dsh-soul-insight-card {
	background: var(--dsw-alias-bg-layer-1, #1a1a2e);
	border-radius: 10px;
	padding: 12px;
	text-align: center;
}

.dsh-soul-insight-value {
	font-size: 24px;
	font-weight: 700;
	line-height: 30px;
	color: var(--dsw-alias-brand-primary, #4a9eff);
}

.dsh-soul-insight-value-sm {
	font-size: 16px;
	line-height: 22px;
}

.dsh-soul-insight-label {
	font-size: 11px;
	line-height: 16px;
	color: var(--dsw-alias-label-tertiary, #888);
	margin-top: 2px;
}

.dsh-soul-summary {
	padding: 12px 16px;
	border-radius: 10px;
	background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.06));
	font-size: 13px;
	line-height: 22px;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

/* ════════════════════════════════════════════════════════════════════
 *  Milestones
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-milestone-row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 0;
	border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.06));
}

.dsh-soul-milestone-icon {
	font-size: 24px;
	line-height: 1;
	flex-shrink: 0;
}

.dsh-soul-milestone-body {
	flex: 1;
	min-width: 0;
}

.dsh-soul-milestone-title {
	font-size: 14px;
	font-weight: 600;
	line-height: 20px;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

.dsh-soul-milestone-desc {
	font-size: 12px;
	line-height: 18px;
	color: var(--dsw-alias-label-tertiary, #888);
}

.dsh-soul-milestone-time {
	font-size: 11px;
	line-height: 16px;
	color: var(--dsw-alias-label-dimmed, #666);
	flex-shrink: 0;
}

/* ════════════════════════════════════════════════════════════════════
 *  Diary
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-diary-entry {
	padding: 10px 12px;
	border-radius: 10px;
	background: var(--dsw-alias-bg-layer-1, #1a1a2e);
	margin-bottom: 8px;
}

.dsh-soul-diary-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 4px;
}

.dsh-soul-diary-mood {
	font-size: 12px;
	font-weight: 500;
	color: var(--dsw-alias-brand-primary, #4a9eff);
}

.dsh-soul-diary-time {
	font-size: 11px;
	color: var(--dsw-alias-label-dimmed, #666);
}

.dsh-soul-diary-content {
	font-size: 13px;
	line-height: 22px;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

.dsh-soul-diary-form {
	margin-top: 12px;
}

.dsh-soul-diary-input {
	margin-bottom: 8px;
}

/* ════════════════════════════════════════════════════════════════════
 *  Personality traits
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-trait {
	margin-bottom: 14px;
}

.dsh-soul-trait:last-child { margin-bottom: 0; }

.dsh-soul-trait-header {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	margin-bottom: 6px;
}

.dsh-soul-trait-name {
	font-size: 13px;
	font-weight: 500;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

.dsh-soul-trait-value {
	font-size: 13px;
	font-weight: 600;
	color: var(--dsw-alias-brand-primary, #4a9eff);
	min-width: 32px;
	text-align: right;
}

.dsh-soul-trait-desc {
	font-size: 11px;
	line-height: 16px;
	color: var(--dsw-alias-label-tertiary, #888);
	margin-bottom: 6px;
}

.dsh-soul-slider {
	width: 100%;
	height: 6px;
	border-radius: 3px;
	background: var(--dsw-alias-border-l2, #3a3a4a);
	outline: none;
	-webkit-appearance: none;
	appearance: none;
	cursor: pointer;
}

.dsh-soul-slider::-webkit-slider-thumb {
	-webkit-appearance: none;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: var(--dsw-alias-button-primary-fill, #4a9eff);
	cursor: pointer;
	border: 2px solid var(--dsw-alias-bg-layer-2, #1e1e2e);
}

.dsh-soul-slider::-moz-range-thumb {
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: var(--dsw-alias-button-primary-fill, #4a9eff);
	cursor: pointer;
	border: 2px solid var(--dsw-alias-bg-layer-2, #1e1e2e);
}

.dsh-soul-trait-actions {
	margin-top: 14px;
	display: flex;
	gap: 8px;
	align-items: center;
	flex-wrap: wrap;
}

.dsh-soul-auto-evolution {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-left: auto;
}

.dsh-soul-auto-evolution-label {
	font-size: 12px;
	line-height: 18px;
	color: var(--dsw-alias-label-secondary, #a0a0b0);
}

/* ════════════════════════════════════════════════════════════════════
 *  Emotions
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-emotion-stats {
	margin-bottom: 16px;
}

.dsh-soul-emotion-trend {
	text-align: center;
}

.dsh-soul-trend-badge {
	display: inline-block;
	padding: 2px 10px;
	border-radius: 12px;
	font-size: 12px;
	line-height: 18px;
	font-weight: 500;
	background: var(--dsw-alias-bg-layer-2, #2a2a3a);
	color: var(--dsw-alias-label-secondary, #a0a0b0);
}

.dsh-soul-emotion-recent {
	margin-bottom: 16px;
}

.dsh-soul-emotion-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	font-size: 13px;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

.dsh-soul-emotion-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.dsh-soul-emotion-name {
	flex: 1;
}

.dsh-soul-emotion-intensity {
	color: var(--dsw-alias-label-secondary, #a0a0b0);
	font-size: 12px;
}

.dsh-soul-emotion-time {
	color: var(--dsw-alias-label-dimmed, #666);
	font-size: 11px;
}

.dsh-soul-emotion-form {
	border-top: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.06));
	padding-top: 12px;
}

.dsh-soul-emotion-intensity-wrap {
	flex: 0 0 80px;
}

/* ════════════════════════════════════════════════════════════════════
 *  Onboarding wizard — preset grid
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-preset-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 10px;
	margin-bottom: 16px;
}

.dsh-soul-preset-card {
	padding: 12px;
	border-radius: 10px;
	border: 1px solid var(--dsw-alias-border-l2, #3a3a4a);
	cursor: pointer;
	background: var(--dsw-alias-bg-layer-1, #1a1a2e);
	transition: border-color 0.15s, background 0.15s;
}

.dsh-soul-preset-card:hover {
	background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.06));
}

.dsh-soul-preset-card.selected {
	border: 2px solid var(--dsw-alias-brand-primary, #4a9eff);
	background: var(--dsw-alias-interactive-bg-hover, rgba(74,158,255,0.1));
}

.dsh-soul-preset-icon {
	font-size: 24px;
	line-height: 1;
	margin-bottom: 4px;
}

.dsh-soul-preset-name {
	font-size: 14px;
	font-weight: 600;
	line-height: 20px;
	color: var(--dsw-alias-label-primary, #e0e0e0);
}

.dsh-soul-preset-desc {
	font-size: 11px;
	line-height: 16px;
	color: var(--dsw-alias-label-tertiary, #888);
	margin-top: 2px;
}

/* ════════════════════════════════════════════════════════════════════
 *  Toast  (match DSH Toast.module.css — top-center, contrast fill)
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-toast {
	position: fixed;
	top: 120px;
	left: 50%;
	z-index: 1100;
	pointer-events: none;
	padding: 12px 16px;
	border-radius: 14px;
	background: var(--dsw-alias-button-contrast-fill, #2a2a4a);
	color: var(--dsw-alias-label-primary-inverted, #fff);
	font-size: 14px;
	line-height: 22px;
	font-weight: 500;
	box-shadow: var(--dsw-shadow-lv3, 0 4px 24px rgba(0,0,0,0.4));
	transform: translateX(-50%);
	animation: dsh-soul-toast-in 0.3s ease;
}

@keyframes dsh-soul-toast-in {
	from { opacity: 0; transform: translate(-50%, -6px); }
	to { opacity: 1; transform: translate(-50%, 0); }
}

/* ════════════════════════════════════════════════════════════════════
 *  Loading / error
 * ════════════════════════════════════════════════════════════════════ */
.dsh-soul-loading {
	text-align: center;
	padding: 48px;
	color: var(--dsw-alias-label-tertiary, #888);
	font-size: 14px;
}

.dsh-soul-error {
	text-align: center;
	padding: 24px;
	color: var(--dsw-alias-state-error-primary, #ff6b6b);
	font-size: 14px;
}

.dsh-soul-error .dsh-soul-btn {
	margin-top: 12px;
}
`;
	document.head.appendChild(style);
}
