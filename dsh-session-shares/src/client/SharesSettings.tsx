/**
 * Shares settings section. Registered into the `settings.section` slot;
 * shows all shares with cancel (revoke) and open-link actions.
 *
 * @module @opendsh/dsh-plugin-session-shares
 */

import type { SnapshotSelectorHook, TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import { useCallback, useEffect, useState } from "react";
import type { ShareView } from "../types.js";
import type { SharesRemote } from "./remote.js";

/** The translate seat of this plugin's `session-shares` locale namespace. */
export type PanelTranslate = TranslateNS<"session-shares">;

/** Props for the shares settings section. */
export interface SharesSettingsProps {
	/** Injected `remote.shares` handle. */
	shares: SharesRemote;
	/** Framework-injected translate seat (namespace `session-shares`). */
	t: PanelTranslate;
}

/** Format an epoch ms timestamp as a locale string. */
function formatTime(epochMs: number): string {
	return new Date(epochMs).toLocaleString();
}

/** Shares settings section component. */
export function SharesSettings({ shares, t }: SharesSettingsProps) {
	const [shareList, setShareList] = useState<ShareView[]>([]);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setLoading(true);
		const res = await shares.list();
		if (res.ok) {
			setShareList(res.value);
		} else {
			setMessage(res.error.message);
		}
		setLoading(false);
	}, [shares]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const handleDelete = useCallback(async (id: string) => {
		const confirmed = window.confirm(t("settingsCancelShareConfirm"));
		if (!confirmed) return;
		const res = await shares.delete(id);
		if (res.ok) {
			await refresh();
		} else {
			setMessage(res.error.message);
		}
	}, [shares, refresh, t]);

	const handleOpen = useCallback((url: string) => {
		window.open(url, "_blank", "noopener,noreferrer");
	}, []);

	return (
		<div>
			<div style={{ marginBottom: "12px", fontSize: "13px", color: "var(--dsh-text-dim, #888)" }}>
				{t("settingsDescription")}
			</div>
			{message !== null && (
				<div style={{ padding: "8px", marginBottom: "8px", color: "#ff6b6b", fontSize: "13px" }}>
					{message}
				</div>
			)}
			{loading ? (
				<div className="dsh-shares-settings-empty">{t("previewLoading")}</div>
			) : shareList.length === 0 ? (
				<div className="dsh-shares-settings-empty">{t("settingsEmpty")}</div>
			) : (
				<table className="dsh-shares-settings-table">
					<thead>
						<tr>
							<th>{t("settingsSession")}</th>
							<th>{t("settingsVisibility")}</th>
							<th>{t("settingsCreated")}</th>
							<th>{t("settingsActions")}</th>
						</tr>
					</thead>
					<tbody>
						{shareList.map((share) => (
							<tr key={share.id}>
								<td className="title-cell" title={share.title}>{share.title}</td>
								<td>
									<span className={`dsh-shares-badge ${share.visibility}`}>
										{share.visibility === "password" ? `🔒 ${t("password")}` : t("public")}
									</span>
								</td>
								<td>{formatTime(share.createdAt)}</td>
								<td>
									<div className="dsh-shares-settings-actions">
										<button
											type="button"
											onClick={() => handleOpen(`${window.location.origin}/share/${share.id}`)}
										>
											{t("settingsOpenLink")}
										</button>
										<button
											type="button"
											className="danger"
											onClick={() => void handleDelete(share.id)}
										>
											{t("settingsCancelShare")}
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
