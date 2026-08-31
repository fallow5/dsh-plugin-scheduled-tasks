/**
 * Zod schemas shared between the server and client bundles.
 *
 * @module @opendsh/dsh-plugin-session-search
 */

import { z } from "zod";

/** Schema for one search hit. */
export const searchHitSchema = z.object({
	seq: z.number().int().min(0),
	role: z.enum(["user", "assistant", "tool"]),
	snippet: z.string(),
	matchIndex: z.number().int().min(0),
	matchLength: z.number().int().min(0),
	toolName: z.string().optional(),
});

/** Schema for the search result. */
export const sessionSearchResultSchema = z.object({
	sessionId: z.string(),
	hits: z.array(searchHitSchema),
	hasMore: z.boolean(),
});

/** Schema for the search input. */
export const sessionSearchInputSchema = z.object({
	sessionId: z.string(),
	query: z.string(),
});
