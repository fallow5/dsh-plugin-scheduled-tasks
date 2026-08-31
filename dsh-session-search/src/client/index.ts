/**
 * Client plugin body: mounts the `sessionSearch` remote namespace, registers
 * the `session-search` locale dictionaries, then:
 *  1. Registers a global keyboard shortcut (Ctrl+P / Cmd+P) to open the
 *     VSCode-style quick-pick search palette.
 *  2. Manages the search palette modal lifecycle (open/close, search, scroll
 *     to target message on selection).
 *
 * @module @opendsh/dsh-plugin-session-search
 */

import type {} from "@deepseek-ai/dsh-client-locale/client";
import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
import type { SessionId } from "@deepseek-ai/dsh-client-runtime/client";
import { en, type SessionSearchKey, zh } from "./locales.js";
import type { SessionSearchRemote } from "./remote.js";
import { injectStyles } from "./styles.js";
import { SearchPalette, type PanelTranslate } from "./SearchPalette.js";
import { TYPERT_REMOTE } from "./typert-remote.js";
import { createRoot } from "react-dom/client";
import { createElement } from "react";

/** Dictionary namespace owned by this plugin. */
const NS = "session-search";

declare module "@deepseek-ai/dsh-client-ui-slots" {
	interface LocaleNamespaceMap {
		/** Session-search palette copy. */
		"session-search": SessionSearchKey;
	}
}

/** Services required before this plugin mounts. */
export const inject = ["slots", "remote", "locale", "sessions"];

/** Mount the browser half. */
export async function apply(ctx: ClientContext) {
	injectStyles();
	ctx.effect(() => ctx.locale.register(NS, { zh, en }), "session-search: dictionaries");
	await ctx.remote.$mount(TYPERT_REMOTE);
	const t = ctx.locale.bind(NS) as PanelTranslate;
	const sessionSearch = ctx.get("remote.sessionSearch") as SessionSearchRemote;

	// ── Palette state ────────────────────────────────────────────────────
	let paletteRoot: ReturnType<typeof createRoot> | null = null;
	let paletteContainer: HTMLDivElement | null = null;

	const openPalette = () => {
		if (paletteContainer === null) {
			paletteContainer = document.createElement("div");
			paletteContainer.id = "dsh-session-search-palette-root";
			document.body.appendChild(paletteContainer);
			paletteRoot = createRoot(paletteContainer);
		}

		// Resolve the current session id from the sessions service.
		const snapshot = ctx.sessions?.list?.getSnapshot?.();
		const currentSessionId = snapshot?.current ?? undefined;

		const handleClose = () => {
			if (paletteRoot !== null) {
				paletteRoot.render(createElement(() => null));
			}
		};

		const handleJump = (seq: number) => {
			handleClose();
			scrollToMessage(seq);
		};

		paletteRoot?.render(
			createElement(SearchPalette, {
				sessionId: currentSessionId,
				sessionSearch,
				t,
				onClose: handleClose,
				onJump: handleJump,
			}),
		);
	};

	// ── 1. Global keyboard shortcut (Ctrl+P / Cmd+P) ────────────────────
	ctx.effect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			// Ctrl+P (Windows/Linux) or Cmd+P (macOS) — but only when not
			// typing in an input/textarea (to avoid hijacking browser print
			// dialog when the user is in the composer).
			const target = e.target as HTMLElement | null;
			if (target !== null) {
				const tag = target.tagName;
				if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
					// Allow Ctrl+P / Cmd+P in the composer to open the palette
					// (prevent default to avoid the browser print dialog).
				}
			}
			if ((e.ctrlKey || e.metaKey) && e.key === "p" && !e.shiftKey && !e.altKey) {
				e.preventDefault();
				e.stopPropagation();
				openPalette();
			}
		};
		window.addEventListener("keydown", onKeyDown, true);
		return () => {
			window.removeEventListener("keydown", onKeyDown, true);
		};
	}, "session-search: keyboard shortcut");

	// ── Cleanup the palette on unmount ──────────────────────────────────
	ctx.effect(
		() => () => {
			if (paletteRoot !== null) {
				paletteRoot.unmount();
				paletteRoot = null;
			}
			if (paletteContainer !== null) {
				paletteContainer.remove();
				paletteContainer = null;
			}
		},
		"session-search: palette cleanup",
	);
}

/** Selector for finding message nodes in the DSH chat view. */
const MESSAGE_SELECTOR = "[data-chat-flow-key]";

/** Find the scrollable conversation container. */
function findScrollContainer(): HTMLElement | null {
	const first = document.querySelector<HTMLElement>(MESSAGE_SELECTOR);
	if (first === null) return null;
	let el: HTMLElement | null = first.parentElement;
	while (el !== null) {
		const style = getComputedStyle(el);
		if (
			(style.overflowY === "auto" || style.overflowY === "scroll") &&
			el.scrollHeight > el.clientHeight
		) {
			return el;
		}
		el = el.parentElement;
	}
	return null;
}

/** Scroll to a message by its seq number and flash-highlight it. */
function scrollToMessage(seq: number): void {
	// The DSH conversation renders each message node with data-chat-flow-key
	// which encodes the event seq. We search for a node whose key contains
	// the seq number.
	const nodes = document.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR);
	for (const node of nodes) {
		const key = node.getAttribute("data-chat-flow-key") ?? "";
		// The key format is typically "seq:N" or just the seq as a string.
		// Try to match the seq in the key.
		if (key.includes(String(seq))) {
			const container = findScrollContainer();
			if (container !== null) {
				node.scrollIntoView({ behavior: "smooth", block: "center" });
			} else {
				node.scrollIntoView({ behavior: "smooth", block: "center" });
			}
			// Flash highlight.
			node.classList.add("dshss-highlight-target");
			setTimeout(() => {
				node.classList.remove("dshss-highlight-target");
			}, 2000);
			return;
		}
	}
}

// Re-export the SessionId type for consumers.
export type { SessionId };
