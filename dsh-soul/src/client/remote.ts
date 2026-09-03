/**
 * Client-side remote surface for the `soul` typert namespace.
 *
 * @module @opendsh/dsh-soul
 */

export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } };

export interface PersonalityTraits {
	warmth: number; humor: number; formality: number; verbosity: number; empathy: number; proactivity: number;
}
export interface SoulPersona { name: string; tagline: string; description: string; avatar: string; }
export interface PreferenceEntry {
	id: string; category: string; key: string; value: string; confidence: number;
	firstSeen: number; lastSeen: number; observationCount: number;
}
export interface EmotionEntry {
	id: string; emotion: string; intensity: number; timestamp: number; context?: string; sessionId?: string;
}
export interface UserProfile {
	userName?: string; preferredLanguage?: string; technicalLevel?: number; communicationStyle?: string;
	interests: string[]; preferences: PreferenceEntry[]; interactionCount: number; createdAt: number; updatedAt: number;
}
export interface Milestone {
	id: string; type: string; title: string; description: string; icon: string; timestamp: number; celebrated: boolean;
}
export interface DiaryEntry {
	id: string; timestamp: number; content: string; mood: string; trigger: string; milestoneId?: string;
}
export interface PersonalityPreset {
	id: string; nameZh: string; nameEn: string; icon: string; descZh: string; traits: PersonalityTraits;
}
export type GrowthStage = "seed" | "sprout" | "bud" | "bloom" | "companion" | "soulmate";
export interface OnboardingState {
	completed: boolean; currentStep: number; completedAt?: number; preset?: string;
}
export interface SoulView {
	id: string;
	personality: PersonalityTraits;
	persona: SoulPersona;
	profile: UserProfile;
	emotionLog: EmotionEntry[];
	growth: {
		xp: number; stage: GrowthStage; milestones: Milestone[]; diary: DiaryEntry[];
		personalityHistory: { timestamp: number; traits: PersonalityTraits; reason: string }[];
		autoEvolution: boolean; updatedAt: number;
	};
	onboarding: OnboardingState;
	enabled: boolean; createdAt: number; updatedAt: number;
}
export interface EmotionStats {
	total: number; dominantEmotion: string | null; averageIntensity: number;
	distribution: Record<string, number>; recent: EmotionEntry[];
	trend: "improving" | "stable" | "declining" | "unknown";
}
export interface SoulInsights {
	familiarityScore: number; preferenceCount: number; emotionCount: number;
	topPreferences: PreferenceEntry[]; dominantEmotion: string | null; summary: string;
	interactionCount: number; daysActive: number;
	stage: GrowthStage; totalXp: number; xpToNextStage: number; stageProgress: number;
	milestoneCount: number; diaryCount: number;
}
export interface RecordInteractionResult {
	xpGained: number; totalXp: number; stage: GrowthStage; stageUp: boolean; newMilestones: Milestone[];
}

export interface SoulRemote {
	getSoul(): Promise<RpcResult<SoulView>>;
	getPersonality(): Promise<RpcResult<PersonalityTraits>>;
	updatePersonality(input: Partial<PersonalityTraits>): Promise<RpcResult<PersonalityTraits>>;
	getPersona(): Promise<RpcResult<SoulPersona>>;
	updatePersona(input: Partial<SoulPersona>): Promise<RpcResult<SoulPersona>>;
	getProfile(): Promise<RpcResult<UserProfile>>;
	updateProfile(input: Partial<UserProfile>): Promise<RpcResult<UserProfile>>;
	addPreference(input: { category: string; key: string; value: string }): Promise<RpcResult<{ id: string; category: string; key: string; value: string; confidence: number }>>;
	removePreference(id: string): Promise<RpcResult<{ id: string; removed: boolean }>>;
	recordEmotion(input: { emotion: string; intensity: number; context?: string; sessionId?: string }): Promise<RpcResult<{ emotion: { id: string; emotion: string; intensity: number; timestamp: number }; totalEmotions: number }>>;
	getEmotionStats(): Promise<RpcResult<EmotionStats>>;
	clearEmotions(): Promise<RpcResult<{ cleared: number }>>;
	getInsights(): Promise<RpcResult<SoulInsights>>;
	setEnabled(input: { enabled: boolean }): Promise<RpcResult<{ enabled: boolean }>>;
	isEnabled(): Promise<RpcResult<boolean>>;
	recordInteraction(): Promise<RpcResult<RecordInteractionResult>>;
	getMilestones(): Promise<RpcResult<Milestone[]>>;
	celebrateMilestone(id: string): Promise<RpcResult<{ id: string; celebrated: boolean }>>;
	getDiary(): Promise<RpcResult<DiaryEntry[]>>;
	addDiaryEntry(input: { content: string; mood: string }): Promise<RpcResult<{ entry: DiaryEntry; totalEntries: number }>>;
	setAutoEvolution(input: { enabled: boolean }): Promise<RpcResult<{ enabled: boolean }>>;
	isAutoEvolution(): Promise<RpcResult<boolean>>;
	getOnboarding(): Promise<RpcResult<OnboardingState>>;
	completeOnboarding(input: { presetId?: string; personality?: Partial<PersonalityTraits>; persona?: Partial<SoulPersona>; profile?: Partial<UserProfile> }): Promise<RpcResult<{ personality: PersonalityTraits; persona: SoulPersona; profile: UserProfile }>>;
	updateOnboardingStep(step: number): Promise<RpcResult<{ step: number }>>;
	getPresets(): Promise<RpcResult<PersonalityPreset[]>>;
}
