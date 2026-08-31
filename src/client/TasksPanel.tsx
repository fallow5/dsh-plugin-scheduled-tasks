/**
 * Scheduled-tasks panel UI. Mounted into the sidebar footer action seat; opens
 * a modal that manages per-project scheduled tasks (list, create, edit,
 * delete, run-now, history) through the `tasks` typert remote.
 *
 * Styling uses the DSH design tokens (`--dsw-alias-*`) exactly as the shipped
 * Cordis panel does, so the panel follows the active light/dark theme. The
 * stylesheet is injected once by the client plugin body (the same mechanism
 * the official client bundles use for CSS modules).
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */

import type { WorkspaceListState } from "@deepseek-ai/dsh-client-runtime/client";
import { IconChecklistOutline14, IconCloseOutline16 } from "@deepseek-ai/dsh-client-ui-primitives";
import type { SnapshotSelectorHook, TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CatalogResult, CreateInput, PresetsResult, RunView, SkillsResult, TaskView, UpdateInput } from "../schemas.js";
import type { RpcResult, TasksRemote } from "./remote.js";
import { panelStore } from "./panelState.js";
import { C } from "./styles.js";

/** The translate seat of this plugin's `scheduled-tasks` locale namespace. */
export type PanelTranslate = TranslateNS<"scheduled-tasks">;

/** Owner + injected + framework standard props for the footer action entry. */
export interface TasksFooterActionProps {
	/** Sidebar column state: wide row vs collapsed rail icon. */
	wide: boolean;
	/** Injected `remote.tasks` handle. */
	tasks: TasksRemote;
	/** Framework standard kit (scope `root`). */
	useWorkspaces: SnapshotSelectorHook<WorkspaceListState>;
	/** Framework-injected translate seat (namespace `scheduled-tasks`). */
	t: PanelTranslate;
}

/** Props for the shell.overlay panel entry. */
export interface TasksOverlayProps {
	/** Injected `remote.tasks` handle. */
	tasks: TasksRemote;
	/** Framework standard kit (scope `root`). */
	useWorkspaces: SnapshotSelectorHook<WorkspaceListState>;
	/** Framework-injected translate seat (namespace `scheduled-tasks`). */
	t: PanelTranslate;
}

// ── layout-only inline helpers (colors live in the stylesheet) ─────────────

const layout = {
	row: { display: "flex", alignItems: "center", gap: 8 },
	column: { display: "flex", flexDirection: "column", gap: 8 },
	spacer: { flex: 1 },
	field: { display: "flex", flexDirection: "column", gap: 4 },
} as const;

// ── helpers ────────────────────────────────────────────────────────────────

function taskBadge(t: PanelTranslate, task: TaskView): { cls: string; text: string } {
	if (task.state === "finished") return { cls: C.badgeDim, text: t("badge.finished") };
	if (!task.enabled) return { cls: C.badgeDim, text: t("badge.disabled") };
	if (task.effectiveUntil !== undefined && Date.now() > Date.parse(task.effectiveUntil)) {
		return { cls: C.badgeDim, text: t("badge.expired") };
	}
	if (task.effectiveFrom !== undefined && Date.now() < Date.parse(task.effectiveFrom)) {
		return { cls: C.badgeDim, text: t("badge.disabled") };
	}
	const remaining = Date.parse(task.scheduledAt) - Date.now();
	if (remaining <= 0) return { cls: C.badgeWarn, text: t("badge.due") };
	return { cls: C.badgeSuccess, text: t("badge.enabled") };
}

function runBadge(t: PanelTranslate, status: RunView["status"]): { cls: string; text: string } {
	switch (status) {
		case "running":
			return { cls: C.badgeSuccess, text: t("badge.running") };
		case "completed":
			return { cls: C.badgeSuccess, text: t("badge.completed") };
		case "failed":
			return { cls: C.badgeError, text: t("badge.failed") };
	}
}

function scheduleText(t: PanelTranslate, task: TaskView): string {
	if (task.kind === "at") return t("schedule.at", { time: formatLocal(task.scheduledAt) });
	if (task.kind === "cron") return t("schedule.cron", { expr: task.cron ?? "?", zone: task.timeZone ?? "UTC" });
	return t("schedule.every", { seconds: task.everySeconds ?? "?" });
}

function effectiveRangeText(t: PanelTranslate, task: TaskView): string {
	const from = task.effectiveFrom !== undefined ? formatLocal(task.effectiveFrom) : undefined;
	const until = task.effectiveUntil !== undefined ? formatLocal(task.effectiveUntil) : undefined;
	if (from !== undefined && until !== undefined) return `${from} → ${until}`;
	if (from !== undefined) return `${from} →`;
	if (until !== undefined) return `→ ${until}`;
	return "";
}

function formatLocal(instant: string): string {
	const date = new Date(instant);
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nextRunText(t: PanelTranslate, task: TaskView): string {
	if (task.state === "finished") return t("nextRun.finished");
	if (!task.enabled) return t("nextRun.disabled");
	if (task.effectiveFrom !== undefined && Date.now() < Date.parse(task.effectiveFrom)) {
		return t("nextRun.notYetEffective", { time: formatLocal(task.effectiveFrom) });
	}
	if (task.effectiveUntil !== undefined && Date.now() > Date.parse(task.effectiveUntil)) {
		return t("nextRun.finished");
	}
	const time = formatLocal(task.scheduledAt);
	const remaining = Date.parse(task.scheduledAt) - Date.now();
	if (remaining <= 0) return t("nextRun.due", { time });
	const minutes = Math.floor(remaining / 60_000);
	if (minutes < 1) return t("nextRun.soon", { time });
	if (minutes < 60) return t("nextRun.minutes", { count: minutes, time });
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return t("nextRun.hours", { count: hours, time });
	return t("nextRun.days", { count: Math.floor(hours / 24), time });
}

function errorText(result: RpcResult<unknown>): string {
	return result.ok ? "" : result.error.message;
}

function defaultTimeZone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
	} catch {
		return "UTC";
	}
}

// ── subviews ───────────────────────────────────────────────────────────────

interface RunHistoryProps {
	tasks: TasksRemote;
	task: TaskView;
	onBack: () => void;
	t: PanelTranslate;
}

