/**
 * Shared open/close state for the scheduled-tasks panel.
 *
 * The trigger button lives in the `sidebar.footer.action` slot and the panel
 * body lives in the `shell.overlay` slot; this tiny store bridges them so
 * clicking the toggle flips the overlay without prop-drilling across slot
 * boundaries.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */

/** Module-level observable store (no React import — safe to use in any slot). */
const listeners = new Set<() => void>();
let open = false;

/** Read the current open flag (stable between mutations). */
function getSnapshot(): boolean {
	return open;
}

/** Subscribe to open-state changes; returns an unsubscribe function. */
function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Set the open flag and notify all subscribers. */
function setOpen(value: boolean): void {
	if (open === value) return;
	open = value;
	listeners.forEach((fn) => fn());
}

/** Toggle the open flag. */
function toggle(): void {
	setOpen(!open);
}

/** Close the panel. */
function close(): void {
	setOpen(false);
}

export const panelStore = {
	getSnapshot,
	subscribe,
	setOpen,
	toggle,
	close,
};
