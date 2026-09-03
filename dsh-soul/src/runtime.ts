/**
 * The `soul` typert host service. Registered as `ctx.soul` by the plugin
 * body; the gateway dispatches `soul/*` endpoints here.
 *
 * @module @opendsh/dsh-soul
 */

import type { Context } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import type { SoulStore } from "./store.js";
import type {
	EmotionStats,
	GrowthStage,
	Milestone,
	DiaryEntry,
	OnboardingState,
	PersonalityPreset,
	PersonalityTraits,
	SoulInsights,
	SoulPersona,
	SoulView,
	UserProfile,
} from "./types.js";

/** Host service backing the `soul` typert namespace. */
export class SoulRuntime extends TypertRemoteService {
	constructor(
		ctx: Context,
		private readonly store: SoulStore,
	) {
		super(ctx, "soul");
	}

	/** Get the full soul view. */
	@Remote
	getSoul(): SoulView {
		return this.store.getView();
	}

	/** Get the current personality traits. */
	@Remote
	getPersonality(): PersonalityTraits {
		return this.store.getView().personality;
	}

	/** Update personality traits (partial merge). */
	@Remote
	async updatePersonality(input: Partial<PersonalityTraits>): Promise<PersonalityTraits> {
		return this.store.updatePersonality(input);
	}

	/** Get the current persona. */
	@Remote
	getPersona(): SoulPersona {
		return this.store.getView().persona;
	}

	/** Update the persona (partial merge). */
	@Remote
	async updatePersona(input: Partial<SoulPersona>): Promise<SoulPersona> {
		return this.store.updatePersona(input);
	}

	/** Get the user profile. */
	@Remote
	getProfile(): UserProfile {
		return this.store.getView().profile;
	}

	/** Update the user profile (partial merge). */
	@Remote
	async updateProfile(input: Partial<UserProfile>): Promise<UserProfile> {
		return this.store.updateProfile(input);
	}

	/** Add a learned preference. */
	@Remote
	async addPreference(input: {
		category: string;
		key: string;
		value: string;
	}): Promise<{ id: string; category: string; key: string; value: string; confidence: number }> {
		const entry = await this.store.addPreference(input);
		return { id: entry.id, category: entry.category, key: entry.key, value: entry.value, confidence: entry.confidence };
	}

	/** Remove a learned preference. */
	@Remote
	async removePreference(id: string): Promise<{ id: string; removed: boolean }> {
		const removed = await this.store.removePreference(id);
		return { id, removed };
	}

	/** Record an emotional state observation. */
	@Remote
	async recordEmotion(input: {
		emotion: string;
		intensity: number;
		context?: string;
		sessionId?: string;
	}): Promise<{ emotion: { id: string; emotion: string; intensity: number; timestamp: number }; totalEmotions: number }> {
		const result = await this.store.recordEmotion(input);
		return {
			emotion: { id: result.emotion.id, emotion: result.emotion.emotion, intensity: result.emotion.intensity, timestamp: result.emotion.timestamp },
			totalEmotions: result.totalEmotions,
		};
	}

	/** Get emotional statistics. */
	@Remote
	getEmotionStats(): EmotionStats {
		return this.store.computeEmotionStats();
	}

	/** Clear the emotion log. */
	@Remote
	async clearEmotions(): Promise<{ cleared: number }> {
		const cleared = await this.store.clearEmotions();
		return { cleared };
	}

	/** Get personalized insights. */
	@Remote
	getInsights(): SoulInsights {
		return this.store.computeInsights();
	}

	/** Toggle the soul enabled state. */
	@Remote
	async setEnabled(input: { enabled: boolean }): Promise<{ enabled: boolean }> {
		const result = await this.store.setEnabled(input.enabled);
		return { enabled: result };
	}

	/** Get whether the soul is enabled. */
	@Remote
	isEnabled(): boolean {
		return this.store.getView().enabled;
	}

	// ── Growth system methods ───────────────────────────────────────────

	/** Record an interaction (grants XP, triggers growth). */
	@Remote
	async recordInteraction(): Promise<{
		xpGained: number;
		totalXp: number;
		stage: GrowthStage;
		stageUp: boolean;
		newMilestones: Milestone[];
	}> {
		return this.store.recordInteraction();
	}

	/** Get all milestones. */
	@Remote
	getMilestones(): Milestone[] {
		return this.store.getMilestones();
	}

	/** Celebrate a milestone (mark as shown). */
	@Remote
	async celebrateMilestone(id: string): Promise<{ id: string; celebrated: boolean }> {
		await this.store.celebrateMilestone(id);
		return { id, celebrated: true };
	}

	/** Get diary entries. */
	@Remote
	getDiary(limit?: number): DiaryEntry[] {
		return this.store.getDiary(limit);
	}

	/** Add a manual diary entry. */
	@Remote
	async addDiaryEntry(input: { content: string; mood: string }): Promise<{ entry: DiaryEntry; totalEntries: number }> {
		const entry = await this.store.addDiaryEntry(input.content, input.mood);
		return { entry, totalEntries: this.store.getDiary().length };
	}

	/** Toggle auto-evolution. */
	@Remote
	async setAutoEvolution(input: { enabled: boolean }): Promise<{ enabled: boolean }> {
		const result = await this.store.setAutoEvolution(input.enabled);
		return { enabled: result };
	}

	/** Get whether auto-evolution is enabled. */
	@Remote
	isAutoEvolution(): boolean {
		return this.store.getView().growth.autoEvolution;
	}

	// ── Onboarding methods ──────────────────────────────────────────────

	/** Get the onboarding state. */
	@Remote
	getOnboarding(): OnboardingState {
		return this.store.getOnboarding();
	}

	/** Complete the onboarding wizard. */
	@Remote
	async completeOnboarding(input: {
		presetId?: string;
		personality?: Partial<PersonalityTraits>;
		persona?: Partial<SoulPersona>;
		profile?: Partial<UserProfile>;
	}): Promise<{
		personality: PersonalityTraits;
		persona: SoulPersona;
		profile: UserProfile;
	}> {
		const result = await this.store.completeOnboarding(input);
		return {
			personality: result.personality,
			persona: result.persona,
			profile: result.profile,
		};
	}

	/** Update onboarding step. */
	@Remote
	async updateOnboardingStep(input: { step: number }): Promise<{ step: number }> {
		await this.store.updateOnboardingStep(input.step);
		return { step: input.step };
	}

	/** Get available personality presets. */
	@Remote
	getPresets(): PersonalityPreset[] {
		return this.store.getPresets();
	}
}
