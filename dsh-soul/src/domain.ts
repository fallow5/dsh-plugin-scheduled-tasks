/**
 * Storage-domain declaration for the soul plugin.
 *
 * @module @opendsh/dsh-soul
 */
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { soulRecordSchema, type SoulRecord } from "./types.js";

/** The `soul` domain declaration. */
export const soulDomain = defineDomain({
	name: "soul",
	version: 1,
	tables: {
		soul: domainTable<string, SoulRecord>(soulRecordSchema),
	},
});

/** Type of the opened `soul` domain. */
export type SoulDomain = typeof soulDomain;
