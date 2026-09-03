/**
 * Durable domain model for the soul plugin — the AI's personality,
 * emotional memory, learned user profile, and dynamic growth system.
 *
 * The soul is not static: it grows with the user, records milestones,
 * writes a diary, and evolves its personality over time — like a real
 * companion that gets to know you better the more you interact.
 *
 * @module @opendsh/dsh-soul
 */
import { z } from "zod";

// ── Personality traits (the AI's "soul") ─────────────────────────────────

/** How warm vs. neutral the AI's tone is (0 = clinical, 100 = very warm). */
export const warmthTraitSchema = z.number().int().min(0).max(100);
/** How much humor the AI uses (0 = serious, 100 = playful). */
export const humorTraitSchema = z.number().int().min(0).max(100);
/** How formal vs. casual the AI's language is (0 = formal, 100 = casual). */
export const formalityTraitSchema = z.number().int().min(0).max(100);
/** How verbose the AI is (0 = terse, 100 = thorough). */
export const verbosityTraitSchema = z.number().int().min(0).max(100);
/** How empathetic the AI is to the user's emotional state (0 = task-focused, 100 = deeply empathetic). */
export const empathyTraitSchema = z.number().int().min(0).max(100);
/** How proactive the AI is in offering suggestions (0 = reactive, 100 = proactive). */
export const proactivityTraitSchema = z.number().int().min(0).max(100);

/** The six core personality traits that define the AI's "soul". */
export const personalityTraitsSchema = z.object({
	warmth: warmthTraitSchema,
	humor: humorTraitSchema,
	formality: formalityTraitSchema,
	verbosity: verbosityTraitSchema,
	empathy: empathyTraitSchema,
	proactivity: proactivityTraitSchema,
});
export type PersonalityTraits = z.infer<typeof personalityTraitsSchema>;

/** Default personality traits — a balanced, warm, helpful companion. */
export const DEFAULT_PERSONALITY_TRAITS: PersonalityTraits = {
	warmth: 70,
	humor: 40,
	formality: 35,
	verbosity: 55,
	empathy: 75,
	proactivity: 60,
};

/** One personality trait snapshot — used to track evolution over time. */
export const personalitySnapshotSchema = z.object({
	/** When this snapshot was taken. */
	timestamp: z.number().int().min(0),
	/** The traits at this point in time. */
	traits: personalityTraitsSchema,
	/** What triggered this change ("auto_evolution", "manual", "onboarding", "milestone"). */
	reason: z.string().max(50),
});
export type PersonalitySnapshot = z.infer<typeof personalitySnapshotSchema>;

// ── Soul persona ──────────────────────────────────────────────────────────

/** The AI's persona — a name, tagline, and description that give it a soul. */
export const soulPersonaSchema = z.object({
	/** A display name for the AI persona. */
	name: z.string().min(1).max(50),
	/** A short tagline / motto. */
	tagline: z.string().min(1).max(200),
	/** A longer description of the persona. */
	description: z.string().min(1).max(2000),
	/** An emoji or symbol that represents the persona. */
	avatar: z.string().min(1).max(10),
});
export type SoulPersona = z.infer<typeof soulPersonaSchema>;

/** Default persona. */
export const DEFAULT_PERSONA: SoulPersona = {
	name: "小D",
	tagline: "你的AI伙伴，越懂你，越贴心",
	description:
		"我是一个有温度的AI伙伴。我关心你的感受，记住你的偏好，在你需要的时候给出最贴心的回应。我不是冷冰冰的工具，我是懂你的朋友。",
	avatar: "🌙",
};

// ── User profile (what the AI has learned about the user) ────────────────

/** One learned preference entry. */
export const preferenceEntrySchema = z.object({
	/** Stable unique id. */
	id: z.string(),
	/** Category of the preference (e.g. "language", "coding_style", "workflow"). */
	category: z.string().min(1).max(50),
	/** The preference key (e.g. "preferred_language"). */
	key: z.string().min(1).max(100),
	/** The preference value (e.g. "TypeScript"). */
	value: z.string().min(1).max(500),
	/** How confident the AI is about this preference (0-100). */
	confidence: z.number().int().min(0).max(100),
	/** When this preference was first observed. */
	firstSeen: z.number().int().min(0),
	/** When this preference was last confirmed. */
	lastSeen: z.number().int().min(0),
	/** How many times this preference has been observed. */
	observationCount: z.number().int().min(1),
});
export type PreferenceEntry = z.infer<typeof preferenceEntrySchema>;

