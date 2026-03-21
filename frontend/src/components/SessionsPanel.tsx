import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type { Session } from "../types";

interface SessionsPanelProps {
	onSelectSession: (sessionId: string) => void;
	refreshTrigger?: number;
}

export function SessionsPanel({
	onSelectSession,
	refreshTrigger,
}: SessionsPanelProps) {
	const [sessions, setSessions] = useState<Session[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const loadSessions = useCallback(async () => {
		const data = await api.getSessions();
		setSessions(data.sessions || []);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refreshTrigger is intentionally used to trigger refresh when parent changes it
	useEffect(() => {
		loadSessions();
	}, [loadSessions, refreshTrigger]);

	const handleSelect = async (id: string) => {
		const data = await api.selectSession(id);
		if (data.status === "selected") {
			setSelectedId(id);
			onSelectSession(id);
		}
	};

	return (
		<div
			className="panel-section"
			style={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
			}}
		>
			<div className="section-title">选择已有 Session</div>
			<div className="sessions-list">
				{sessions.length === 0 ? (
					<div
						style={{
							color: "#666",
							fontSize: "12px",
							textAlign: "center",
							padding: "20px",
						}}
					>
						暂无 Session
					</div>
				) : (
					sessions.map((s) => (
						<div
							key={s.id}
							className={`session-card ${s.id === selectedId ? "selected" : ""}`}
							role="button"
							tabIndex={0}
							onClick={() => handleSelect(s.id)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									handleSelect(s.id);
								}
							}}
						>
							<div className="session-header">
								<span className="session-time">{s.created}</span>
								<span className="session-total">{s.total} 张</span>
							</div>
							<div className="session-counts">
								<span className="rock">石:{s.stats.rock}</span>
								<span className="paper">布:{s.stats.paper}</span>
								<span className="scissors">剪:{s.stats.scissors}</span>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
