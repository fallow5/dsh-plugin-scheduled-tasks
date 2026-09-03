/**
 * Headless task executor: runs one task prompt through a freshly created
 * agent session in the project directory (the same drive pattern as the
 * `headless` runner), captures the final assistant text, archives the run
 * session so it stays out of the normal session list, and settles the run
 * record.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */

import { randomUUID } from "node:crypto";
import type { Context } from "@deepseek-ai/cordis";
import { type AgentRegistry, installModelSelection } from "@deepseek-ai/dsh-agent";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { SessionId } from "@deepseek-ai/dsh-session";
import type { TasksStore } from "./store.js";
import type { RunRecord, RunStatus, Task, TaskModel } from "./types.js";

/** Executor configuration derived from plugin config. */
export interface TaskExecutorConfig {
	/** Maximum concurrently running agent sessions. */
	maxConcurrentRuns: number;
	/** Hard bound on one agent turn before the run is marked failed. */
	runTimeoutMs: number;
}

/**
 * Resolve the effective model selection for one task run: the task's explicit
 * override, or the deployment's current default selection when the task has
 * none. Returns `undefined` only when neither source is available.
 */
export function resolveRunModel(ctx: Context, task: Task): TaskModel | undefined {
	if (task.model !== undefined) return task.model;
	const defaultModel = ctx.get("agentDefaultModel");
	const selection = defaultModel?.currentSelection();
	if (selection === undefined) return undefined;
	return { provider: selection.provider, model: selection.model };
}

/** Turn outcome reason, closed-union subset used by the summary. */
interface TurnReason {
	kind?: string;
	error?: { code?: string; message?: string; status?: number; requestId?: string };
	reason?: unknown;
}

/** One raw session event projection used by the summary (schema-agnostic). */
interface RunEvent {
	type: string;
	seq: number;
	data: unknown;
}

/**
 * Get session events in a backward-compatible way.
 * DSH 0.1.2-alpha.4 removed the `events` getter from Session; use
 * `snapshotEvents()` when available, falling back to `events` for older versions.
 */
function getSessionEvents(session: { events?: readonly RunEvent[]; snapshotEvents?: () => readonly RunEvent[] }): readonly RunEvent[] {
	return typeof session.snapshotEvents === "function" ? session.snapshotEvents() : (session.events ?? []);
}

/**
 * Aggregate the last assistant text and turn outcome over an event window.
 *
 * The agent loop may have already started its first turn before the run prompt
 * is queued (the prompt then joins that turn), so `turn/start` can sit before
 * `firstSeq`. The summary therefore never gates on turn boundaries: it keeps
 * the last non-empty assistant text and the last `turn/end` reason at or after
 * `firstSeq`.
 */
export function summarizeRun(
	events: readonly RunEvent[],
	firstSeq: number,
): {
	text: string;
	reason: TurnReason | undefined;
} {
	let text = "";
	let reason: TurnReason | undefined;
	for (const event of events) {
		if (event.seq < firstSeq) continue;
		if (event.type === "assistant/message") {
			const message = (event.data as { message?: { content?: { type: string; text?: string }[] } }).message;
			const joined = (message?.content ?? [])
				.filter((block) => block.type === "text")
				.map((block) => block.text ?? "")
				.join("");
			if (joined !== "") text = joined;
		}
		if (event.type === "turn/end") reason = (event.data as { reason?: TurnReason }).reason;
	}
	return { text, reason };
}

/** Stable diagnostic text for a non-completed turn outcome. */
export function describeReason(reason: TurnReason | undefined): string | undefined {
	if (reason === undefined) return "The run produced no turn outcome.";
	switch (reason.kind) {
		case "completed":
			return undefined;
		case "error": {
			const failure = reason.error;
			if (failure !== undefined && typeof failure.message === "string") {
				return failure.code === undefined ? failure.message : `${failure.code}: ${failure.message}`;
			}
			return `error: ${JSON.stringify(failure)}`;
		}
		case "aborted":
			return `aborted: ${JSON.stringify(reason.reason ?? {})}`;
		case "blocked":
			return "blocked: the turn was blocked while waiting for approval or resources.";
		case "max-tokens":
			return "max-tokens: the turn hit the output-token ceiling.";
		default:
			return `turn ended with reason: ${JSON.stringify(reason)}`;
	}
}

/**
 * Cap the stored text at the store boundary. Length is measured in UTF-16
 * code units to match the zod `.max()` caps on the run schema; the truncation
 * marker is counted against the cap so the result never exceeds it.
 */
function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	const marker = "\n…[truncated]";
	return `${text.slice(0, maxLength - marker.length)}${marker}`;
}

