/**
 * The `shares` typert host service. Registered as `ctx.shares` by the plugin
 * body; the gateway dispatches `shares/*` endpoints here.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import type { Context } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { deriveSessionTitle, getSessionPreview } from "./session-reader.js";
import type { SharesStore } from "./store.js";
import type { CreateShareResult, DeleteShareResult, MessagePreview, ShareView } from "./types.js";

/** Minimal webServer face for resolving the base URL. */
interface WebServerLike {
	host: string;
	port: number;
}

/** Minimal workspace-registry face. */
interface WorkspaceRegistryLike {
	resolveByPath?(path: string): Promise<{ path: string } | undefined>;
}

/** Host service backing the `shares` typert namespace. */
export class SharesRuntime extends TypertRemoteService {
	constructor(
		ctx: Context,
		private readonly store: SharesStore,
	) {
		super(ctx, "shares");
	}

	/** List all shares, newest first. */
	@Remote
	list(): ShareView[] {
		return this.store.listViews();
	}

	/** Create a new share. */
	@Remote
	async create(input: {
		sessionId: string;
		selectedSeqs: number[];
		visibility: "public" | "password";
		password?: string;
	}): Promise<CreateShareResult> {
		const baseUrl = this.resolveBaseUrl();
		const title = await deriveSessionTitle(this.ctx as never, input.sessionId);
		const projectPath = await this.resolveProjectPath(input.sessionId);
		const maxSeq = await this.resolveMaxSeq(input.sessionId);
		return this.store.create(
			{
				sessionId: input.sessionId,
				projectPath,
				title,
				selectedSeqs: input.selectedSeqs,
				maxSeq,
				visibility: input.visibility,
				...(input.password !== undefined ? { password: input.password } : {}),
			},
			baseUrl,
		);
	}

	/** Delete a share (cancel sharing). */
	@Remote
	async delete(id: string): Promise<DeleteShareResult> {
		return this.store.deleteShare(id);
	}

	/** Get a preview of messages in a session (for the selection UI). */
	@Remote
	async preview(sessionId: string): Promise<{ sessionId: string; messages: MessagePreview[] }> {
		const messages = await getSessionPreview(this.ctx as never, sessionId);
		return { sessionId, messages };
	}

	/** Resolve the base URL for share links. */
	private resolveBaseUrl(): string {
		const webServer = (this.ctx as unknown as { webServer?: WebServerLike }).webServer;
		if (webServer !== undefined) {
			return `http://${webServer.host}:${webServer.port}`;
		}
		return "http://127.0.0.1:3080";
	}

	/** Resolve the project path for a session. */
	private async resolveProjectPath(sessionId: string): Promise<string> {
		const persistence = this.ctx.get("sessionPersistence") as
			| { list(): Promise<{ id: string; cwd?: string }[]> }
			| undefined;
		if (persistence !== undefined) {
			try {
				const headers = await persistence.list();
				const header = headers.find((h) => h.id === sessionId);
				if (header?.cwd !== undefined) return header.cwd;
			} catch {
				// fall through
			}
		}
		return "/";
	}

	/** Resolve the current max seq for a session. */
	private async resolveMaxSeq(sessionId: string): Promise<number> {
		const persistence = this.ctx.get("sessionPersistence") as
			| { inspect(id: string): Promise<{ events: ReadonlyArray<{ seq: number }> }> }
			| undefined;
		if (persistence !== undefined) {
			try {
				const inspected = await persistence.inspect(sessionId);
				return inspected.events.length;
			} catch {
				// fall through
			}
		}
		return 0;
	}
}
