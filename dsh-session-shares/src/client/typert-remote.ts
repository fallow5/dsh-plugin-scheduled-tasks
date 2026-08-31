/**
 * Client TYPERT_REMOTE face: installs the `shares` namespace on the client
 * through `ctx.remote.$mount(...)`, mirroring the host TYPERT manifest.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import type { TypertRemoteContribution } from "@deepseek-ai/dsh-typert-protocol";
import { z } from "zod";
import {
	createShareResultSchema,
	deleteShareResultSchema,
	sessionPreviewSchema,
	shareListSchema,
} from "../schemas.js";

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

/** Remote contribution consumed by `ctx.remote.$mount(...)`. */
export const TYPERT_REMOTE: TypertRemoteContribution = {
	package: PKG,
	descriptors: [
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