/**
 * Compute a stable period key for session rotation.
 * - `weekly`: ISO year-week (e.g. `2026-W03`), so sessions rotate every Monday.
 * - `monthly`: calendar year-month (e.g. `2026-01`), so sessions rotate on the 1st.
 */
function computePeriodKey(mode: "weekly" | "monthly"): string {
	const now = new Date();
	if (mode === "monthly") {
		return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
	}
	// ISO week number calculation.
	const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0
	d.setUTCDate(d.getUTCDate() - dayNum + 3); // Thursday of this week
	const isoYear = d.getUTCFullYear();
	const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
	const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
	const weekNum =
		1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - firstDayNum + 3) / 7);
	return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}

/** Build the effective prompt, optionally prepending skill pre-load and expert summon instructions. */
function buildEffectivePrompt(task: Task): string {
	let prefix = "";
	if (task.skills !== undefined && task.skills.length > 0) {
		const skillList = task.skills.map((s) => `- ${s}`).join("\n");
		prefix += `Before proceeding, load and use the following skills by calling the skill tool for each:\n${skillList}\n\n---\n\n`;
	}
	if (task.expert !== undefined && task.expert.trim() !== "") {
		prefix += `Use the summon_expert tool to summon the expert "${task.expert}" for this task.\n\n---\n\n`;
	}
	return prefix === "" ? task.prompt : `${prefix}${task.prompt}`;
}

/** Race a promise against a hard deadline, rejecting with a clear message on expiry. */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}

/** One run in flight; the executor owns the lifecycle and concurrency slot. */
export class TaskExecutor {
	private active = 0;
	private readonly waiters: (() => void)[] = [];

	constructor(
		private readonly ctx: Context,
		private readonly store: TasksStore,
		private readonly config: TaskExecutorConfig,
	) {}

	private async acquire(): Promise<void> {
		if (this.active < this.config.maxConcurrentRuns) {
			this.active += 1;
			return;
		}
		await new Promise<void>((resolve) => {
			this.waiters.push(resolve);
		});
		this.active += 1;
	}

	private release(): void {
		this.active -= 1;
		const next = this.waiters.shift();
		if (next !== undefined) next();
	}

	/**
	 * Run one task prompt to quiescence and settle the run record.
	 * @param task - the task to execute.
	 * @param options - dispatch provenance.
	 * @param prestarted - an already-persisted in-flight run (created by the
	 * run-now gesture so the UI can show it while the drive is queued).
	 * @returns the settled run record (never rejects for model/agent failures).
	 */
	async run(
		task: Task,
		options: { triggeredBy: "schedule" | "manual"; overdue: boolean },
		prestarted?: RunRecord,
	): Promise<RunRecord> {
		await this.acquire();
		try {
			// Capture the effective selection once: the run record and the agent
			// drive must agree, including for prestarted (run-now) runs whose
			// record already carries the selection the scheduler resolved.
			const runModel = prestarted?.model ?? resolveRunModel(this.ctx, task);
			const run =
				prestarted ??
				(await this.store.beginRun({
					taskId: task.id,
					projectPath: task.projectPath,
					triggeredBy: options.triggeredBy,
					overdue: options.overdue,
					...(runModel === undefined ? {} : { model: runModel }),
				}));
			let sessionId: string | undefined;
			let outcome: { status: RunStatus; output?: string; error?: string };
			try {
				const { status, output, error, spawnedSessionId } = await this.driveAgent(task, runModel);
				sessionId = spawnedSessionId;
				outcome = { status, ...(output === undefined ? {} : { output }), ...(error === undefined ? {} : { error }) };
			} catch (error) {
				outcome = {
					status: "failed",
					error: `scheduled-task run failed: ${error instanceof Error ? error.message : String(error)}`,
				};
			}
			// Persist the session id for reuse mode: the next run will continue it.
			if (sessionId !== undefined && task.reuseKinds !== undefined && task.reuseKinds.includes(task.kind)) {
				const period = task.reuseMode !== undefined ? computePeriodKey(task.reuseMode) : undefined;
				await this.store.setLastSessionId(task.id, sessionId, period);
			}
			return await this.store.finishRun(run, task.id, {
				...outcome,
				...(sessionId === undefined ? {} : { sessionId }),
			});
		} finally {
			this.release();
		}
	}

