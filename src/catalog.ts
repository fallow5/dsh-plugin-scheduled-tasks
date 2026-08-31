/**
 * Grouped model-catalog builder for the `tasks/catalog` endpoint. Kept free of
 * decorators so it is directly unit-testable (the plugin's vitest transform
 * preserves decorators, which Node cannot parse); the decorated runtime method
 * delegates here.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */
import type { Context } from "@deepseek-ai/cordis";
import type { CatalogResult, ModelCatalogGroup, PresetItem, PresetsResult, SkillItem, SkillsResult } from "./schemas.js";

/**
 * Grouped model catalog over every registered provider route (the same groups
 * the DSH model selector renders), plus the deployment's current default
 * selection when one is exposed. Providers whose catalog lookup fails are
 * dropped from the groups, never failing the request.
 */
export async function buildModelCatalog(ctx: Context): Promise<CatalogResult> {
	const groups: ModelCatalogGroup[] = [];
	const llm = ctx.get("llm");
	if (llm !== undefined && typeof llm.listProviders === "function") {
		for (const provider of llm.listProviders()) {
			try {
				const models = await llm.listModels(provider.id);
				groups.push({
					id: provider.id,
					name: provider.name,
					models: models.map((model) => ({
						id: model.id,
						name: model.name,
						...(model.description === undefined ? {} : { description: model.description }),
					})),
				});
			} catch {
				// One broken catalog lookup must not hide the sound groups.
			}
		}
	}
	const defaultModel = ctx.get("agentDefaultModel");
	const selection = defaultModel?.currentSelection();
	return {
		groups,
		default: selection === undefined ? null : { provider: selection.provider, model: selection.model },
	};
}

/**
 * Agent-preset catalog over the deployment's discovered presets (the same roster
 * the DSH preset picker renders), plus the deployment's current default preset
 * id when one is exposed. Broken presets are reported with their id only (the
 * picker shows the id as a fallback name); a discovery failure never fails the
 * request.
 */
export async function buildPresetCatalog(ctx: Context): Promise<PresetsResult> {
	const presetsService = ctx.get("agentPresets");
	if (presetsService === undefined || typeof presetsService.list !== "function") {
		return { presets: [], default: null };
	}
	const items: PresetItem[] = [];
	try {
		const roster = await presetsService.list();
		for (const preset of roster) {
			items.push({
				id: preset.id,
				name: preset.name ?? preset.id,
				...(preset.description === undefined ? {} : { description: preset.description }),
			});
		}
	} catch {
		// A broken discovery never fails the catalog request.
	}
	const defaultId =
		typeof presetsService.defaultId === "string" ? presetsService.defaultId : null;
	return { presets: items, default: defaultId };
}

/**
 * Agent-skill catalog over the deployment's discovered skills (the same roster
 * the DSH skill picker renders). A discovery failure never fails the request.
 */
export async function buildSkillCatalog(ctx: Context): Promise<SkillsResult> {
	const skillsService = ctx.get("skills");
	if (skillsService === undefined || typeof skillsService.list !== "function") {
		return { skills: [] };
	}
	const items: SkillItem[] = [];
	try {
		const roster = await skillsService.list();
		for (const skill of roster) {
			items.push({
				name: skill.name,
				description: skill.description ?? "",
			});
		}
	} catch {
		// A broken discovery never fails the catalog request.
	}
	return { skills: items };
}
