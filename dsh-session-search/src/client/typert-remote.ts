/**
 * Client TYPERT_REMOTE face: installs the `sessionSearch` namespace on the
 * client through `ctx.remote.$mount(...)`, mirroring the host TYPERT manifest.
 *
 * @module @opendsh/dsh-plugin-session-search
 */

import type { TypertRemoteContribution } from "@deepseek-ai/dsh-typert-protocol";
import { z } from "zod";
import { sessionSearchResultSchema } from "../schemas.js";

const PKG = "@opendsh/dsh-plugin-session-search";

const direct: { kind: "direct" } = { kind: "direct" };

function jsonCodec(typeSymbol: string, schema: z.ZodType) {
	return { mode: "strict" as const, typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}

function result(typeSymbol: string, schema: z.ZodType) {
	return { mode: "strict" as const, typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}

const sessionSearchInputSchema = z.object({
	sessionId: z.string(),
	query: z.string(),
});

/** Remote contribution consumed by `ctx.remote.$mount(...)`. */
export const TYPERT_REMOTE: TypertRemoteContribution = {
	package: PKG,
	descriptors: [
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
