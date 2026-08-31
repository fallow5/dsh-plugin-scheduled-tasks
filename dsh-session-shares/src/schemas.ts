/**
 * Zod schemas shared between the server and client bundles.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import { z } from "zod";

/** Schema for one shared-session record (server-side, includes password hash). */
export const shareRecordSchema = z.object({
	id: z.string(),
	sessionId: z.string(),
	projectPath: z.string(),
	title: z.string(),
	selectedSeqs: z.array(z.number()),
	maxSeq: z.number(),
	visibility: z.enum(["public", "password"]),
	passwordHash: z.string().optional(),
	createdAt: z.number(),
	updatedAt: z.number(),
});

/** Schema for a share view (client-side, never includes password hash). */
export const shareViewSchema = z.object({
	id: z.string(),
	sessionId: z.string(),
	projectPath: z.string(),
	title: z.string(),
	selectedSeqs: z.array(z.number()),
	maxSeq: z.number(),
	visibility: z.enum(["public", "password"]),
	hasPassword: z.boolean(),
	createdAt: z.number(),
	updatedAt: z.number(),
});

/** Schema for the create-share result. */
export const createShareResultSchema = z.object({
	share: shareViewSchema,
	url: z.string(),
});

/** Schema for the delete-share result. */
export const deleteShareResultSchema = z.object({
	id: z.string(),
	deleted: z.boolean(),
});

/** Schema for the list result. */
export const shareListSchema = z.array(shareViewSchema);

/** Schema for the create-share input. */
export const createShareInputSchema = z.object({
	sessionId: z.string(),
	selectedSeqs: z.array(z.number().int().min(0)),
	visibility: z.enum(["public", "password"]),
	password: z.string().optional(),
});

/** Schema for one message item in the session preview. */
export const messagePreviewSchema = z.object({
	seq: z.number(),
	role: z.enum(["user", "assistant", "tool"]),
	content: z.string(),
	toolName: z.string().optional(),
});

/** Schema for the session messages preview result. */
export const sessionPreviewSchema = z.object({
	sessionId: z.string(),
	messages: z.array(messagePreviewSchema),
});
