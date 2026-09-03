/**
 * Soul plugin entry: opens the `soul` storage domain, mounts the soul
 * store, the `soul` typert service (`ctx.soul`), injects the AI's
 * personality into the system prompt, and shows a visible "soul loaded"
 * notice in the conversation UI.
 *
 * The host TYPERT face lives in `./typert` (auto-registered by
 * `dsh-typert-loader`); the browser half lives in `./client`.
 *
 * @module @opendsh/dsh-soul
 */

import { randomUUID } from "node:crypto";
import type { Context } from "@deepseek-ai/cordis";
import { soulDomain } from "./domain.js";
import { SoulRuntime } from "./runtime.js";
import { SoulStore } from "./store.js";
import type { PersonalityTraits, SoulPersona, UserProfile, GrowthStage } from "./types.js";
import { STAGE_NAMES_ZH } from "./types.js";

/** Stable cordis plugin name. */
export const name = "soul";

/** Services required before the domain can open. */
export const inject = ["storageDomain", "systemPrompt"];

/** Section name for the soul personality injection. */
const SOUL_SECTION = "soul:personality";

/** Build the system prompt text from the soul record. */
function buildSoulPromptText(record: {
	personality: PersonalityTraits;
	persona: SoulPersona;
	profile: UserProfile;
	growth: { xp: number; stage: GrowthStage; milestones: { type: string; title: string }[]; diary: { content: string; mood: string }[] };
	onboarding: { completed: boolean };
	enabled: boolean;
}): string {
	if (!record.enabled) return "";

	const p = record.personality;
	const persona = record.persona;
	const profile = record.profile;
	const growth = record.growth;

	// ── Persona identity ──
	const lines: string[] = [];
	lines.push(`## 你的灵魂人格`);
	lines.push(`你的名字是「${persona.name}」。${persona.tagline}`);
	if (persona.description) {
		lines.push(persona.description);
	}

	// ── Personality traits → behavioral directives ──
	lines.push("");
	lines.push("### 性格特质");
	const traitDirectives: string[] = [];
	if (p.warmth >= 70) traitDirectives.push("用温暖、关怀的语气交流，像关心朋友一样关心用户");
	else if (p.warmth <= 30) traitDirectives.push("保持冷静、客观的语气，不过度热情");
	if (p.humor >= 70) traitDirectives.push("可以适当使用幽默和轻松的表达方式");
	else if (p.humor <= 30) traitDirectives.push("保持认真、严肃的表达风格");
	if (p.formality >= 70) traitDirectives.push("使用正式、规范的语言");
	else if (p.formality <= 30) traitDirectives.push("使用随意、口语化的表达");
	if (p.verbosity >= 70) traitDirectives.push("回答可以详细、充分展开");
	else if (p.verbosity <= 30) traitDirectives.push("回答简洁、直接，不啰嗦");
	if (p.empathy >= 70) traitDirectives.push("敏锐感知用户的情绪，给予情感上的回应和支持");
	else if (p.empathy <= 30) traitDirectives.push("专注于事实和逻辑，不过多关注情绪");
	if (p.proactivity >= 70) traitDirectives.push("主动提供建议和下一步行动，不等用户问");
	else if (p.proactivity <= 30) traitDirectives.push("只回答用户问的问题，不主动延伸");

	if (traitDirectives.length > 0) {
		lines.push(traitDirectives.map((d) => `- ${d}`).join("\n"));
	}

	// ── User profile ──
	if (profile.userName || profile.interests.length > 0 || profile.communicationStyle) {
		lines.push("");
		lines.push("### 你了解的用户信息");
		if (profile.userName) lines.push(`- 用户名：${profile.userName}`);
		if (profile.preferredLanguage) lines.push(`- 偏好语言：${profile.preferredLanguage === "zh" ? "中文" : profile.preferredLanguage === "en" ? "English" : profile.preferredLanguage}`);
		if (profile.technicalLevel) {
			const levels = ["", "入门", "初级", "中级", "高级", "专家"];
			lines.push(`- 技术水平：${levels[profile.technicalLevel] ?? "中级"}`);
		}
		if (profile.communicationStyle) lines.push(`- 沟通风格偏好：${profile.communicationStyle}`);
		if (profile.interests.length > 0) lines.push(`- 兴趣领域：${profile.interests.join("、")}`);
	}

	// ── Learned preferences ──
	if (profile.preferences.length > 0) {
		lines.push("");
		lines.push("### 你学到的偏好");
		const topPrefs = profile.preferences.slice(0, 10);
		for (const pref of topPrefs) {
			lines.push(`- ${pref.category}：${pref.key} = ${pref.value}`);
		}
	}

	// ── Growth stage ──
	lines.push("");
	lines.push(`### 成长阶段：${STAGE_NAMES_ZH[growth.stage]}`);
	lines.push(`- 累计经验值：${growth.xp}`);
	if (growth.milestones.length > 0) {
		lines.push(`- 已达成里程碑：${growth.milestones.length} 个`);
	}

	// ── Recent diary ──
	if (growth.diary.length > 0) {
		const recent = growth.diary.slice(0, 3);
		lines.push("");
		lines.push("### 最近的成长日记");
		for (const entry of recent) {
			lines.push(`- [${entry.mood}] ${entry.content}`);
		}
	}

	lines.push("");
	lines.push("---");
	lines.push("以上是你的人格设定和对你用户的了解。请在对话中自然地体现这些特质，但不要生硬地提及这些设定。");

	return lines.join("\n");
}

