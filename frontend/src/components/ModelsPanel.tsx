import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type { Model } from "../types";

interface ModelsPanelProps {
	onModelChange: (modelPath: string) => void;
	onModelSelect?: (model: Model) => void;
}

export function ModelsPanel({
	onModelChange,
	onModelSelect,
}: ModelsPanelProps) {
	const [models, setModels] = useState<Model[]>([]);
	const [currentModel, setCurrentModel] = useState<string>("");

	const loadModels = useCallback(async () => {
		const data = await api.getModels();
		setModels(data.models || []);
		setCurrentModel(data.current);
	}, []);

	useEffect(() => {
		loadModels();
	}, [loadModels]);

	const handleSwitch = async (path: string) => {
		const data = await api.switchModel(path);
		if (data.status === "success") {
			setCurrentModel(data.model_path);
			onModelChange(data.model_path);
		} else {
			alert(`切换失败: ${data.message || "未知错误"}`);
		}
	};

	const handleOpenFolder = (model: Model) => {
		if (model.folder_path) {
			api.openFolder(model.folder_path);
		}
	};

	const handleCopyPath = (model: Model) => {
		if (model.folder_path) {
			api.copyPath(model.folder_path);
		}
	};

	const handleOpenDataset = (model: Model) => {
		if (model.dataset_path) {
			api.openFolder(model.dataset_path);
		}
	};

	const handleCopyDatasetPath = (model: Model) => {
		if (model.dataset_path) {
			api.copyPath(model.dataset_path);
		}
	};

	const getSourceTag = (source: string) => {
		const tags: Record<string, { class: string; text: string }> = {
			pretrained: { class: "pretrained", text: "预训练" },
			default: { class: "default", text: "默认" },
			local: { class: "local", text: "本地训练" },
			custom: { class: "custom", text: "自定义" },
		};
		return tags[source] || { class: "custom", text: source };
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
			<div className="section-title">切换模型</div>
			<div className="model-list">
				{models.length === 0 ? (
					<div
						style={{
							color: "#666",
							fontSize: "12px",
							textAlign: "center",
							padding: "20px",
						}}
					>
						加载中...
					</div>
				) : (
					models.map((m) => {
						const tag = getSourceTag(m.source);
						const isSelected = m.path === currentModel;

						return (
							<div
								key={m.path}
								className={`model-item ${isSelected ? "selected" : ""}`}
								role="button"
								tabIndex={0}
								onClick={() => {
									handleSwitch(m.path);
									onModelSelect?.(m);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleSwitch(m.path);
										onModelSelect?.(m);
									}
								}}
							>
								<div className="model-header">
									<span className="model-name">{m.name}</span>
									<span className={`model-source-tag ${tag.class}`}>
										{tag.text}
									</span>
								</div>
								<div className="model-path">{m.path}</div>
								{(m.time || m.size_mb) && (
									<div
										className="model-meta"
										style={{
											fontSize: "10px",
											color: "#555",
											marginTop: "3px",
											display: "flex",
											gap: "12px",
										}}
									>
										{m.time && <span className="model-time">🕐 {m.time}</span>}
										{m.size_mb && (
											<span className="model-size">📦 {m.size_mb} MB</span>
										)}
									</div>
								)}
								<div className="model-actions">
									<button
										type="button"
										className="model-action-btn open-folder"
										onClick={(e) => {
											e.stopPropagation();
											handleOpenFolder(m);
										}}
									>
										📁 打开模型
									</button>
									<button
										type="button"
										className="model-action-btn copy-path"
										onClick={(e) => {
											e.stopPropagation();
											handleCopyPath(m);
										}}
									>
										📋 复制路径
									</button>
									{m.dataset_path && (
										<>
											<button
												type="button"
												className="model-action-btn open-folder"
												onClick={(e) => {
													e.stopPropagation();
													handleOpenDataset(m);
												}}
											>
												📁 打开数据集
											</button>
											<button
												type="button"
												className="model-action-btn copy-path"
												onClick={(e) => {
													e.stopPropagation();
													handleCopyDatasetPath(m);
												}}
											>
												📋 复制数据集路径
											</button>
										</>
									)}
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
