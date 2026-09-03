/**
 * Locale dictionaries for the soul settings panel.
 *
 * @module @opendsh/dsh-soul
 */

export const en = {
	title: "Soul",
	subtitle: "Personality, emotion, and growth",
	enabled: "Enabled",
	disabled: "Disabled",
	enableSoul: "Enable Soul",
	disableSoul: "Disable Soul",
	enableHint: "When enabled, the AI uses your personality settings and learned preferences.",

	// Onboarding
	onboarding: "Welcome",
	onboardingTitle: "Let's set up your AI companion",
	onboardingStep1: "Choose a personality",
	onboardingStep2: "Tell me about you",
	onboardingStep3: "Name your companion",
	onboardingSkip: "Skip",
	onboardingNext: "Next",
	onboardingBack: "Back",
	onboardingFinish: "Finish",
	onboardingPresetHint: "Pick a personality that feels right. You can always change it later.",
	onboardingProfileHint: "Tell me a bit about yourself so I can understand you better.",
	onboardingPersonaHint: "Give your AI companion a name and identity.",
	onboardingComplete: "All set! I'm excited to grow with you.",

	// Personality
	personality: "Personality",
	personalityHint: "Tune the AI's character traits. Each slider goes from 0 to 100.",
	warmth: "Warmth", warmDesc: "How warm vs. clinical the tone is",
	humor: "Humor", humorDesc: "How much humor the AI uses",
	formality: "Formality", formalityDesc: "Formal (0) vs. casual (100)",
	verbosity: "Verbosity", verbosityDesc: "Terse (0) vs. thorough (100)",
	empathy: "Empathy", empathyDesc: "How attuned to your emotions",
	proactivity: "Proactivity", proactivityDesc: "Reactive (0) vs. proactive (100)",
	resetTraits: "Reset to defaults",
	traitsSaved: "Personality saved!",
	autoEvolution: "Auto-evolution",
	autoEvolutionHint: "Let personality traits evolve based on your interactions",
	autoEvolutionOn: "On",
	autoEvolutionOff: "Off",

	// Persona
	persona: "Persona",
	personaHint: "The AI's identity — a name, a tagline, a soul.",
	personaName: "Name", personaTagline: "Tagline",
	personaDescription: "Description", personaAvatar: "Avatar",
	personaSaved: "Persona saved!",

	// Profile
	profile: "My Profile",
	profileHint: "What the AI has learned about you over time.",
	userName: "Your name", preferredLanguage: "Preferred language",
	technicalLevel: "Technical level",
	level1: "Beginner", level2: "Novice", level3: "Intermediate", level4: "Advanced", level5: "Expert",
	communicationStyle: "Communication style", interests: "Interests",
	addInterest: "Add interest", profileSaved: "Profile saved!",

	// Preferences
	preferences: "Learned Preferences",
	preferencesHint: "Preferences the AI has picked up from your interactions.",
	noPreferences: "No preferences learned yet.",
	category: "Category", preferenceKey: "Key", preferenceValue: "Value",
	confidence: "Confidence", remove: "Remove", addPreference: "Add preference",

	// Emotions
	emotions: "Emotional Memory",
	emotionsHint: "Recent emotional states the AI has observed.",
	noEmotions: "No emotions recorded yet.",
	recordEmotion: "Record emotion", emotionLabel: "Emotion", intensity: "Intensity",
	emotionContext: "Context (optional)", clearEmotions: "Clear all emotions",
	emotionStats: "Statistics", dominantEmotion: "Dominant emotion",
	averageIntensity: "Average intensity", totalEmotions: "Total recorded",
	trend: "Trend", trendImproving: "Improving", trendStable: "Stable",
	trendDeclining: "Declining", trendUnknown: "Unknown",

	// Growth
	growth: "Growth Journey",
	growthHint: "The soul grows with you — tracking milestones, writing a diary, evolving over time.",
	stage: "Stage", xp: "Experience", totalXp: "Total XP",
	xpToNext: "XP to next stage", stageProgress: "Stage progress",
	milestones: "Milestones", noMilestones: "No milestones yet.",
	milestoneReached: "Reached", diary: "Growth Diary",
	noDiary: "No diary entries yet.", addDiary: "Write entry",
	diaryContent: "What happened?", diaryMood: "Mood",
	diaryAdded: "Diary entry added!", writeDiary: "Write",
	daysActive: "Days active", interactions: "Interactions",

	// Insights
	insights: "Insights",
	familiarityScore: "Familiarity",
	learnedPreferences: "Learned preferences", emotionCount: "Emotions tracked",
	summary: "Summary",

	// Common
	saving: "Saving…", loading: "Loading…", error: "Something went wrong",
	retry: "Retry", close: "Close",
} as const;

