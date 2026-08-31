/**
 * Grouped model-catalog builder for the `tasks/catalog` endpoint. Kept free of
 * decorators so it is directly unit-testable (the plugin's vitest transform
 * preserves decorators, which Node cannot parse); the decorated runtime method
 * delegates here.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */
import type { Context } from "@deepseek-ai/cordis";
import type { CatalogResult, ExpertItem, ExpertsResult, ModelCatalogGroup, SkillItem, SkillsResult } from "./schemas.js";

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

/** All standard Agency divisions (mirrors the agency-agents DEFAULT_DIVISIONS). */
const AGENCY_DIVISIONS = [
	"academic",
	"design",
	"engineering",
	"finance",
	"game-development",
	"gis",
	"healthcare",
	"marketing",
	"paid-media",
	"product",
	"project-management",
	"sales",
	"security",
	"spatial-computing",
	"specialized",
	"support",
	"testing",
] as const;

/**
 * Expert catalog over the deployment's enabled agency-agents experts. Reads
 * the `agencyAgents` service's `getEnabled()` to find which expert slugs are
 * enabled, then dynamically imports `loadCatalog` from
 * `@michengai/dsh-agency-agents` to map slugs to names/divisions. When the
 * plugin is not installed or the catalog fails to load, the request degrades
 * to returning just the enabled slugs (with the slug as the display name).
 */
export async function buildExpertCatalog(ctx: Context): Promise<ExpertsResult> {
	const agencyAgents = (ctx as unknown as { get?: (key: string) => unknown }).get?.("agencyAgents");
	if (agencyAgents === undefined || typeof (agencyAgents as { getEnabled?: unknown }).getEnabled !== "function") {
		return { experts: [] };
	}
	const items: ExpertItem[] = [];
	try {
		const state = (agencyAgents as { getEnabled(): { enabled: string[]; revision: number } }).getEnabled();
		// Try to load the full roster from the agency-agents package for rich
		// display (name, division, description). Fall back to slug-only when the
		// package is not installed or the catalog cannot be loaded.
		let roster: Map<string, { slug: string; name: string; division: string; description: string }> | undefined;
		try {
			// Dynamic import via a variable so the bundler/typechecker does not try
			// to resolve the optional peer dependency at build time.
			const specifier = "@michengai/dsh-agency-agents";
			const mod = (await import(/* @vite-ignore */ specifier)) as {
				loadCatalog?: (root: string, divisions: readonly string[]) => Promise<
					Map<string, { slug: string; name: string; nameEn: string; division: string; description: string; descriptionEn: string; persona: string }>
				>;
				resolveCatalogRoot?: (root: string) => string;
			};
			if (typeof mod.loadCatalog === "function" && typeof mod.resolveCatalogRoot === "function") {
				const root = mod.resolveCatalogRoot("");
				const catalog = await mod.loadCatalog(root, AGENCY_DIVISIONS);
				roster = new Map();
				for (const [slug, expert] of catalog) {
					roster.set(slug, { slug, name: expert.name, division: expert.division, description: expert.description });
				}
			}
		} catch {
			// Package not installed or catalog load failed — degrade to slug-only.
		}
		if (roster !== undefined) {
			for (const slug of state.enabled) {
				const expert = roster.get(slug);
				if (expert === undefined) continue;
				items.push({
					slug: expert.slug,
					name: expert.name,
					division: expert.division,
					description: expert.description,
				});
			}
			items.sort((a, b) => a.division.localeCompare(b.division) || a.slug.localeCompare(b.slug));
		} else {
			// Fallback: return enabled slugs with the slug as the display name.
			for (const slug of state.enabled) {
				items.push({ slug, name: slug, division: "", description: "" });
			}
		}
	} catch {
		// A broken discovery never fails the catalog request.
	}
	return { experts: items };
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
