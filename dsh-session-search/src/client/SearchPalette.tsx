/**
 * SearchPalette: a VSCode-style quick-pick palette for searching within
 * the current session's message content.
 *
 * Features:
 *  - Centered modal at the top of the viewport
 *  - Search input with debounced server-side search
 *  - Results list with role badges, snippets, and match highlighting
 *  - Keyboard navigation (↑/↓ to move, Enter to jump, Esc to close)
 *  - Click to jump to the matching message
 *
 * @module @opendsh/dsh-plugin-session-search
 */

import {
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { SessionSearchRemote, SearchHit } from "./remote.js";

/** Locale translate function. */
export type PanelTranslate = (key: string, params?: Record<string, unknown>) => string;

/** Props for the SearchPalette component. */
export interface SearchPaletteProps {
	/** The current session id (undefined if no session is active). */
	sessionId: string | undefined;
	/** The remote sessionSearch namespace. */
	sessionSearch: SessionSearchRemote;
	/** Locale translate function. */
	t: PanelTranslate;
	/** Called when the palette should close. */
	onClose: () => void;
	/** Called when the user selects a result to jump to. */
	onJump: (seq: number) => void;
}

/** Debounce delay for search (ms). */
const SEARCH_DEBOUNCE_MS = 200;

/** Minimum query length to trigger a search. */
const MIN_QUERY_LENGTH = 1;

/** Escape all regex special characters in a string. */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Highlight all occurrences of `query` in `text` with <mark> tags. */
function highlightText(text: string, query: string): string {
	if (query.length === 0) return text;
	const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
	const parts = text.split(regex);
	return parts
		.map((part) =>
			regex.test(part)
				? `<mark class="dshss-highlight">${escapeHtml(part)}</mark>`
				: escapeHtml(part),
		)
		.join("");
}

/** Escape HTML special characters. */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Render a snippet with the query highlighted. */
function renderSnippet(snippet: string, query: string): string {
	return highlightText(snippet, query);
}

/** Role badge class for a role. */
function roleBadgeClass(role: SearchHit["role"]): string {
	switch (role) {
		case "user":
			return "dshss-roleUser";
		case "assistant":
			return "dshss-roleAssistant";
		case "tool":
			return "dshss-roleTool";
		default:
			return "dshss-roleAssistant";
	}
}

/** Role label for a role. */
function roleLabel(role: SearchHit["role"], t: PanelTranslate): string {
	switch (role) {
		case "user":
			return t("roleUser");
		case "assistant":
			return t("roleAssistant");
		case "tool":
			return t("roleTool");
		default:
			return role;
	}
}

/** SearchPalette component. */
export function SearchPalette({
	sessionId,
	sessionSearch,
	t,
	onClose,
	onJump,
}: SearchPaletteProps) {
	const [query, setQuery] = useState("");
	const [hits, setHits] = useState<SearchHit[]>([]);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const resultsRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);

	// Focus the input on mount.
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// Close on Escape.
	useEffect(() => {
		const onKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				onClose();
			}
		};
		window.addEventListener("keydown", onKeyDown, true);
		return () => {
			window.removeEventListener("keydown", onKeyDown, true);
		};
	}, [onClose]);

	// Debounced search.
	const doSearch = useCallback(
		async (q: string) => {
			if (sessionId === undefined || q.trim().length < MIN_QUERY_LENGTH) {
				setHits([]);
				setHasMore(false);
				setError(null);
				setLoading(false);
				return;
			}

			// Cancel previous in-flight search.
			if (abortRef.current !== null) {
				abortRef.current.abort();
			}

			setLoading(true);
			setError(null);

			try {
				const result = await sessionSearch.search({
					sessionId,
					query: q.trim(),
				});
				if (result.ok) {
					setHits(result.value.hits);
					setHasMore(result.value.hasMore);
				} else {
					setError(result.error.message || t("error"));
					setHits([]);
					setHasMore(false);
				}
			} catch (e) {
				setError(e instanceof Error ? e.message : t("error"));
				setHits([]);
				setHasMore(false);
			} finally {
				setLoading(false);
			}
		},
		[sessionId, sessionSearch, t],
	);

	// Debounce the search.
	useEffect(() => {
		if (query.trim().length < MIN_QUERY_LENGTH) {
			setHits([]);
			setHasMore(false);
			setError(null);
			setLoading(false);
			return;
		}
		setLoading(true);
		const timer = window.setTimeout(() => {
			void doSearch(query);
		}, SEARCH_DEBOUNCE_MS);
		return () => {
			window.clearTimeout(timer);
		};
	}, [query, doSearch]);

	// Reset active index when hits change.
	useEffect(() => {
		setActiveIndex(0);
	}, [hits]);

	// Scroll the active result into view within the results list.
	useEffect(() => {
		if (resultsRef.current === null) return;
		const activeEl = resultsRef.current.children[activeIndex] as HTMLElement | undefined;
		if (activeEl !== undefined) {
			activeEl.scrollIntoView({ block: "nearest" });
		}
	}, [activeIndex]);

	// Keyboard navigation.
	const handleKeyDown = useCallback(
		(e: ReactKeyboardEvent<HTMLDivElement>) => {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setActiveIndex((prev) => Math.min(prev + 1, hits.length - 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setActiveIndex((prev) => Math.max(prev - 1, 0));
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (hits.length > 0 && activeIndex < hits.length) {
					onJump(hits[activeIndex].seq);
				}
			}
		},
		[hits, activeIndex, onJump],
	);

	// Click on backdrop to close.
	const handleBackdropClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (e.target === e.currentTarget) {
				onClose();
			}
		},
		[onClose],
	);

	const countText = useMemo(() => {
		if (loading) return t("searching");
		if (error !== null) return "";
		if (hits.length === 0) return "";
		return t("results").replace("{count}", String(hits.length));
	}, [loading, error, hits.length, t]);

	const showHint = hits.length > 0 || query.trim().length > 0;

	return (
		<div className="dshss-overlay" onClick={handleBackdropClick}>
			<div
				className="dshss-palette"
				onKeyDown={handleKeyDown}
				role="dialog"
				aria-modal="true"
				aria-label={t("placeholder")}
			>
				{/* ── Search input ─────────────────────────────────────────── */}
				<div className="dshss-inputRow">
					<svg
						className="dshss-searchIcon"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
					>
						<circle cx="7" cy="7" r="5" />
						<line x1="11" y1="11" x2="14" y2="14" />
					</svg>
					<input
						ref={inputRef}
						className="dshss-input"
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={
							sessionId === undefined ? t("error") : t("placeholder")
						}
						disabled={sessionId === undefined}
						spellCheck={false}
						autoComplete="off"
					/>
					{countText.length > 0 && <span className="dshss-count">{countText}</span>}
				</div>

				{/* ── Results ───────────────────────────────────────────────── */}
				<div className="dshss-results" ref={resultsRef}>
					{error !== null ? (
						<div className={`dshss-state dshss-stateError`}>{error}</div>
					) : loading ? (
						<div className="dshss-state">{t("searching")}</div>
					) : query.trim().length === 0 ? (
						<div className="dshss-state" />
					) : hits.length === 0 ? (
						<div className="dshss-state">{t("noResults")}</div>
					) : (
						hits.map((hit, index) => (
							<div
								key={hit.seq}
								className={`dshss-result${index === activeIndex ? " dshss-active" : ""}`}
								onClick={() => onJump(hit.seq)}
								onMouseEnter={() => setActiveIndex(index)}
							>
								<div className="dshss-resultRole">
									<span className={`dshss-roleBadge ${roleBadgeClass(hit.role)}`}>
										{roleLabel(hit.role, t)}
									</span>
									{hit.toolName !== undefined && (
										<span className="dshss-toolName">{hit.toolName}</span>
									)}
								</div>
								<div
									className="dshss-snippet"
									// biome-ignore lint/security/noDangerouslySetInnerHtml: snippet is server-generated and HTML-escaped
									dangerouslySetInnerHTML={{
										__html: renderSnippet(hit.snippet, query.trim()),
									}}
								/>
							</div>
						))
					)}
				</div>

				{/* ── Footer ────────────────────────────────────────────────── */}
				{hasMore && <div className="dshss-moreResults">{t("moreResults")}</div>}
				{showHint && (
					<div className="dshss-hint">{t("hint")}</div>
				)}
			</div>
		</div>
	);
}
