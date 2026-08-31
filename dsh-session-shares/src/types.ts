/**
 * Durable domain model for session shares.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */
import { z } from "zod";

/** Branded share identifier. */
export type ShareId = string & { readonly __shareId: unique symbol };

/** Mint a branded share id from a raw value (boundary-only cast). */
export function ShareId(value: string): ShareId {
	return value as ShareId;
}

/** Visibility of a shared session. */
export type ShareVisibility = "public" | "password";

const shareIdSchema = z.string().regex(/^share-[A-Za-z0-9_-]+$/);

/** One shared-session record stored in the domain. */
export const shareSchema = z.object({
	id: shareIdSchema,
	/** The source session's id. */
	sessionId: z.string().min(1),
	/** The project path the session belongs to. */
	projectPath: z.string().min(1),
	/** Human-readable title for the share. */
	title: z.string().min(1).max(500),
	/** Event seq numbers selected for sharing (non-contiguous allowed). */
	selectedSeqs: z.array(z.number().int().min(0)),
	/** Maximum seq at share-creation time (freeze boundary). */
	maxSeq: z.number().int().min(0),
	/** Whether the share is public or password-protected. */
	visibility: z.enum(["public", "password"]),
	/** SHA-256 hash of the password (present only when visibility is "password"). */
	passwordHash: z.string().optional(),
	/** Epoch ms when the share was created. */
	createdAt: z.number().int().min(0),
	/** Epoch ms when the share was last updated. */
	updatedAt: z.number().int().min(0),
});
export type ShareRecord = z.infer<typeof shareSchema>;

/** A share record projected to the client (never includes the password hash). */
export type ShareView = Omit<ShareRecord, "passwordHash"> & {
	/** Whether the share is password-protected. */
	hasPassword: boolean;
};

/** Result of creating a share. */
export interface CreateShareResult {
	/** The share view (without password hash). */
	share: ShareView;
	/** The full public URL for the share. */
	url: string;
}

/** Result of deleting a share. */
export interface DeleteShareResult {
	id: string;
	deleted: boolean;
}

/** One message item in the session preview. */
export interface MessagePreview {
	seq: number;
	role: "user" | "assistant" | "tool";
	content: string;
	toolName?: string;
}

/** Session messages preview result. */
export interface SessionPreview {
	sessionId: string;
	messages: MessagePreview[];
}
