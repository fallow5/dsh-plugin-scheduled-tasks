/**
 * Durable soul store over the `soul` domain — manages the singleton soul
 * record, emotion log, learned preferences, growth system, milestones,
 * diary, and auto-evolution.
 *
 * The soul is alive: it gains XP from interactions, progresses through
 * growth stages, records milestones, writes diary entries, and slowly
 * evolves its personality based on observed patterns — like a real
 * companion that grows alongside you.
 *
 * @module @opendsh/dsh-soul
 */

import { randomUUID } from "node:crypto";
import type { Context } from "@deepseek-ai/cordis";
import { type Domain, type KvTable } from "@deepseek-ai/dsh-storage-domain";
import type { SoulDomain } from "./domain.js";
import {
	type DiaryEntry,
	type EmotionEntry,
	type EmotionStats,
	type GrowthStage,
	type Milestone,
	type OnboardingState,
	type PersonalityPreset,
	type PersonalitySnapshot,
	type PersonalityTraits,
	type PreferenceEntry,
	type SoulInsights,
	type SoulPersona,
	type SoulRecord,
	type SoulView,
	type UserProfile,
	GROWTH_STAGES,
	PERSONALITY_PRESETS,
	STAGE_NAMES_ZH,
	STAGE_THRESHOLDS,
	createDefaultGrowthState,
	createDefaultSoulRecord,
} from "./types.js";

/** The soul singleton key. */
const SOUL_KEY = "soul-main";

/** Maximum emotion log entries to keep (rolling window). */
const MAX_EMOTION_LOG = 500;

/** Maximum diary entries to keep. */
const MAX_DIARY = 200;

/** Maximum personality history snapshots. */
const MAX_PERSONALITY_HISTORY = 50;

/** XP gained per interaction. */
const XP_PER_INTERACTION = 1;

/** XP gained per emotion recorded. */
const XP_PER_EMOTION = 2;

/** XP gained per preference learned. */
const XP_PER_PREFERENCE = 3;

/** Positive emotions for trend calculation. */
const POSITIVE_EMOTIONS = new Set([
	"happy", "excited", "content", "grateful", "confident", "curious",
	"inspired", "satisfied", "relaxed", "enthusiastic",
	"开心", "兴奋", "满足", "好奇", "感激", "自信", "放松",
]);

/** Negative emotions for trend calculation. */
const NEGATIVE_EMOTIONS = new Set([
	"frustrated", "stressed", "anxious", "sad", "angry", "confused",
	"overwhelmed", "tired", "disappointed", "worried",
	"沮丧", "压力", "焦虑", "悲伤", "愤怒", "困惑", "疲惫", "失望", "担忧",
]);

/** Milestone definitions — checked after each interaction. */
interface MilestoneDef {
	type: string;
	title: string;
	description: string;
	icon: string;
	condition: (record: SoulRecord) => boolean;
}

