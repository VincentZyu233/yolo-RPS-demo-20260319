export interface Detection {
	class: string;
	conf: number;
	bbox: [number, number, number, number];
}

export interface Session {
	id: string;
	created: string;
	total: number;
	stats: {
		rock: number;
		paper: number;
		scissors: number;
	};
}

export interface Model {
	name: string;
	path: string;
	source: "pretrained" | "default" | "local" | "custom";
	time?: string;
	size_mb?: number;
	folder_path?: string;
	dataset_path?: string;
}

export interface DatasetInfo {
	available: boolean;
	path?: string;
	train_images?: number;
	valid_images?: number;
}

export interface TrainStatus {
	active: boolean;
	progress: number;
	message: string;
}

export interface CollectStatus {
	session_id: string | null;
	active: boolean;
	stats: {
		rock: number;
		paper: number;
		scissors: number;
	};
}

export interface ModelAnalysis {
	model_path: string;
	model_name: string;
	results_csv?: string;
	confusion_matrix?: string;
	confusion_matrix_normalized?: string;
	results_png?: string;
	pr_curve?: string;
	f1_curve?: string;
	p_curve?: string;
	r_curve?: string;
	train_batches?: string[];
	val_batches?: { labels: string; pred: string }[];
	args?: Record<string, unknown>;
	metrics?: {
		epochs: number[];
		train_loss: number[];
		val_loss: number[];
		precision: number[];
		recall: number[];
		mAP50: number[];
		mAP50_95: number[];
	};
	anchor_boxes?: {
		sizes: number[][];
		strides: number[];
	};
	feature_maps?: {
		name: string;
		size: string;
		channels: number;
	}[];
	nms_params?: {
		iou_threshold: number;
		conf_threshold: number;
	};
	model_architecture?: {
		backbone: string;
		neck: string;
		head: string;
		layers: {
			name: string;
			size: string;
		}[];
	};
}
