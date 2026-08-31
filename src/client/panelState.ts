/**
 * Shared open/close state for the scheduled-tasks panel.
 *
 * The trigger button lives in the `sidebar.footer.action` slot and the panel
 * body is dynamically registered into the `conversation` slot; this tiny store
 * bridges them so clicking the toggle flips the panel without prop-drilling
 * across slot boundaries.
 *
 * Uses the same workspace-activation pattern as the knowledge-base plugin:
 * when one plugin workspace opens, it dispatches a CustomEvent so other
 * plugin workspaces close themselves (mutual exclusion).
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */

/** Custom event name for cross-plugin workspace activation. */
const WORKSPACE_ACTIVATE_EVENT = "dsh-plugin-workspace-activate";

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

/** Dispatch a workspace-activate event so other plugin workspaces close. */
function activateWorkspace(): void {
	window.dispatchEvent(
		new CustomEvent(WORKSPACE_ACTIVATE_EVENT, { detail: { pluginId: "scheduled-tasks" } }),
	);
}

/** Toggle the open flag. When opening, also fires the workspace-activate event. */
function toggle(): void {
	if (open) {
		setOpen(false);
	} else {
		activateWorkspace();
		setOpen(true);
	}
}

/** Close the panel. */
function close(): void {
	setOpen(false);
}

/**
 * Observe workspace activations from other plugins. When another plugin
 * activates its workspace, call `close()` to mutually exclude.
 */
function observeWorkspaceClose(): () => void {
	const onActivate = (event: Event) => {
		const detail = (event as CustomEvent).detail;
		if (detail?.pluginId !== "scheduled-tasks") close();
	};
	window.addEventListener(WORKSPACE_ACTIVATE_EVENT, onActivate);
	return () => window.removeEventListener(WORKSPACE_ACTIVATE_EVENT, onActivate);
}

export const panelStore = {
	getSnapshot,
	subscribe,
	setOpen,
	toggle,
	close,
	observeWorkspaceClose,
};