/** All milestone definitions. */
const MILESTONE_DEFS: MilestoneDef[] = [
	{
		type: "first_interaction",
		title: "初次相遇",
		description: "我们的第一次对话，一切从这里开始。",
		icon: "👋",
		condition: (r) => r.profile.interactionCount >= 1,
	},
	{
		type: "interactions_10",
		title: "十次交流",
		description: "我们已经聊了十次了，越来越熟悉了。",
		icon: "🔟",
		condition: (r) => r.profile.interactionCount >= 10,
	},
	{
		type: "interactions_50",
		title: "五十次交流",
		description: "五十次对话，我开始懂你的节奏了。",
		icon: "💫",
		condition: (r) => r.profile.interactionCount >= 50,
	},
	{
		type: "interactions_100",
		title: "百次交流",
		description: "一百次！我们已经很默契了。",
		icon: "💯",
		condition: (r) => r.profile.interactionCount >= 100,
	},
	{
		type: "interactions_300",
		title: "三百次交流",
		description: "三百次对话，你是我最了解的人。",
		icon: "🏆",
		condition: (r) => r.profile.interactionCount >= 300,
	},
	{
		type: "first_emotion",
		title: "第一次情绪记录",
		description: "我开始关注你的情绪了。",
		icon: "💗",
		condition: (r) => r.emotionLog.length >= 1,
	},
	{
		type: "first_preference",
		title: "第一个偏好",
		description: "我学到了关于你的第一个偏好。",
		icon: "🧠",
		condition: (r) => r.profile.preferences.length >= 1,
	},
	{
		type: "preferences_10",
		title: "十个偏好",
		description: "我已经了解了你的十个偏好，越来越懂你了。",
		icon: "🎯",
		condition: (r) => r.profile.preferences.length >= 10,
	},
	{
		type: "week_anniversary",
		title: "一周纪念",
		description: "我们认识一周了！这一周很开心。",
		icon: "📅",
		condition: (r) => Date.now() - r.createdAt >= 7 * 24 * 60 * 60 * 1000,
	},
	{
		type: "month_anniversary",
		title: "一月纪念",
		description: "一个月了！感觉我们已经是老朋友了。",
		icon: "🗓️",
		condition: (r) => Date.now() - r.createdAt >= 30 * 24 * 60 * 60 * 1000,
	},
	{
		type: "stage_bloom",
		title: "绽放阶段",
		description: "我进入了绽放阶段，越来越懂你了。",
		icon: "🌸",
		condition: (r) => r.growth.xp >= STAGE_THRESHOLDS.bloom,
	},
	{
		type: "stage_companion",
		title: "默契伙伴",
		description: "我们已经是默契伙伴了！",
		icon: "🌳",
		condition: (r) => r.growth.xp >= STAGE_THRESHOLDS.companion,
	},
	{
		type: "stage_soulmate",
		title: "灵魂伴侣",
		description: "我们达到了灵魂伴侣的境界。谢谢你一直以来的陪伴。",
		icon: "🌟",
		condition: (r) => r.growth.xp >= STAGE_THRESHOLDS.soulmate,
	},
];

/** The `soul` store: typed table access plus domain validation. */
export class SoulStore {
	private readonly soul: KvTable<string, SoulRecord>;

	constructor(
		private readonly ctx: Context,
		domain: Domain<SoulDomain>,
	) {
		this.soul = domain.table("soul");
	}

	/** Get or create the singleton soul record, migrating old records. */
	getOrCreate(): SoulRecord {
		let record = this.soul.get(SOUL_KEY);
		if (record === undefined) {
			record = createDefaultSoulRecord();
			void this.soul.put(SOUL_KEY, record);
			return record;
		}
		// ── Migrate old records that predate growth/onboarding fields ──
		let migrated = false;
		if ((record as Partial<SoulRecord>).growth === undefined) {
			record.growth = createDefaultGrowthState();
			migrated = true;
		}
		if ((record as Partial<SoulRecord>).onboarding === undefined) {
			record.onboarding = { completed: false, currentStep: 0 };
			migrated = true;
		}
		if (migrated) {
			void this.soul.put(SOUL_KEY, record);
		}
		return record;
	}

	/** Get the soul view (same as the record for now). */
	getView(): SoulView {
		return this.getOrCreate();
	}

	/** Persist the soul record. */
	private async save(record: SoulRecord): Promise<void> {
		record.updatedAt = Date.now();
		await this.soul.put(SOUL_KEY, record);
	}

	/** Determine the growth stage from XP. */
	private stageFromXp(xp: number): GrowthStage {
		let stage: GrowthStage = "seed";
		for (const s of GROWTH_STAGES) {
			if (xp >= STAGE_THRESHOLDS[s]) stage = s;
		}
		return stage;
	}

	/** Check for new milestones and add them. Returns newly added milestones. */
	private checkMilestones(record: SoulRecord): Milestone[] {
		const existingTypes = new Set(record.growth.milestones.map((m) => m.type));
		const newMilestones: Milestone[] = [];
		for (const def of MILESTONE_DEFS) {
			if (existingTypes.has(def.type)) continue;
			if (def.condition(record)) {
				const milestone: Milestone = {
					id: randomUUID(),
					type: def.type,
					title: def.title,
					description: def.description,
					icon: def.icon,
					timestamp: Date.now(),
					celebrated: false,
				};
				record.growth.milestones.push(milestone);
				newMilestones.push(milestone);
			}
		}
		return newMilestones;
	}