function RunHistory({ tasks, task, onBack, t }: RunHistoryProps) {
	const [runs, setRuns] = useState<RunView[]>([]);
	const [error, setError] = useState("");
	const [expanded, setExpanded] = useState<string | undefined>();
	const [busy, setBusy] = useState(false);

	const refresh = useCallback(async () => {
		const result = await tasks.history(task.id);
		if (result.ok) setRuns(result.value);
		else setError(errorText(result));
	}, [tasks, task.id]);

	useEffect(() => {
		void refresh();
		const timer = setInterval(() => void refresh(), 10_000);
		return () => clearInterval(timer);
	}, [refresh]);

	return (
		<div style={layout.column}>
			<div style={layout.row}>
				<button type="button" className={C.btn} onClick={onBack}>
					← {t("history.back")}
				</button>
				<span className={C.name}>{t("history.title", { name: task.name })}</span>
				<span style={layout.spacer} />
				<button
					type="button"
					className={C.btn}
					disabled={busy}
					onClick={() => {
						setBusy(true);
						void refresh().finally(() => setBusy(false));
					}}
				>
					{t("history.refresh")}
				</button>
			</div>
			{error !== "" && <div className={C.error}>{error}</div>}
			{runs.length === 0 && <div className={C.empty}>{t("history.empty")}</div>}
			{runs.map((run) => {
				const badge = runBadge(t, run.status);
				return (
					<div key={run.id} className={C.row}>
						<span className={`${C.badge} ${badge.cls}`}>{badge.text}</span>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div className={C.meta}>
								{formatLocal(run.startedAt)}
								{run.finishedAt !== undefined ? ` → ${formatLocal(run.finishedAt)}` : ""}
								{run.triggeredBy === "manual"
									? ` · ${t("history.trigger.manual")}`
									: run.overdue
										? ` · ${t("history.trigger.overdue")}`
										: ` · ${t("history.trigger.scheduled")}`}
								{run.model !== undefined &&
									` · ${t("model.used", { provider: run.model.provider, model: run.model.model })}`}
							</div>
							{expanded === run.id && (
								<div style={{ marginTop: 4 }}>
									{run.error !== undefined && (
										<div className={C.error} style={{ margin: "4px 0" }}>
											{run.error}
										</div>
									)}
									{run.output !== undefined && <pre className={C.output}>{run.output}</pre>}
									{run.output === undefined && run.error === undefined && (
										<div className={C.meta}>{t("history.noOutput")}</div>
									)}
								</div>
							)}
						</div>
						<button
							type="button"
							className={C.btn}
							onClick={() => setExpanded(expanded === run.id ? undefined : run.id)}
						>
							{expanded === run.id ? t("history.collapse") : t("history.details")}
						</button>
					</div>
				);
			})}
		</div>
	);
}

interface TaskFormProps {
	tasks: TasksRemote;
	workspaces: readonly { readonly workspaceId: string; readonly title: string; readonly path: string }[];
	defaultProjectPath?: string;
	initial?: TaskView;
	onSaved: () => void;
	onCancel: () => void;
	t: PanelTranslate;
}

/** One selectable model option (provider route + provider-owned model id). */
interface ModelOption {
	/** Stable select value: provider and model joined by a separator that cannot appear in either. */
	key: string;
	provider: string;
	model: string;
	label: string;
	/** Provider display name, used as the optgroup label. */
	group: string;
}

/** Join a provider/model pair into a select value. */
function modelKeyOf(provider: string, model: string): string {
	return `${provider}\u0000${model}`;
}

/** Cron preset types: daily, weekly, monthly, or custom (raw expression). */
type CronPreset = "daily" | "weekly" | "monthly" | "custom";

/** Weekday labels for the weekly preset selector (0=Sunday … 6=Saturday). */
const WEEKDAYS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Build a cron expression from a preset configuration. */
function buildCronFromPreset(
	preset: CronPreset,
	time: string,
	weekday: number,
	dayOfMonth: number,
): string {
	const [h, m] = time.split(":");
	const hh = h ?? "9";
	const mm = m ?? "0";
	switch (preset) {
		case "daily":
			return `${mm} ${hh} * * *`;
		case "weekly":
			return `${mm} ${hh} * * ${weekday}`;
		case "monthly":
			return `${mm} ${hh} ${dayOfMonth} * *`;
		default:
			return `${mm} ${hh} * * *`;
	}
}

/** Detect the preset from an existing cron expression, or "custom". */
function detectCronPreset(cron: string): CronPreset {
	const parts = cron.trim().split(/\s+/);
	if (parts.length < 5) return "custom";
	const [, , day, , weekday] = parts;
	if (day === "*" && weekday === "*") return "daily";
	if (day === "*" && weekday !== "*" && !weekday.includes(",")) return "weekly";
	if (day !== "*" && weekday === "*") return "monthly";
	return "custom";
}

/** Group a flat option list into optgroup runs, preserving provider order. */
function groupModelOptions(options: ModelOption[]): { label: string; options: ModelOption[] }[] {
	const groups: { label: string; options: ModelOption[] }[] = [];
	for (const option of options) {
		let group = groups[groups.length - 1];
		if (group === undefined || group.label !== option.group) {
			group = { label: option.group, options: [] };
			groups.push(group);
		}
		group.options.push(option);
	}
	return groups;
}

