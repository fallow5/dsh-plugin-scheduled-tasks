/**
 * Storage-domain declaration for session shares.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { type ShareId, type ShareRecord, shareSchema } from "./types.js";

/** The `session_shares` domain declaration. */
export const sharesDomain = defineDomain({
	name: "session_shares",
	version: 1,
	tables: {
		shares: domainTable<ShareId, ShareRecord>(shareSchema),
	},
});

/** Type of the opened `session_shares` domain. */
export type SharesDomain = typeof sharesDomain;