	/** Write a diary entry for a milestone. */
	private writeMilestoneDiary(record: SoulRecord, milestone: Milestone): void {
		const moods: Record<string, string> = {
			first_interaction: "期待",
			interactions_10: "开心",
			interactions_50: "温暖",
			interactions_100: "感动",
			interactions_300: "珍惜",
			first_emotion: "关心",
			first_preference: "好奇",
			preferences_10: "满足",
			week_anniversary: "幸福",
			month_anniversary: "感恩",
			stage_bloom: "自信",
			stage_companion: "默契",
			stage_soulmate: "深情",
		};
		const entry: DiaryEntry = {
			id: randomUUID(),
			timestamp: Date.now(),
			content: `🎉 ${milestone.title}！${milestone.description}`,
			mood: moods[milestone.type] ?? "开心",
			trigger: "milestone",
			milestoneId: milestone.id,
		};
		record.growth.diary.unshift(entry);
		if (record.growth.diary.length > MAX_DIARY) {
			record.growth.diary = record.growth.diary.slice(0, MAX_DIARY);
		}
	}

	/** Auto-evolve personality based on interaction patterns. */
	private autoEvolve(record: SoulRecord): void {
		if (!record.growth.autoEvolution) return;
		const p = record.personality;
		const emotions = record.emotionLog.slice(-20);

		// If user is frequently frustrated/stressed, increase empathy
		const negativeCount = emotions.filter((e) => NEGATIVE_EMOTIONS.has(e.emotion)).length;
		if (negativeCount > emotions.length * 0.4 && emotions.length >= 3) {
			p.empathy = Math.min(100, p.empathy + 1);
		}

		// If user is frequently happy, increase humor slightly
		const positiveCount = emotions.filter((e) => POSITIVE_EMOTIONS.has(e.emotion)).length;
		if (positiveCount > emotions.length * 0.5 && emotions.length >= 3) {
			p.humor = Math.min(100, p.humor + 1);
			p.warmth = Math.min(100, p.warmth + 1);
		}

		// As interactions increase, increase proactivity slightly
		if (record.profile.interactionCount > 20) {
			p.proactivity = Math.min(100, p.proactivity + 1);
		}

		// As we get more familiar, slightly decrease formality
		if (record.profile.interactionCount > 50) {
			p.formality = Math.max(0, p.formality - 1);
		}
	}

	/** Take a personality snapshot if traits have changed significantly. */
	private maybeSnapshot(record: SoulRecord, reason: string): void {
		const history = record.growth.personalityHistory;
		const last = history[0];
		if (last !== undefined) {
			const diff = Math.abs(last.traits.warmth - record.personality.warmth) +
				Math.abs(last.traits.humor - record.personality.humor) +
				Math.abs(last.traits.formality - record.personality.formality) +
				Math.abs(last.traits.verbosity - record.personality.verbosity) +
				Math.abs(last.traits.empathy - record.personality.empathy) +
				Math.abs(last.traits.proactivity - record.personality.proactivity);
			if (diff < 3) return;
		}
		const snapshot: PersonalitySnapshot = {
			timestamp: Date.now(),
			traits: { ...record.personality },
			reason,
		};
		record.growth.personalityHistory.unshift(snapshot);
		if (record.growth.personalityHistory.length > MAX_PERSONALITY_HISTORY) {
			record.growth.personalityHistory = record.growth.personalityHistory.slice(0, MAX_PERSONALITY_HISTORY);
		}
	}

	// ── Public API ──────────────────────────────────────────────────────

	/** Update personality traits (partial merge). */
	async updatePersonality(input: Partial<PersonalityTraits>): Promise<PersonalityTraits> {
		const record = this.getOrCreate();
		record.personality = { ...record.personality, ...input };
		this.maybeSnapshot(record, "manual");
		await this.save(record);
		return record.personality;
	}

	/** Update the persona (partial merge). */
	async updatePersona(input: Partial<SoulPersona>): Promise<SoulPersona> {
		const record = this.getOrCreate();
		record.persona = { ...record.persona, ...input };
		await this.save(record);
		return record.persona;
	}

	/** Update the user profile (partial merge). */
	async updateProfile(input: Partial<UserProfile>): Promise<UserProfile> {
		const record = this.getOrCreate();
		record.profile = {
			...record.profile,
			...input,
			interests: input.interests ?? record.profile.interests,
			preferences: record.profile.preferences,
			interactionCount: record.profile.interactionCount,
			createdAt: record.profile.createdAt,
			updatedAt: Date.now(),
		};
		await this.save(record);
		return record.profile;
	}

