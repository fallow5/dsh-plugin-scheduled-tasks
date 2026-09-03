/**
 * Client plugin body: mounts the `soul` remote namespace, registers the
 * `soul` locale dictionaries, then registers a "Soul" section in the
 * settings panel.
 *
 * @module @opendsh/dsh-soul
 */

import type {} from "@deepseek-ai/dsh-client-locale/client";
import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar/client";
import { en, type SoulKey, zh } from "./locales.js";
import type { SoulRemote } from "./remote.js";
import { injectStyles } from "./styles.js";
import { SoulSettings, type SoulSettingsProps } from "./SoulSettings.js";
import { TYPERT_REMOTE } from "./typert-remote.js";

/** Dictionary namespace owned by this plugin. */
const NS = "soul";

declare module "@deepseek-ai/dsh-client-ui-slots" {
	interface LocaleNamespaceMap {
		/** Soul panel copy. */
		"soul": SoulKey;
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

/** Services required before this plugin mounts. */
export const inject = ["slots", "remote", "locale"];

/** Mount the browser half. */
export async function apply(ctx: ClientContext) {
	injectStyles();
	ctx.effect(() => ctx.locale.register(NS, { zh, en }), "soul: dictionaries");
	await ctx.remote.$mount(TYPERT_REMOTE);
	const t = ctx.locale.bind(NS) as PanelTranslate;
	const soul = ctx.get("remote.soul") as SoulRemote;

	// ── "Soul" section in the settings panel ────────────────────────────────
	ctx.slots.inject("settings.section", () =>
		ctx.slots.register(
			{
				name: "settings.section",
				id: "soul",
				order: 150,
				label: () => t("title"),
				locale: NS,
				inject: (): Pick<SoulSettingsProps, "soul"> => ({
					soul: ctx.get("remote.soul") as SoulRemote,
				}),
			},
			SoulSettings,
		),
	);
}

/** The translate seat type for the soul namespace. */
type PanelTranslate = (key: SoulKey) => string;
