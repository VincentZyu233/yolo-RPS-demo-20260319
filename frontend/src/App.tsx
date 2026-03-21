import { useCallback, useEffect, useState } from "react";
import { CollectPanel } from "./components/CollectPanel";
import { ModelAnalysisPanel } from "./components/ModelAnalysisPanel";
import { ModelsPanel } from "./components/ModelsPanel";
import { SessionsPanel } from "./components/SessionsPanel";
import { VideoCanvas } from "./components/VideoCanvas";
import { useWebSocket } from "./hooks/useWebSocket";
import { api } from "./services/api";
import type { Model } from "./types";
import "./styles/global.css";

type TabType = "capture" | "history" | "model";

const VALID_TABS: TabType[] = ["capture", "history", "model"];

function getTabFromUrl(): TabType | null {
	const params = new URLSearchParams(window.location.search);
	const tab = params.get("tab");
	if (tab && VALID_TABS.includes(tab as TabType)) {
		return tab as TabType;
	}
	return null;
}

function updateUrlTab(tab: TabType) {
	const url = new URL(window.location.href);
	url.searchParams.set("tab", tab);
	window.history.replaceState({}, "", url.toString());
}

export default function App() {
	const [currentTab, setCurrentTab] = useState<TabType>(() => {
		// 从 URL 读取 tab，如果没有则默认为 model
		return getTabFromUrl() || "model";
	});
	const [currentModelName, setCurrentModelName] = useState<string>("加载中...");
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [selectedModel, setSelectedModel] = useState<Model | null>(null);

	const { frame, detections, connected, reconnect } = useWebSocket();

	const loadCurrentModel = useCallback(async () => {
		const data = await api.getModels();
		const current = data.models?.find((m) => m.path === data.current);
		setCurrentModelName(current?.name || data.current || "未知模型");
	}, []);

	useEffect(() => {
		loadCurrentModel();
	}, [loadCurrentModel]);

	// tab 变化时更新 URL
	useEffect(() => {
		updateUrlTab(currentTab);
	}, [currentTab]);

	// 监听浏览器前进/后退按钮，同步 tab 状态
	useEffect(() => {
		const handlePopState = () => {
			const tabFromUrl = getTabFromUrl();
			if (tabFromUrl && tabFromUrl !== currentTab) {
				setCurrentTab(tabFromUrl);
			}
		};

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [currentTab]);

	const handleSessionSelect = () => {
		setCurrentTab("capture");
	};

	const handleModelChange = () => {
		loadCurrentModel();
	};

	const handleSessionsChange = () => {
		setRefreshTrigger((prev) => prev + 1);
	};

	const detectionText =
		detections.length > 0
			? detections
					.map((d) => `${d.class} (${(d.conf * 100).toFixed(1)}%)`)
					.join(", ")
			: "未检测到手势";

	return (
		<div className="app-layout">
			<div className="left-panel">
				<div className="panel-header">
					<h1 className="panel-title">Rock Paper Scissors</h1>
					<div className="model-indicator">
						当前模型: <strong>{currentModelName}</strong>
					</div>
				</div>

				<VideoCanvas frame={frame} detections={detections} />

				<div className="detection-info">
					{detectionText}
					{!connected && (
						<span style={{ color: "#e94560" }}>
							{" "}
							(连接断开)
							<button
								type="button"
								onClick={reconnect}
								style={{
									marginLeft: "8px",
									padding: "2px 8px",
									fontSize: "11px",
									cursor: "pointer",
									background: "#e94560",
									border: "none",
									borderRadius: "3px",
									color: "#fff",
								}}
							>
								重连
							</button>
						</span>
					)}
				</div>
			</div>

			<div className="center-panel">
				<div className="mode-tabs">
					<button
						type="button"
						className={`mode-tab ${currentTab === "capture" ? "active" : ""}`}
						onClick={() => setCurrentTab("capture")}
					>
						采集
					</button>
					<button
						type="button"
						className={`mode-tab ${currentTab === "history" ? "active" : ""}`}
						onClick={() => setCurrentTab("history")}
					>
						历史
					</button>
					<button
						type="button"
						className={`mode-tab ${currentTab === "model" ? "active" : ""}`}
						onClick={() => setCurrentTab("model")}
					>
						模型
					</button>
				</div>

				{currentTab === "capture" && (
					<CollectPanel onSessionsChange={handleSessionsChange} />
				)}

				{currentTab === "history" && (
					<SessionsPanel
						onSelectSession={handleSessionSelect}
						refreshTrigger={refreshTrigger}
					/>
				)}

				{currentTab === "model" && (
					<ModelsPanel
						onModelChange={handleModelChange}
						onModelSelect={setSelectedModel}
					/>
				)}
			</div>

			<div className="right-panel">
				<ModelAnalysisPanel selectedModel={selectedModel} />
			</div>
		</div>
	);
}
