import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type { CollectStatus, DatasetInfo } from "../types";

interface CollectPanelProps {
	onSessionsChange: () => void;
}

export function CollectPanel({ onSessionsChange }: CollectPanelProps) {
	const [status, setStatus] = useState<CollectStatus | null>(null);
	const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
	const [selectedDataset, setSelectedDataset] = useState<"custom" | "local">(
		"custom",
	);
	const [flashKey, setFlashKey] = useState<string | null>(null);

	const loadStatus = useCallback(async () => {
		const data = await api.getCollectStatus();
		setStatus(data);
	}, []);

	const loadDatasetInfo = useCallback(async () => {
		const data = await api.getDataset();
		setDatasetInfo(data);
	}, []);

	const stopCollect = useCallback(async () => {
		await api.stopCollect();
		await loadStatus();
		onSessionsChange();
	}, [loadStatus, onSessionsChange]);

	const takeSnapshot = useCallback(
		async (gesture: "rock" | "paper" | "scissors") => {
			if (!status?.active) return;
			const data = await api.takeSnapshot(gesture);
			if (data.status === "saved") {
				setStatus((prev) => (prev ? { ...prev, stats: data.counts } : null));
				setFlashKey(gesture);
				setTimeout(() => setFlashKey(null), 200);
			}
		},
		[status?.active],
	);

	useEffect(() => {
		loadStatus();
		loadDatasetInfo();
	}, [loadStatus, loadDatasetInfo]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!status?.active) return;
			const key = e.key.toLowerCase();
			if (key === "r") takeSnapshot("rock");
			else if (key === "p") takeSnapshot("paper");
			else if (key === "s") takeSnapshot("scissors");
			else if (key === "q") stopCollect();
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [status?.active, takeSnapshot, stopCollect]);

	const startCollect = async () => {
		await api.startCollect();
		await loadStatus();
		onSessionsChange();
	};

	const startTrainCustom = async () => {
		if (!status?.session_id) {
			alert("请先选择或新建一个 Session!");
			return;
		}
		await api.startTrain(status.session_id, 50);
	};

	const startTrainLocal = async () => {
		if (!datasetInfo?.available) {
			alert("本地数据集不可用!");
			return;
		}
		await api.startTrainLocal(50);
	};

	return (
		<div
			className="panel-section"
			style={{ flex: 1, display: "flex", flexDirection: "column" }}
		>
			<div
				className="current-session"
				style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}
			>
				Session:{" "}
				<strong style={{ color: "#4ecca3" }}>
					{status?.session_id || "未选择"}
				</strong>
			</div>

			<div className="stats">
				<div className="stat rock">
					<div className="stat-value">{status?.stats.rock || 0}</div>
					<div className="stat-label">石头</div>
				</div>
				<div className="stat paper">
					<div className="stat-value">{status?.stats.paper || 0}</div>
					<div className="stat-label">布</div>
				</div>
				<div className="stat scissors">
					<div className="stat-value">{status?.stats.scissors || 0}</div>
					<div className="stat-label">剪刀</div>
				</div>
			</div>

			<div className="dataset-selector">
				<select
					value={selectedDataset}
					onChange={(e) =>
						setSelectedDataset(e.target.value as "custom" | "local")
					}
				>
					<option value="custom">自定义采集数据</option>
					<option value="local">本地预下载数据集</option>
				</select>
			</div>

			<div className="dataset-info">
				{datasetInfo?.available ? (
					<>
						<span className="available">✓ 本地数据集可用</span>
						<br />
						训练集: {datasetInfo.train_images} 张 | 验证集:{" "}
						{datasetInfo.valid_images} 张<br />
						<small>{datasetInfo.path}</small>
					</>
				) : (
					<span className="unavailable">✗ 本地数据集未找到</span>
				)}
			</div>

			<div className="hotkeys">
				<span className={`key rock ${flashKey === "rock" ? "flash" : ""}`}>
					R
				</span>
				<span className={`key paper ${flashKey === "paper" ? "flash" : ""}`}>
					P
				</span>
				<span
					className={`key scissors ${flashKey === "scissors" ? "flash" : ""}`}
				>
					S
				</span>
			</div>

			<button type="button" className="btn btn-new" onClick={startCollect}>
				新建采集
			</button>

			{status?.active ? (
				<button type="button" className="btn btn-stop" onClick={stopCollect}>
					停止采集
				</button>
			) : (
				<button type="button" className="btn btn-start" onClick={startCollect}>
					开始采集
				</button>
			)}

			<button
				type="button"
				className="btn btn-train"
				onClick={startTrainCustom}
			>
				训练(自定义数据)
			</button>

			<button
				type="button"
				className="btn btn-train"
				style={{ background: "#e94560" }}
				onClick={startTrainLocal}
				disabled={!datasetInfo?.available}
			>
				训练(本地数据集)
			</button>
		</div>
	);
}
