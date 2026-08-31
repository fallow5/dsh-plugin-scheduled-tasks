/**
 * Session-search plugin entry: opens the `session_search` storage domain
 * (unused — search is stateless), mounts the `sessionSearch` typert service
 * (`ctx.sessionSearch`).
 *
 * The host TYPERT face lives in `./typert` (auto-registered by
 * `dsh-typert-loader`); the browser half lives in `./client`.
 *
 * @module @opendsh/dsh-plugin-session-search
 */

import type { Context } from "@deepseek-ai/cordis";
import { SessionSearchRuntime } from "./runtime.js";

/** Stable cordis plugin name. */
export const name = "session-search";

/** Services required before the plugin can mount. */
export const inject = ["sessionPersistence"];

/** Mount the plugin. */
export async function apply(ctx: Context) {
	// The TypertRemoteService constructor registers `ctx.sessionSearch` itself
	// and unregisters it when this plugin's fiber unloads.
	void new SessionSearchRuntime(ctx);
}
