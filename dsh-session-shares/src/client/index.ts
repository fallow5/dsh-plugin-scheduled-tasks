/**
 * Client plugin body: mounts the `shares` remote namespace, registers the
 * `session-shares` locale dictionaries, then:
 *  1. Attaches a selection-mode controller to the conversation DOM (long-press
 *     to select messages, swipe-to-select, floating share button).
 *  2. Registers a "Share" item into the session context menu (desktop).
 *  3. Registers a "Session Shares" section in the settings panel.
 *  4. Manages the share dialog modal lifecycle.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import type {} from "@deepseek-ai/dsh-client-locale/client";
import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar/client";
import { en, type SessionSharesKey, zh } from "./locales.js";
import type { SharesRemote } from "./remote.js";
import { injectStyles } from "./styles.js";
import { ShareDialog, type PanelTranslate } from "./ShareDialog.js";
import { attachSelectionMode } from "./SelectionMode.js";
import { SharesSettings, type SharesSettingsProps } from "./SharesSettings.js";
import { TYPERT_REMOTE } from "./typert-remote.js";
import { createRoot } from "react-dom/client";
import { createElement } from "react";

/** Dictionary namespace owned by this plugin. */
const NS = "session-shares";

declare module "@deepseek-ai/dsh-client-ui-slots" {
	interface LocaleNamespaceMap {
		/** Session-shares panel copy. */
		"session-shares": SessionSharesKey;
	}
	interface SlotMap {
		/** Settings panel section (declared by dsh-client-ui-settings at runtime). */
		"settings.section": {
			kind: "list";
			scope: "root";
			owner: { close: () => void };
		};
	}
}

/** Symbol key for the session-context-menu extensions registry. */
const CTX_MENU_KEY = Symbol.for("dsh.session-context-menu.extensions");

/** One context-menu extension entry shape. */
interface CtxMenuExtension {
	id: string;
	label: string;
	order?: number;
	visible?: (ctx: { session: { id: string } | null; row: Element | null }) => boolean;
	run: (ctx: {
		session: { id: string; displayTitle: string; blank: boolean } | null;
		row: Element | null;
		close: () => void;
	}) => void;
}

/** Services required before this plugin mounts. */
export const inject = ["slots", "remote", "locale"];

/** Mount the browser half. */
export async function apply(ctx: ClientContext) {
	injectStyles();
	ctx.effect(() => ctx.locale.register(NS, { zh, en }), "session-shares: dictionaries");
	await ctx.remote.$mount(TYPERT_REMOTE);
	const t = ctx.locale.bind(NS) as PanelTranslate;
	const shares = ctx.get("remote.shares") as SharesRemote;

	// ── Share dialog state (for context-menu trigger) ───────────────────
	let dialogRoot: ReturnType<typeof createRoot> | null = null;
	let dialogContainer: HTMLDivElement | null = null;

	const openShareDialog = (sessionId: string, preSelectedSeqs?: number[]) => {
		if (dialogContainer === null) {
			dialogContainer = document.createElement("div");
			dialogContainer.id = "dsh-session-shares-dialog-root";
			document.body.appendChild(dialogContainer);
			dialogRoot = createRoot(dialogContainer);
		}
		const handleClose = () => {
			if (dialogRoot !== null) {
				dialogRoot.render(createElement(() => null));
			}
		};
		dialogRoot?.render(
			createElement(ShareDialog, {
				sessionId,
				shares,
				t,
				onClose: handleClose,
				...(preSelectedSeqs !== undefined ? { preSelectedSeqs } : {}),
			}),
		);
	};

	// ── 1. Selection-mode controller (DOM-level, no slot) ──────────────
	// Long-press a message to enter selection mode, swipe to select/deselect,
	// floating share button at the bottom.
	ctx.effect(
		() => attachSelectionMode(t, shares, openShareDialog),
		"session-shares: selection mode",
	);

	// ── 2. Register "Share Session" into the session context menu ─────────
	ctx.effect(() => {
		let disposed = false;
		let disposers: (() => void)[] = [];

		const doRegister = () => {
			if (disposed) return;
			const registry = (globalThis as Record<symbol, {
				register: (entry: CtxMenuExtension) => () => void;
			}>)[CTX_MENU_KEY];
			if (registry === undefined) return false;

			disposers.push(
				registry.register({
					id: "session-shares.share",
					label: t("share"),
					order: 50,
					visible: ({ session }) => session !== null,
					run: ({ session }) => {
						if (session === null) return;
						openShareDialog(session.id);
					},
				}),
			);

			return true;
		};

		if (doRegister()) return () => {
			disposed = true;
			for (const d of disposers) d();
		};

		// Poll until the registry appears (context-menu plugin loads late).
		const timer = window.setInterval(() => {
			if (doRegister()) {
				window.clearInterval(timer);
			}
		}, 500);

		return () => {
			disposed = true;
			window.clearInterval(timer);
			for (const d of disposers) d();
		};
	}, "session-shares: context-menu extension");

	// ── 3. "Session Shares" section in the settings panel ────────────────
	ctx.slots.inject("settings.section", () =>
		ctx.slots.register(
			{
				name: "settings.section",
				id: "session-shares",
				order: 200,
				label: () => t("settingsTitle"),
				locale: NS,
				inject: (): Pick<SharesSettingsProps, "shares"> => ({
					shares: ctx.get("remote.shares") as SharesRemote,
				}),
			},
			SharesSettings,
		),
	);

	// ── Cleanup the dialog on unmount ────────────────────────────────────
	ctx.effect(
		() => () => {
			if (dialogRoot !== null) {
				dialogRoot.unmount();
				dialogRoot = null;
			}
			if (dialogContainer !== null) {
				dialogContainer.remove();
				dialogContainer = null;
			}
		},
		"session-shares: dialog cleanup",
	);
}
