/**
 * Soul settings section. Registered into the `settings.section` slot;
 * shows onboarding wizard, personality, persona, user profile, growth
 * journey (milestones + diary), emotions, and insights.
 *
 * @module @opendsh/dsh-soul
 */

import type { TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import { useCallback, useEffect, useState } from "react";
import type {
	SoulRemote, PersonalityTraits, SoulPersona, UserProfile,
	EmotionStats, SoulInsights, PreferenceEntry, Milestone, DiaryEntry,
	PersonalityPreset, OnboardingState, GrowthStage,
} from "./remote.js";

export type PanelTranslate = TranslateNS<"soul">;

export interface SoulSettingsProps {
	soul: SoulRemote;
	t: PanelTranslate;
}

const STAGE_EMOJIS: Record<GrowthStage, string> = {
	seed: "🌱", sprout: "🌿", bud: "🍃", bloom: "🌸", companion: "🌳", soulmate: "🌟",
};
const STAGE_NAMES_ZH: Record<GrowthStage, string> = {
	seed: "萌芽", sprout: "初识", bud: "熟悉", bloom: "相知", companion: "默契", soulmate: "灵魂伴侣",
};

const EMOTION_COLORS: Record<string, string> = {
	happy: "#fbbf24", excited: "#f59e0b", content: "#84cc16", grateful: "#22c55e",
	confident: "#10b981", curious: "#06b6d4", inspired: "#0ea5e9", satisfied: "#14b8a6",
	relaxed: "#a3e635", enthusiastic: "#f97316",
	frustrated: "#ef4444", stressed: "#dc2626", anxious: "#f87171", sad: "#6366f1",
	angry: "#b91c1c", confused: "#a78bfa", overwhelmed: "#c084fc", tired: "#94a3b8",
	disappointed: "#818cf8", worried: "#fca5a5",
	"开心": "#fbbf24", "兴奋": "#f59e0b", "满足": "#84cc16", "感激": "#22c55e",
	"好奇": "#06b6d4", "放松": "#a3e635", "沮丧": "#ef4444", "压力": "#dc2626",
	"焦虑": "#f87171", "悲伤": "#6366f1", "愤怒": "#b91c1c", "困惑": "#a78bfa",
	"疲惫": "#94a3b8", "失望": "#818cf8", "担忧": "#fca5a5",
};

function emotionColor(emotion: string): string {
	return EMOTION_COLORS[emotion.toLowerCase()] ?? "#a1a1aa";
}
function formatTime(epochMs: number): string {
	const d = new Date(epochMs);
	const diff = Date.now() - epochMs;
	if (diff < 60000) return "刚刚";
	if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
	if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
	return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

/** Soul settings section component. */
export function SoulSettings({ soul, t }: SoulSettingsProps) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [enabled, setEnabled] = useState(true);
	const [personality, setPersonality] = useState<PersonalityTraits | null>(null);
	const [persona, setPersona] = useState<SoulPersona | null>(null);
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [emotionStats, setEmotionStats] = useState<EmotionStats | null>(null);
	const [insights, setInsights] = useState<SoulInsights | null>(null);
	const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
	const [milestones, setMilestones] = useState<Milestone[]>([]);
	const [diary, setDiary] = useState<DiaryEntry[]>([]);
	const [autoEvolution, setAutoEvolution] = useState(true);
	const [presets, setPresets] = useState<PersonalityPreset[]>([]);
	const [toast, setToast] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	// Onboarding wizard state
	const [wizardStep, setWizardStep] = useState(0);
	const [wizardPreset, setWizardPreset] = useState<string | undefined>();
	const [wizardName, setWizardName] = useState("");
	const [wizardLang, setWizardLang] = useState("zh");
	const [wizardLevel, setWizardLevel] = useState(3);
	const [wizardPersonaName, setWizardPersonaName] = useState("小D");
	const [wizardPersonaAvatar, setWizardPersonaAvatar] = useState("🌙");

	// Form state
	const [personaForm, setPersonaForm] = useState<SoulPersona | null>(null);
	const [profileForm, setProfileForm] = useState<Partial<UserProfile> | null>(null);
	const [newInterest, setNewInterest] = useState("");
	const [newPrefCategory, setNewPrefCategory] = useState("");
	const [newPrefKey, setNewPrefKey] = useState("");
	const [newPrefValue, setNewPrefValue] = useState("");
	const [newEmotion, setNewEmotion] = useState("");
	const [newEmotionIntensity, setNewEmotionIntensity] = useState(50);
	const [newEmotionContext, setNewEmotionContext] = useState("");
	const [diaryContent, setDiaryContent] = useState("");
	const [diaryMood, setDiaryMood] = useState("开心");

	const showToast = useCallback((msg: string) => {
		setToast(msg);
		setTimeout(() => setToast(null), 2500);
	}, []);

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [soulRes, statsRes, insightsRes, onboardingRes, milestonesRes, diaryRes, presetsRes] = await Promise.all([
				soul.getSoul(), soul.getEmotionStats(), soul.getInsights(),
				soul.getOnboarding(), soul.getMilestones(), soul.getDiary(), soul.getPresets(),
			]);
			if (soulRes.ok) {
				setEnabled(soulRes.value.enabled);
				setPersonality(soulRes.value.personality);
				setPersona(soulRes.value.persona);
				setPersonaForm(soulRes.value.persona);
				setProfile(soulRes.value.profile);
				setProfileForm(soulRes.value.profile);
				setAutoEvolution(soulRes.value.growth.autoEvolution);
			} else { setError(soulRes.error.message); }
			if (statsRes.ok) setEmotionStats(statsRes.value);
			if (insightsRes.ok) setInsights(insightsRes.value);
			if (onboardingRes.ok) setOnboarding(onboardingRes.value);
			if (milestonesRes.ok) setMilestones(milestonesRes.value);
			if (diaryRes.ok) setDiary(diaryRes.value);
			if (presetsRes.ok) setPresets(presetsRes.value);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, [soul]);

	useEffect(() => { void refresh(); }, [refresh]);

	// ── Onboarding handlers ─────────────────────────────────────────────
	const handleCompleteOnboarding = useCallback(async () => {
		setSaving(true);
		const res = await soul.completeOnboarding({
			...(wizardPreset !== undefined ? { presetId: wizardPreset } : {}),
			profile: { userName: wizardName || undefined, preferredLanguage: wizardLang, technicalLevel: wizardLevel },
			persona: { name: wizardPersonaName || "小D", avatar: wizardPersonaAvatar || "🌙" },
		});
		if (res.ok) {
			setOnboarding({ completed: true, currentStep: 0, completedAt: Date.now() });
			showToast(t("onboardingComplete"));
			await refresh();
		}
		setSaving(false);
	}, [soul, wizardPreset, wizardName, wizardLang, wizardLevel, wizardPersonaName, wizardPersonaAvatar, showToast, t, refresh]);

	// ── Handlers ────────────────────────────────────────────────────────
	const handleToggleEnabled = useCallback(async () => {
		setSaving(true);
		const res = await soul.setEnabled({ enabled: !enabled });
		if (res.ok) { setEnabled(res.value.enabled); showToast(res.value.enabled ? t("enabled") : t("disabled")); }
		setSaving(false);
	}, [soul, enabled, showToast, t]);

	const handlePersonalityChange = useCallback((key: keyof PersonalityTraits, value: number) => {
		setPersonality((prev) => prev ? { ...prev, [key]: value } : prev);
	}, []);

	const handlePersonalitySave = useCallback(async () => {
		if (!personality) return;
		setSaving(true);
		const res = await soul.updatePersonality(personality);
		if (res.ok) { setPersonality(res.value); showToast(t("traitsSaved")); }
		setSaving(false);
	}, [soul, personality, showToast, t]);

	const handleAutoEvolution = useCallback(async () => {
		setSaving(true);
		const res = await soul.setAutoEvolution({ enabled: !autoEvolution });
		if (res.ok) { setAutoEvolution(res.value.enabled); }
		setSaving(false);
	}, [soul, autoEvolution]);

	const handlePersonaSave = useCallback(async () => {
		if (!personaForm) return;
		setSaving(true);
		const res = await soul.updatePersona(personaForm);
		if (res.ok) { setPersona(res.value); showToast(t("personaSaved")); }
		setSaving(false);
	}, [soul, personaForm, showToast, t]);

	const handleProfileSave = useCallback(async () => {
		if (!profileForm) return;
		setSaving(true);
		const res = await soul.updateProfile(profileForm);
		if (res.ok) { setProfile(res.value); showToast(t("profileSaved")); }
		setSaving(false);
	}, [soul, profileForm, showToast, t]);

	const handleAddInterest = useCallback(() => {
		const trimmed = newInterest.trim();
		if (!trimmed) return;
		setProfileForm((prev) => ({ ...prev, interests: [...(prev?.interests ?? []), trimmed] }));
		setNewInterest("");
	}, [newInterest, profileForm]);

	const handleRemoveInterest = useCallback((idx: number) => {
		setProfileForm((prev) => {
			const interests = [...(prev?.interests ?? [])];
			interests.splice(idx, 1);
			return { ...prev, interests };
		});
	}, []);

	const handleAddPreference = useCallback(async () => {
		if (!newPrefCategory.trim() || !newPrefKey.trim() || !newPrefValue.trim()) return;
		setSaving(true);
		const res = await soul.addPreference({ category: newPrefCategory.trim(), key: newPrefKey.trim(), value: newPrefValue.trim() });
		if (res.ok) { setNewPrefCategory(""); setNewPrefKey(""); setNewPrefValue(""); await refresh(); }
		setSaving(false);
	}, [soul, newPrefCategory, newPrefKey, newPrefValue, refresh]);

	const handleRemovePreference = useCallback(async (id: string) => {
		setSaving(true);
		await soul.removePreference(id);
		await refresh();
		setSaving(false);
	}, [soul, refresh]);

	const handleRecordEmotion = useCallback(async () => {
		if (!newEmotion.trim()) return;
		setSaving(true);
		const res = await soul.recordEmotion({ emotion: newEmotion.trim(), intensity: newEmotionIntensity, ...(newEmotionContext.trim() ? { context: newEmotionContext.trim() } : {}) });
		if (res.ok) { setNewEmotion(""); setNewEmotionIntensity(50); setNewEmotionContext(""); await refresh(); }
		setSaving(false);
	}, [soul, newEmotion, newEmotionIntensity, newEmotionContext, refresh]);

	const handleClearEmotions = useCallback(async () => {
		if (!window.confirm(t("clearEmotions") + "?")) return;
		setSaving(true);
		await soul.clearEmotions();
		await refresh();
		setSaving(false);
	}, [soul, refresh, t]);

	const handleAddDiary = useCallback(async () => {
		if (!diaryContent.trim()) return;
		setSaving(true);
		const res = await soul.addDiaryEntry({ content: diaryContent.trim(), mood: diaryMood });
		if (res.ok) { setDiaryContent(""); setDiaryMood("开心"); showToast(t("diaryAdded")); await refresh(); }
		setSaving(false);
	}, [soul, diaryContent, diaryMood, showToast, t, refresh]);

	// ── Onboarding wizard ───────────────────────────────────────────────
	if (!loading && onboarding !== null && !onboarding.completed) {
		return (
			<div className="dsh-soul-panel">
				<div className="dsh-soul-header">
					<div className="dsh-soul-avatar">🌙</div>
					<h2 className="dsh-soul-title">{t("onboardingTitle")}</h2>
				</div>

				<div className="dsh-soul-section">
					{wizardStep === 0 && (
						<>
							<h3 className="dsh-soul-section-title">{t("onboardingStep1")}</h3>
							<p className="dsh-soul-section-hint">{t("onboardingPresetHint")}</p>
							<div className="dsh-soul-preset-grid">
								{presets.map((p) => (
									<div key={p.id} className={`dsh-soul-preset-card ${wizardPreset === p.id ? "selected" : ""}`} onClick={() => setWizardPreset(p.id)}>
										<div className="dsh-soul-preset-icon">{p.icon}</div>
										<div className="dsh-soul-preset-name">{p.nameZh}</div>
										<div className="dsh-soul-preset-desc">{p.descZh}</div>
									</div>
								))}
							</div>
							<div className="dsh-soul-btn-row">
								<button className="dsh-soul-btn dsh-soul-btn-ghost dsh-soul-btn-sm" onClick={() => { void handleCompleteOnboarding(); }}>{t("onboardingSkip")}</button>
								<button className="dsh-soul-btn dsh-soul-btn-sm" disabled={saving} onClick={() => setWizardStep(1)}>{t("onboardingNext")}</button>
							</div>
						</>
					)}
					{wizardStep === 1 && (
						<>
							<h3 className="dsh-soul-section-title">{t("onboardingStep2")}</h3>
							<p className="dsh-soul-section-hint">{t("onboardingProfileHint")}</p>
							<div className="dsh-soul-field">
								<label className="dsh-soul-label">{t("userName")}</label>
								<input className="dsh-soul-input" value={wizardName} onChange={(e) => setWizardName(e.target.value)} placeholder="怎么称呼你？" />
							</div>
							<div className="dsh-soul-field">
								<label className="dsh-soul-label">{t("preferredLanguage")}</label>
								<select className="dsh-soul-select" value={wizardLang} onChange={(e) => setWizardLang(e.target.value)}>
									<option value="zh">中文</option><option value="en">English</option><option value="ja">日本語</option>
								</select>
							</div>
							<div className="dsh-soul-field">
								<label className="dsh-soul-label">{t("technicalLevel")}</label>
								<select className="dsh-soul-select" value={wizardLevel} onChange={(e) => setWizardLevel(Number(e.target.value))}>
									<option value={1}>{t("level1")}</option><option value={2}>{t("level2")}</option>
									<option value={3}>{t("level3")}</option><option value={4}>{t("level4")}</option><option value={5}>{t("level5")}</option>
								</select>
							</div>
							<div className="dsh-soul-btn-row">
								<button className="dsh-soul-btn dsh-soul-btn-ghost dsh-soul-btn-sm" onClick={() => setWizardStep(0)}>{t("onboardingBack")}</button>
								<button className="dsh-soul-btn dsh-soul-btn-sm" onClick={() => setWizardStep(2)}>{t("onboardingNext")}</button>
							</div>
						</>
					)}
					{wizardStep === 2 && (
						<>
							<h3 className="dsh-soul-section-title">{t("onboardingStep3")}</h3>
							<p className="dsh-soul-section-hint">{t("onboardingPersonaHint")}</p>
							<div className="dsh-soul-row dsh-soul-row-mb">
								<div className="dsh-soul-field">
									<label className="dsh-soul-label">{t("personaAvatar")}</label>
									<input className="dsh-soul-input" value={wizardPersonaAvatar} onChange={(e) => setWizardPersonaAvatar(e.target.value)} />
								</div>
								<div className="dsh-soul-field">
									<label className="dsh-soul-label">{t("personaName")}</label>
									<input className="dsh-soul-input" value={wizardPersonaName} onChange={(e) => setWizardPersonaName(e.target.value)} />
								</div>
							</div>
							<div className="dsh-soul-btn-row">
								<button className="dsh-soul-btn dsh-soul-btn-ghost dsh-soul-btn-sm" onClick={() => setWizardStep(1)}>{t("onboardingBack")}</button>
								<button className="dsh-soul-btn dsh-soul-btn-sm" disabled={saving} onClick={() => void handleCompleteOnboarding()}>{t("onboardingFinish")}</button>
							</div>
						</>
					)}
				</div>
				{toast && <div className="dsh-soul-toast">{toast}</div>}
			</div>
		);
	}

	// ── Main panel ──────────────────────────────────────────────────────
	if (loading) return <div className="dsh-soul-loading">{t("loading")}</div>;
	if (error) return (
		<div className="dsh-soul-error">
			<p>{t("error")}: {error}</p>
			<button className="dsh-soul-btn dsh-soul-btn-outline" onClick={() => void refresh()}>{t("retry")}</button>
		</div>
	);

	return (
		<div className="dsh-soul-panel">
			{/* Header */}
			<div className="dsh-soul-header">
				<div className="dsh-soul-avatar">{persona?.avatar ?? "🌙"}</div>
				<h2 className="dsh-soul-title">{persona?.name ?? t("title")}</h2>
				<p className="dsh-soul-subtitle">{t("subtitle")}</p>
				{persona?.tagline && <p className="dsh-soul-tagline">{persona.tagline}</p>}
			</div>

			{/* Enable/Disable */}
			<div className="dsh-soul-toggle-row">
				<div>
					<div className="dsh-soul-toggle-label">{enabled ? t("enabled") : t("disabled")}</div>
					<div className="dsh-soul-toggle-hint">{t("enableHint")}</div>
				</div>
				<div className={`dsh-soul-switch ${enabled ? "on" : ""}`} onClick={() => void handleToggleEnabled()}>
					<div className="dsh-soul-switch-knob" />
				</div>
			</div>

			{/* Growth Journey */}
			{insights && (
				<div className="dsh-soul-section">
					<h3 className="dsh-soul-section-title">{STAGE_EMOJIS[insights.stage]} {t("growth")}</h3>
					<p className="dsh-soul-section-hint">{t("growthHint")}</p>

					{/* Stage + XP bar */}
					<div className="dsh-soul-stage-center">
						<div className="dsh-soul-stage-emoji">{STAGE_EMOJIS[insights.stage]}</div>
						<div className="dsh-soul-stage-name">{STAGE_NAMES_ZH[insights.stage]}</div>
						<div className="dsh-soul-stage-xp">
							{t("totalXp")}: {insights.totalXp}
							{insights.xpToNextStage > 0 && ` · ${t("xpToNext")}: ${insights.xpToNextStage}`}
						</div>
					</div>
					<div className="dsh-soul-familiarity-bar">
						<div className="dsh-soul-familiarity-fill" style={{ width: `${insights.stageProgress}%` }} />
					</div>

					{/* Stats grid */}
					<div className="dsh-soul-insights">
						<div className="dsh-soul-insight-card">
							<div className="dsh-soul-insight-value">{insights.familiarityScore}%</div>
							<div className="dsh-soul-insight-label">{t("familiarityScore")}</div>
						</div>
						<div className="dsh-soul-insight-card">
							<div className="dsh-soul-insight-value">{insights.daysActive}</div>
							<div className="dsh-soul-insight-label">{t("daysActive")}</div>
						</div>
						<div className="dsh-soul-insight-card">
							<div className="dsh-soul-insight-value">{insights.interactionCount}</div>
							<div className="dsh-soul-insight-label">{t("interactions")}</div>
						</div>
						<div className="dsh-soul-insight-card">
							<div className="dsh-soul-insight-value">{insights.milestoneCount}</div>
							<div className="dsh-soul-insight-label">{t("milestones")}</div>
						</div>
					</div>
					<div className="dsh-soul-summary">{insights.summary}</div>
				</div>
			)}

			{/* Milestones */}
			{milestones.length > 0 && (
				<div className="dsh-soul-section">
					<h3 className="dsh-soul-section-title">🏆 {t("milestones")}</h3>
					{milestones.map((m) => (
						<div key={m.id} className="dsh-soul-milestone-row">
							<span className="dsh-soul-milestone-icon">{m.icon}</span>
							<div className="dsh-soul-milestone-body">
								<div className="dsh-soul-milestone-title">{m.title}</div>
								<div className="dsh-soul-milestone-desc">{m.description}</div>
							</div>
							<span className="dsh-soul-milestone-time">{formatTime(m.timestamp)}</span>
						</div>
					))}
				</div>
			)}

			{/* Growth Diary */}
			<div className="dsh-soul-section">
				<h3 className="dsh-soul-section-title">📔 {t("diary")}</h3>
				{diary.length > 0 ? (
					diary.map((d) => (
						<div key={d.id} className="dsh-soul-diary-entry">
							<div className="dsh-soul-diary-header">
								<span className="dsh-soul-diary-mood">{d.mood}</span>
								<span className="dsh-soul-diary-time">{formatTime(d.timestamp)}</span>
							</div>
							<div className="dsh-soul-diary-content">{d.content}</div>
						</div>
					))
				) : (
					<div className="dsh-soul-empty">{t("noDiary")}</div>
				)}
				<div className="dsh-soul-diary-form">
					<input className="dsh-soul-input dsh-soul-diary-input" placeholder={t("diaryContent")} value={diaryContent} onChange={(e) => setDiaryContent(e.target.value)} />
					<div className="dsh-soul-row">
						<input className="dsh-soul-input" placeholder={t("diaryMood")} value={diaryMood} onChange={(e) => setDiaryMood(e.target.value)} />
						<button className="dsh-soul-btn dsh-soul-btn-sm dsh-soul-btn-ghost" disabled={saving || !diaryContent.trim()} onClick={() => void handleAddDiary()}>{t("writeDiary")}</button>
					</div>
				</div>
			</div>

			{/* Personality */}
			{personality && (
				<div className="dsh-soul-section">
					<h3 className="dsh-soul-section-title">🎭 {t("personality")}</h3>
					<p className="dsh-soul-section-hint">{t("personalityHint")}</p>
					{([
						["warmth", t("warmth"), t("warmDesc")],
						["humor", t("humor"), t("humorDesc")],
						["formality", t("formality"), t("formalityDesc")],
						["verbosity", t("verbosity"), t("verbosityDesc")],
						["empathy", t("empathy"), t("empathyDesc")],
						["proactivity", t("proactivity"), t("proactivityDesc")],
					] as const).map(([key, name, desc]) => (
						<div className="dsh-soul-trait" key={key}>
							<div className="dsh-soul-trait-header">
								<span className="dsh-soul-trait-name">{name}</span>
								<span className="dsh-soul-trait-value">{personality[key]}</span>
							</div>
							<div className="dsh-soul-trait-desc">{desc}</div>
							<input className="dsh-soul-slider" type="range" min={0} max={100} value={personality[key]} onChange={(e) => handlePersonalityChange(key, Number(e.target.value))} />
						</div>
					))}
					<div className="dsh-soul-trait-actions">
						<button className="dsh-soul-btn dsh-soul-btn-sm" disabled={saving} onClick={() => void handlePersonalitySave()}>{t("traitsSaved").replace("！", "")}</button>
						<div className="dsh-soul-auto-evolution">
							<span className="dsh-soul-auto-evolution-label">{t("autoEvolution")}</span>
							<div className={`dsh-soul-switch dsh-soul-switch-sm ${autoEvolution ? "on" : ""}`} onClick={() => void handleAutoEvolution()}>
								<div className="dsh-soul-switch-knob" />
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Persona */}
			{personaForm && (
				<div className="dsh-soul-section">
					<h3 className="dsh-soul-section-title">🪐 {t("persona")}</h3>
					<p className="dsh-soul-section-hint">{t("personaHint")}</p>
					<div className="dsh-soul-row dsh-soul-row-mb">
						<div className="dsh-soul-field">
							<label className="dsh-soul-label">{t("personaAvatar")}</label>
							<input className="dsh-soul-input" value={personaForm.avatar} onChange={(e) => setPersonaForm({ ...personaForm, avatar: e.target.value })} />
						</div>
						<div className="dsh-soul-field">
							<label className="dsh-soul-label">{t("personaName")}</label>
							<input className="dsh-soul-input" value={personaForm.name} onChange={(e) => setPersonaForm({ ...personaForm, name: e.target.value })} />
						</div>
					</div>
					<div className="dsh-soul-field">
						<label className="dsh-soul-label">{t("personaTagline")}</label>
						<input className="dsh-soul-input" value={personaForm.tagline} onChange={(e) => setPersonaForm({ ...personaForm, tagline: e.target.value })} />
					</div>
					<div className="dsh-soul-field">
						<label className="dsh-soul-label">{t("personaDescription")}</label>
						<textarea className="dsh-soul-textarea" value={personaForm.description} onChange={(e) => setPersonaForm({ ...personaForm, description: e.target.value })} />
					</div>
					<button className="dsh-soul-btn dsh-soul-btn-sm" disabled={saving} onClick={() => void handlePersonaSave()}>{t("personaSaved").replace("！", "")}</button>
				</div>
			)}

			{/* Profile */}
			{profileForm && (
				<div className="dsh-soul-section">
					<h3 className="dsh-soul-section-title">👤 {t("profile")}</h3>
					<p className="dsh-soul-section-hint">{t("profileHint")}</p>
					<div className="dsh-soul-row">
						<div className="dsh-soul-field">
							<label className="dsh-soul-label">{t("userName")}</label>
							<input className="dsh-soul-input" value={profileForm.userName ?? ""} onChange={(e) => setProfileForm({ ...profileForm, userName: e.target.value })} />
						</div>
						<div className="dsh-soul-field">
							<label className="dsh-soul-label">{t("preferredLanguage")}</label>
							<select className="dsh-soul-select" value={profileForm.preferredLanguage ?? ""} onChange={(e) => setProfileForm({ ...profileForm, preferredLanguage: e.target.value || undefined })}>
								<option value="">—</option><option value="zh">中文</option><option value="en">English</option><option value="ja">日本語</option>
							</select>
						</div>
					</div>
					<div className="dsh-soul-row">
						<div className="dsh-soul-field">
							<label className="dsh-soul-label">{t("technicalLevel")}</label>
							<select className="dsh-soul-select" value={profileForm.technicalLevel ?? 3} onChange={(e) => setProfileForm({ ...profileForm, technicalLevel: Number(e.target.value) })}>
								<option value={1}>{t("level1")}</option><option value={2}>{t("level2")}</option>
								<option value={3}>{t("level3")}</option><option value={4}>{t("level4")}</option><option value={5}>{t("level5")}</option>
							</select>
						</div>
					</div>
					<div className="dsh-soul-field">
						<label className="dsh-soul-label">{t("communicationStyle")}</label>
						<input className="dsh-soul-input" value={profileForm.communicationStyle ?? ""} onChange={(e) => setProfileForm({ ...profileForm, communicationStyle: e.target.value })} />
					</div>
					<div className="dsh-soul-field">
						<label className="dsh-soul-label">{t("interests")}</label>
						<div className="dsh-soul-tags">
							{(profileForm.interests ?? []).map((interest, idx) => (
								<span className="dsh-soul-tag" key={`${interest}-${idx}`}>{interest}<span className="dsh-soul-tag-remove" onClick={() => handleRemoveInterest(idx)}>×</span></span>
							))}
						</div>
						<div className="dsh-soul-row">
							<input className="dsh-soul-input" placeholder={t("addInterest")} value={newInterest} onChange={(e) => setNewInterest(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddInterest(); } }} />
							<button className="dsh-soul-btn dsh-soul-btn-sm dsh-soul-btn-ghost" onClick={handleAddInterest}>+</button>
						</div>
					</div>
					<button className="dsh-soul-btn dsh-soul-btn-sm" disabled={saving} onClick={() => void handleProfileSave()}>{t("profileSaved").replace("！", "")}</button>
				</div>
			)}

			{/* Preferences */}
			{profile && (
				<div className="dsh-soul-section">
					<h3 className="dsh-soul-section-title">🧠 {t("preferences")}</h3>
					<p className="dsh-soul-section-hint">{t("preferencesHint")}</p>
					{profile.preferences.length === 0 ? (
						<div className="dsh-soul-empty">{t("noPreferences")}</div>
					) : (
						profile.preferences.map((pref: PreferenceEntry) => (
							<div className="dsh-soul-pref-row" key={pref.id}>
								<span className="dsh-soul-pref-cat">{pref.category}</span>
								<span className="dsh-soul-pref-key">{pref.key}</span>
								<span className="dsh-soul-pref-val">{pref.value}</span>
								<span className="dsh-soul-pref-conf">{pref.confidence}%</span>
								<button className="dsh-soul-btn dsh-soul-btn-sm dsh-soul-btn-danger" disabled={saving} onClick={() => void handleRemovePreference(pref.id)}>×</button>
							</div>
						))
					)}
					<div className="dsh-soul-pref-form">
						<div className="dsh-soul-row dsh-soul-row-mb">
							<input className="dsh-soul-input" placeholder={t("category")} value={newPrefCategory} onChange={(e) => setNewPrefCategory(e.target.value)} />
							<input className="dsh-soul-input" placeholder={t("preferenceKey")} value={newPrefKey} onChange={(e) => setNewPrefKey(e.target.value)} />
						</div>
						<div className="dsh-soul-row">
							<input className="dsh-soul-input" placeholder={t("preferenceValue")} value={newPrefValue} onChange={(e) => setNewPrefValue(e.target.value)} />
							<button className="dsh-soul-btn dsh-soul-btn-sm dsh-soul-btn-ghost" disabled={saving} onClick={() => void handleAddPreference()}>{t("addPreference")}</button>
						</div>
					</div>
				</div>
			)}

			{/* Emotions */}
			{emotionStats && (
				<div className="dsh-soul-section">
					<h3 className="dsh-soul-section-title">💗 {t("emotions")}</h3>
					<p className="dsh-soul-section-hint">{t("emotionsHint")}</p>
					{emotionStats.total > 0 && (
						<div className="dsh-soul-emotion-stats">
							<div className="dsh-soul-insights">
								<div className="dsh-soul-insight-card">
									<div className="dsh-soul-insight-value">{emotionStats.total}</div>
									<div className="dsh-soul-insight-label">{t("totalEmotions")}</div>
								</div>
								<div className="dsh-soul-insight-card">
									<div className="dsh-soul-insight-value">{emotionStats.averageIntensity}</div>
									<div className="dsh-soul-insight-label">{t("averageIntensity")}</div>
								</div>
								<div className="dsh-soul-insight-card">
									<div className="dsh-soul-insight-value dsh-soul-insight-value-sm">{emotionStats.dominantEmotion ?? "—"}</div>
									<div className="dsh-soul-insight-label">{t("dominantEmotion")}</div>
								</div>
							</div>
							<div className="dsh-soul-emotion-trend">
								<span className="dsh-soul-trend-badge">
									{emotionStats.trend === "improving" ? t("trendImproving") : emotionStats.trend === "stable" ? t("trendStable") : emotionStats.trend === "declining" ? t("trendDeclining") : t("trendUnknown")}
								</span>
							</div>
						</div>
					)}
					{emotionStats.recent.length > 0 ? (
						<div className="dsh-soul-emotion-recent">
							{emotionStats.recent.map((e) => (
								<div className="dsh-soul-emotion-row" key={e.id}>
									<span className="dsh-soul-emotion-dot" style={{ background: emotionColor(e.emotion) }} />
									<span className="dsh-soul-emotion-name">{e.emotion}</span>
									<span className="dsh-soul-emotion-intensity">{e.intensity}%</span>
									<span className="dsh-soul-emotion-time">{formatTime(e.timestamp)}</span>
								</div>
							))}
						</div>
					) : (
						<div className="dsh-soul-empty">{t("noEmotions")}</div>
					)}
					<div className="dsh-soul-emotion-form">
						<div className="dsh-soul-row dsh-soul-row-mb">
							<input className="dsh-soul-input" placeholder={t("emotionLabel")} value={newEmotion} onChange={(e) => setNewEmotion(e.target.value)} />
							<div className="dsh-soul-emotion-intensity-wrap">
								<input className="dsh-soul-input" type="number" min={0} max={100} value={newEmotionIntensity} onChange={(e) => setNewEmotionIntensity(Number(e.target.value))} />
							</div>
						</div>
						<input className="dsh-soul-input dsh-soul-diary-input" placeholder={t("emotionContext")} value={newEmotionContext} onChange={(e) => setNewEmotionContext(e.target.value)} />
						<div className="dsh-soul-btn-row">
							<button className="dsh-soul-btn dsh-soul-btn-sm" disabled={saving || !newEmotion.trim()} onClick={() => void handleRecordEmotion()}>{t("recordEmotion")}</button>
							{emotionStats.total > 0 && (
								<button className="dsh-soul-btn dsh-soul-btn-sm dsh-soul-btn-danger" disabled={saving} onClick={() => void handleClearEmotions()}>{t("clearEmotions")}</button>
							)}
						</div>
					</div>
				</div>
			)}

			{toast && <div className="dsh-soul-toast">{toast}</div>}
		</div>
	);
}