function TaskForm({ tasks, workspaces, defaultProjectPath, initial, onSaved, onCancel, t }: TaskFormProps) {
	const [projectPath, setProjectPath] = useState(
		() => initial?.projectPath ?? defaultProjectPath ?? workspaces[0]?.path ?? "",
	);
	const [name, setName] = useState(initial?.name ?? "");
	const [prompt, setPrompt] = useState(initial?.prompt ?? "");
	const [kind, setKind] = useState<"at" | "every" | "cron">(initial?.kind ?? "cron");
	const [atDate, setAtDate] = useState(() => {
		if (initial?.kind === "at") return initial.scheduledAt.slice(0, 10);
		const next = new Date(Date.now() + 60 * 60_000);
		const pad = (value: number) => String(value).padStart(2, "0");
		return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
	});
	const [atTime, setAtTime] = useState(() => {
		if (initial?.kind === "at") return initial.scheduledAt.slice(11, 16);
		const next = new Date(Date.now() + 60 * 60_000);
		const pad = (value: number) => String(value).padStart(2, "0");
		return `${pad(next.getHours())}:${pad(next.getMinutes())}`;
	});
	const [timeZone, setTimeZone] = useState(() => initial?.timeZone ?? defaultTimeZone());
	const [cron, setCron] = useState(initial?.kind === "cron" ? (initial.cron ?? "") : "");
	const [cronPreset, setCronPreset] = useState<CronPreset>(() =>
		initial?.kind === "cron" && initial.cron ? detectCronPreset(initial.cron) : "daily",
	);
	const [presetTime, setPresetTime] = useState(() => {
		if (initial?.kind === "cron" && initial.cron) {
			const parts = initial.cron.trim().split(/\s+/);
			if (parts.length >= 2) return `${parts[1].padStart(2, "0")}:${parts[0].padStart(2, "0")}`;
		}
		return "09:00";
	});
	const [presetWeekday, setPresetWeekday] = useState(() => {
		if (initial?.kind === "cron" && initial.cron) {
			const parts = initial.cron.trim().split(/\s+/);
			if (parts.length >= 5 && parts[4] !== "*") {
				const n = Number(parts[4]);
				if (Number.isSafeInteger(n) && n >= 0 && n <= 6) return n;
			}
		}
		return 1;
	});
	const [presetDayOfMonth, setPresetDayOfMonth] = useState(() => {
		if (initial?.kind === "cron" && initial.cron) {
			const parts = initial.cron.trim().split(/\s+/);
			if (parts.length >= 3 && parts[2] !== "*") {
				const n = Number(parts[2]);
				if (Number.isSafeInteger(n) && n >= 1 && n <= 31) return n;
			}
		}
		return 1;
	});
	const [everyMinutes, setEveryMinutes] = useState(() => String((initial?.everySeconds ?? 1800) / 60));
	const [enabled, setEnabled] = useState(initial?.enabled ?? true);
	const [effectiveFrom, setEffectiveFrom] = useState(() => initial?.effectiveFrom?.slice(0, 10) ?? "");
	const [effectiveUntil, setEffectiveUntil] = useState(() => initial?.effectiveUntil?.slice(0, 10) ?? "");
	// Model selection: "" means "use the deployment default".
	const [modelKey, setModelKey] = useState(() =>
		initial?.model === undefined ? "" : modelKeyOf(initial.model.provider, initial.model.model),
	);
	const [catalog, setCatalog] = useState<CatalogResult | undefined>();
	const [catalogError, setCatalogError] = useState("");
	const [catalogBusy, setCatalogBusy] = useState(false);
	// Preset selection: "" means "use the deployment default".
	const [presetKey, setPresetKey] = useState(() => initial?.preset ?? "");
	const [presetsCatalog, setPresetsCatalog] = useState<PresetsResult | undefined>();
	const [presetsError, setPresetsError] = useState("");
	const [presetsBusy, setPresetsBusy] = useState(false);
	// Skill selection: array of skill names to pre-load.
	const [selectedSkills, setSelectedSkills] = useState<string[]>(() => initial?.skills ?? []);
	const [skillsCatalog, setSkillsCatalog] = useState<SkillsResult | undefined>();
	const [skillsError, setSkillsError] = useState("");
	const [skillsBusy, setSkillsBusy] = useState(false);
	// Slash autocomplete state for the prompt textarea.
	const [slashMenuOpen, setSlashMenuOpen] = useState(false);
	const [slashQuery, setSlashQuery] = useState("");
	const [slashActiveIndex, setSlashActiveIndex] = useState(0);
	const promptRef = useRef<HTMLTextAreaElement>(null);
	// Session mode: "fresh" (default) or "reuse".
	const [sessionMode, setSessionMode] = useState<"fresh" | "reuse">(() => initial?.sessionMode ?? "fresh");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	/** Flat option list for projects; a stored task whose project is not currently open is kept as a fallback. */
	const projectOptions = useMemo(() => {
		const options = workspaces.map((item) => ({
			path: item.path,
			label: item.title ? `${item.title} (${item.path})` : item.path,
		}));
		const trimmedPath = projectPath.trim();
		if (trimmedPath !== "" && !options.some((opt) => opt.path === trimmedPath)) {
			options.push({
				path: trimmedPath,
				label: t("form.projectOther", { path: trimmedPath }),
			});
		}
		return options;
	}, [workspaces, projectPath, t]);

	/** Load the grouped provider catalog when the form mounts. */
	const loadCatalog = useCallback(async () => {
		setCatalogBusy(true);
		setCatalogError("");
		const result = await tasks.catalog();
		if (result.ok) setCatalog(result.value);
		else setCatalogError(errorText(result));
		setCatalogBusy(false);
	}, [tasks]);

	useEffect(() => {
		void loadCatalog();
	}, [loadCatalog]);

	/** Load the agent-preset catalog when the form mounts. */
	const loadPresets = useCallback(async () => {
		setPresetsBusy(true);
		setPresetsError("");
		const result = await tasks.presets();
		if (result.ok) setPresetsCatalog(result.value);
		else setPresetsError(errorText(result));
		setPresetsBusy(false);
	}, [tasks]);

	useEffect(() => {
		void loadPresets();
	}, [loadPresets]);

	/** Load the skill catalog when the form mounts. */
	const loadSkills = useCallback(async () => {
		setSkillsBusy(true);
		setSkillsError("");
		const result = await tasks.skills();
		if (result.ok) setSkillsCatalog(result.value);
		else setSkillsError(errorText(result));
		setSkillsBusy(false);
	}, [tasks]);

	useEffect(() => {
		void loadSkills();
	}, [loadSkills]);

	/** Toggle a skill in the selected set. */
	const toggleSkill = useCallback((name: string) => {
		setSelectedSkills((prev) =>
			prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
		);
	}, []);

	/** Filtered skills for the slash autocomplete menu. */
	const slashFilteredSkills = useMemo(() => {
		if (skillsCatalog === undefined) return [];
		const query = slashQuery.toLowerCase();
		return skillsCatalog.skills.filter(
			(skill) =>
				skill.name.toLowerCase().includes(query) ||
				skill.description.toLowerCase().includes(query),
		);
	}, [skillsCatalog, slashQuery]);

	/** Handle prompt textarea changes: detect `/` at word boundary to open the slash menu. */
	const handlePromptChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		const value = event.target.value;
		setPrompt(value);
		// Detect slash at the start of a word (after space or at beginning).
		const cursorPos = event.target.selectionStart ?? value.length;
		const beforeCursor = value.slice(0, cursorPos);
		const slashMatch = beforeCursor.match(/(?:^|\s)\/([^\s]*)$/);
		if (slashMatch !== null) {
			setSlashMenuOpen(true);
			setSlashQuery(slashMatch[1] ?? "");
			setSlashActiveIndex(0);
		} else {
			setSlashMenuOpen(false);
		}
	}, []);

	/** Insert a skill from the slash menu into the prompt and add it to selected skills. */
	const insertSkillFromMenu = useCallback((skillName: string) => {
		const textarea = promptRef.current;
		if (textarea === null) return;
		const cursorPos = textarea.selectionStart ?? prompt.length;
		const beforeCursor = prompt.slice(0, cursorPos);
		const afterCursor = prompt.slice(cursorPos);
		// Find the `/` that started the menu and replace from there to cursor.
		const slashIndex = beforeCursor.search(/(?:^|\s)\/[^\s]*$/);
		if (slashIndex === -1) return;
		const prefix = beforeCursor.slice(0, slashIndex === 0 ? 0 : slashIndex + 1);
		const newPrompt = `${prefix}${skillName} ${afterCursor}`;
		setPrompt(newPrompt);
		setSlashMenuOpen(false);
		// Add to selected skills.
		setSelectedSkills((prev) => (prev.includes(skillName) ? prev : [...prev, skillName]));
		// Restore focus and place cursor after the inserted text.
		requestAnimationFrame(() => {
			const insertPos = (slashIndex === 0 ? 0 : slashIndex + 1) + skillName.length + 1;
			textarea.focus();
			textarea.setSelectionRange(insertPos, insertPos);
		});
	}, [prompt]);

	/** Handle keydown in the prompt textarea for slash menu navigation. */
	const handlePromptKeyDown = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
		if (!slashMenuOpen || slashFilteredSkills.length === 0) return;
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				setSlashActiveIndex((prev) => (prev + 1) % slashFilteredSkills.length);
				break;
			case "ArrowUp":
				event.preventDefault();
				setSlashActiveIndex((prev) => (prev - 1 + slashFilteredSkills.length) % slashFilteredSkills.length);
				break;
			case "Enter":
			case "Tab":
				event.preventDefault();
				insertSkillFromMenu(slashFilteredSkills[slashActiveIndex].name);
				break;
			case "Escape":
				event.preventDefault();
				setSlashMenuOpen(false);
				break;
		}
	}, [slashMenuOpen, slashFilteredSkills, slashActiveIndex, insertSkillFromMenu]);

	/** Flat option list; a stored selection missing from the catalog is kept as a fallback. */
	const modelOptions = useMemo<ModelOption[]>(() => {
		const options: ModelOption[] = [];
		for (const group of catalog?.groups ?? []) {
			for (const model of group.models) {
				options.push({
					key: modelKeyOf(group.id, model.id),
					provider: group.id,
					model: model.id,
					label: model.name,
					group: group.name,
				});
			}
		}
		const stored = initial?.model;
		if (
			stored !== undefined &&
			!options.some((option) => option.provider === stored.provider && option.model === stored.model)
		) {
			options.push({
				key: modelKeyOf(stored.provider, stored.model),
				provider: stored.provider,
				model: stored.model,
				label: `${stored.provider} / ${stored.model}`,
				group: t("form.modelOther"),
			});
		}
		return options;
	}, [catalog, initial?.model, t]);

	const groupedModelOptions = useMemo(() => groupModelOptions(modelOptions), [modelOptions]);

	const defaultLabel =
		catalog === undefined || catalog.default === null
			? t("form.modelDefault")
			: t("form.modelDefaultWith", { provider: catalog.default.provider, model: catalog.default.model });

	const submit = async () => {
		if (projectPath.trim() === "") {
			setError(t("form.error.projectRequired"));
			return;
		}
		if (name.trim() === "") {
			setError(t("form.error.nameRequired"));
			return;
		}
		if (prompt.trim() === "") {
			setError(t("form.error.promptRequired"));
			return;
		}
		// Validate effective date range if both are set.
		if (effectiveFrom !== "" && effectiveUntil !== "" && effectiveFrom > effectiveUntil) {
			setError(t("form.error.effectiveRange"));
			return;
		}
		const base: CreateInput = {
			projectPath: projectPath.trim(),
			name: name.trim(),
			prompt: prompt.trim(),
			kind,
			enabled,
			...(effectiveFrom !== "" ? { effectiveFrom: `${effectiveFrom}T00:00:00.000Z` } : {}),
			...(effectiveUntil !== "" ? { effectiveUntil: `${effectiveUntil}T23:59:59.999Z` } : {}),
		};
		let input: CreateInput;
		if (kind === "at") {
			input = { ...base, at: { date: atDate, time: `${atTime}:00`, time_zone: timeZone } };
		} else if (kind === "cron") {
			// Build the cron expression from the preset or use the raw expression.
			const effectiveCron =
				cronPreset === "custom" ? cron.trim() : buildCronFromPreset(cronPreset, presetTime, presetWeekday, presetDayOfMonth);
			if (effectiveCron === "") {
				setError(t("form.error.cronRequired"));
				return;
			}
			input = { ...base, cron: effectiveCron, timeZone };
		} else {
			const minutes = Number(everyMinutes);
			if (!Number.isSafeInteger(minutes) || minutes * 60 < 300) {
				setError(t("form.error.intervalTooShort"));
				return;
			}
			input = { ...base, everySeconds: minutes * 60 };
		}
		if (modelKey !== "") {
			const selected = modelOptions.find((option) => option.key === modelKey);
			if (selected !== undefined) {
				input = { ...input, model: { provider: selected.provider, model: selected.model } };
			}
		}
		if (presetKey !== "") {
			input = { ...input, preset: presetKey };
		}
		if (selectedSkills.length > 0) {
			input = { ...input, skills: selectedSkills };
		}
		if (sessionMode === "reuse") {
			input = { ...input, sessionMode: "reuse" };
		}
		setBusy(true);
		setError("");
		try {
			const result =
				initial === undefined
					? await tasks.create(input)
					: await tasks.update(
							initial.id,
							// An empty picker clears a stored override back to the default.
							{
								...input,
								projectPath: projectPath.trim(),
								...(modelKey === "" ? { model: null } : {}),
								...(presetKey === "" ? { preset: null } : {}),
								...(selectedSkills.length === 0 ? { skills: null } : {}),
								...(sessionMode === "fresh" ? { sessionMode: null } : {}),
								...(effectiveFrom === "" ? { effectiveFrom: null } : {}),
								...(effectiveUntil === "" ? { effectiveUntil: null } : {}),
							} as unknown as UpdateInput,
						);
			if (result.ok) {
				onSaved();
			} else {
				setError(errorText(result));
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<div style={layout.column}>
			<div style={layout.row}>
				<button type="button" className={C.btn} onClick={onCancel}>
					← {t("form.back")}
				</button>
				<span className={C.name}>{initial === undefined ? t("form.new") : t("form.edit")}</span>
			</div>
			<div style={layout.field}>
				<div className={C.label}>{t("form.taskName")}</div>
				<input
					className={C.input}
					value={name}
					onChange={(event) => setName(event.target.value)}
					placeholder={t("form.taskNamePlaceholder")}
				/>
			</div>
			<div style={layout.field}>
				<div className={C.label}>{t("form.project")}</div>
				{projectOptions.length > 0 ? (
					<select className={C.select} value={projectPath} onChange={(event) => setProjectPath(event.target.value)}>
						{projectOptions.map((option) => (
							<option key={option.path} value={option.path}>
								{option.label}
							</option>
						))}
					</select>
				) : (
					<input
						className={C.input}
						value={projectPath}
						onChange={(event) => setProjectPath(event.target.value)}
						placeholder={t("form.projectPlaceholder")}
					/>
				)}
			</div>
			<div style={layout.field}>
				<div className={C.label}>{t("form.prompt")}</div>
				<div style={{ position: "relative" }}>
					<textarea
						ref={promptRef}
						className={C.textarea}
						value={prompt}
						onChange={handlePromptChange}
						onKeyDown={handlePromptKeyDown}
						placeholder={t("form.promptPlaceholder")}
					/>
					{slashMenuOpen && slashFilteredSkills.length > 0 && (
						<div className={C.slashMenu}>
							{slashFilteredSkills.slice(0, 10).map((skill, index) => (
								<button
									key={skill.name}
									type="button"
									className={index === slashActiveIndex ? C.slashItemActive : C.slashItem}
									onClick={() => insertSkillFromMenu(skill.name)}
									onMouseEnter={() => setSlashActiveIndex(index)}
								>
									<span className={C.slashItemName}>/{skill.name}</span>
									<span className={C.slashItemDesc}>{skill.description}</span>
								</button>
							))}
						</div>
					)}
				</div>
			</div>
			<div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
				<div style={layout.field}>
					<div className={C.label}>{t("form.scheduleType")}</div>
					<div style={layout.row}>
						<label style={{ cursor: "pointer", ...layout.row, gap: 4 }}>
							<input type="radio" checked={kind === "cron"} onChange={() => setKind("cron")} /> {t("form.periodic")}
						</label>
						<label style={{ cursor: "pointer", ...layout.row, gap: 4 }}>
							<input type="radio" checked={kind === "every"} onChange={() => setKind("every")} /> {t("form.interval")}
						</label>
						<label style={{ cursor: "pointer", ...layout.row, gap: 4 }}>
							<input type="radio" checked={kind === "at"} onChange={() => setKind("at")} /> {t("form.oneShot")}
						</label>
					</div>
				</div>
			</div>
			{kind === "cron" ? (
				cronPreset === "custom" ? (
					<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
						<div style={{ ...layout.field, flex: 2, minWidth: 220 }}>
							<div className={C.label}>{t("form.cronExpression")}</div>
							<input
								className={C.input}
								value={cron}
								onChange={(event) => setCron(event.target.value)}
								placeholder="0 9 * * 1-5"
							/>
						</div>
						<div style={{ ...layout.field, flex: 1, minWidth: 160 }}>
							<div className={C.label}>{t("form.timeZone")}</div>
							<input
								className={C.input}
								value={timeZone}
								onChange={(event) => setTimeZone(event.target.value)}
								placeholder="Asia/Shanghai"
							/>
						</div>
						<div style={{ ...layout.field, minWidth: 100 }}>
							<div className={C.label}>{t("form.preset")}</div>
							<select
								className={C.select}
								value={cronPreset}
								onChange={(event) => setCronPreset(event.target.value as CronPreset)}
							>
								<option value="daily">{t("form.presetDaily")}</option>
								<option value="weekly">{t("form.presetWeekly")}</option>
								<option value="monthly">{t("form.presetMonthly")}</option>
								<option value="custom">{t("form.presetCustom")}</option>
							</select>
						</div>
					</div>
				) : (
					<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
						<div style={{ ...layout.field, minWidth: 100 }}>
							<div className={C.label}>{t("form.preset")}</div>
							<select
								className={C.select}
								value={cronPreset}
								onChange={(event) => setCronPreset(event.target.value as CronPreset)}
							>
								<option value="daily">{t("form.presetDaily")}</option>
								<option value="weekly">{t("form.presetWeekly")}</option>
								<option value="monthly">{t("form.presetMonthly")}</option>
								<option value="custom">{t("form.presetCustom")}</option>
							</select>
						</div>
						<div style={{ ...layout.field, flex: 1, minWidth: 100 }}>
							<div className={C.label}>{t("form.time")}</div>
							<input
								className={C.input}
								type="time"
								value={presetTime}
								onChange={(event) => setPresetTime(event.target.value)}
							/>
						</div>
						{cronPreset === "weekly" && (
							<div style={{ ...layout.field, flex: 1, minWidth: 120 }}>
								<div className={C.label}>{t("form.presetWeekday")}</div>
								<select
									className={C.select}
									value={String(presetWeekday)}
									onChange={(event) => setPresetWeekday(Number(event.target.value))}
								>
									{WEEKDAYS_ZH.map((day, index) => (
										<option key={index} value={String(index)}>
											{day}
										</option>
									))}
								</select>
							</div>
						)}
						{cronPreset === "monthly" && (
							<div style={{ ...layout.field, flex: 1, minWidth: 100 }}>
								<div className={C.label}>{t("form.presetDayOfMonth")}</div>
								<input
									className={C.input}
									type="number"
									min={1}
									max={31}
									value={String(presetDayOfMonth)}
									onChange={(event) => setPresetDayOfMonth(Number(event.target.value))}
								/>
							</div>
						)}
						<div style={{ ...layout.field, flex: 1, minWidth: 160 }}>
							<div className={C.label}>{t("form.timeZone")}</div>
							<input
								className={C.input}
								value={timeZone}
								onChange={(event) => setTimeZone(event.target.value)}
								placeholder="Asia/Shanghai"
							/>
						</div>
					</div>
				)
			) : kind === "at" ? (
				<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
					<div style={{ ...layout.field, flex: 1, minWidth: 140 }}>
						<div className={C.label}>{t("form.date")}</div>
						<input className={C.input} type="date" value={atDate} onChange={(event) => setAtDate(event.target.value)} />
					</div>
					<div style={{ ...layout.field, flex: 1, minWidth: 100 }}>
						<div className={C.label}>{t("form.time")}</div>
						<input className={C.input} type="time" value={atTime} onChange={(event) => setAtTime(event.target.value)} />
					</div>
					<div style={{ ...layout.field, flex: 1, minWidth: 160 }}>
						<div className={C.label}>{t("form.timeZone")}</div>
						<input
							className={C.input}
							value={timeZone}
							onChange={(event) => setTimeZone(event.target.value)}
							placeholder="Asia/Shanghai"
						/>
					</div>
				</div>
			) : (
				<div style={{ ...layout.field, maxWidth: 200 }}>
					<div className={C.label}>{t("form.intervalMinutes")}</div>
					<input
						className={C.input}
						type="number"
						min={5}
						step={5}
						value={everyMinutes}
						onChange={(event) => setEveryMinutes(event.target.value)}
					/>
				</div>
			)}
			<div style={layout.field}>
				<div className={C.label}>{t("form.effectiveRange")}</div>
				<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
					<div style={{ ...layout.field, flex: 1, minWidth: 140 }}>
						<div className={C.label}>{t("form.effectiveFrom")}</div>
						<input
							className={C.input}
							type="date"
							value={effectiveFrom}
							onChange={(event) => setEffectiveFrom(event.target.value)}
						/>
					</div>
					<div style={{ ...layout.field, flex: 1, minWidth: 140 }}>
						<div className={C.label}>{t("form.effectiveUntil")}</div>
						<input
							className={C.input}
							type="date"
							value={effectiveUntil}
							onChange={(event) => setEffectiveUntil(event.target.value)}
						/>
					</div>
				</div>
			</div>
			<div style={layout.field}>
				<div className={C.label}>{t("form.model")}</div>
				{catalogError !== "" && (
					<div style={layout.row}>
						<span className={C.error}>{catalogError}</span>
						<button type="button" className={C.btn} disabled={catalogBusy} onClick={() => void loadCatalog()}>
							{t("form.modelReload")}
						</button>
					</div>
				)}
				{catalogError === "" && groupedModelOptions.length === 0 && (
					<div className={C.meta}>{catalogBusy ? t("form.modelLoading") : t("form.modelEmpty")}</div>
				)}
				{groupedModelOptions.length > 0 && (
					<select className={C.select} value={modelKey} onChange={(event) => setModelKey(event.target.value)}>
						<option value="">{defaultLabel}</option>
						{groupedModelOptions.map((group) => (
							<optgroup key={group.label} label={group.label}>
								{group.options.map((option) => (
									<option key={option.key} value={option.key}>
										{option.label}
									</option>
								))}
							</optgroup>
						))}
					</select>
				)}
			</div>
			<div style={layout.field}>
				<div className={C.label}>{t("form.agentPreset")}</div>
				{presetsError !== "" && (
					<div style={layout.row}>
						<span className={C.error}>{presetsError}</span>
						<button type="button" className={C.btn} disabled={presetsBusy} onClick={() => void loadPresets()}>
							{t("form.agentPresetReload")}
						</button>
					</div>
				)}
				{presetsError === "" && (presetsCatalog === undefined || presetsCatalog.presets.length === 0) && (
					<div className={C.meta}>{presetsBusy ? t("form.agentPresetLoading") : t("form.agentPresetEmpty")}</div>
				)}
				{presetsCatalog !== undefined && presetsCatalog.presets.length > 0 && (
					<select className={C.select} value={presetKey} onChange={(event) => setPresetKey(event.target.value)}>
						<option value="">
							{presetsCatalog.default !== null
								? t("form.agentPresetDefaultWith", {
										name: presetsCatalog.presets.find((p) => p.id === presetsCatalog.default)?.name ?? presetsCatalog.default,
									})
								: t("form.agentPresetDefault")}
						</option>
						{presetsCatalog.presets.map((preset) => (
							<option key={preset.id} value={preset.id}>
								{preset.name}
								{preset.description !== undefined ? ` — ${preset.description}` : ""}
							</option>
						))}
					</select>
				)}
			</div>
			<div style={layout.field}>
				<div className={C.label}>{t("form.skills")}</div>
				{skillsError !== "" && (
					<div style={layout.row}>
						<span className={C.error}>{skillsError}</span>
						<button type="button" className={C.btn} disabled={skillsBusy} onClick={() => void loadSkills()}>
							{t("form.skillsReload")}
						</button>
					</div>
				)}
				{selectedSkills.length > 0 && (
					<div style={{ ...layout.row, flexWrap: "wrap", gap: 4 }}>
						{selectedSkills.map((name) => (
							<span key={name} className={C.skillTag}>
								/{name}
								<button
									type="button"
									className={C.skillTagRemove}
									onClick={() => toggleSkill(name)}
									aria-label={t("form.skillsRemove")}
								>
									×
								</button>
							</span>
						))}
					</div>
				)}
				<div className={C.meta}>{t("form.skillsHint")}</div>
			</div>
			<div style={layout.field}>
				<label style={{ cursor: "pointer", ...layout.row, gap: 6 }}>
					<input
						type="checkbox"
						checked={sessionMode === "reuse"}
						onChange={(event) => setSessionMode(event.target.checked ? "reuse" : "fresh")}
					/>
					{t("form.sessionModeReuse")}
				</label>
				<div className={C.meta}>{t("form.sessionModeHint")}</div>
			</div>
			<label style={{ cursor: "pointer", ...layout.row, gap: 6 }}>
				<input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />{" "}
				{t("form.enabled")}
			</label>
			{error !== "" && <div className={C.error}>{error}</div>}
			<div style={layout.row}>
				<button type="button" className={`${C.btn} ${C.btnPrimary}`} disabled={busy} onClick={() => void submit()}>
					{busy ? t("form.saving") : t("form.save")}
				</button>
				<button type="button" className={C.btn} onClick={onCancel}>
					{t("form.cancel")}
				</button>
			</div>
		</div>
	);
}

// ── root panel ─────────────────────────────────────────────────────────────

type View = { kind: "list" } | { kind: "form"; task?: TaskView } | { kind: "history"; task: TaskView };

export function TasksFooterAction(props: TasksFooterActionProps) {
	const { wide, t } = props;
	const open = useSyncExternalStore(panelStore.subscribe, panelStore.getSnapshot);

	return wide ? (
		<button
			type="button"
			className={C.trigger}
			title={t("title")}
			aria-haspopup="dialog"
			aria-expanded={open}
			onClick={() => panelStore.toggle()}
		>
			<IconChecklistOutline14 size={16} />
			<span className={C.triggerLabel}>{t("title")}</span>
		</button>
	) : (
		<button
			type="button"
			className={`${C.trigger} ${C.triggerRail}`}
			title={t("title")}
			aria-haspopup="dialog"
			aria-expanded={open}
			onClick={() => panelStore.toggle()}
		>
			<IconChecklistOutline14 size={16} />
		</button>
	);
}

// ── overlay panel (rendered into shell.overlay) ─────────────────────────────

export function TasksOverlay(props: TasksOverlayProps) {
	const { tasks, t } = props;
	const workspaceItems = props.useWorkspaces((state) => state.items);
	const recentWorkspaceId = props.useWorkspaces((state) => state.recentWorkspaceId);
	const open = useSyncExternalStore(panelStore.subscribe, panelStore.getSnapshot);
	// Active filter tab: `undefined` selects the All tab (every project).
	const [selectedPath, setSelectedPath] = useState<string | undefined>();
	const [taskList, setTaskList] = useState<TaskView[]>([]);
	const [view, setView] = useState<View>({ kind: "list" });
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const tabsRef = useRef<HTMLDivElement>(null);
	// Track the sidebar width so the panel can offset past it (not cover the sidebar).
	const [sidebarWidth, setSidebarWidth] = useState(0);

	useEffect(() => {
		if (!open) return;
		const update = () => {
			const frames = document.querySelectorAll('[style*="grid-template-columns"]');
			for (const frame of frames) {
				if (!(frame instanceof HTMLElement)) continue;
				const cols = frame.style.gridTemplateColumns;
				const match = cols.match(/^(\d+)px\s+minmax/);
				if (match !== null) {
					setSidebarWidth(Number(match[1]));
					return;
				}
			}
		};
		update();
		const observer = new ResizeObserver(update);
		const frames = document.querySelectorAll('[style*="grid-template-columns"]');
		for (const frame of frames) {
			if (frame instanceof HTMLElement) observer.observe(frame);
		}
		return () => observer.disconnect();
	}, [open]);

	// Reset to list view and clear errors when the panel is opened.
	useEffect(() => {
		if (open) {
			setView({ kind: "list" });
			setError("");
		}
	}, [open]);

	// Fallback project used as the create target while the All tab is active.
	const fallbackPath = useMemo(() => {
		const recent = workspaceItems.find((item) => item.workspaceId === recentWorkspaceId);
		return recent?.path ?? workspaceItems[0]?.path;
	}, [workspaceItems, recentWorkspaceId]);

	const refresh = useCallback(async () => {
		const result = await tasks.list(undefined);
		if (result.ok) setTaskList(result.value);
		else setError(errorText(result));
	}, [tasks]);

	// Per-project task counts (projectPath → count) backing the tab badges.
	const counts = useMemo(() => {
		const map = new Map<string, number>();
		for (const task of taskList) {
			map.set(task.projectPath, (map.get(task.projectPath) ?? 0) + 1);
		}
		return map;
	}, [taskList]);

	// Tasks shown for the active tab: everything on All, else one project.
	const visibleTasks = useMemo(
		() => (selectedPath === undefined ? taskList : taskList.filter((task) => task.projectPath === selectedPath)),
		[taskList, selectedPath],
	);

	// Create target: the active project tab, or the fallback project on All.
	const newTaskPath = selectedPath ?? fallbackPath;

	// Drop the selection back to All when its project leaves the registry or
	// its task count falls to zero (empty-project tabs are hidden).
	useEffect(() => {
		if (selectedPath === undefined) return;
		const stillListed = workspaceItems.some((item) => item.path === selectedPath);
		if (!stillListed || (counts.get(selectedPath) ?? 0) === 0) setSelectedPath(undefined);
	}, [workspaceItems, selectedPath, counts]);

	// Load the task list when the panel opens.
	useEffect(() => {
		if (open) void refresh();
	}, [open, refresh]);

	// Close on Escape.
	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") panelStore.close();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open]);

	// Horizontal wheel scroll for the tab strip.
	useEffect(() => {
		if (!open) return;
		const el = tabsRef.current;
		if (el === null) return;
		const onWheel = (event: WheelEvent) => {
			if (event.deltaY === 0) return;
			const max = el.scrollWidth - el.clientWidth;
			if (max <= 0) return;
			const before = el.scrollLeft;
			el.scrollLeft += event.deltaY;
			if (el.scrollLeft !== before) event.preventDefault();
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [open, view.kind]);

	// Arrow keys move the active filter tab (wrapping at both ends).
	const onTablistKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
		if (tabs.length === 0) return;
		const current = document.activeElement;
		let index = tabs.indexOf(current as HTMLButtonElement);
		if (index === -1) index = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
		if (index === -1) return;
		const delta = event.key === "ArrowRight" ? 1 : -1;
		const next = tabs[(index + delta + tabs.length) % tabs.length];
		if (next === undefined) return;
		event.preventDefault();
		next.focus();
		next.click();
	};

	const toggle = (id: string, enabled: boolean) => {
		setBusy(true);
		void tasks
			.update(id, { enabled })
			.then((result) => {
				if (!result.ok) setError(errorText(result));
			})
			.finally(() => {
				setBusy(false);
				void refresh();
			});
	};

	const remove = (task: TaskView) => {
		if (!window.confirm(t("list.confirmDelete", { name: task.name }))) return;
		setBusy(true);
		void tasks
			.delete(task.id)
			.then((result) => {
				if (!result.ok) setError(errorText(result));
			})
			.finally(() => {
				setBusy(false);
				void refresh();
			});
	};

	const runNow = (task: TaskView) => {
		setBusy(true);
		void tasks
			.runNow(task.id)
			.then((result) => {
				if (!result.ok) setError(errorText(result));
			})
			.finally(() => {
				setBusy(false);
				void refresh();
			});
	};

	if (!open) return null;

	return (
		<div
			className={C.overlay}
			style={{ left: sidebarWidth, ["--dshst-sidebar-w" as string]: `${sidebarWidth}px` }}
		>
			<div className={C.card} role="dialog" aria-label={t("title")}>
				<div className={C.header}>
					<IconChecklistOutline14 size={16} />
					<h2 className={C.title}>
						{t("title")}
					</h2>
					<button type="button" className={C.close} onClick={() => panelStore.close()} aria-label={t("close")}>
						<IconCloseOutline16 size={16} />
					</button>
				</div>
				<div className={C.body}>
					{error !== "" && (
						<div className={C.error}>
							{error}
							<button
								type="button"
								className={`${C.btn} ${C.btnDanger}`}
								style={{ marginLeft: 8 }}
								onClick={() => setError("")}
							>
								{t("dismiss")}
							</button>
						</div>
					)}
					{view.kind === "form" && (
						<TaskForm
							tasks={tasks}
							workspaces={workspaceItems}
							defaultProjectPath={newTaskPath}
							initial={view.task}
							onSaved={() => {
								setView({ kind: "list" });
								void refresh();
							}}
							onCancel={() => setView({ kind: "list" })}
							t={t}
						/>
					)}
					{view.kind === "history" && (
						<RunHistory tasks={tasks} task={view.task} onBack={() => setView({ kind: "list" })} t={t} />
					)}
					{view.kind === "list" && (
						<>
							<div
								ref={tabsRef}
								className={C.tabs}
								role="tablist"
								aria-label={t("tabs.label")}
								onKeyDown={onTablistKeyDown}
							>
								<button
									type="button"
									role="tab"
									aria-selected={selectedPath === undefined}
									className={selectedPath === undefined ? `${C.tab} ${C.tabActive}` : C.tab}
									onClick={() => setSelectedPath(undefined)}
								>
									{t("tabs.all")}
									<span className={C.tabCount}>({taskList.length})</span>
								</button>
								{workspaceItems.map((item) => {
									if ((counts.get(item.path) ?? 0) === 0) return null;
									const active = selectedPath === item.path;
									return (
										<button
											key={item.workspaceId}
											type="button"
											role="tab"
											aria-selected={active}
											className={active ? `${C.tab} ${C.tabActive}` : C.tab}
											title={item.path}
											onClick={() => setSelectedPath(item.path)}
										>
											{item.title}
											<span className={C.tabCount}>({counts.get(item.path) ?? 0})</span>
										</button>
										);
									})}
							</div>
							<div style={layout.row}>
								<span className={C.note}>
									{selectedPath === undefined
										? t("list.allNote", { count: taskList.length })
										: t("list.projectNote", { path: selectedPath })}
								</span>
								<span style={layout.spacer} />
								<button
									type="button"
									className={`${C.btn} ${C.btnPrimary}`}
									disabled={newTaskPath === undefined}
									onClick={() => setView({ kind: "form" })}
								>
									+ {t("list.newTask")}
								</button>
							</div>
							{visibleTasks.length === 0 && (
								<div className={C.empty}>{selectedPath === undefined ? t("list.emptyAll") : t("list.empty")}</div>
							)}
							{visibleTasks.map((task) => {
								const badge = taskBadge(t, task);
								return (
									<div key={task.id} className={C.row}>
										<span className={`${C.badge} ${badge.cls}`}>{badge.text}</span>
										<div style={{ flex: 1, minWidth: 0 }}>
											<div className={C.name}>{task.name}</div>
											<div className={C.meta}>
												{scheduleText(t, task)}
												{" · "}
												{nextRunText(t, task)}
												{task.model !== undefined &&
													` · ${t("model.used", { provider: task.model.provider, model: task.model.model })}`}
												{task.preset !== undefined &&
													` · ${t("agentPreset.used", { name: task.preset })}`}
												{task.skills !== undefined && task.skills.length > 0 &&
													` · ${t("skills.used", { count: task.skills.length })}`}
												{task.sessionMode === "reuse" &&
													` · ${t("sessionMode.reuse")}`}
												{(task.effectiveFrom !== undefined || task.effectiveUntil !== undefined) &&
													` · ${effectiveRangeText(t, task)}`}
											</div>
										</div>
										<button
											type="button"
											className={C.btn}
											disabled={busy}
											onClick={() => runNow(task)}
											title={t("list.runNowTitle")}
										>
											{t("list.run")}
										</button>
										<button type="button" className={C.btn} onClick={() => setView({ kind: "form", task })}>
											{t("list.edit")}
										</button>
										<button type="button" className={C.btn} onClick={() => setView({ kind: "history", task })}>
											{t("list.history")}
										</button>
										<button type="button" className={C.btn} onClick={() => toggle(task.id, !task.enabled)}>
											{task.enabled ? t("list.disable") : t("list.enable")}
										</button>
										<button type="button" className={`${C.btn} ${C.btnDanger}`} onClick={() => remove(task)}>
											{t("list.delete")}
										</button>
									</div>
								);
							})}
						</>
					)}
				</div>
				<div className={C.footer}>
					<span className={C.note}>{t("footer.note")}</span>
				</div>
			</div>
		</div>
	);
}
