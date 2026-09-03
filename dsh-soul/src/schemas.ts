/**
 * Zod schemas shared between the server and client bundles.
 *
 * @module @opendsh/dsh-soul
 */

import { z } from "zod";

import {
	emotionEntrySchema,
	personalityTraitsSchema,
	preferenceEntrySchema,
	soulPersonaSchema,
	soulRecordSchema,
	userProfileSchema,
} from "./types.js";

// ── Re-exported core schemas ──────────────────────────────────────────────

export const soulViewSchema = soulRecordSchema;
export const personalitySchema = personalityTraitsSchema;
export const personaSchema = soulPersonaSchema;
export const profileSchema = userProfileSchema;
export const emotionSchema = emotionEntrySchema;
export const preferenceSchema = preferenceEntrySchema;

// ── Growth schemas ────────────────────────────────────────────────────────

export const milestoneSchema = z.object({
	id: z.string(),
	type: z.string(),
	title: z.string(),
	description: z.string(),
	icon: z.string(),
	timestamp: z.number().int(),
	celebrated: z.boolean(),
});

export const diaryEntrySchema = z.object({
	id: z.string(),
	timestamp: z.number().int(),
	content: z.string(),
	mood: z.string(),
	trigger: z.string(),
	milestoneId: z.string().optional(),
});

export const growthStateSchema = z.object({
	xp: z.number().int(),
	stage: z.enum(["seed", "sprout", "bud", "bloom", "companion", "soulmate"]),
	milestones: z.array(milestoneSchema),
	diary: z.array(diaryEntrySchema),
	personalityHistory: z.array(z.object({
		timestamp: z.number().int(),
		traits: personalityTraitsSchema,
		reason: z.string(),
	})),
	autoEvolution: z.boolean(),
	updatedAt: z.number().int(),
});

export const onboardingStateSchema = z.object({
	completed: z.boolean(),
	currentStep: z.number().int(),
	completedAt: z.number().int().optional(),
	preset: z.string().optional(),
});

// ── Input schemas ──────────────────────────────────────────────────────────

export const updatePersonalityInputSchema = z.object({
	warmth: z.number().int().min(0).max(100).optional(),
	humor: z.number().int().min(0).max(100).optional(),
	formality: z.number().int().min(0).max(100).optional(),
	verbosity: z.number().int().min(0).max(100).optional(),
	empathy: z.number().int().min(0).max(100).optional(),
	proactivity: z.number().int().min(0).max(100).optional(),
});

export const updatePersonaInputSchema = z.object({
	name: z.string().min(1).max(50).optional(),
	tagline: z.string().min(1).max(200).optional(),
	description: z.string().min(1).max(2000).optional(),
	avatar: z.string().min(1).max(10).optional(),
});

export const updateProfileInputSchema = z.object({
	userName: z.string().max(100).optional(),
	preferredLanguage: z.string().max(20).optional(),
	technicalLevel: z.number().int().min(1).max(5).optional(),
	communicationStyle: z.string().max(500).optional(),
	interests: z.array(z.string().max(100)).max(50).optional(),
});

export const recordEmotionInputSchema = z.object({
	emotion: z.string().min(1).max(50),
	intensity: z.number().int().min(0).max(100),
	context: z.string().max(500).optional(),
	sessionId: z.string().optional(),
});

export const addPreferenceInputSchema = z.object({
	category: z.string().min(1).max(50),
	key: z.string().min(1).max(100),
	value: z.string().min(1).max(500),
});

export const completeOnboardingInputSchema = z.object({
	presetId: z.string().max(50).optional(),
	personality: updatePersonalityInputSchema.optional(),
	persona: updatePersonaInputSchema.optional(),
	profile: updateProfileInputSchema.optional(),
});

export const addDiaryInputSchema = z.object({
	content: z.string().min(1).max(2000),
	mood: z.string().min(1).max(50),
});

// ── Result schemas ────────────────────────────────────────────────────────

export const updatePersonalityResultSchema = z.object({
	personality: personalityTraitsSchema,
	updatedAt: z.number().int(),
});

export const updatePersonaResultSchema = z.object({
	persona: personaSchema,
	updatedAt: z.number().int(),
});

export const updateProfileResultSchema = z.object({
	profile: profileSchema,
	updatedAt: z.number().int(),
});

export const recordEmotionResultSchema = z.object({
	emotion: emotionSchema,
	totalEmotions: z.number().int(),
});

export const emotionStatsSchema = z.object({
	total: z.number().int(),
	dominantEmotion: z.string().nullable(),
	averageIntensity: z.number(),
	distribution: z.record(z.string(), z.number()),
	recent: z.array(emotionSchema),
	trend: z.enum(["improving", "stable", "declining", "unknown"]),
});

export const soulInsightsSchema = z.object({
	familiarityScore: z.number().int().min(0).max(100),
	preferenceCount: z.number().int(),
	emotionCount: z.number().int(),
	topPreferences: z.array(preferenceSchema),
	dominantEmotion: z.string().nullable(),
	summary: z.string(),
	interactionCount: z.number().int(),
	daysActive: z.number().int(),
	stage: z.enum(["seed", "sprout", "bud", "bloom", "companion", "soulmate"]),
	totalXp: z.number().int(),
	xpToNextStage: z.number().int(),
	stageProgress: z.number().int(),
	milestoneCount: z.number().int(),
	diaryCount: z.number().int(),
});

export const toggleEnabledResultSchema = z.object({
	enabled: z.boolean(),
	updatedAt: z.number().int(),
});

export const recordInteractionResultSchema = z.object({
	xpGained: z.number().int(),
	totalXp: z.number().int(),
	stage: z.enum(["seed", "sprout", "bud", "bloom", "companion", "soulmate"]),
	stageUp: z.boolean(),
	newMilestones: z.array(milestoneSchema),
});

export const milestoneListSchema = z.array(milestoneSchema);
export const diaryListSchema = z.array(diaryEntrySchema);

export const addDiaryResultSchema = z.object({
	entry: diaryEntrySchema,
	totalEntries: z.number().int(),
});

export const completeOnboardingResultSchema = z.object({
	personality: personalityTraitsSchema,
	persona: personaSchema,
	profile: profileSchema,
});

export const presetSchema = z.object({
	id: z.string(),
	nameZh: z.string(),
	nameEn: z.string(),
	icon: z.string(),
	descZh: z.string(),
	traits: personalityTraitsSchema,
});

export const presetListSchema = z.array(presetSchema);
