/**
 * Session reader: reads session events from persistence and searches
 * message content for a literal phrase.
 *
 * @module @opendsh/dsh-plugin-session-search
 */

/** Maximum number of hits to return. */
const MAX_HITS = 50;

/** Context radius (characters on each side of the match) for snippets. */
const SNIPPET_RADIUS = 60;

/** Maximum snippet length. */
const MAX_SNIPPET = 240;

/** Minimal context face that can access sessionPersistence. */
interface ContextWithServices {
	get(name: "sessionPersistence"): unknown;
}

/** Minimal session-persistence face for cold reads. */
interface SessionPersistenceLike {
	inspect(
		id: string,
		signal?: AbortSignal,
	): Promise<{
		meta: { id: string; cwd?: string; createdAt?: number };
		events: ReadonlyArray<{
			type: string;
			seq: number;
			time: number;
			data: unknown;
		}>;
	}>;
}

/** One search hit. */
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

/** Resolve the session-persistence service from the context. */
function getPersistence(ctx: ContextWithServices): SessionPersistenceLike | undefined {
	return ctx.get("sessionPersistence") as SessionPersistenceLike | undefined;
}

/** Extract text from a content block array (concatenates all text blocks). */
function extractText(content: unknown): string {
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	for (const block of content) {
		if (block !== null && typeof block === "object") {
			const b = block as { type?: string; text?: string };
			if (b.type === "text" && typeof b.text === "string") {
				parts.push(b.text);
			}
		}
	}
	return parts.join("\n");
}

/** Extract text from an assistant message's content blocks. */
function extractAssistantText(content: unknown): string {
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	for (const block of content) {
		if (block === null || typeof block !== "object") continue;
		const b = block as { type?: string; text?: string };
		if (b.type === "text" && typeof b.text === "string") {
			parts.push(b.text);
		}
	}
	return parts.join("\n");
}

/** Build a snippet around the first match, truncated to MAX_SNIPPET. */
function buildSnippet(text: string, matchIndex: number, matchLength: number): string {
	const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
	const end = Math.min(text.length, matchIndex + matchLength + SNIPPET_RADIUS);
	let snippet = text.slice(start, end);
	if (start > 0) snippet = `…${snippet}`;
	if (end < text.length) snippet = `${snippet}…`;
	// Truncate to MAX_SNIPPET Unicode code points.
	if (snippet.length > MAX_SNIPPET) {
		snippet = `${snippet.slice(0, MAX_SNIPPET)}…`;
	}
	return snippet;
}

/** Convert a raw session event into text + role, or null if not message-producing. */
function eventToSearchable(event: {
	type: string;
	seq: number;
	time: number;
	data: unknown;
}): { seq: number; role: "user" | "assistant" | "tool"; text: string; toolName?: string } | null {
	const { type, seq, data } = event;
	if (data === null || typeof data !== "object") return null;

	if (type === "user/message") {
		const msg = data as { content?: unknown };
		const text = extractText(msg.content);
		if (text.length === 0) return null;
		return { seq, role: "user", text };
	}

	if (type === "assistant/message") {
		const payload = data as { message?: { content?: unknown } };
		const msg = payload.message;
		if (msg === undefined) return null;
		const text = extractAssistantText(msg.content);
		if (text.length === 0) return null;
		return { seq, role: "assistant", text };
	}

	if (type === "tool/call") {
		const payload = data as { name?: string; arguments?: string };
		const text = payload.arguments ?? "";
		if (text.length === 0) return null;
		return { seq, role: "tool", text, toolName: payload.name };
	}

	if (type === "tool/result") {
		const payload = data as { message?: { content?: unknown } };
		const msg = payload.message;
		const content = msg?.content;
		let text = "";
		if (Array.isArray(content)) {
			text = extractText(content);
		}
		if (text.length === 0) return null;
		return { seq, role: "tool", text };
	}

	return null;
}

/**
 * Search a session's events for a literal phrase (case-insensitive).
 * Returns matching messages with snippets and match positions.
 */
export async function searchSessionContent(
	ctx: ContextWithServices,
	sessionId: string,
	query: string,
): Promise<SessionSearchResult> {
	const persistence = getPersistence(ctx);
	if (persistence === undefined) {
		return { sessionId, hits: [], hasMore: false };
	}

	let events: ReadonlyArray<{
		type: string;
		seq: number;
		time: number;
		data: unknown;
	}>;
	try {
		const inspected = await persistence.inspect(sessionId);
		events = inspected.events;
	} catch {
		return { sessionId, hits: [], hasMore: false };
	}

	const lowerQuery = query.toLowerCase();
	const hits: SearchHit[] = [];
	let hasMore = false;

	// Iterate newest-first for relevance.
	for (let i = events.length - 1; i >= 0; i--) {
		const event = events[i];
		const searchable = eventToSearchable(event);
		if (searchable === null) continue;

		const lowerText = searchable.text.toLowerCase();
		const matchIndex = lowerText.indexOf(lowerQuery);
		if (matchIndex === -1) continue;

		if (hits.length >= MAX_HITS) {
			hasMore = true;
			break;
		}

		hits.push({
			seq: searchable.seq,
			role: searchable.role,
			snippet: buildSnippet(searchable.text, matchIndex, query.length),
			matchIndex,
			matchLength: query.length,
			...(searchable.toolName !== undefined ? { toolName: searchable.toolName } : {}),
		});
	}

	return { sessionId, hits, hasMore };
}
