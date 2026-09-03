/**
 * Client TYPERT_REMOTE face: installs the `soul` namespace on the client
 * through `ctx.remote.$mount(...)`, mirroring the host TYPERT manifest.
 *
 * @module @opendsh/dsh-soul
 */

import type { TypertRemoteContribution } from "@deepseek-ai/dsh-typert-protocol";
import { z } from "zod";
import {
	addDiaryInputSchema,
	addDiaryResultSchema,
	completeOnboardingInputSchema,
	completeOnboardingResultSchema,
	diaryListSchema,
	emotionStatsSchema,
	milestoneListSchema,
	personalitySchema,
	profileSchema,
	recordEmotionResultSchema,
	recordInteractionResultSchema,
	soulInsightsSchema,
	soulViewSchema,
	toggleEnabledResultSchema,
	updatePersonaInputSchema,
	updatePersonalityInputSchema,
	updateProfileInputSchema,
} from "../schemas.js";
import { addPreferenceInputSchema, recordEmotionInputSchema } from "../schemas.js";

const PKG = "@opendsh/dsh-soul";
const direct: { kind: "direct" } = { kind: "direct" };

function jsonCodec(typeSymbol: string, schema: z.ZodType) {
	return { mode: "strict" as const, typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}
function result(typeSymbol: string, schema: z.ZodType) {
	return { mode: "strict" as const, typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}

const personaSchema = z.object({ name: z.string(), tagline: z.string(), description: z.string(), avatar: z.string() });
const addPreferenceResultSchema = z.object({ id: z.string(), category: z.string(), key: z.string(), value: z.string(), confidence: z.number().int() });
const removePreferenceResultSchema = z.object({ id: z.string(), removed: z.boolean() });
const clearEmotionsResultSchema = z.object({ cleared: z.number().int() });
const setEnabledInputSchema = z.object({ enabled: z.boolean() });
const setAutoEvolutionInputSchema = z.object({ enabled: z.boolean() });
const updateOnboardingStepInputSchema = z.object({ step: z.number().int() });

/** Remote contribution consumed by `ctx.remote.$mount(...)`. */
export const TYPERT_REMOTE: TypertRemoteContribution = {
	package: PKG,
	descriptors: [
		{ id: `${PKG}#soul/getSoul`, service: "soul", namespace: "soul", method: "getSoul", invocation: direct, parameters: [], result: result("SoulView", soulViewSchema) },
		{ id: `${PKG}#soul/getPersonality`, service: "soul", namespace: "soul", method: "getPersonality", invocation: direct, parameters: [], result: result("PersonalityTraits", personalitySchema) },
		{ id: `${PKG}#soul/updatePersonality`, service: "soul", namespace: "soul", method: "updatePersonality", invocation: direct, parameters: [{ name: "input", wire: "input", source: "json", codec: jsonCodec("UpdatePersonalityInput", updatePersonalityInputSchema) }], result: result("PersonalityTraits", personalitySchema) },
		{ id: `${PKG}#soul/getPersona`, service: "soul", namespace: "soul", method: "getPersona", invocation: direct, parameters: [], result: result("SoulPersona", personaSchema) },
		{ id: `${PKG}#soul/updatePersona`, service: "soul", namespace: "soul", method: "updatePersona", invocation: direct, parameters: [{ name: "input", wire: "input", source: "json", codec: jsonCodec("UpdatePersonaInput", updatePersonaInputSchema) }], result: result("SoulPersona", personaSchema) },
		{ id: `${PKG}#soul/getProfile`, service: "soul", namespace: "soul", method: "getProfile", invocation: direct, parameters: [], result: result("UserProfile", profileSchema) },
		{ id: `${PKG}#soul/updateProfile`, service: "soul", namespace: "soul", method: "updateProfile", invocation: direct, parameters: [{ name: "input", wire: "input", source: "json", codec: jsonCodec("UpdateProfileInput", updateProfileInputSchema) }], result: result("UserProfile", profileSchema) },
		{ id: `${PKG}#soul/addPreference`, service: "soul", namespace: "soul", method: "addPreference", invocation: direct, parameters: [{ name: "input", wire: "input", source: "json", codec: jsonCodec("AddPreferenceInput", addPreferenceInputSchema) }], result: result("PreferenceResult", addPreferenceResultSchema) },
		{ id: `${PKG}#soul/removePreference`, service: "soul", namespace: "soul", method: "removePreference", invocation: direct, parameters: [{ name: "id", wire: "id", source: "json", codec: jsonCodec("string", z.string()) }], result: result("RemovePreferenceResult", removePreferenceResultSchema) },
		{ id: `${PKG}#soul/recordEmotion`, service: "soul", namespace: "soul", method: "recordEmotion", invocation: direct, parameters: [{ name: "input", wire: "input", source: "json", codec: jsonCodec("RecordEmotionInput", recordEmotionInputSchema) }], result: result("RecordEmotionResult", recordEmotionResultSchema) },
		{ id: `${PKG}#soul/getEmotionStats`, service: "soul", namespace: "soul", method: "getEmotionStats", invocation: direct, parameters: [], result: result("EmotionStats", emotionStatsSchema) },
		{ id: `${PKG}#soul/clearEmotions`, service: "soul", namespace: "soul", method: "clearEmotions", invocation: direct, parameters: [], result: result("ClearEmotionsResult", clearEmotionsResultSchema) },
		{ id: `${PKG}#soul/getInsights`, service: "soul", namespace: "soul", method: "getInsights", invocation: direct, parameters: [], result: result("SoulInsights", soulInsightsSchema) },
		{ id: `${PKG}#soul/setEnabled`, service: "soul", namespace: "soul", method: "setEnabled", invocation: direct, parameters: [{ name: "input", wire: "input", source: "json", codec: jsonCodec("SetEnabledInput", setEnabledInputSchema) }], result: result("ToggleEnabledResult", toggleEnabledResultSchema) },
		{ id: `${PKG}#soul/isEnabled`, service: "soul", namespace: "soul", method: "isEnabled", invocation: direct, parameters: [], result: result("boolean", z.boolean()) },
		{ id: `${PKG}#soul/recordInteraction`, service: "soul", namespace: "soul", method: "recordInteraction", invocation: direct, parameters: [], result: result("RecordInteractionResult", recordInteractionResultSchema) },
		{ id: `${PKG}#soul/getMilestones`, service: "soul", namespace: "soul", method: "getMilestones", invocation: direct, parameters: [], result: result("Milestone[]", milestoneListSchema) },
		{ id: `${PKG}#soul/celebrateMilestone`, service: "soul", namespace: "soul", method: "celebrateMilestone", invocation: direct, parameters: [{ name: "id", wire: "id", source: "json", codec: jsonCodec("string", z.string()) }], result: result("CelebrateMilestoneResult", z.object({ id: z.string(), celebrated: z.boolean() })) },
		{ id: `${PKG}#soul/getDiary`, service: "soul", namespace: "soul", method: "getDiary", invocation: direct, parameters: [], result: result("DiaryEntry[]", diaryListSchema) },
		{ id: `${PKG}#soul/addDiaryEntry`, service: "soul", namespace: "soul", method: "addDiaryEntry", invocation: direct, parameters: [{ name: "input", wire: "input", source: "json", codec: jsonCodec("AddDiaryInput", addDiaryInputSchema) }], result: result("AddDiaryResult", addDiaryResultSchema) },
		{ id: `${PKG}#soul/setAutoEvolution`, service: "soul", namespace: "soul", method: "setAutoEvolution", invocation: direct, parameters: [{ name: "input", wire: "input", source: "json", codec: jsonCodec("SetAutoEvolutionInput", setAutoEvolutionInputSchema) }], result: result("AutoEvolutionResult", z.object({ enabled: z.boolean() })) },
		{ id: `${PKG}#soul/isAutoEvolution`, service: "soul", namespace: "soul", method: "isAutoEvolution", invocation: direct, parameters: [], result: result("boolean", z.boolean()) },
		{ id: `${PKG}#soul/getOnboarding`, service: "soul", namespace: "soul", method: "getOnboarding", invocation: direct, parameters: [], result: result("OnboardingState", z.object({ completed: z.boolean(), currentStep: z.number().int(), completedAt: z.number().int().optional(), preset: z.string().optional() })) },
		{ id: `${PKG}#soul/completeOnboarding`, service: "soul", namespace: "soul", method: "completeOnboarding", invocation: direct, parameters: [{ name: "input", wire: "input", source: "json", codec: jsonCodec("CompleteOnboardingInput", completeOnboardingInputSchema) }], result: result("CompleteOnboardingResult", completeOnboardingResultSchema) },
		{ id: `${PKG}#soul/updateOnboardingStep`, service: "soul", namespace: "soul", method: "updateOnboardingStep", invocation: direct, parameters: [{ name: "input", wire: "input", source: "json", codec: jsonCodec("UpdateOnboardingStepInput", updateOnboardingStepInputSchema) }], result: result("UpdateOnboardingStepResult", z.object({ step: z.number().int() })) },
		{ id: `${PKG}#soul/getPresets`, service: "soul", namespace: "soul", method: "getPresets", invocation: direct, parameters: [], result: result("PersonalityPreset[]", z.array(z.object({ id: z.string(), nameZh: z.string(), nameEn: z.string(), icon: z.string(), descZh: z.string(), traits: personalitySchema }))) },
	],
};
