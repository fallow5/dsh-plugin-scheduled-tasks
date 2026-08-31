/**
 * Client-side remote surface for the `shares` typert namespace.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import type { CreateShareResult, DeleteShareResult, MessagePreview, ShareView } from "../types.js";

/** One settled wire result. */
export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } };

/** Typed projection of the installed `remote.shares` namespace. */
export interface SharesRemote {
	list(): Promise<RpcResult<ShareView[]>>;
	create(input: {
		sessionId: string;
		selectedSeqs: number[];
		visibility: "public" | "password";
		password?: string;
	}): Promise<RpcResult<CreateShareResult>>;
	delete(id: string): Promise<RpcResult<DeleteShareResult>>;
	preview(sessionId: string): Promise<RpcResult<{ sessionId: string; messages: MessagePreview[] }>>;
}
