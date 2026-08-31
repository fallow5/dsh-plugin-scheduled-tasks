/**
 * Share dialog: modal for selecting messages and creating a share.
 *
 * Triggered from the session context menu; renders a modal overlay with
 * a message list (checkboxes for non-contiguous selection), visibility
 * options (public/password), and a create button.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import type { TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CreateShareResult, MessagePreview } from "../types.js";
import type { SharesRemote } from "./remote.js";

/** The translate seat of this plugin's `session-shares` locale namespace. */
export type PanelTranslate = TranslateNS<"session-shares">;

/** Props for the share dialog. */
export interface ShareDialogProps {
	/** The session id to share. */
	sessionId: string;
	/** The remote handle. */
	shares: SharesRemote;
	/** Translate seat. */
	t: PanelTranslate;
	/** Close the dialog. */
	onClose: () => void;
	/** Pre-selected message seqs (from selection mode). */
	preSelectedSeqs?: number[];
}

/** One message row in the selection list. */
function MessageRow({
	message,
	selected,
	onToggle,
	roleLabel,
}: {
	message: MessagePreview;
	selected: boolean;
	onToggle: () => void;
	roleLabel: string;
}) {
	const [expanded, setExpanded] = useState(false);
	const displayContent = message.content.length > 200 && !expanded
		? `${message.content.slice(0, 200)}…`
		: message.content;
	return (
		<div
			className={`dsh-shares-message-item ${selected ? "selected" : ""}`}
			onClick={onToggle}
		>
			<input
				type="checkbox"
				className="dsh-shares-message-checkbox"
				checked={selected}
				onChange={onToggle}
				onClick={(e) => e.stopPropagation()}
			/>
			<div className="dsh-shares-message-content">
				<div className="dsh-shares-message-role">
					{roleLabel}
					{message.toolName !== undefined ? ` · ${message.toolName}` : ""}
				</div>
				<div
					className={`dsh-shares-message-text ${expanded ? "expanded" : ""}`}
					onClick={(e) => {
						e.stopPropagation();
						setExpanded((v) => !v);
					}}
				>
					{displayContent || "(empty)"}
				</div>
			</div>
		</div>
	);
}

