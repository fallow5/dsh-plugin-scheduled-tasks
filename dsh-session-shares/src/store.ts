/**
 * Durable share store over the `session_shares` domain.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import type { Context } from "@deepseek-ai/cordis";
import { type Domain, type KvTable } from "@deepseek-ai/dsh-storage-domain";
import type { SharesDomain } from "./domain.js";
import {
	type CreateShareResult,
	type DeleteShareResult,
	type ShareId,
	type ShareRecord,
	type ShareView,
	ShareId as makeShareId,
} from "./types.js";

/** Validation failure with a stable code, surfaced to the UI. */
export class SharesInputError extends Error {
	readonly code: string;

	constructor(code: string, message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "SharesInputError";
		this.code = code;
	}
}

/** Error used when a share cannot be found. */
export class ShareNotFoundError extends Error {
	constructor(id: string) {
		super(`share ${id} does not exist`);
		this.name = "ShareNotFoundError";
	}
}

/** Input accepted by {@link SharesStore.create}. */
export interface ShareCreateInput {
	sessionId: string;
	projectPath: string;
	title: string;
	selectedSeqs: number[];
	maxSeq: number;
	visibility: "public" | "password";
	password?: string;
}

/** Hash a password with SHA-256. */
function hashPassword(password: string): string {
	return createHash("sha256").update(password).digest("hex");
}

/** Constant-time password comparison. */
export function verifyPassword(password: string, hash: string): boolean {
	const a = Buffer.from(hashPassword(password), "hex");
	const b = Buffer.from(hash, "hex");
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

/** Project a ShareRecord to a ShareView (strips password hash). */
export function toView(record: ShareRecord): ShareView {
	const { passwordHash, ...rest } = record;
	return { ...rest, hasPassword: record.visibility === "password" && passwordHash !== undefined };
}

/** The `session-shares` store: typed table access plus domain validation. */
export class SharesStore {
	private readonly shares: KvTable<ShareId, ShareRecord>;

	constructor(
		private readonly ctx: Context,
		domain: Domain<SharesDomain>,
	) {
		this.shares = domain.table("shares");
	}

	/** All shares, newest first. */
	list(): ShareRecord[] {
		const all = [...this.shares.entries()].map(([, record]) => record);
		all.sort((a, b) => b.createdAt - a.createdAt);
		return all;
	}

	/** All share views, newest first. */
	listViews(): ShareView[] {
		return this.list().map(toView);
	}

	/** Read one share synchronously. */
	get(id: string): ShareRecord | undefined {
		return this.shares.get(makeShareId(id));
	}

	/** Read one share view. */
	getView(id: string): ShareView | undefined {
		const record = this.get(id);
		return record === undefined ? undefined : toView(record);
	}

	/** Create and persist one share. */
	async create(input: ShareCreateInput, baseUrl: string): Promise<CreateShareResult> {
		const now = Date.now();
		if (input.selectedSeqs.length === 0) {
			throw new SharesInputError("empty_selection", "at least one message must be selected for sharing.");
		}
		if (input.visibility === "password") {
			if (input.password === undefined || input.password.length < 1) {
				throw new SharesInputError("invalid_password", "a non-empty password is required for password-protected shares.");
			}
			if (input.password.length > 200) {
				throw new SharesInputError("invalid_password", "password must be at most 200 characters.");
			}
		}
		const id = makeShareId(`share-${randomUUID()}`);
		const record: ShareRecord = {
			id,
			sessionId: input.sessionId,
			projectPath: input.projectPath,
			title: input.title.slice(0, 500),
			selectedSeqs: [...input.selectedSeqs].sort((a, b) => a - b),
			maxSeq: input.maxSeq,
			visibility: input.visibility,
			...(input.visibility === "password" && input.password !== undefined
				? { passwordHash: hashPassword(input.password) }
				: {}),
			createdAt: now,
			updatedAt: now,
		};
		await this.shares.put(id, record);
		const url = `${baseUrl}/share/${id}`;
		return { share: toView(record), url };
	}

	/** Delete one share. Returns whether it existed. */
	async remove(id: string): Promise<boolean> {
		const existing = this.shares.get(makeShareId(id));
		if (existing === undefined) return false;
		await this.shares.delete(makeShareId(id));
		return true;
	}

	/** Delete one share and return a result object. */
	async deleteShare(id: string): Promise<DeleteShareResult> {
		const deleted = await this.remove(id);
		return { id, deleted };
	}

	/** Delete all shares for a given session. */
	async deleteBySession(sessionId: string): Promise<number> {
		let count = 0;
		for (const [shareId, record] of [...this.shares.entries()]) {
			if (record.sessionId === sessionId) {
				await this.shares.delete(shareId);
				count++;
			}
		}
		return count;
	}
}
