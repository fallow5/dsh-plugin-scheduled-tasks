/**
 * Host TYPERT face for the `sessionSearch` namespace. The
 * `dsh-typert-loader` scans loader entries that export `./typert`,
 * registers this manifest, and the host gateway dispatches
 * `sessionSearch/*` endpoints to the `sessionSearch` service.
 *
 * @module @opendsh/dsh-plugin-session-search
 */

import { z } from "zod";
import { sessionSearchInputSchema, sessionSearchResultSchema } from "./schemas.js";

const PKG = "@opendsh/dsh-plugin-session-search";

const direct: { kind: "direct" } = { kind: "direct" };

function jsonCodec(typeSymbol: string, schema: z.ZodType) {
	return { mode: "strict" as const, typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}

function result(typeSymbol: string, schema: z.ZodType) {
	return { mode: "strict" as const, typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}

/** Strict host contribution: `sessionSearch/*` endpoints dispatched to `ctx.sessionSearch`. */
export const TYPERT = {
	package: PKG,
	face: "host",
	schemas: [],
	model: {
		services: [
			{
				tags: [],
				key: "sessionSearch",
				exportName: "sessionSearch",
				members: [
					{
						name: "search",
						kind: "method",
						signature: "(input: SessionSearchInput): Promise<SessionSearchResult>",
					},
				],
				types: [
					{
						name: "SearchHit",
						declaration:
							"export interface SearchHit { seq: number; role: 'user' | 'assistant' | 'tool'; snippet: string; matchIndex: number; matchLength: number; toolName?: string; }",
					},
					{
						name: "SessionSearchResult",
						declaration:
							"export interface SessionSearchResult { sessionId: string; hits: SearchHit[]; hasMore: boolean; }",
					},
					{
						name: "SessionSearchInput",
						declaration:
							"export interface SessionSearchInput { sessionId: string; query: string; }",
					},
				],
			},
		],
		events: [],
		objects: [],
	},
	invocations: [
		{
			id: `${PKG}#sessionSearch/search`,
			service: "sessionSearch",
			namespace: "sessionSearch",
			method: "search",
			invocation: direct,
			parameters: [
				{
					name: "input",
					wire: "input",
					source: "json",
					codec: jsonCodec("SessionSearchInput", sessionSearchInputSchema),
				},
			],
			result: result("SessionSearchResult", sessionSearchResultSchema),
		},
	],
};