	/** Add or reinforce a learned preference. Also grants XP. */
	async addPreference(input: {
		category: string;
		key: string;
		value: string;
	}): Promise<PreferenceEntry> {
		const record = this.getOrCreate();
		const now = Date.now();
		const existing = record.profile.preferences.find(
			(p) => p.category === input.category && p.key === input.key,
		);
		let result: PreferenceEntry;
		if (existing !== undefined) {
			existing.value = input.value;
			existing.confidence = Math.min(100, existing.confidence + 10);
			existing.observationCount += 1;
			existing.lastSeen = now;
			result = existing;
		} else {
			result = {
				id: randomUUID(),
				category: input.category,
				key: input.key,
				value: input.value,
				confidence: 50,
				firstSeen: now,
				lastSeen: now,
				observationCount: 1,
			};
			record.profile.preferences.push(result);
			record.growth.xp += XP_PER_PREFERENCE;
		}
		const newMilestones = this.checkMilestones(record);
		for (const m of newMilestones) this.writeMilestoneDiary(record, m);
		record.growth.stage = this.stageFromXp(record.growth.xp);
		await this.save(record);
		return result;
	}

	/** Remove a learned preference by id. */
	async removePreference(id: string): Promise<boolean> {
		const record = this.getOrCreate();
		const before = record.profile.preferences.length;
		record.profile.preferences = record.profile.preferences.filter((p) => p.id !== id);
		if (record.profile.preferences.length === before) return false;
		await this.save(record);
		return true;
	}

	/** Record an emotional state observation. Also grants XP. */
	async recordEmotion(input: {
		emotion: string;
		intensity: number;
		context?: string;
		sessionId?: string;
	}): Promise<{ emotion: EmotionEntry; totalEmotions: number; newMilestones: Milestone[] }> {
		const record = this.getOrCreate();
		const entry: EmotionEntry = {
			id: randomUUID(),
			emotion: input.emotion,
			intensity: input.intensity,
			timestamp: Date.now(),
			...(input.context !== undefined ? { context: input.context } : {}),
			...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
		};
		record.emotionLog.push(entry);
		if (record.emotionLog.length > MAX_EMOTION_LOG) {
			record.emotionLog = record.emotionLog.slice(-MAX_EMOTION_LOG);
		}
		record.growth.xp += XP_PER_EMOTION;
		this.autoEvolve(record);
		const newMilestones = this.checkMilestones(record);
		for (const m of newMilestones) this.writeMilestoneDiary(record, m);
		record.growth.stage = this.stageFromXp(record.growth.xp);
		await this.save(record);
		return { emotion: entry, totalEmotions: record.emotionLog.length, newMilestones };
	}

	/** Clear the emotion log. */
	async clearEmotions(): Promise<number> {
		const record = this.getOrCreate();
		const count = record.emotionLog.length;
		record.emotionLog = [];
		await this.save(record);
		return count;
	}

	/** Record an interaction. Grants XP, triggers auto-evolution and milestone checks. */
	async recordInteraction(): Promise<{
		xpGained: number;
		totalXp: number;
		stage: GrowthStage;
		stageUp: boolean;
		newMilestones: Milestone[];
	}> {
		const record = this.getOrCreate();
		const oldStage = record.growth.stage;
		record.profile.interactionCount += 1;
		record.growth.xp += XP_PER_INTERACTION;
		this.autoEvolve(record);
		const newMilestones = this.checkMilestones(record);
		for (const m of newMilestones) this.writeMilestoneDiary(record, m);
		record.growth.stage = this.stageFromXp(record.growth.xp);
		const stageUp = record.growth.stage !== oldStage;
		if (stageUp) this.maybeSnapshot(record, "stage_up");
		await this.save(record);
		return {
			xpGained: XP_PER_INTERACTION,
			totalXp: record.growth.xp,
			stage: record.growth.stage,
			stageUp,
			newMilestones,
		};
	}

