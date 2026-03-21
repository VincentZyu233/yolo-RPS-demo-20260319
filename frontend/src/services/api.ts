import type {
	CollectStatus,
	DatasetInfo,
	Model,
	ModelAnalysis,
	Session,
	TrainStatus,
} from "../types";

const API_BASE = "/api";

export const api = {
	async getSessions(): Promise<{ sessions: Session[] }> {
		const res = await fetch(`${API_BASE}/sessions`);
		return res.json();
	},

	async selectSession(sessionId: string): Promise<{
		status: string;
		session_id: string;
		counts: { rock: number; paper: number; scissors: number };
	}> {
		const res = await fetch(
			`${API_BASE}/sessions/select?session_id=${sessionId}`,
			{ method: "POST" },
		);
		return res.json();
	},

	async getModels(): Promise<{ models: Model[]; current: string }> {
		const res = await fetch(`${API_BASE}/models`);
		return res.json();
	},

	async switchModel(
		modelPath: string,
	): Promise<{ status: string; model_path: string; message?: string }> {
		const res = await fetch(`${API_BASE}/models/switch`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ model_path: modelPath }),
		});
		return res.json();
	},

	async getDataset(): Promise<DatasetInfo> {
		const res = await fetch(`${API_BASE}/dataset`);
		return res.json();
	},

	async getCollectStatus(): Promise<CollectStatus> {
		const res = await fetch(`${API_BASE}/collect/status`);
		return res.json();
	},

	async startCollect(): Promise<{
		session_id: string;
		counts: { rock: number; paper: number; scissors: number };
	}> {
		const res = await fetch(`${API_BASE}/collect/start`, { method: "POST" });
		return res.json();
	},

	async stopCollect(): Promise<{
		session_id: string;
		counts: { rock: number; paper: number; scissors: number };
	}> {
		const res = await fetch(`${API_BASE}/collect/stop`, { method: "POST" });
		return res.json();
	},

	async takeSnapshot(gesture: "rock" | "paper" | "scissors"): Promise<{
		status: string;
		counts: { rock: number; paper: number; scissors: number };
	}> {
		const res = await fetch(`${API_BASE}/collect/snapshot`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ gesture }),
		});
		return res.json();
	},

	async startTrain(sessionId: string, epochs: number = 50): Promise<void> {
		await fetch(
			`${API_BASE}/train/start?session_id=${sessionId}&epochs=${epochs}`,
			{ method: "POST" },
		);
	},

	async startTrainLocal(epochs: number = 50): Promise<void> {
		await fetch(`${API_BASE}/train/local?epochs=${epochs}`, { method: "POST" });
	},

	async getTrainStatus(): Promise<TrainStatus> {
		const res = await fetch(`${API_BASE}/train/status`);
		return res.json();
	},

	async openFolder(folderPath: string): Promise<void> {
		await fetch(`${API_BASE}/folder/open`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ folder_path: folderPath }),
		});
	},

	async copyPath(path: string): Promise<void> {
		await fetch(`${API_BASE}/path/copy`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path }),
		});
	},

	async getModelAnalysis(modelPath: string): Promise<ModelAnalysis> {
		const res = await fetch(
			`${API_BASE}/models/analysis?model_path=${encodeURIComponent(modelPath)}`,
		);
		return res.json();
	},
};
