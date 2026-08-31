/**
 * Client plugin body: mounts the `tasks` remote namespace, registers the
 * `scheduled-tasks` locale dictionaries, then registers:
 *   1. The scheduled-tasks trigger button into the sidebar footer action seat.
 *   2. The scheduled-tasks panel body dynamically into the `conversation` slot
 *      (renders inline in the content area, not as a modal popup). The panel
 *      is registered/unregistered on toggle, mirroring the knowledge-base
 *      plugin pattern.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */
// Load the locale service declarations (module augmentation for Context.locale).
import type {} from "@deepseek-ai/dsh-client-locale/client";
import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
// Load the sidebar slot declarations (module augmentation for the SlotMap).
import type {} from "@deepseek-ai/dsh-client-ui-sidebar/client";
import { en, type ScheduledTasksKey, zh } from "./locales.js";
import { panelStore } from "./panelState.js";
import type { TasksRemote } from "./remote.js";
import { injectStyles } from "./styles.js";
import { TasksFooterAction, type TasksFooterActionProps, TasksOverlay, type TasksOverlayProps } from "./TasksPanel.js";
import { TYPERT_REMOTE } from "./typert-remote.js";

/** Dictionary namespace owned by this plugin (panel copy). */
const NS = "scheduled-tasks";

declare module "@deepseek-ai/dsh-client-ui-slots" {
	interface LocaleNamespaceMap {
		/** Scheduled-tasks panel copy. */
		"scheduled-tasks": ScheduledTasksKey;
	}
	interface SlotMap {
		/** Conversation slot (declared by dsh-client-ui-layout; single, session-maybe scope). */
		conversation: {
			kind: "single";
			scope: "session-maybe";
		};
	}
}

/** Services required before this plugin mounts. */
export const inject = ["slots", "remote", "locale"];

/** Mount the browser half. */
export async function apply(ctx: ClientContext) {
	injectStyles();
	ctx.effect(() => ctx.locale.register(NS, { zh, en }), "scheduled-tasks: dictionaries");
	await ctx.remote.$mount(TYPERT_REMOTE);
	// Stable per-namespace translate; reads the active locale at call time, so
	// the label thunk below follows language switches without re-registration.
	const t = ctx.locale.bind(NS);
	// 1. Trigger button in the sidebar footer.
	ctx.slots.inject("sidebar.footer.action", () =>
		ctx.slots.register(
			{
				name: "sidebar.footer.action",
				id: "scheduled-tasks",
				label: () => t("title"),
				locale: NS,
				inject: (): Pick<TasksFooterActionProps, "tasks"> => ({
					tasks: ctx.get("remote.tasks") as TasksRemote,
				}),
			},
			TasksFooterAction,
		),
	);
	// 2. Panel body dynamically registered into the `conversation` slot (inline
	//    in the content area). Registered on open, disposed on close — mirrors
	//    the knowledge-base plugin pattern. Uses priority -1 so the panel
	//    shadows the normal conversation content when active.
	let disposePanel: (() => void) | undefined;
	const registerPanel = () => {
		if (disposePanel !== undefined) return;
		disposePanel = ctx.slots.register(
			{
				name: "conversation",
				priority: -1,
				locale: NS,
				inject: (): Pick<TasksOverlayProps, "tasks"> => ({
					tasks: ctx.get("remote.tasks") as TasksRemote,
				}),
			},
			TasksOverlay,
		);
	};
	const unregisterPanel = () => {
		if (disposePanel !== undefined) {
			disposePanel();
			disposePanel = undefined;
		}
	};
	// Subscribe to panel open/close state — register/unregister accordingly.
	const unsubscribe = panelStore.subscribe(() => {
		if (panelStore.getSnapshot()) registerPanel();
		else unregisterPanel();
	});
	// Close when another plugin workspace activates.
	const unsubscribeWorkspace = panelStore.observeWorkspaceClose();
	ctx.effect(
		() => () => {
			unsubscribe();
			unsubscribeWorkspace();
			unregisterPanel();
		},
		"scheduled-tasks: conversation panel lifecycle",
	);
}