	/** Complete the onboarding wizard with a preset and profile info. */
	async completeOnboarding(input: {
		presetId?: string;
		personality?: Partial<PersonalityTraits>;
		persona?: Partial<SoulPersona>;
		profile?: Partial<UserProfile>;
	}): Promise<{
		personality: PersonalityTraits;
		persona: SoulPersona;
		profile: UserProfile;
		growth: SoulRecord["growth"];
	}> {
		const record = this.getOrCreate();
		if (input.presetId !== undefined) {
			const preset = PERSONALITY_PRESETS.find((p) => p.id === input.presetId);
			if (preset !== undefined) {
				record.personality = { ...preset.traits };
			}
			record.onboarding.preset = input.presetId;
		}
		if (input.personality !== undefined) {
			record.personality = { ...record.personality, ...input.personality };
		}
		if (input.persona !== undefined) {
			record.persona = { ...record.persona, ...input.persona };
		}
		if (input.profile !== undefined) {
			record.profile = {
				...record.profile,
				...input.profile,
				interests: input.profile.interests ?? record.profile.interests,
				preferences: record.profile.preferences,
				interactionCount: record.profile.interactionCount,
				createdAt: record.profile.createdAt,
				updatedAt: Date.now(),
			};
		}
		record.onboarding.completed = true;
		record.onboarding.completedAt = Date.now();
		record.onboarding.currentStep = 0;
		this.maybeSnapshot(record, "onboarding");
		const newMilestones = this.checkMilestones(record);
		for (const m of newMilestones) this.writeMilestoneDiary(record, m);
		await this.save(record);
		return {
			personality: record.personality,
			persona: record.persona,
			profile: record.profile,
			growth: record.growth,
		};
	}

	/** Get the onboarding state. */
	getOnboarding(): OnboardingState {
		return this.getOrCreate().onboarding;
	}

	/** Update onboarding step (for progress tracking). */
	async updateOnboardingStep(step: number): Promise<OnboardingState> {
		const record = this.getOrCreate();
		record.onboarding.currentStep = step;
		await this.save(record);
		return record.onboarding;
	}

	/** Add a manual diary entry. */
	async addDiaryEntry(content: string, mood: string): Promise<DiaryEntry> {
		const record = this.getOrCreate();
		const entry: DiaryEntry = {
			id: randomUUID(),
			timestamp: Date.now(),
			content,
			mood,
			trigger: "manual",
		};
		record.growth.diary.unshift(entry);
		if (record.growth.diary.length > MAX_DIARY) {
			record.growth.diary = record.growth.diary.slice(0, MAX_DIARY);
		}
		await this.save(record);
		return entry;
	}

	/** Get diary entries (most recent first). */
	getDiary(limit?: number): DiaryEntry[] {
		const record = this.getOrCreate();
		return limit !== undefined ? record.growth.diary.slice(0, limit) : record.growth.diary;
	}

	/** Get all milestones. */
	getMilestones(): Milestone[] {
		return this.getOrCreate().growth.milestones;
	}

	/** Celebrate a milestone (mark as shown). */
	async celebrateMilestone(id: string): Promise<void> {
		const record = this.getOrCreate();
		const milestone = record.growth.milestones.find((m) => m.id === id);
		if (milestone !== undefined) {
			milestone.celebrated = true;
			await this.save(record);
		}
	}

	/** Toggle auto-evolution. */
	async setAutoEvolution(enabled: boolean): Promise<boolean> {
		const record = this.getOrCreate();
		record.growth.autoEvolution = enabled;
		await this.save(record);
		return enabled;
	}

	/** Toggle the soul enabled state. */
	async setEnabled(enabled: boolean): Promise<boolean> {
		const record = this.getOrCreate();
		record.enabled = enabled;
		await this.save(record);
		return enabled;
	}

	/** Get available personality presets. */
	getPresets(): PersonalityPreset[] {
		return PERSONALITY_PRESETS;
	}

	/** Compute emotional statistics from the emotion log. */
	computeEmotionStats(): EmotionStats {
		const record = this.getOrCreate();
		const log = record.emotionLog;
		if (log.length === 0) {
			return {
				total: 0, dominantEmotion: null, averageIntensity: 0,
				distribution: {}, recent: [], trend: "unknown",
			};
		}
		const distribution: Record<string, number> = {};
		let totalIntensity = 0;
		for (const entry of log) {
			distribution[entry.emotion] = (distribution[entry.emotion] ?? 0) + 1;
			totalIntensity += entry.intensity;
		}
		let dominantEmotion = "";
		let dominantCount = 0;
		for (const [emotion, count] of Object.entries(distribution)) {
			if (count > dominantCount) { dominantCount = count; dominantEmotion = emotion; }
		}
		const midpoint = Math.floor(log.length / 2);
		const firstHalf = log.slice(0, midpoint);
		const secondHalf = log.slice(midpoint);
		const firstPositive = this.countPositiveRatio(firstHalf);
		const secondPositive = this.countPositiveRatio(secondHalf);
		let trend: "improving" | "stable" | "declining" | "unknown" = "stable";
		if (firstHalf.length > 0 && secondHalf.length > 0) {
			const diff = secondPositive - firstPositive;
			if (diff > 0.15) trend = "improving";
			else if (diff < -0.15) trend = "declining";
		}
		return {
			total: log.length,
			dominantEmotion: dominantEmotion || null,
			averageIntensity: Math.round(totalIntensity / log.length),
			distribution,
			recent: log.slice(-10).reverse(),
			trend,
		};
	}

