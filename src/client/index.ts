/**
 * Client plugin body: mounts the `tasks` remote namespace, registers the
 * `scheduled-tasks` locale dictionaries, then registers:
 *   1. The scheduled-tasks trigger button into the sidebar footer action seat.
 *   2. The scheduled-tasks panel body into the shell.overlay seat (renders
 *      inline in the content area, not as a modal popup).
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */
// Load the locale service declarations (module augmentation for Context.locale).
import type {} from "@deepseek-ai/dsh-client-locale/client";
import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
// Load the sidebar slot declarations (module augmentation for the SlotMap).
import type {} from "@deepseek-ai/dsh-client-ui-sidebar/client";
import { en, type ScheduledTasksKey, zh } from "./locales.js";
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
		/** Shell overlay layer (declared by dsh-client-ui-layout; list, root scope). */
		"shell.overlay": {
			kind: "list";
			scope: "root";
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
	// 2. Panel body in the shell overlay (renders inline in the content area).
	ctx.slots.inject("shell.overlay", () =>
		ctx.slots.register(
			{
				name: "shell.overlay",
				id: "scheduled-tasks",
				locale: NS,
				inject: (): Pick<TasksOverlayProps, "tasks"> => ({
					tasks: ctx.get("remote.tasks") as TasksRemote,
				}),
			},
			TasksOverlay,
		),
	);
}