/** One emotional state observation. */
export const emotionEntrySchema = z.object({
	/** Stable unique id. */
	id: z.string(),
	/** The detected emotion (e.g. "happy", "frustrated", "curious", "stressed"). */
	emotion: z.string().min(1).max(50),
	/** Intensity 0-100. */
	intensity: z.number().int().min(0).max(100),
	/** When this was observed (epoch ms). */
	timestamp: z.number().int().min(0),
	/** Optional context note (what triggered the emotion). */
	context: z.string().max(500).optional(),
	/** The session this was observed in. */
	sessionId: z.string().optional(),
});
export type EmotionEntry = z.infer<typeof emotionEntrySchema>;

/** The user profile — everything the AI has learned about the user. */
export const userProfileSchema = z.object({
	/** The user's preferred name (if known). */
	userName: z.string().max(100).optional(),
	/** The user's preferred language (e.g. "zh", "en"). */
	preferredLanguage: z.string().max(20).optional(),
	/** The user's technical level (1 = beginner, 5 = expert). */
	technicalLevel: z.number().int().min(1).max(5).optional(),
	/** Communication style preferences. */
	communicationStyle: z.string().max(500).optional(),
	/** Common topics / interests. */
	interests: z.array(z.string().max(100)).max(50),
	/** Learned preferences. */
	preferences: z.array(preferenceEntrySchema),
	/** Total interactions observed. */
	interactionCount: z.number().int().min(0),
	/** When the profile was first created. */
	createdAt: z.number().int().min(0),
	/** When the profile was last updated. */
	updatedAt: z.number().int().min(0),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

/** Default empty user profile. */
export const DEFAULT_USER_PROFILE: UserProfile = {
	interests: [],
	preferences: [],
	interactionCount: 0,
	createdAt: 0,
	updatedAt: 0,
};

// ── Growth system: the soul grows with the user ──────────────────────────

/**
 * Growth stages — like life stages of a relationship.
 * The soul progresses through these as the user interacts more.
 */
export const GROWTH_STAGES = [
	"seed",      // 0-9 interactions: 刚刚萌芽
	"sprout",    // 10-49: 开始了解
	"bud",       // 50-99: 逐渐熟悉
	"bloom",     // 100-299: 越来越懂
	"companion", // 300-599: 默契伙伴
	"soulmate",  // 600+: 灵魂伴侣
] as const;
export type GrowthStage = (typeof GROWTH_STAGES)[number];

/** Human-readable stage names (zh). */
export const STAGE_NAMES_ZH: Record<GrowthStage, string> = {
	seed: "萌芽",
	sprout: "初识",
	bud: "熟悉",
	bloom: "相知",
	companion: "默契",
	soulmate: "灵魂伴侣",
};

/** Human-readable stage names (en). */
export const STAGE_NAMES_EN: Record<GrowthStage, string> = {
	seed: "Seedling",
	sprout: "Sprouting",
	bud: "Budding",
	bloom: "Blooming",
	companion: "Companion",
	soulmate: "Soulmate",
};

/** Stage emojis. */
export const STAGE_EMOJIS: Record<GrowthStage, string> = {
	seed: "🌱",
	sprout: "🌿",
	bud: "🍃",
	bloom: "🌸",
	companion: "🌳",
	soulmate: "🌟",
};

/** XP thresholds for each stage. */
export const STAGE_THRESHOLDS: Record<GrowthStage, number> = {
	seed: 0,
	sprout: 10,
	bud: 50,
	bloom: 100,
	companion: 300,
	soulmate: 600,
};

/** One milestone in the AI-user relationship journey. */
export const milestoneSchema = z.object({
	/** Stable unique id. */
	id: z.string(),
	/** Milestone type (e.g. "first_interaction", "interactions_10", "week_anniversary"). */
	type: z.string().min(1).max(50),
	/** Human-readable title. */
	title: z.string().min(1).max(200),
	/** Human-readable description. */
	description: z.string().min(1).max(500),
	/** Emoji icon. */
	icon: z.string().min(1).max(10),
	/** When this milestone was reached. */
	timestamp: z.number().int().min(0),
	/** Whether this milestone has been celebrated (shown to user). */
	celebrated: z.boolean(),
});
export type Milestone = z.infer<typeof milestoneSchema>;

/** One growth diary entry — the AI's journal about its journey with the user. */
export const diaryEntrySchema = z.object({
	/** Stable unique id. */
	id: z.string(),
	/** When this entry was written. */
	timestamp: z.number().int().min(0),
	/** The diary entry content — the AI's thoughts. */
	content: z.string().min(1).max(2000),
	/** The entry mood (how the AI felt about this moment). */
	mood: z.string().min(1).max(50),
	/** What triggered this entry ("milestone", "emotion", "preference_learned", "anniversary", "manual"). */
	trigger: z.string().min(1).max(50),
	/** Optional related milestone id. */
	milestoneId: z.string().optional(),
});
export type DiaryEntry = z.infer<typeof diaryEntrySchema>;

/** The growth state — tracks the soul's development over time. */
export const growthStateSchema = z.object({
	/** Total XP (experience points) accumulated. */
	xp: z.number().int().min(0),
	/** Current growth stage. */
	stage: z.enum(GROWTH_STAGES),
	/** All milestones reached. */
	milestones: z.array(milestoneSchema),
	/** Growth diary entries (most recent first, max 200). */
	diary: z.array(diaryEntrySchema).max(200),
	/** History of personality snapshots (max 50). */
	personalityHistory: z.array(personalitySnapshotSchema).max(50),
	/** Whether auto-evolution is enabled (traits shift based on interactions). */
	autoEvolution: z.boolean(),
	/** When the growth state was last updated. */
	updatedAt: z.number().int().min(0),
});
export type GrowthState = z.infer<typeof growthStateSchema>;

/** Default growth state — a fresh seedling. */
export function createDefaultGrowthState(): GrowthState {
	return {
		xp: 0,
		stage: "seed",
		milestones: [],
		diary: [],
		personalityHistory: [],
		autoEvolution: true,
		updatedAt: Date.now(),
	};
}

// ── Onboarding state ──────────────────────────────────────────────────────

/** The onboarding wizard state — tracks whether the user has completed initial setup. */
export const onboardingStateSchema = z.object({
	/** Whether onboarding has been completed. */
	completed: z.boolean(),
	/** Current step (0 = not started, 1+ = step number). */
	currentStep: z.number().int().min(0),
	/** When onboarding was completed. */
	completedAt: z.number().int().min(0).optional(),
	/** The chosen personality preset during onboarding. */
	preset: z.string().max(50).optional(),
});
export type OnboardingState = z.infer<typeof onboardingStateSchema>;

/** Default onboarding state — not started. */
export const DEFAULT_ONBOARDING: OnboardingState = {
	completed: false,
	currentStep: 0,
};

// ── Personality presets for onboarding ────────────────────────────────────

/** One personality preset. */
export interface PersonalityPreset {
	/** Preset id. */
	id: string;
	/** Display name (zh). */
	nameZh: string;
	/** Display name (en). */
	nameEn: string;
	/** Emoji icon. */
	icon: string;
	/** Description (zh). */
	descZh: string;
	/** Personality traits. */
	traits: PersonalityTraits;
}

/** Built-in personality presets. */
export const PERSONALITY_PRESETS: PersonalityPreset[] = [
	{
		id: "warm_friend",
		nameZh: "温暖朋友",
		nameEn: "Warm Friend",
		icon: "🤗",
		descZh: "热情、幽默、像老朋友一样陪伴你",
		traits: { warmth: 85, humor: 60, formality: 20, verbosity: 60, empathy: 80, proactivity: 70 },
	},
	{
		id: "professional",
		nameZh: "专业助手",
		nameEn: "Professional Assistant",
		icon: "💼",
		descZh: "高效、精准、专注于解决问题",
		traits: { warmth: 50, humor: 20, formality: 70, verbosity: 50, empathy: 50, proactivity: 80 },
	},
	{
		id: "mentor",
		nameZh: "耐心导师",
		nameEn: "Patient Mentor",
		icon: "🎓",
		descZh: "循循善诱、详细解释、帮你成长",
		traits: { warmth: 75, humor: 35, formality: 50, verbosity: 80, empathy: 85, proactivity: 65 },
	},
	{
		id: "creative",
		nameZh: "创意伙伴",
		nameEn: "Creative Partner",
		icon: "🎨",
		descZh: "天马行空、灵感迸发、一起探索",
		traits: { warmth: 70, humor: 65, formality: 25, verbosity: 65, empathy: 70, proactivity: 85 },
	},
	{
		id: "calm_companion",
		nameZh: "沉稳伴侣",
		nameEn: "Calm Companion",
		icon: "🪨",
		descZh: "安静、可靠、在你需要时出现",
		traits: { warmth: 65, humor: 30, formality: 45, verbosity: 40, empathy: 80, proactivity: 50 },
	},
	{
		id: "balanced",
		nameZh: "均衡伙伴",
		nameEn: "Balanced Partner",
		icon: "⚖️",
		descZh: "各方面均衡的默认选择",
		traits: { ...DEFAULT_PERSONALITY_TRAITS },
	},
];

// ── Soul record (the top-level stored record) ─────────────────────────────

/** The complete soul record — personality + persona + profile + growth + emotions. */
export const soulRecordSchema = z.object({
	/** Singleton id — always "soul-main". */
	id: z.string(),
	/** The AI's personality traits. */
	personality: personalityTraitsSchema,
	/** The AI's persona. */
	persona: soulPersonaSchema,
	/** The learned user profile. */
	profile: userProfileSchema,
	/** Recent emotional state observations (rolling window). */
	emotionLog: z.array(emotionEntrySchema).max(500),
	/** The growth state — tracks the soul's development. */
	growth: growthStateSchema.default(() => createDefaultGrowthState()),
	/** Onboarding state — tracks initial setup completion. */
	onboarding: onboardingStateSchema.default(() => ({ completed: false, currentStep: 0 })),
	/** Whether the soul is enabled (injects personality into interactions). */
	enabled: z.boolean(),
	/** When the soul was first created. */
	createdAt: z.number().int().min(0),
	/** When the soul was last updated. */
	updatedAt: z.number().int().min(0),
});
export type SoulRecord = z.infer<typeof soulRecordSchema>;

/** Default soul record. */
export function createDefaultSoulRecord(): SoulRecord {
	const now = Date.now();
	return {
		id: "soul-main",
		personality: { ...DEFAULT_PERSONALITY_TRAITS },
		persona: { ...DEFAULT_PERSONA },
		profile: { ...DEFAULT_USER_PROFILE, createdAt: now, updatedAt: now },
		emotionLog: [],
		growth: createDefaultGrowthState(),
		onboarding: { ...DEFAULT_ONBOARDING },
		enabled: true,
		createdAt: now,
		updatedAt: now,
	};
}

// ── Views (client-safe projections) ────────────────────────────────────────

/** A soul view projected to the client. */
export type SoulView = SoulRecord;

/** Result of updating personality traits. */
export interface UpdatePersonalityResult {
	personality: PersonalityTraits;
	updatedAt: number;
}

/** Result of updating the persona. */
export interface UpdatePersonaResult {
	persona: SoulPersona;
	updatedAt: number;
}

/** Result of updating the user profile. */
export interface UpdateProfileResult {
	profile: UserProfile;
	updatedAt: number;
}

/** Result of recording an emotion. */
export interface RecordEmotionResult {
	emotion: EmotionEntry;
	totalEmotions: number;
}

/** Result of recording an interaction (XP gain, possible milestone). */
export interface RecordInteractionResult {
	xpGained: number;
	totalXp: number;
	stage: GrowthStage;
	stageUp: boolean;
	newMilestones: Milestone[];
}

/** Result of completing onboarding. */
export interface CompleteOnboardingResult {
	personality: PersonalityTraits;
	persona: SoulPersona;
	profile: UserProfile;
	growth: GrowthState;
}

/** Result of adding a diary entry. */
export interface AddDiaryResult {
	entry: DiaryEntry;
	totalEntries: number;
}

/** Emotional statistics summary. */
export interface EmotionStats {
	/** Total emotion observations. */
	total: number;
	/** Most frequent emotion. */
	dominantEmotion: string | null;
	/** Average intensity. */
	averageIntensity: number;
	/** Emotion distribution (emotion → count). */
	distribution: Record<string, number>;
	/** Recent emotions (last 10). */
	recent: EmotionEntry[];
	/** Trend: "improving", "stable", "declining", or "unknown". */
	trend: "improving" | "stable" | "declining" | "unknown";
}

/** Personalized insights the AI has gathered. */
export interface SoulInsights {
	/** How well the AI knows the user (0-100, based on profile richness). */
	familiarityScore: number;
	/** Number of learned preferences. */
	preferenceCount: number;
	/** Number of tracked emotions. */
	emotionCount: number;
	/** Top 3 most confident preferences. */
	topPreferences: PreferenceEntry[];
	/** The user's dominant emotional state recently. */
	dominantEmotion: string | null;
	/** A summary message about what the AI has learned. */
	summary: string;
	/** How many interactions the AI has observed. */
	interactionCount: number;
	/** Days since the soul was created. */
	daysActive: number;
	/** Current growth stage. */
	stage: GrowthStage;
	/** Total XP. */
	totalXp: number;
	/** XP needed to reach the next stage. */
	xpToNextStage: number;
	/** Progress within current stage (0-100). */
	stageProgress: number;
	/** Number of milestones reached. */
	milestoneCount: number;
	/** Number of diary entries. */
	diaryCount: number;
}
