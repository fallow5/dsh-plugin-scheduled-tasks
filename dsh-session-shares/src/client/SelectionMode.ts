/**
 * Selection mode controller: attaches long-press selection into the
 * conversation DOM, manages checkbox state, swipe-to-select, and the
 * floating bottom "Share" button.
 *
 * This is a pure DOM controller (no React, no slot) — called from
 * `ctx.effect()` in the plugin entry. Returns a cleanup function.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import type { SharesRemote } from "./remote.js";
import type { PanelTranslate } from "./ShareDialog.js";

/** Long-press threshold in ms. */
const LONG_PRESS_MS = 500;

/** Max movement (px) before a long-press is cancelled. */
const MOVE_TOLERANCE = 10;

/** Attribute used to mark message elements we've instrumented. */
const INSTRUMENTED = "data-shares-instrumented";

/** Attribute storing the node key on a message element. */
const KEY_ATTR = "data-shares-key";

/** Selector for finding message nodes in the DSH chat view. */
const MESSAGE_SELECTOR = "[data-chat-flow-key]";

/** Find all message DOM nodes with their keys. */
function findMessageNodes(): { element: HTMLElement; key: string }[] {
	const results: { element: HTMLElement; key: string }[] = [];
	const seen = new Set<HTMLElement>();

	const nodes = document.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR);
	for (const node of nodes) {
		if (seen.has(node)) continue;
		const key = node.getAttribute("data-chat-flow-key");
		if (key === null) continue;
		seen.add(node);
		results.push({ element: node, key });
	}

	return results;
}

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

/** Get the current session ID from the URL or DSH state. */
function getCurrentSessionId(): string | undefined {
	// DSH stores the current session in the URL hash.
	const hash = window.location.hash;
	const match = hash.match(/session[\/=]([a-f0-9-]+)/i);
	if (match !== null) return match[1];

	// Fallback: check for a data attribute on the conversation root.
	const convRoot = document.querySelector<HTMLElement>("[data-session-id]");
	if (convRoot !== null) {
		return convRoot.getAttribute("data-session-id") ?? undefined;
	}

	return undefined;
}

/**
 * Attach the selection-mode controller to the document.
 * Returns a cleanup function that removes all listeners and DOM modifications.
 */
