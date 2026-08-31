/**
 * Session reader: reads session events from persistence and extracts
 * message content for sharing and preview.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import type { MessagePreview } from "./types.js";

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

/** One content block in a message (simplified for rendering). */
export interface RenderBlock {
	type: "text" | "reasoning" | "tool-call" | "tool-result" | "image";
	text?: string;
	toolName?: string;
	toolArgs?: string;
	toolCallId?: string;
	isError?: boolean;
}

/** One rendered message from the session log. */
export interface RenderedMessage {
	seq: number;
	time: number;
	role: "user" | "assistant" | "tool";
	blocks: RenderBlock[];
	toolName?: string;
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

/** Convert a raw session event into a RenderedMessage, or null if not message-producing. */
function eventToMessage(event: {
	type: string;
	seq: number;
	time: number;
	data: unknown;
}): RenderedMessage | null {
	const { type, seq, time, data } = event;
	if (data === null || typeof data !== "object") return null;

	if (type === "user/message") {
		const msg = data as { content?: unknown };
		const text = extractText(msg.content);
		return { seq, time, role: "user", blocks: [{ type: "text", text }] };
	}

	if (type === "assistant/message") {
		const payload = data as { message?: { content?: unknown } };
		const msg = payload.message;
		if (msg === undefined) return null;
		const blocks = extractBlocks(msg.content);
		return { seq, time, role: "assistant", blocks };
	}

	if (type === "tool/call") {
		const payload = data as { callId?: string; name?: string; arguments?: string };
		return {
			seq,
			time,
			role: "tool",
			toolName: payload.name,
			blocks: [
				{
					type: "tool-call",
					toolName: payload.name,
					toolArgs: payload.arguments,
					toolCallId: payload.callId,
				},
			],
		};
	}

	if (type === "tool/result") {
		const payload = data as {
			message?: { content?: unknown };
			error?: { name?: string; code?: string };
		};
		const msg = payload.message;
		const content = msg?.content;
		let isError = false;
		let text = "";
		let toolCallId: string | undefined;
		if (Array.isArray(content)) {
			for (const block of content) {
				if (block !== null && typeof block === "object") {
					const b = block as {
						type?: string;
						text?: string;
						isError?: boolean;
						toolCallId?: string;
						content?: unknown;
					};
					if (b.type === "tool-result") {
						isError = b.isError === true;
						toolCallId = b.toolCallId;
						text = extractText(b.content);
					}
				}
			}
		}
		return {
			seq,
			time,
			role: "tool",
			blocks: [{ type: "tool-result", text, isError, toolCallId }],
		};
	}

	return null;
}

/** Extract render blocks from a content block array. */
function extractBlocks(content: unknown): RenderBlock[] {
	if (!Array.isArray(content)) return [];
	const blocks: RenderBlock[] = [];
	for (const block of content) {
		if (block === null || typeof block !== "object") continue;
		const b = block as { type?: string; text?: string; name?: string; arguments?: string; id?: string; isError?: boolean; content?: unknown };
		switch (b.type) {
			case "text":
				blocks.push({ type: "text", text: b.text ?? "" });
				break;
			case "reasoning":
				blocks.push({ type: "reasoning", text: b.text ?? "" });
				break;
			case "tool-call":
				blocks.push({
					type: "tool-call",
					toolName: b.name,
					toolArgs: b.arguments,
					toolCallId: b.id,
				});
				break;
			case "tool-result":
				blocks.push({
					type: "tool-result",
					text: extractText(b.content),
					isError: b.isError === true,
					toolCallId: (b as { toolCallId?: string }).toolCallId,
				});
				break;
			case "image":
				blocks.push({ type: "image" });
				break;
		}
	}
	return blocks;
}

/** Read a session's events from persistence. */
export async function readSessionEvents(
	ctx: ContextWithServices,
	sessionId: string,
): Promise<{ events: ReadonlyArray<{ type: string; seq: number; time: number; data: unknown }>; cwd?: string } | undefined> {
	const persistence = getPersistence(ctx);
	if (persistence === undefined) return undefined;
	try {
		const inspected = await persistence.inspect(sessionId);
		return { events: inspected.events, cwd: inspected.meta.cwd };
	} catch {
		return undefined;
	}
}

/** Get a preview of all message-producing events in a session (for the selection UI). */
export async function getSessionPreview(
	ctx: ContextWithServices,
	sessionId: string,
): Promise<MessagePreview[]> {
	const result = await readSessionEvents(ctx, sessionId);
	if (result === undefined) return [];
	const messages: MessagePreview[] = [];
	for (const event of result.events) {
		const msg = eventToMessage(event);
		if (msg === null) continue;
		const content = msg.blocks
			.map((b) => b.text ?? "")
			.filter((t) => t.length > 0)
			.join("\n");
		messages.push({
			seq: msg.seq,
			role: msg.role,
			content: content.slice(0, 500),
			...(msg.toolName !== undefined ? { toolName: msg.toolName } : {}),
		});
	}
	return messages;
}

/** Get rendered messages for a set of selected seqs (for the share viewer). */
export async function getRenderedMessages(
	ctx: ContextWithServices,
	sessionId: string,
	selectedSeqs: number[],
	maxSeq: number,
): Promise<RenderedMessage[]> {
	const result = await readSessionEvents(ctx, sessionId);
	if (result === undefined) return [];
	const selectedSet = new Set(selectedSeqs);
	const messages: RenderedMessage[] = [];
	for (const event of result.events) {
		if (event.seq > maxSeq) break;
		if (!selectedSet.has(event.seq)) continue;
		const msg = eventToMessage(event);
		if (msg === null) continue;
		messages.push(msg);
	}
	return messages;
}

/** Derive a title from the first user message in a session. */
export async function deriveSessionTitle(ctx: ContextWithServices, sessionId: string): Promise<string> {
	const preview = await getSessionPreview(ctx, sessionId);
	const firstUser = preview.find((m) => m.role === "user");
	if (firstUser === undefined) {
		return `Session ${sessionId.slice(0, 12)}`;
	}
	const title = firstUser.content.trim().split("\n")[0];
	return title.length > 100 ? `${title.slice(0, 100)}…` : title;
}