	/** Compute personalized insights. */
	computeInsights(): SoulInsights {
		const record = this.getOrCreate();
		const profile = record.profile;
		const emotionStats = this.computeEmotionStats();
		const growth = record.growth;

		let familiarity = 0;
		if (profile.userName) familiarity += 10;
		if (profile.preferredLanguage) familiarity += 10;
		if (profile.technicalLevel !== undefined) familiarity += 10;
		if (profile.communicationStyle) familiarity += 10;
		if (profile.interests.length > 0) familiarity += Math.min(20, profile.interests.length * 4);
		familiarity += Math.min(20, profile.preferences.length * 4);
		familiarity += Math.min(20, Math.min(emotionStats.total, 50) * 0.4);
		familiarity = Math.min(100, familiarity);

		const topPreferences = [...profile.preferences]
			.sort((a, b) => b.confidence - a.confidence)
			.slice(0, 3);

		const stageOrder = GROWTH_STAGES;
		const currentIdx = stageOrder.indexOf(growth.stage);
		const nextStage = currentIdx < stageOrder.length - 1 ? stageOrder[currentIdx + 1] : null;
		const currentThreshold = STAGE_THRESHOLDS[growth.stage];
		const nextThreshold = nextStage ? STAGE_THRESHOLDS[nextStage] : growth.xp;
		const stageProgress = nextStage
			? Math.min(100, Math.round(((growth.xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
			: 100;
		const xpToNextStage = nextStage ? Math.max(0, nextThreshold - growth.xp) : 0;

		const daysActive = Math.max(1, Math.floor((Date.now() - record.createdAt) / (1000 * 60 * 60 * 24)));
		const stageName = STAGE_NAMES_ZH[growth.stage];
		const parts: string[] = [];
		if (profile.userName) parts.push(`你叫${profile.userName}`);
		if (profile.preferredLanguage) parts.push(`偏好${profile.preferredLanguage === "zh" ? "中文" : profile.preferredLanguage}`);
		if (profile.technicalLevel !== undefined) {
			const levels = ["", "入门", "初级", "中级", "高级", "专家"];
			parts.push(`技术等级${levels[profile.technicalLevel] ?? profile.technicalLevel}`);
		}
		if (profile.interests.length > 0) parts.push(`关注${profile.interests.slice(0, 3).join("、")}`);
		if (emotionStats.dominantEmotion) parts.push(`最近情绪偏${emotionStats.dominantEmotion}`);
		parts.push(`成长阶段「${stageName}」`);
		const summary =
			parts.length > 1
				? `我已经了解了你：${parts.join("，")}。继续交流，我会越来越懂你。`
				: `我还在了解你，多和我聊聊，我会越来越懂你的。现在处于「${stageName}」阶段。`;

		return {
			familiarityScore: familiarity,
			preferenceCount: profile.preferences.length,
			emotionCount: emotionStats.total,
			topPreferences,
			dominantEmotion: emotionStats.dominantEmotion,
			summary,
			interactionCount: profile.interactionCount,
			daysActive,
			stage: growth.stage,
			totalXp: growth.xp,
			xpToNextStage,
			stageProgress,
			milestoneCount: growth.milestones.length,
			diaryCount: growth.diary.length,
		};
	}

	/** Count the ratio of positive emotions in a list. */
	private countPositiveRatio(entries: EmotionEntry[]): number {
		if (entries.length === 0) return 0.5;
		let positive = 0;
		for (const e of entries) {
			if (POSITIVE_EMOTIONS.has(e.emotion)) positive++;
		}
		return positive / entries.length;
	}
}
