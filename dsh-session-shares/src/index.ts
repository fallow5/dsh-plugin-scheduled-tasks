/**
 * Session-shares plugin entry: opens the `session_shares` storage domain,
 * mounts the share store, the `shares` typert service (`ctx.shares`), and
 * the public share viewer HTTP route.
 *
 * The host TYPERT face lives in `./typert` (auto-registered by
 * `dsh-typert-loader`); the browser half lives in `./client`.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import type { Context } from "@deepseek-ai/cordis";
import { sharesDomain } from "./domain.js";
import { registerShareViewer } from "./share-viewer.js";
import { SharesRuntime } from "./runtime.js";
import { SharesStore } from "./store.js";

/** Stable cordis plugin name. */
export const name = "session-shares";

/** Services required before the domain can open. */
export const inject = ["storageDomain", "webServer"];

/** Mount the plugin. */
export async function apply(ctx: Context) {
	const domain = await ctx.storageDomain.open(sharesDomain);
	const store = new SharesStore(ctx, domain);
	// The TypertRemoteService constructor registers `ctx.shares` itself and
	// unregisters it when this plugin's fiber unloads.
	void new SharesRuntime(ctx, store);
	// Register the public share viewer HTTP route on the web server.
	// Use ctx.effect to ensure the route is registered after the webServer
	// service is active, and unregistered on teardown.
	ctx.effect(
		() => registerShareViewer(ctx as never, store) ?? (() => {}),
		"session-shares: share viewer route",
	);
	ctx.effect(
		() => async () => {
			await domain.close();
		},
		"session-shares.teardown()",
	);
}