export function attachSelectionMode(
	t: PanelTranslate,
	_shares: SharesRemote,
	openShareDialog: (sessionId: string, preSelectedSeqs?: number[]) => void,
): () => void {
	let disposed = false;
	let active = false;
	const selected = new Set<string>();

	// Long-press tracking
	let longPressTimer: number | null = null;
	let startPos: { x: number; y: number } | null = null;

	// Swipe tracking
	let swipeSelecting = false;
	let swipeMode: "select" | "deselect" = "select";
	const processed = new Set<string>();

	// Floating bar element
	let floatingBar: HTMLDivElement | null = null;

	// MutationObserver for new messages
	let observer: MutationObserver | null = null;
	let pollTimer: number | null = null;

	/** Enter selection mode with an initial key. */
	function enterSelection(initialKey: string) {
		active = true;
		selected.add(initialKey);
		applySelectionModeUI();
		showFloatingBar();
		// If the finger is still down (long-press triggered selection mode),
		// enable swipe-selecting so subsequent touchmove selects more items.
		swipeSelecting = true;
		swipeMode = "select";
		processed.clear();
		processed.add(initialKey);
	}

	/** Exit selection mode. */
	function exitSelection() {
		active = false;
		selected.clear();
		removeSelectionModeUI();
		hideFloatingBar();
	}

	/** Toggle a message's selection. */
	function toggleMessage(key: string) {
		if (selected.has(key)) selected.delete(key);
		else selected.add(key);
		updateMessageHighlight(key);
		updateFloatingBar();
	}

	/** Set selection state for a message (used by swipe). */
	function setMessageSelected(key: string, select: boolean) {
		if (select && selected.has(key)) return;
		if (!select && !selected.has(key)) return;
		if (select) selected.add(key);
		else selected.delete(key);
		updateMessageHighlight(key);
		updateFloatingBar();
	}

	/** Instrument a single message node with long-press handlers. */
	function instrumentNode(el: HTMLElement, key: string) {
		if (el.hasAttribute(INSTRUMENTED)) return;
		el.setAttribute(INSTRUMENTED, "1");
		el.setAttribute(KEY_ATTR, key);

		const onStart = (clientX: number, clientY: number) => {
			startPos = { x: clientX, y: clientY };
			if (longPressTimer !== null) window.clearTimeout(longPressTimer);
			longPressTimer = window.setTimeout(() => {
				if (disposed) return;
				if (startPos === null) return;
				const dx = Math.abs(clientX - startPos.x);
				const dy = Math.abs(clientY - startPos.y);
				if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) return;
				enterSelection(key);
			}, LONG_PRESS_MS);
		};

		const onMove = (clientX: number, clientY: number) => {
			if (startPos === null) return;
			const dx = Math.abs(clientX - startPos.x);
			const dy = Math.abs(clientY - startPos.y);
			if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
				if (longPressTimer !== null) {
					window.clearTimeout(longPressTimer);
					longPressTimer = null;
				}
			}
		};

		const onEnd = () => {
			if (longPressTimer !== null) {
				window.clearTimeout(longPressTimer);
				longPressTimer = null;
			}
			startPos = null;
		};

		// Mouse events
		const onMouseDown = (e: MouseEvent) => onStart(e.clientX, e.clientY);
		const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
		const onMouseUp = () => onEnd();

		// Touch events
		const onTouchStart = (e: TouchEvent) => {
			if (e.touches.length > 0) onStart(e.touches[0].clientX, e.touches[0].clientY);
		};
		const onTouchMove = (e: TouchEvent) => {
			if (e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
		};
		const onTouchEnd = () => onEnd();

		el.addEventListener("mousedown", onMouseDown);
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchmove", onTouchMove, { passive: true });
		el.addEventListener("touchend", onTouchEnd);

		// Store cleanup on the element
		(el as unknown as { __sharesCleanup?: () => void }).__sharesCleanup = () => {
			el.removeEventListener("mousedown", onMouseDown);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchmove", onTouchMove);
			el.removeEventListener("touchend", onTouchEnd);
		};
	}

	/** Scan and instrument all message nodes. */
	function scanAndInstrument() {
		if (disposed || active) return;
		const nodes = findMessageNodes();
		for (const { element, key } of nodes) {
			instrumentNode(element, key);
		}
	}

	/** Apply selection mode UI (checkboxes, highlights, click handlers). */
	function applySelectionModeUI() {
		const nodes = findMessageNodes();
		for (const { element, key } of nodes) {
			element.classList.add("dsh-shares-selectable");
			if (selected.has(key)) {
				element.classList.add("dsh-shares-selected");
			}

			// Add checkbox
			let checkbox = element.querySelector<HTMLInputElement>(".dsh-shares-check");
			if (checkbox === null) {
				checkbox = document.createElement("input");
				checkbox.type = "checkbox";
				checkbox.className = "dsh-shares-check";
				checkbox.checked = selected.has(key);
				checkbox.addEventListener("click", (e) => {
					e.stopPropagation();
					toggleMessage(key);
				});
				element.prepend(checkbox);
			} else {
				checkbox.checked = selected.has(key);
			}

			// Click to toggle
			const onClick = (e: MouseEvent) => {
				if ((e.target as HTMLElement).classList.contains("dsh-shares-check")) return;
				e.preventDefault();
				e.stopPropagation();
				toggleMessage(key);
			};
			element.addEventListener("click", onClick, { capture: true });
			(element as unknown as { __sharesClick?: (e: MouseEvent) => void }).__sharesClick = onClick;
		}

		// Set up swipe-to-select (gallery-style: finger passes over items → select/deselect)
		// Listen on document so the finger can move outside the scroll container.

		const findMessageFromPoint = (x: number, y: number): string | null => {
			const target = document.elementFromPoint(x, y);
			if (target === null) return null;
			let msgEl: HTMLElement | null = target as HTMLElement;
			while (msgEl !== null && !msgEl.hasAttribute(KEY_ATTR)) {
				msgEl = msgEl.parentElement;
			}
			if (msgEl === null) return null;
			return msgEl.getAttribute(KEY_ATTR);
		};

		const onTouchStartSwipe = (e: TouchEvent) => {
			if (e.touches.length === 0) return;
			// Don't intercept touches on the floating bar (exit/share buttons)
			const touch = e.touches[0];
			const target = touch.target as HTMLElement | null;
			if (target !== null && target.closest(".dsh-shares-floating-bar") !== null) return;
			processed.clear();
			const key = findMessageFromPoint(touch.clientX, touch.clientY);
			if (key === null) return;
			// Prevent text selection and scrolling
			e.preventDefault();
			swipeMode = selected.has(key) ? "deselect" : "select";
			swipeSelecting = true;
			setMessageSelected(key, swipeMode === "select");
			processed.add(key);
		};

		const onTouchMoveSwipe = (e: TouchEvent) => {
			if (!swipeSelecting || e.touches.length === 0) return;
			// Prevent page scroll and text selection while swiping to select
			e.preventDefault();
			const touch = e.touches[0];
			const key = findMessageFromPoint(touch.clientX, touch.clientY);
			if (key === null) return;
			if (processed.has(key)) return;
			processed.add(key);
			setMessageSelected(key, swipeMode === "select");
		};

		const onTouchEndSwipe = () => {
			swipeSelecting = false;
			processed.clear();
		};

		// touchstart/touchmove must be non-passive to call preventDefault
		document.addEventListener("touchstart", onTouchStartSwipe, { passive: false });
		document.addEventListener("touchmove", onTouchMoveSwipe, { passive: false });
		document.addEventListener("touchend", onTouchEndSwipe);
		document.addEventListener("touchcancel", onTouchEndSwipe);

		(document as unknown as {
			__sharesSwipeCleanup?: () => void;
		}).__sharesSwipeCleanup = () => {
			document.removeEventListener("touchstart", onTouchStartSwipe);
			document.removeEventListener("touchmove", onTouchMoveSwipe);
			document.removeEventListener("touchend", onTouchEndSwipe);
			document.removeEventListener("touchcancel", onTouchEndSwipe);
		};
	}

	/** Remove selection mode UI. */
	function removeSelectionModeUI() {
		const nodes = findMessageNodes();
		for (const { element } of nodes) {
			element.classList.remove("dsh-shares-selectable", "dsh-shares-selected");
			const checkbox = element.querySelector(".dsh-shares-check");
			if (checkbox !== null) checkbox.remove();
			const clickHandler = (element as unknown as { __sharesClick?: (e: MouseEvent) => void }).__sharesClick;
			if (clickHandler !== undefined) {
				element.removeEventListener("click", clickHandler, { capture: true } as EventListenerOptions);
			}
		}

		// Clean up swipe handlers
		const swipeCleanup = (document as unknown as { __sharesSwipeCleanup?: () => void }).__sharesSwipeCleanup;
		if (swipeCleanup !== undefined) swipeCleanup();
	}

	/** Update highlight for a single message. */
	function updateMessageHighlight(key: string) {
		const nodes = findMessageNodes();
		for (const { element, key: k } of nodes) {
			if (k !== key) continue;
			if (selected.has(key)) {
				element.classList.add("dsh-shares-selected");
			} else {
				element.classList.remove("dsh-shares-selected");
			}
			const checkbox = element.querySelector<HTMLInputElement>(".dsh-shares-check");
			if (checkbox !== null) checkbox.checked = selected.has(key);
		}
	}

	/** Show the floating bottom bar. */
	function showFloatingBar() {
		if (floatingBar !== null) return;
		floatingBar = document.createElement("div");
		floatingBar.className = "dsh-shares-floating-bar";
		document.body.appendChild(floatingBar);
		updateFloatingBar();
	}

	/** Hide the floating bottom bar. */
	function hideFloatingBar() {
		if (floatingBar !== null) {
			floatingBar.remove();
			floatingBar = null;
		}
	}

	/** Update the floating bar content. */
	function updateFloatingBar() {
		if (floatingBar === null) return;
		const count = selected.size;
		floatingBar.innerHTML = "";

		const exitBtn = document.createElement("button");
		exitBtn.type = "button";
		exitBtn.className = "dsh-shares-floating-exit";
		exitBtn.setAttribute("aria-label", t("exitSelection"));
		exitBtn.textContent = "✕";
		exitBtn.addEventListener("click", exitSelection);

		const countSpan = document.createElement("span");
		countSpan.className = "dsh-shares-floating-count";
		countSpan.textContent = t("selectedCount", { count: String(count) });

		const shareBtn = document.createElement("button");
		shareBtn.type = "button";
		shareBtn.className = "dsh-shares-floating-share";
		shareBtn.textContent = t("share");
		shareBtn.disabled = count === 0;
		shareBtn.addEventListener("click", () => {
			if (selected.size === 0) return;
			const sessionId = getCurrentSessionId();
			if (sessionId === undefined) return;
			// Pass selected node keys as pre-selected items
			// ShareDialog will use them to pre-select messages
			const selectedKeys = [...selected];
			exitSelection();
			openShareDialog(sessionId, selectedKeys as unknown as number[]);
		});

		floatingBar.appendChild(exitBtn);
		floatingBar.appendChild(countSpan);
		floatingBar.appendChild(shareBtn);
	}

	// ── Initialize ──────────────────────────────────────────────────────

	// Initial scan
	scanAndInstrument();

	// Observe DOM mutations for new messages
	observer = new MutationObserver(() => {
		if (!disposed && !active) scanAndInstrument();
	});
	observer.observe(document.body, { childList: true, subtree: true });

	// Poll as fallback
	pollTimer = window.setInterval(() => {
		if (!disposed && !active) scanAndInstrument();
	}, 2000);

	// Return cleanup
	return () => {
		disposed = true;
		if (longPressTimer !== null) window.clearTimeout(longPressTimer);
		if (observer !== null) {
			observer.disconnect();
			observer = null;
		}
		if (pollTimer !== null) window.clearInterval(pollTimer);
		// Clean up all instrumented nodes
		for (const { element } of findMessageNodes()) {
			const cleanup = (element as unknown as { __sharesCleanup?: () => void }).__sharesCleanup;
			if (cleanup !== undefined) cleanup();
			element.removeAttribute(INSTRUMENTED);
		}
		removeSelectionModeUI();
		hideFloatingBar();
	};
}
