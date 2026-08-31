/**
 * Wire schemas shared by the host TYPERT face and the client remote face.
 * These zod schemas anchor both directions of the `tasks` typert namespace:
 * the host validates incoming arguments and outgoing results, the client
 * validates outgoing arguments and incoming results.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */
import { z } from "zod";
import { taskModelSchema } from "./types.js";

/** JSON-safe projection of one task record (undefined fields stripped). */
export const taskViewSchema = z.object({
	id: z.string(),
	projectPath: z.string(),
	name: z.string(),
	prompt: z.string(),
	kind: z.enum(["at", "every", "cron"]),
	scheduledAt: z.string(),
	everySeconds: z.number().optional(),
	cron: z.string().optional(),
	timeZone: z.string().optional(),
	model: taskModelSchema.optional(),
	expert: z.string().optional(),
	skills: z.array(z.string()).optional(),
	reuseKinds: z.array(z.enum(["at", "every", "cron"])).optional(),
	lastSessionId: z.string().optional(),
	enabled: z.boolean(),
	state: z.enum(["active", "finished"]),
	effectiveFrom: z.string().optional(),
	effectiveUntil: z.string().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
	lastRunAt: z.string().optional(),
	lastRunId: z.string().optional(),
});

/** JSON-safe projection of one run record. */
export const runViewSchema = z.object({
	id: z.string(),
	taskId: z.string(),
	projectPath: z.string(),
	triggeredBy: z.enum(["schedule", "manual"]),
	overdue: z.boolean(),
	startedAt: z.string(),
	finishedAt: z.string().optional(),
	status: z.enum(["running", "completed", "failed"]),
	output: z.string().optional(),
	error: z.string().optional(),
	sessionId: z.string().optional(),
	model: taskModelSchema.optional(),
});

/** Local calendar `at` selector (snake_case, mirroring dsh-schedule). */
export const localAtSchema = z.object({
	date: z.string(),
	time: z.string(),
	time_zone: z.string(),
});

/** The `at` selector: explicit-offset instant string or local calendar object. */
export const atSelectorSchema = z.union([z.string(), localAtSchema]);

/** Wire form of `tasks/create` input. */
export const createInputSchema = z.object({
	projectPath: z.string(),
	name: z.string(),
	prompt: z.string(),
	kind: z.enum(["at", "every", "cron"]),
	at: atSelectorSchema.optional(),
	everySeconds: z.number().optional(),
	cron: z.string().optional(),
	timeZone: z.string().optional(),
	model: taskModelSchema.optional(),
	expert: z.string().optional(),
	skills: z.array(z.string()).optional(),
	reuseKinds: z.array(z.enum(["at", "every", "cron"])).optional(),
	enabled: z.boolean().optional(),
	effectiveFrom: z.string().optional(),
	effectiveUntil: z.string().optional(),
});

/** Wire form of `tasks/update` patch. `model: null` clears the per-task override. */
export const updateInputSchema = z.object({
	projectPath: z.string().optional(),
	name: z.string().optional(),
	prompt: z.string().optional(),
	kind: z.enum(["at", "every", "cron"]).optional(),
	at: atSelectorSchema.optional(),
	everySeconds: z.number().optional(),
	cron: z.string().optional(),
	timeZone: z.string().optional(),
	model: z.union([taskModelSchema, z.null()]).optional(),
	expert: z.union([z.string(), z.null()]).optional(),
	skills: z.union([z.array(z.string()), z.null()]).optional(),
	reuseKinds: z.union([z.array(z.enum(["at", "every", "cron"])), z.null()]).optional(),
	enabled: z.boolean().optional(),
	effectiveFrom: z.union([z.string(), z.null()]).optional(),
	effectiveUntil: z.union([z.string(), z.null()]).optional(),
});

/** Wire result of `tasks/delete`. */
export const deleteResultSchema = z.object({
	id: z.string(),
	deleted: z.boolean(),
});

/** One model advertised by one provider group in `tasks/catalog`. */
export const catalogModelSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
});

/** One provider group with the models it advertises (advisory catalog). */
export const modelCatalogGroupSchema = z.object({
	id: z.string(),
	name: z.string(),
	models: z.array(catalogModelSchema),
});

/** Wire result of `tasks/catalog`: every registered provider, grouped by provider. */
export const catalogResultSchema = z.object({
	/** Provider groups in registration order. */
	groups: z.array(modelCatalogGroupSchema),
	/** Current default selection when the deployment exposes one. */
	default: z
		.object({
			provider: z.string(),
			model: z.string(),
		})
		.nullable(),
});

/** One expert advertised in `tasks/experts`. */
export const expertItemSchema = z.object({
	slug: z.string(),
	name: z.string(),
	division: z.string(),
	description: z.string(),
});

/** Wire result of `tasks/experts`: every enabled agency expert. */
export const expertsResultSchema = z.object({
	/** Experts in discovery order. */
	experts: z.array(expertItemSchema),
});

/** One skill advertised in `tasks/skills`. */
export const skillItemSchema = z.object({
	name: z.string(),
	description: z.string(),
});

/** Wire result of `tasks/skills`: every discovered agent skill. */
export const skillsResultSchema = z.object({
	/** Skills in discovery order. */
	skills: z.array(skillItemSchema),
});

export type TaskView = z.infer<typeof taskViewSchema>;
export type RunView = z.infer<typeof runViewSchema>;
export type CreateInput = z.infer<typeof createInputSchema>;
export type UpdateInput = z.infer<typeof updateInputSchema>;
export type CatalogResult = z.infer<typeof catalogResultSchema>;
export type ModelCatalogGroup = z.infer<typeof modelCatalogGroupSchema>;
export type ExpertItem = z.infer<typeof expertItemSchema>;
export type ExpertsResult = z.infer<typeof expertsResultSchema>;
export type SkillItem = z.infer<typeof skillItemSchema>;
export type SkillsResult = z.infer<typeof skillsResultSchema>;