/** The share dialog component. */
export function ShareDialog({ sessionId, shares, t, onClose, preSelectedSeqs }: ShareDialogProps) {
	const [messages, setMessages] = useState<MessagePreview[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<Set<number>>(
		() => new Set(preSelectedSeqs ?? []),
	);
	const [visibility, setVisibility] = useState<"public" | "password">("public");
	const [password, setPassword] = useState("");
	const [creating, setCreating] = useState(false);
	const [result, setResult] = useState<CreateShareResult | null>(null);
	const [copied, setCopied] = useState(false);

	// Fetch the session preview.
	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);
		const res = await shares.preview(sessionId);
		if (res.ok) {
			setMessages(res.value.messages);
			// If pre-selected seqs were provided, use them; otherwise pre-select all user/assistant.
			if (preSelectedSeqs !== undefined && preSelectedSeqs.length > 0) {
				setSelected(new Set(preSelectedSeqs));
			} else {
				setSelected(
					new Set(
						res.value.messages
							.filter((m) => m.role === "user" || m.role === "assistant")
							.map((m) => m.seq),
					),
				);
			}
		} else {
			setError(res.error.message);
		}
		setLoading(false);
	}, [shares, sessionId, preSelectedSeqs]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	// Close on Escape.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !creating) onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, creating]);

	const toggleMessage = useCallback((seq: number) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(seq)) next.delete(seq);
			else next.add(seq);
			return next;
		});
	}, []);

	const selectAll = useCallback(() => {
		setSelected(new Set(messages.map((m) => m.seq)));
	}, [messages]);

	const deselectAll = useCallback(() => {
		setSelected(new Set());
	}, []);

	const handleCreate = useCallback(async () => {
		if (selected.size === 0) return;
		if (visibility === "password" && password.length === 0) return;
		setCreating(true);
		setError(null);
		const res = await shares.create({
			sessionId,
			selectedSeqs: [...selected],
			visibility,
			...(visibility === "password" ? { password } : {}),
		});
		if (res.ok) {
			setResult(res.value);
		} else {
			setError(res.error.message);
		}
		setCreating(false);
	}, [shares, sessionId, selected, visibility, password]);

	const handleCopy = useCallback(async () => {
		if (result === null) return;
		try {
			await navigator.clipboard.writeText(result.url);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			// fallback: select the input
		}
	}, [result]);

	const roleLabel = useCallback(
		(role: "user" | "assistant" | "tool"): string => {
			if (role === "user") return t("previewUser");
			if (role === "assistant") return t("previewAssistant");
			return t("previewTool");
		},
		[t],
	);

	const canCreate = selected.size > 0 && !creating && (visibility === "public" || password.length > 0);

	const dialogContent = useMemo(() => {
		if (result !== null) {
			return (
				<div className="dsh-shares-result">
					<div style={{ fontSize: "14px", marginBottom: "8px" }}>
						✅ {t("shareUrl")}:
					</div>
					<div className="dsh-shares-url-row">
						<input
							className="dsh-shares-url-input"
							type="text"
							value={result.url}
							readOnly
							onClick={(e) => (e.target as HTMLInputElement).select()}
						/>
						<button
							type="button"
							className="dsh-shares-btn dsh-shares-btn-primary"
							onClick={() => void handleCopy()}
						>
							{copied ? t("copied") : t("copyLink")}
						</button>
					</div>
					<div style={{ fontSize: "12px", color: "var(--dsh-text-dim, #888)", marginTop: "8px" }}>
						{t("selectMessages")}: {result.share.selectedSeqs.length} / {messages.length}
					</div>
				</div>
			);
		}
		return (
			<>
				{loading ? (
					<div className="dsh-shares-loading">{t("previewLoading")}</div>
				) : error !== null ? (
					<div className="dsh-shares-error">{error}</div>
				) : messages.length === 0 ? (
					<div className="dsh-shares-loading">{t("previewEmpty")}</div>
				) : (
					<>
						<div className="dsh-shares-toolbar">
							<button type="button" onClick={selectAll}>{t("selectAll")}</button>
							<button type="button" onClick={deselectAll}>{t("deselectAll")}</button>
							<span className="spacer" />
							<span style={{ fontSize: "12px", color: "var(--dsh-text-dim, #888)" }}>
								{selected.size} / {messages.length}
							</span>
						</div>
						<div className="dsh-shares-message-list">
							{messages.map((msg) => (
								<MessageRow
									key={msg.seq}
									message={msg}
									selected={selected.has(msg.seq)}
									onToggle={() => toggleMessage(msg.seq)}
									roleLabel={roleLabel(msg.role)}
								/>
							))}
						</div>
					</>
				)}
			</>
		);
	}, [result, loading, error, messages, selected, t, selectAll, deselectAll, toggleMessage, roleLabel, copied, handleCopy]);

	const footerContent = useMemo(() => {
		if (result !== null) {
			return (
				<div className="dsh-shares-actions">
					<button
						type="button"
						className="dsh-shares-btn dsh-shares-btn-primary"
						onClick={onClose}
					>
						{t("close")}
					</button>
				</div>
			);
		}
		return (
			<>
				{error === null && !loading && (
					<>
						<div className="dsh-shares-visibility-row">
							<label>
								<input
									type="radio"
									name="visibility"
									checked={visibility === "public"}
									onChange={() => setVisibility("public")}
								/>
								{t("public")}
							</label>
							<label>
								<input
									type="radio"
									name="visibility"
									checked={visibility === "password"}
									onChange={() => setVisibility("password")}
								/>
								{t("password")}
							</label>
						</div>
						{visibility === "password" && (
							<input
								className="dsh-shares-password-input"
								type="password"
								placeholder={t("passwordPlaceholder")}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						)}
					</>
				)}
				<div className="dsh-shares-actions">
					<button
						type="button"
						className="dsh-shares-btn dsh-shares-btn-secondary"
						onClick={onClose}
						disabled={creating}
					>
						{t("cancel")}
					</button>
					<button
						type="button"
						className="dsh-shares-btn dsh-shares-btn-primary"
						onClick={() => void handleCreate()}
						disabled={!canCreate}
					>
						{creating ? t("creating") : t("createShare")}
					</button>
				</div>
			</>
		);
	}, [result, error, loading, visibility, password, creating, canCreate, t, onClose, handleCreate]);

	return createPortal(
		<div className="dsh-shares-overlay" onClick={(e) => { if (e.target === e.currentTarget && !creating) onClose(); }}>
			<div className="dsh-shares-dialog">
				<div className="dsh-shares-dialog-header">
					<h2>{t("shareSession")}</h2>
					<button
						type="button"
						className="dsh-shares-dialog-close"
						onClick={() => { if (!creating) onClose(); }}
					>
						✕
					</button>
				</div>
				<div className="dsh-shares-dialog-body">
					{dialogContent}
				</div>
				<div className="dsh-shares-dialog-footer">
					{footerContent}
				</div>
			</div>
		</div>,
		document.body,
	);
}
