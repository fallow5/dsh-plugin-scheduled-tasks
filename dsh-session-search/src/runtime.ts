/**
 * The `sessionSearch` typert host service. Registered as `ctx.sessionSearch`
 * by the plugin body; the gateway dispatches `sessionSearch/*` endpoints here.
 *
 * @module @opendsh/dsh-plugin-session-search
 */

import type { Context } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { searchSessionContent } from "./session-reader.js";

/** Minimal context face that can access sessionPersistence. */
interface ContextWithServices {
	get(name: "sessionPersistence"): unknown;
}

/** One search hit inside a session. */
export interface SearchHit {
	/** Event seq number of the matching message. */
	seq: number;
	/** Role of the message: user, assistant, or tool. */
	role: "user" | "assistant" | "tool";
	/** Snippet of the matching content (truncated, with match context). */
	snippet: string;
	/** The 0-based offset of the first match character within the original text. */
	matchIndex: number;
	/** The length of the matched substring. */
	matchLength: number;
	/** Tool name if the message is a tool call/result. */
	toolName?: string;
}

/** Result of searching a single session's content. */
export interface SessionSearchResult {
	/** The session id that was searched. */
	sessionId: string;
	/** Matching messages, newest first, capped at 50. */
	hits: SearchHit[];
	/** Whether more matches existed beyond the cap. */
	hasMore: boolean;
}

/** Host service backing the `sessionSearch` typert namespace. */
export class SessionSearchRuntime extends TypertRemoteService {
	constructor(ctx: Context) {
		super(ctx, "sessionSearch");
	}

	/**
	 * Search the content of a single session for a literal phrase.
	 * Returns matching messages with snippets and match positions.
	 */
	@Remote
	async search(input: {
		sessionId: string;
		query: string;
	}): Promise<SessionSearchResult> {
		const query = input.query.trim();
		if (query.length === 0) {
			return { sessionId: input.sessionId, hits: [], hasMore: false };
		}
		const hits = await searchSessionContent(
			this.ctx as unknown as ContextWithServices,
			input.sessionId,
			query,
		);
		return hits;
	}
}