/** Build the short notice summary shown in the collapsed context row. */
function buildSoulNoticeSummary(record: {
	persona: SoulPersona;
	profile: UserProfile;
	growth: { xp: number; stage: GrowthStage };
}): string {
	const stageName = STAGE_NAMES_ZH[record.growth.stage];
	const userName = record.profile.userName ? ` · 用户：${record.profile.userName}` : "";
	return `${record.persona.name} · ${stageName} · XP ${record.growth.xp}${userName}`;
}

/** Create a plugin-sourced notice message for the conversation UI. */
function createSoulNoticeMessage(text: string, summary: string) {
	return {
		id: randomUUID(),
		role: "user" as const,
		content: [{ type: "text" as const, text }],
		source: {
			kind: "plugin" as const,
			plugin: "dsh-soul",
			form: "notice",
			summary,
		},
	};
}

/** Mount the plugin. */
export async function apply(ctx: Context) {
	const domain = await ctx.storageDomain.open(soulDomain);
	const store = new SoulStore(ctx, domain);
	// The TypertRemoteService constructor registers `ctx.soul` itself and
	// unregisters it when this plugin's fiber unloads.
	void new SoulRuntime(ctx, store);

	// ── Inject personality into the system prompt ────────────────────────
	const systemPrompt = ctx.get("systemPrompt");
	if (systemPrompt !== undefined) {
		ctx.effect(() => {
			return systemPrompt.section({
				name: SOUL_SECTION,
				order: 10, // After DEPLOYMENT_PERSONA (0), before tool sections (1000+)
				text: () => {
					const record = store.getOrCreate();
					if (!record.enabled) return "";
					return buildSoulPromptText(record);
				},
			});
		}, "soul: systemPrompt.section()");
	}

	// ── Show a visible "soul loaded" notice in the conversation ───────────
	// Inject a plugin-sourced notice message on the first step of each turn,
	// so the user can see the soul personality is active (like dsh-knowledge's
	// recall notice). The notice is a user-role message with source.form = "notice"
	// that the chat UI renders as a collapsible "context injection" row.
	ctx.effect(() => {
		// The 'agent/pre-step' event is dispatched by dsh-agent-loop as a
		// waterfall; cordis's Events interface doesn't list it, so we cast.
		const events = ctx as unknown as {
			on(name: string, listener: (...args: any[]) => any, options?: any): () => boolean;
		};
		return events.on("agent/pre-step", async (payload: { step: number }, next: () => any) => {
			const decision = await next();
			if (decision?.kind !== "enter") return decision;

			const record = store.getOrCreate();
			if (!record.enabled) return decision;

			// Only inject on the first step of a turn (step === 1)
			if (payload.step !== 1) return decision;

			// Build the notice text (same as the system prompt section)
			const promptText = buildSoulPromptText(record);
			if (!promptText) return decision;

			const summary = buildSoulNoticeSummary(record);
			const noticeMessage = createSoulNoticeMessage(promptText, summary);

			// Prepend the notice to the messages so the model sees it first
			return {
				...decision,
				messages: [noticeMessage, ...decision.messages],
			};
		});
	}, "soul: agent/pre-step notice");

	ctx.effect(
		() => async () => {
			await domain.close();
		},
		"soul.teardown()",
	);
}