export type SoulKey = keyof typeof en;

export const zh = {
	title: "灵魂",
	subtitle: "人格、情绪与成长",
	enabled: "已启用",
	disabled: "已禁用",
	enableSoul: "启用灵魂",
	disableSoul: "禁用灵魂",
	enableHint: "启用后，AI 会使用你设定的人格和学到的偏好。",

	// Onboarding
	onboarding: "欢迎",
	onboardingTitle: "让我们来设置你的 AI 伙伴",
	onboardingStep1: "选择一个人格",
	onboardingStep2: "介绍一下你自己",
	onboardingStep3: "给你的伙伴起个名字",
	onboardingSkip: "跳过",
	onboardingNext: "下一步",
	onboardingBack: "上一步",
	onboardingFinish: "完成",
	onboardingPresetHint: "选一个感觉对的人格，之后随时可以调整。",
	onboardingProfileHint: "告诉我一些关于你的信息，这样我能更好地理解你。",
	onboardingPersonaHint: "给你的 AI 伙伴一个名字和身份。",
	onboardingComplete: "设置完成！期待和你一起成长。",

	// Personality
	personality: "人格特质",
	personalityHint: "调节 AI 的性格特征。每个滑块从 0 到 100。",
	warmth: "温暖度", warmDesc: "语气是温暖还是冷静",
	humor: "幽默感", humorDesc: "AI 使用多少幽默",
	formality: "正式度", formalityDesc: "正式 (0) vs. 随意 (100)",
	verbosity: "详细度", verbosityDesc: "简洁 (0) vs. 详尽 (100)",
	empathy: "共情力", empathyDesc: "对你情绪的感知程度",
	proactivity: "主动性", proactivityDesc: "被动 (0) vs. 主动 (100)",
	resetTraits: "恢复默认",
	traitsSaved: "人格已保存！",
	autoEvolution: "自动进化",
	autoEvolutionHint: "让人格特质根据交互自动演化",
	autoEvolutionOn: "开",
	autoEvolutionOff: "关",

	// Persona
	persona: "人设",
	personaHint: "AI 的身份——一个名字、一句标语、一个灵魂。",
	personaName: "名字", personaTagline: "标语",
	personaDescription: "描述", personaAvatar: "头像",
	personaSaved: "人设已保存！",

	// Profile
	profile: "我的画像",
	profileHint: "AI 随时间了解到的关于你的信息。",
	userName: "你的名字", preferredLanguage: "偏好语言",
	technicalLevel: "技术水平",
	level1: "入门", level2: "初级", level3: "中级", level4: "高级", level5: "专家",
	communicationStyle: "沟通风格", interests: "兴趣领域",
	addInterest: "添加兴趣", profileSaved: "画像已保存！",

	// Preferences
	preferences: "已学偏好",
	preferencesHint: "AI 从你的交互中学到的偏好。",
	noPreferences: "暂未学到偏好。",
	category: "类别", preferenceKey: "键", preferenceValue: "值",
	confidence: "置信度", remove: "移除", addPreference: "添加偏好",

	// Emotions
	emotions: "情绪记忆",
	emotionsHint: "AI 观察到的近期情绪状态。",
	noEmotions: "暂无情绪记录。",
	recordEmotion: "记录情绪", emotionLabel: "情绪", intensity: "强度",
	emotionContext: "上下文（可选）", clearEmotions: "清除所有情绪",
	emotionStats: "统计", dominantEmotion: "主导情绪",
	averageIntensity: "平均强度", totalEmotions: "总记录数",
	trend: "趋势", trendImproving: "好转中", trendStable: "稳定",
	trendDeclining: "下滑", trendUnknown: "未知",

	// Growth
	growth: "成长之旅",
	growthHint: "灵魂随你成长——记录里程碑、写日记、随时间进化。",
	stage: "阶段", xp: "经验值", totalXp: "总经验值",
	xpToNext: "距下一阶段", stageProgress: "阶段进度",
	milestones: "里程碑", noMilestones: "暂无里程碑。",
	milestoneReached: "达成于", diary: "成长日记",
	noDiary: "暂无日记。", addDiary: "写日记",
	diaryContent: "发生了什么？", diaryMood: "心情",
	diaryAdded: "日记已添加！", writeDiary: "记录",
	daysActive: "活跃天数", interactions: "交互次数",

	// Insights
	insights: "洞察",
	familiarityScore: "熟悉度",
	learnedPreferences: "已学偏好", emotionCount: "情绪记录",
	summary: "总结",

	// Common
	saving: "保存中…", loading: "加载中…", error: "出错了",
	retry: "重试", close: "关闭",
} as const;
