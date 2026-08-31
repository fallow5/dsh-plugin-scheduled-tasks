/**
 * Host TYPERT face for the `shares` namespace. The `dsh-typert-loader` scans
 * loader entries that export `./typert`, registers this manifest, and the
 * host gateway dispatches `shares/*` endpoints to the `shares` service.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import { z } from "zod";
import {
	createShareResultSchema,
	deleteShareResultSchema,
	messagePreviewSchema,
	sessionPreviewSchema,
	shareListSchema,
	shareViewSchema,
} from "./schemas.js";

const PKG = "@opendsh/dsh-plugin-session-shares";

const direct: { kind: "direct" } = { kind: "direct" };

function jsonCodec(typeSymbol: string, schema: z.ZodType) {
	return { mode: "strict" as const, typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}

function result(typeSymbol: string, schema: z.ZodType) {
	return { mode: "strict" as const, typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}

const createShareInputSchema = z.object({
	sessionId: z.string(),
	selectedSeqs: z.array(z.number().int().min(0)),
	visibility: z.enum(["public", "password"]),
	password: z.string().optional(),
});

/** Strict host contribution: `shares/*` endpoints dispatched to `ctx.shares`. */
export const TYPERT = {
	package: PKG,
	face: "host",
	schemas: [],
	model: {
		services: [
			{
				tags: [],
				key: "shares",
				exportName: "shares",
				members: [
					{ name: "list", kind: "method", signature: "(): ShareView[]" },
					{ name: "create", kind: "method", signature: "(input: CreateShareInput): Promise<CreateShareResult>" },
					{ name: "delete", kind: "method", signature: "(id: string): Promise<DeleteShareResult>" },
					{ name: "preview", kind: "method", signature: "(sessionId: string): Promise<SessionPreview>" },
				],
				types: [
					{ name: "ShareId", declaration: "export type ShareId = string;" },
					{
						name: "ShareVisibility",
						declaration: "export type ShareVisibility = 'public' | 'password';",
					},
					{
						name: "ShareView",
						declaration:
							"export interface ShareView { id: string; sessionId: string; projectPath: string; title: string; selectedSeqs: number[]; maxSeq: number; visibility: ShareVisibility; hasPassword: boolean; createdAt: number; updatedAt: number; }",
					},
					{
						name: "CreateShareInput",
						declaration:
							"export interface CreateShareInput { sessionId: string; selectedSeqs: number[]; visibility: ShareVisibility; password?: string; }",
					},
					{
						name: "CreateShareResult",
						declaration:
							"export interface CreateShareResult { share: ShareView; url: string; }",
					},
					{
						name: "DeleteShareResult",
						declaration: "export interface DeleteShareResult { id: string; deleted: boolean; }",
					},
					{
						name: "MessagePreview",
						declaration:
							"export interface MessagePreview { seq: number; role: 'user' | 'assistant' | 'tool'; content: string; toolName?: string; }",
					},
					{
						name: "SessionPreview",
						declaration:
							"export interface SessionPreview { sessionId: string; messages: MessagePreview[]; }",
					},
				],
			},
		],
		events: [],
		objects: [],
	},
	invocations: [
		{
			id: `${PKG}#shares/list`,
			service: "shares",
			namespace: "shares",
			method: "list",
			invocation: direct,
			parameters: [],
			result: result("ShareView[]", shareListSchema),
		},
		{
			id: `${PKG}#shares/create`,
			service: "shares",
			namespace: "shares",
			method: "create",
			invocation: direct,
			parameters: [
				{
					name: "input",
					wire: "input",
					source: "json",
					codec: jsonCodec("CreateShareInput", createShareInputSchema),
				},
			],
			result: result("CreateShareResult", createShareResultSchema),
		},
		{
			id: `${PKG}#shares/delete`,
			service: "shares",
			namespace: "shares",
			method: "delete",
			invocation: direct,
			parameters: [
				{
					name: "id",
					wire: "id",
					source: "json",
					codec: jsonCodec("ShareId", z.string()),
				},
			],
			result: result("DeleteShareResult", deleteShareResultSchema),
		},
		{
			id: `${PKG}#shares/preview`,
			service: "shares",
			namespace: "shares",
			method: "preview",
			invocation: direct,
			parameters: [
				{
					name: "sessionId",
					wire: "sessionId",
					source: "json",
					codec: jsonCodec("SessionId", z.string()),
				},
			],
			result: result("SessionPreview", sessionPreviewSchema),
		},
	],
};