	/** Create the agent, drive one turn, and summarize; never throws for model failures. */
	private async driveAgent(
		task: Task,
		runModel?: TaskModel,
	): Promise<{ status: RunStatus; output?: string; error?: string; spawnedSessionId?: string }> {
		const ctx = this.ctx;
		const agents = ctx.get("agents");
		if (agents === undefined) {
			return { status: "failed", error: "agents service is unavailable." };
		}
		// The run's explicit selection wins; otherwise fall back to the default.
		const selection = runModel ?? ctx.get("agentDefaultModel")?.currentSelection();
		if (selection === undefined) {
			return { status: "failed", error: "no model selection is available for this run." };
		}

		// Build the effective prompt, optionally prepending skill pre-load instructions.
		const effectivePrompt = buildEffectivePrompt(task);

		// Session reuse: try to continue an existing session from a prior run,
		// but only if the current period (week/month) matches the last session's period.
		if (task.reuseKinds !== undefined && task.reuseKinds.includes(task.kind) && task.lastSessionId !== undefined) {
			const currentPeriod = task.reuseMode !== undefined ? computePeriodKey(task.reuseMode) : undefined;
			const periodMatches = currentPeriod === undefined || task.lastSessionPeriod === currentPeriod;
			if (periodMatches) {
				const reused = await this.driveExistingAgent(task, effectivePrompt, agents);
				if (reused !== undefined) return reused;
				// Fall through to creating a fresh session if the existing one is gone.
			}
			// Period changed or no period key — create a fresh session for the new period.
		}

		const sessionId = SessionId(`scheduled-run-${randomUUID()}`);
		const meta: { cwd: string; agentPreset?: string } = { cwd: task.projectPath };
		let handle: Awaited<ReturnType<AgentRegistry["create"]>> | undefined;
		try {
			// Compose the run agent exactly like a normal web session: mount the
			// deployment's default agent preset into the agent scope so it carries
			// the same tools (bash, fs, web, skill, subagent, …), permissions, and
			// prompt sections. A bare `agents.create` (no preset) registers no
			// tools, the model then emits a foreign tool format, and the loop ends
			// the turn without executing anything.
			const presets = ctx.get("agentPresets");
			let setup: Parameters<NonNullable<typeof agents>["create"]>[0]["setup"];
			if (presets !== undefined && typeof presets.resolve === "function" && typeof presets.mount === "function") {
				const preset = await presets.resolve(undefined);
				meta.agentPreset = preset.id;
				setup = async (agentCtx) => {
					installModelSelection(agentCtx, {
						current: selection,
						assembled: undefined,
					});
					await presets.mount(agentCtx, preset.id);
					// After the preset mounts (which may register a deployment:persona section
					// containing {{model}}/{{cwd}} template variables), register a last-resort
					// system-prompt/assemble handler that guarantees those variables have values.
					// installModelSelection already does this, but it runs BEFORE presets.mount in
					// the waterfall; this ensures the override sticks even if a preset row's own
					// assemble handler clears or rewrites variables.
					agentCtx.on("system-prompt/assemble", async (_assembly, _context, next) => {
						const assembled = await next();
						return {
							...assembled,
							variables: {
								...assembled.variables,
								provider: selection.provider,
								model: selection.model,
							},
						};
					});
				};
			} else {
				setup = (agentCtx) => {
					installModelSelection(agentCtx, {
						current: selection,
						assembled: undefined,
					});
				};
			}
			handle = await agents.create({
				sessionId,
				meta,
				agentOptions: {
					provider: selection.provider,
					model: selection.model,
				},
				setup,
			});
		} catch (error) {
			return {
				status: "failed",
				error: `could not start the run session: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
		const agent = handle.agent;
		// Make the run visible as a normal conversation under its project: attach
		// it to the workspace (plugin-created agents are not auto-attached) and
		// pin a readable title. Both are best-effort.
		await attachToWorkspace(ctx, task.projectPath, sessionId);
		// When session rotation is enabled, append the period key to the title so
		// each rotation period's session is distinguishable in the conversation list.
		const currentPeriod = task.reuseMode !== undefined ? computePeriodKey(task.reuseMode) : undefined;
		await renameRunSession(ctx, agent.session, task, currentPeriod);
		const firstSeq = agent.session.seq;
		const timeoutLabel = `${Math.round(this.config.runTimeoutMs / 60_000)} minutes`;
		try {
			// A freshly created agent may already be driving an initial turn
			// before the run prompt is queued; wait that out under the same hard
			// bound so a stuck initial turn cannot hang the run (and its
			// concurrency slot) forever.
			await withTimeout(
				agent.whenIdle(),
				this.config.runTimeoutMs,
				`run timed out after ${timeoutLabel} waiting for the agent to become idle`,
			);
			agent.followup(
				createUserMessage({
					content: [{ type: "text", text: effectivePrompt }],
					source: { kind: "plugin", plugin: "scheduled-tasks" },
				}),
			);
			await withTimeout(agent.whenIdle(), this.config.runTimeoutMs, `run timed out after ${timeoutLabel}`);
			const summary = summarizeRun(getSessionEvents(agent.session), firstSeq);
			const status: RunStatus = summary.reason?.kind === "completed" ? "completed" : "failed";
			const error = describeReason(summary.reason);
			return {
				status,
				...(summary.text === "" ? {} : { output: truncate(summary.text, 20_000) }),
				...(error === undefined ? {} : { error: truncate(error, 4000) }),
				spawnedSessionId: sessionId,
			};
		} catch (error) {
			return {
				status: "failed",
				error: `run drive failed: ${error instanceof Error ? error.message : String(error)}`,
				spawnedSessionId: sessionId,
			};
		} finally {
			// The run session deliberately stays registered (idle): disposing the
			// agent would remove it from the in-memory session store and the
			// workspace conversation list would drop it until the next page
			// refresh re-baselines from persistence. Keeping it registered matches
			// how normal web conversations behave.
		}
	}

	/** Drive a followup turn on an existing live or resumed session. */
	private async driveExistingAgent(
		task: Task,
		effectivePrompt: string,
		agents: AgentRegistry,
	): Promise<{ status: RunStatus; output?: string; error?: string; spawnedSessionId?: string } | undefined> {
		const ctx = this.ctx;
		const sessionId = task.lastSessionId!;
		const timeoutLabel = `${Math.round(this.config.runTimeoutMs / 60_000)} minutes`;

		// Try a live agent first (still in memory from a prior run this process).
		let agent = agents.get(SessionId(sessionId));

		// If not live, try to resume the persisted session.
		if (agent === undefined) {
			try {
				const handle = await agents.resume({ resumeSessionId: SessionId(sessionId) });
				agent = handle.agent;
			} catch {
				// Session no longer exists in persistence; caller falls back to fresh.
				return undefined;
			}
		}

		const firstSeq = agent.session.seq;
		try {
			await withTimeout(
				agent.whenIdle(),
				this.config.runTimeoutMs,
				`run timed out after ${timeoutLabel} waiting for the agent to become idle`,
			);
			agent.followup(
				createUserMessage({
					content: [{ type: "text", text: effectivePrompt }],
					source: { kind: "plugin", plugin: "scheduled-tasks" },
				}),
			);
			await withTimeout(agent.whenIdle(), this.config.runTimeoutMs, `run timed out after ${timeoutLabel}`);
			const summary = summarizeRun(getSessionEvents(agent.session), firstSeq);
			const status: RunStatus = summary.reason?.kind === "completed" ? "completed" : "failed";
			const error = describeReason(summary.reason);
			return {
				status,
				...(summary.text === "" ? {} : { output: truncate(summary.text, 20_000) }),
				...(error === undefined ? {} : { error: truncate(error, 4000) }),
				spawnedSessionId: sessionId,
			};
		} catch (error) {
			return {
				status: "failed",
				error: `run drive failed: ${error instanceof Error ? error.message : String(error)}`,
				spawnedSessionId: sessionId,
			};
		}
	}
}

/** Attach the run session to its project's workspace so it appears in the list. */
async function attachToWorkspace(ctx: Context, projectPath: string, sessionId: string): Promise<void> {
	const workspaceRegistry = ctx.get("workspaceRegistry");
	if (workspaceRegistry === undefined || typeof workspaceRegistry.resolveByPath !== "function") return;
	try {
		const workspace = await workspaceRegistry.resolveByPath(projectPath);
		if (workspace !== undefined && typeof workspace.attachSession === "function") {
			await workspace.attachSession(sessionId);
		}
	} catch (error) {
		ctx.logger.warn(
			`scheduled-tasks: could not attach run session "${sessionId}" to workspace: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/** Pin a readable title on the run session so the conversation list is informative. */
async function renameRunSession(ctx: Context, session: { id: string }, task: Task, periodKey?: string): Promise<void> {
	const sessionTitle = ctx.get("sessionTitle");
	if (sessionTitle === undefined || typeof sessionTitle.rename !== "function") return;
	let title: string;
	if (periodKey !== undefined) {
		// periodKey is like "2026-W35" (weekly) or "2026-08" (monthly).
		const isWeekly = periodKey.includes("-W");
		const label = isWeekly ? "日报" : "周报";
		title = `🕐 [${periodKey}] ${label} · ${task.name}`;
	} else {
		title = `🕐 ${task.name}`;
	}
	try {
		sessionTitle.rename(session as Parameters<typeof sessionTitle.rename>[0], title);
	} catch (error) {
		ctx.logger.warn(
			`scheduled-tasks: could not rename run session "${session.id}": ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
