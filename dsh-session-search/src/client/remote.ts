/**
 * Client-side remote surface for the `sessionSearch` typert namespace.
 *
 * @module @opendsh/dsh-plugin-session-search
 */

/** One search hit from the server. */
export interface SearchHit {
	seq: number;
	role: "user" | "assistant" | "tool";
	snippet: string;
	matchIndex: number;
	matchLength: number;
	toolName?: string;
}

/** Result of searching a session. */
export interface SessionSearchResult {
	sessionId: string;
	hits: SearchHit[];
	hasMore: boolean;
}

/** One settled wire result. */
export type RpcResult<T> =
	| { ok: true; value: T }
	| { ok: false; error: { code: string; message: string } };

/** Typed projection of the installed `remote.sessionSearch` namespace. */
export interface SessionSearchRemote {
	search(input: {
		sessionId: string;
		query: string;
	}): Promise<RpcResult<SessionSearchResult>>;
}
