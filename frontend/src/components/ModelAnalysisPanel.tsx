import { toPng } from "html-to-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { api } from "../services/api";
import type { Model, ModelAnalysis } from "../types";

// 格式化日期时间为指定格式：YYYY年MM月DD日-HH-MM-SS
function formatDateTime(dateStr?: string): string {
	if (!dateStr) {
		const now = new Date();
		return `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月${String(now.getDate()).padStart(2, "0")}日-${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
	}
	// 尝试解析日期字符串
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) {
		// 如果解析失败，使用当前时间
		const now = new Date();
		return `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月${String(now.getDate()).padStart(2, "0")}日-${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
	}
	return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日-${String(date.getHours()).padStart(2, "0")}-${String(date.getMinutes()).padStart(2, "0")}-${String(date.getSeconds()).padStart(2, "0")}`;
}

// 简单的 CRC32 计算（用于 ZIP 文件）
function crc32(str: string): number {
	const table: number[] = [];
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let j = 0; j < 8; j++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[i] = c;
	}
	let crc = -1;
	for (let i = 0; i < str.length; i++) {
		crc = table[(crc ^ str.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ -1) >>> 0;
}

// 将字符串转换为 UTF-8 编码的字节数组
function stringToUtf8Bytes(str: string): Uint8Array {
	return new TextEncoder().encode(str);
}

// 创建 ZIP 文件（支持 UTF-8 文件名）
async function createZip(
	files: { name: string; data: string; isBase64?: boolean }[],
): Promise<Blob> {
	const zipParts: Uint8Array[] = [];
	let offset = 0;
	const centralDirectory: { header: Uint8Array; offset: number }[] = [];

	for (const file of files) {
		// 处理数据
		let dataBytes: Uint8Array;
		if (file.isBase64) {
			const binary = atob(file.data);
			dataBytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) {
				dataBytes[i] = binary.charCodeAt(i);
			}
		} else {
			dataBytes = stringToUtf8Bytes(file.data);
		}

		// 将文件名转为 UTF-8 字节
		const nameBytes = stringToUtf8Bytes(file.name);

		// 计算 CRC32（对数据字节）
		const dataForCrc = file.isBase64 ? atob(file.data) : file.data;
		const crc = crc32(dataForCrc);

		// 本地文件头
		const localHeader = new Uint8Array(30 + nameBytes.length);
		const view = new DataView(localHeader.buffer);
		view.setUint32(0, 0x04034b50, true); // 本地文件头签名
		view.setUint16(4, 20, true); // 版本
		view.setUint16(6, 0x0800, true); // 标志：第11位设置表示 UTF-8 编码文件名
		view.setUint16(8, 0, true); // 压缩方法 (0 = 不压缩)
		view.setUint16(10, 0, true); // 时间
		view.setUint16(12, 0, true); // 日期
		view.setUint32(14, crc, true); // CRC32
		view.setUint32(18, dataBytes.length, true); // 压缩后大小
		view.setUint32(22, dataBytes.length, true); // 未压缩大小
		view.setUint16(26, nameBytes.length, true); // 文件名长度
		view.setUint16(28, 0, true); // 额外字段长度
		localHeader.set(nameBytes, 30);

		zipParts.push(localHeader);
		zipParts.push(dataBytes);

		// 记录中央目录条目
		const cdHeader = new Uint8Array(46 + nameBytes.length);
		const cdView = new DataView(cdHeader.buffer);
		cdView.setUint32(0, 0x02014b50, true); // 中央目录签名
		cdView.setUint16(4, 20, true); // 创建版本
		cdView.setUint16(6, 20, true); // 需要版本
		cdView.setUint16(8, 0x0800, true); // 标志：第11位设置表示 UTF-8 编码文件名
		cdView.setUint16(10, 0, true); // 压缩方法
		cdView.setUint16(12, 0, true); // 时间
		cdView.setUint16(14, 0, true); // 日期
		cdView.setUint32(16, crc, true); // CRC32
		cdView.setUint32(20, dataBytes.length, true); // 压缩后大小
		cdView.setUint32(24, dataBytes.length, true); // 未压缩大小
		cdView.setUint16(28, nameBytes.length, true); // 文件名长度
		cdView.setUint16(30, 0, true); // 额外字段长度
		cdView.setUint16(32, 0, true); // 注释长度
		cdView.setUint16(34, 0, true); // 磁盘号
		cdView.setUint16(36, 0, true); // 内部文件属性
		cdView.setUint32(38, 0, true); // 外部文件属性
		cdView.setUint32(42, offset, true); // 本地文件头偏移
		cdHeader.set(nameBytes, 46);

		centralDirectory.push({ header: cdHeader, offset });
		offset += localHeader.length + dataBytes.length;
	}

	// 中央目录偏移
	const cdOffset = offset;

	// 添加中央目录
	for (const cd of centralDirectory) {
		zipParts.push(cd.header);
		offset += cd.header.length;
	}

	// 中央目录大小
	const cdSize = offset - cdOffset;

	// 结束记录
	const endRecord = new Uint8Array(22);
	const endView = new DataView(endRecord.buffer);
	endView.setUint32(0, 0x06054b50, true); // 结束记录签名
	endView.setUint16(4, 0, true); // 磁盘号
	endView.setUint16(6, 0, true); // 中央目录起始磁盘
	endView.setUint16(8, files.length, true); // 磁盘上条目数
	endView.setUint16(10, files.length, true); // 总条目数
	endView.setUint32(12, cdSize, true); // 中央目录大小
	endView.setUint32(16, cdOffset, true); // 中央目录偏移
	endView.setUint16(20, 0, true); // 注释长度

	zipParts.push(endRecord);

	// 合并所有部分
	const totalLength = zipParts.reduce((sum, part) => sum + part.length, 0);
	const result = new Uint8Array(totalLength);
	let position = 0;
	for (const part of zipParts) {
		result.set(part, position);
		position += part.length;
	}

	return new Blob([result], { type: "application/zip" });
}

interface ModelAnalysisPanelProps {
	selectedModel: Model | null;
}

// 训练参数说明
const PARAM_DESCRIPTIONS: Record<string, { desc: string; purpose: string }> = {
	task: {
		desc: "任务类型",
		purpose:
			"指定YOLO的任务类型：detect(检测)、segment(分割)、classify(分类)、pose(姿态)",
	},
	mode: {
		desc: "运行模式",
		purpose: "train(训练)、val(验证)、predict(预测)、export(导出)",
	},
	model: {
		desc: "模型文件",
		purpose: "指定预训练模型权重文件的路径，如 yolov8n.pt、yolov8s.pt 等",
	},
	data: {
		desc: "数据配置文件",
		purpose: "指定数据集YAML配置文件路径，包含训练/验证数据路径和类别信息",
	},
	epochs: {
		desc: "训练轮数",
		purpose: "模型遍历整个数据集的次数。值越大训练越充分，但过大会导致过拟合",
	},
	time: {
		desc: "训练时间限制",
		purpose: "设置最大训练时间(小时)，到达后自动停止。null表示不限制",
	},
	patience: {
		desc: "早停耐心值",
		purpose: "验证指标连续多少轮没有改善就停止训练。防止过拟合，节省训练时间",
	},
	batch: {
		desc: "批次大小",
		purpose:
			"每次迭代使用的样本数。值越大训练越快但占用更多显存，需根据GPU调整",
	},
	imgsz: {
		desc: "输入图像尺寸",
		purpose: "训练和推理时图像被调整的大小。通常是640，越大精度越高但速度越慢",
	},
	save: {
		desc: "保存训练结果",
		purpose: "是否保存训练过程中的模型权重和日志",
	},
	save_period: {
		desc: "保存周期",
		purpose: "每隔多少轮保存一次模型。-1表示只保存最佳和最后一个模型",
	},
	cache: {
		desc: "数据缓存",
		purpose: "是否将数据集加载到内存中缓存。true加速训练但需要更多内存",
	},
	device: {
		desc: "计算设备",
		purpose: "训练使用的设备：0(第一块GPU)、cpu(CPU训练)、0,1,2,3(多GPU)",
	},
	workers: {
		desc: "数据加载线程数",
		purpose: "加载数据的CPU线程数。值越大数据加载越快，但占用更多CPU资源",
	},
	project: {
		desc: "项目目录",
		purpose: "训练结果保存的根目录",
	},
	name: {
		desc: "训练名称",
		purpose: "本次训练的子目录名称，用于区分不同实验",
	},
	lr0: {
		desc: "初始学习率",
		purpose: "优化器的初始学习率。过大导致不稳定，过小收敛慢",
	},
	lrf: {
		desc: "最终学习率系数",
		purpose: "最终学习率 = lr0 * lrf。控制学习率衰减程度",
	},
	momentum: {
		desc: "动量",
		purpose: "SGD优化器的动量因子，加速收敛并减少震荡",
	},
	weight_decay: {
		desc: "权重衰减",
		purpose: "L2正则化系数，防止过拟合。值越大正则化越强",
	},
	warmup_epochs: {
		desc: "预热轮数",
		purpose: "训练开始时学习率从0逐渐上升到lr0的轮数，稳定训练初期",
	},
	box: {
		desc: "边界框损失权重",
		purpose: "检测框定位损失的权重系数",
	},
	cls: {
		desc: "分类损失权重",
		purpose: "类别分类损失的权重系数",
	},
	dfl: {
		desc: "分布焦点损失权重",
		purpose: "YOLOv8中用于边界框回归的分布焦点损失权重",
	},
	nbs: {
		desc: "标称批次大小",
		purpose: "用于自动计算学习率的参考批次大小",
	},
	overlap_mask: {
		desc: "掩码重叠",
		purpose: "分割任务中是否允许掩码重叠",
	},
	mask_ratio: {
		desc: "掩码比例",
		purpose: "分割掩码的下采样比例",
	},
	dropout: {
		desc: "Dropout比率",
		purpose: "训练时随机丢弃神经元的比例，防止过拟合",
	},
	val: {
		desc: "验证",
		purpose: "训练过程中是否进行验证",
	},
	plots: {
		desc: "生成图表",
		purpose: "是否保存训练过程中的可视化图表",
	},
};

// 训练参数项组件
interface TrainingParamItemProps {
	paramKey: string;
	value: string;
}

function TrainingParamItem({ paramKey, value }: TrainingParamItemProps) {
	const [showTooltip, setShowTooltip] = useState(false);
	const info = PARAM_DESCRIPTIONS[paramKey];

	return (
		<div
			className="training-param-item"
			onMouseEnter={() => setShowTooltip(true)}
			onMouseLeave={() => setShowTooltip(false)}
			onFocus={() => setShowTooltip(true)}
			onBlur={() => setShowTooltip(false)}
			tabIndex={0}
			role="button"
			aria-describedby={info ? `tooltip-${paramKey}` : undefined}
		>
			<span className="training-param-key">{paramKey}:</span>{" "}
			<span className="training-param-value">{value}</span>
			{info && <span className="training-param-hint">ⓘ</span>}
			{showTooltip && info && (
				<div className="training-param-tooltip" id={`tooltip-${paramKey}`}>
					<div className="tooltip-header">{info.desc}</div>
					<div className="tooltip-content">
						<div className="tooltip-full-value">
							<span className="tooltip-label">完整值:</span>
							<span className="tooltip-text">
								{paramKey}: {value}
							</span>
						</div>
						<span className="tooltip-label">用途:</span>
						<span className="tooltip-text">{info.purpose}</span>
					</div>
				</div>
			)}
		</div>
	);
}

// 可放大的图片组件
interface ZoomableImageProps {
	src: string;
	alt: string;
	title: string;
	lib?: string;
	chartKey?: string;
}

// 指标说明
const METRIC_DESCRIPTIONS: Record<
	string,
	{ name: string; desc: string; purpose: string }
> = {
	mAP50: {
		name: "mAP@50",
		desc: "IoU阈值≥0.5时的平均精度均值",
		purpose: "衡量模型在较宽松匹配条件下的检测精度。值越高越好，一般>80%为良好",
	},
	mAP50_95: {
		name: "mAP@50-95",
		desc: "IoU阈值从0.5到0.95的平均精度均值",
		purpose:
			"衡量模型在不同严格程度下的综合检测精度。比mAP@50更严格，更能反映模型真实性能",
	},
	precision: {
		name: "Precision",
		desc: "精确率 = TP/(TP+FP)",
		purpose: "模型预测为正类的样本中真正为正类的比例。高精确率意味着少误检",
	},
	recall: {
		name: "Recall",
		desc: "召回率 = TP/(TP+FN)",
		purpose: "所有正类样本中被正确预测的比例。高召回率意味着少漏检",
	},
};

// 图表说明
const CHART_DESCRIPTIONS: Record<
	string,
	{ title: string; desc: string; axes: string; interpretation: string }
> = {
	results: {
		title: "训练结果",
		desc: "展示训练过程中各项损失和评估指标的变化趋势，帮助判断模型是否收敛、是否过拟合",
		axes: "X轴: Epoch(训练轮数) | Y轴: 损失值/指标值",
		interpretation:
			"损失应逐渐下降并趋于平稳，mAP应逐渐上升。若验证损失上升而训练损失下降，可能过拟合",
	},
	confusion_matrix: {
		title: "混淆矩阵",
		desc: "展示模型对每个类别的预测结果与真实标签的对比，对角线表示正确预测",
		axes: "X轴: 预测类别 | Y轴: 真实类别 | 颜色深浅: 样本数量",
		interpretation: "对角线颜色越深说明分类越准确。非对角线元素显示混淆情况，帮助发现易混淆类别",
	},
	confusion_matrix_normalized: {
		title: "归一化混淆矩阵",
		desc: "混淆矩阵的归一化版本，每行表示真实类别的预测分布比例，便于比较不同类别的表现",
		axes: "X轴: 预测类别 | Y轴: 真实类别 | 颜色深浅: 比例值(0-1)",
		interpretation: "对角线值接近1表示该类被准确预测。某行非对角线值高说明该类常被误判为对应类别",
	},
	pr_curve: {
		title: "Precision-Recall 曲线",
		desc: "展示不同置信度阈值下精确率和召回率的权衡关系，曲线下面积为AP值",
		axes: "X轴: Recall(召回率) | Y轴: Precision(精确率)",
		interpretation: "曲线越靠近右上角越好。理想情况下高精确率同时高召回率。不同类别用不同颜色区分",
	},
};

// 曲线说明
const CURVE_DESCRIPTIONS: Record<
	string,
	{ name: string; desc: string; tip: string }
> = {
	train_loss: {
		name: "训练损失",
		desc: "模型在训练集上的损失值",
		tip: "应该持续下降，如果震荡过大可能是学习率太高",
	},
	val_loss: {
		name: "验证损失",
		desc: "模型在验证集上的损失值",
		tip: "用于检测过拟合，如果持续上升而train_loss下降，说明过拟合了",
	},
	mAP50: {
		name: "mAP@50",
		desc: "IoU=0.5时的平均精度",
		tip: "目标检测核心指标，越接近1越好，通常>0.8算不错",
	},
};

// 自定义 Tooltip 组件
interface TooltipProps {
	active?: boolean;
	payload?: Array<{
		dataKey: string;
		value: number;
		color: string;
	}>;
	label?: number;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
	if (!active || !payload || !payload.length) return null;

	return (
		<div className="custom-chart-tooltip">
			<div className="tooltip-title">Epoch {label}</div>
			{payload.map((entry) => {
				const info = CURVE_DESCRIPTIONS[entry.dataKey];
				return (
					<div key={entry.dataKey} className="tooltip-item">
						<div className="tooltip-row">
							<span
								className="tooltip-dot"
								style={{ background: entry.color }}
							/>
							<span className="tooltip-name">
								{info?.name || entry.dataKey}:
							</span>
							<span className="tooltip-value">{entry.value.toFixed(4)}</span>
						</div>
						{info && <div className="tooltip-desc">{info.desc}</div>}
						{info?.tip && <div className="tooltip-tip">💡 {info.tip}</div>}
					</div>
				);
			})}
		</div>
	);
}

function ZoomableImage({
	src,
	alt,
	title,
	lib,
	chartKey,
}: ZoomableImageProps & { lib?: string; chartKey?: string }) {
	const [isZoomed, setIsZoomed] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);
	const chartInfo = chartKey ? CHART_DESCRIPTIONS[chartKey] : null;
	const containerRef = useRef<HTMLDivElement>(null);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setIsZoomed(true);
		}
	};

	const handleModalKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			setIsZoomed(false);
		}
	};

	const handleContainerClick = (e: React.MouseEvent) => {
		// 阻止事件冒泡，避免触发其他点击事件
		e.stopPropagation();
		setIsZoomed(true);
	};

	const handleModalClick = (e: React.MouseEvent) => {
		// 阻止事件冒泡，避免触发其他点击事件
		e.stopPropagation();
		setIsZoomed(false);
	};

	const handleModalContentClick = (e: React.MouseEvent) => {
		// 阻止事件冒泡，避免触发模态框的点击事件
		e.stopPropagation();
	};

	const handleCloseModal = (e: React.MouseEvent) => {
		// 阻止事件冒泡，避免触发其他点击事件
		e.stopPropagation();
		setIsZoomed(false);
	};

	return (
		<>
			<div
				ref={containerRef}
				className="zoomable-image-container"
				onClick={handleContainerClick}
				onKeyDown={handleKeyDown}
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
				onFocus={() => setShowTooltip(true)}
				onBlur={() => setShowTooltip(false)}
				tabIndex={0}
				role="button"
				aria-label="点击放大图片"
				title="点击放大"
				style={{
					position: 'relative',
					display: 'inline-block',
					cursor: 'pointer',
					zIndex: 10,
					transition: 'transform 0.2s ease-in-out'
				}}
				onMouseOver={(e) => {
					// 显示放大图标
					const overlay = e.currentTarget.querySelector('.zoomable-image-overlay');
					if (overlay) {
						(overlay as HTMLElement).style.opacity = '1';
					}
				}}
				onMouseOut={(e) => {
					// 隐藏放大图标
					const overlay = e.currentTarget.querySelector('.zoomable-image-overlay');
					if (overlay) {
						(overlay as HTMLElement).style.opacity = '0';
					}
				}}
			>
				<img 
					src={src} 
					alt={alt}
					style={{
						maxWidth: '100%',
						height: 'auto',
						borderRadius: '4px',
						transition: 'transform 0.2s ease-in-out'
					}}
				/>
				<div className="zoomable-image-overlay" style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					backgroundColor: 'rgba(0, 0, 0, 0.3)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					opacity: 0,
					transition: 'opacity 0.2s ease-in-out',
					borderRadius: '4px',
					zIndex: 1
				}}>
					<span className="zoomable-image-icon" style={{
						fontSize: '32px',
						color: '#fff',
						textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
					}}>🔍</span>
				</div>
				{showTooltip && chartInfo && (
					<div className="chart-image-tooltip" style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						marginTop: '10px',
						backgroundColor: '#2d2d2d',
						color: '#fff',
						padding: '15px',
						borderRadius: '4px',
						boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
						zIndex: 1000,
						maxWidth: '300px',
						pointerEvents: 'none',
						transform: 'translateZ(0)',
						willChange: 'transform'
					}}>
						<div className="tooltip-header" style={{
							fontWeight: 'bold',
							marginBottom: '10px',
							fontSize: '14px'
						}}>{chartInfo.title}</div>
						<div className="tooltip-content">
							<div className="tooltip-section" style={{
								marginBottom: '8px'
							}}>
								<div className="tooltip-label" style={{
									fontSize: '12px',
									color: '#ccc',
									marginBottom: '4px'
								}}>📊 图表说明</div>
								<div className="tooltip-text" style={{
									fontSize: '12px'
								}}>{chartInfo.desc}</div>
							</div>
							<div className="tooltip-section" style={{
								marginBottom: '8px'
							}}>
								<div className="tooltip-label" style={{
									fontSize: '12px',
									color: '#ccc',
									marginBottom: '4px'
								}}>📈 坐标轴含义</div>
								<div className="tooltip-text" style={{
									fontSize: '12px'
								}}>{chartInfo.axes}</div>
							</div>
							<div className="tooltip-section">
								<div className="tooltip-label" style={{
									fontSize: '12px',
									color: '#ccc',
									marginBottom: '4px'
								}}>💡 解读方法</div>
								<div className="tooltip-text" style={{
									fontSize: '12px'
								}}>{chartInfo.interpretation}</div>
							</div>
						</div>
					</div>
				)}
			</div>
			{isZoomed && (
				<div
					className="image-modal"
					onClick={handleModalClick}
					onKeyDown={handleModalKeyDown}
					tabIndex={-1}
					role="dialog"
					aria-modal="true"
					aria-label={title}
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						backgroundColor: 'rgba(0, 0, 0, 0.95)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 9999,
						padding: '20px',
						boxSizing: 'border-box',
						backdropFilter: 'blur(5px)',
						animation: 'fadeIn 0.3s ease-in-out'
					}}
				>
					<div
						className="image-modal-content"
						onClick={handleModalContentClick}
						onKeyDown={(e) => e.stopPropagation()}
						style={{
							maxWidth: '95%',
							maxHeight: '95%',
							backgroundColor: '#1a1a1a',
							borderRadius: '8px',
							padding: '20px',
							display: 'flex',
							flexDirection: 'column',
							boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
							animation: 'scaleIn 0.3s ease-in-out'
						}}
					>
						<div 
							className="image-modal-header"
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: '15px'
							}}
						>
							<span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>{title}</span>
							{lib && (
								<span 
									className="chart-lib-badge matplotlib"
									style={{
										backgroundColor: '#333',
										color: '#fff',
										padding: '4px 8px',
										borderRadius: '4px',
										fontSize: '12px',
										margin: '0 10px'
									}}
								>
									{lib}
								</span>
							)}
							<button
								type="button"
								className="image-modal-close"
								onClick={handleCloseModal}
								style={{
									background: 'none',
									border: 'none',
									color: '#fff',
									fontSize: '24px',
									cursor: 'pointer',
									padding: '0',
									width: '30px',
									height: '30px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									transition: 'transform 0.2s ease-in-out'
								}}
								onMouseOver={(e) => {
									(e.currentTarget as HTMLElement).style.transform = 'rotate(90deg)';
								}}
								onMouseOut={(e) => {
									(e.currentTarget as HTMLElement).style.transform = 'rotate(0deg)';
								}}
							>
								✕
							</button>
						</div>
						<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
							<img 
								src={src} 
								alt={alt}
								style={{
									maxWidth: '100%',
									maxHeight: 'calc(90vh - 100px)',
									objectFit: 'contain',
									transition: 'transform 0.3s ease-in-out'
								}}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

export function ModelAnalysisPanel({ selectedModel }: ModelAnalysisPanelProps) {
	const [analysis, setAnalysis] = useState<ModelAnalysis | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchModelAnalysis = useCallback(async () => {
		if (!selectedModel) return;

		setIsLoading(true);
		setError(null);

		try {
			const response = await api.getModelAnalysis(selectedModel.path);
			setAnalysis(response);
		} catch (err) {
			console.error("Failed to fetch model analysis:", err);
			setError("获取模型分析数据失败");
		} finally {
			setIsLoading(false);
		}
	}, [selectedModel]);

	useEffect(() => {
		fetchModelAnalysis();
	}, [fetchModelAnalysis]);

	const downloadImage = async (elementId: string, filename: string) => {
		const element = document.getElementById(elementId);
		if (!element) return;

		try {
			const dataUrl = await toPng(element);
			const link = document.createElement("a");
			link.download = filename;
			link.href = dataUrl;
			link.click();
		} catch (err) {
			console.error("下载图片失败:", err);
		}
	};

	// 下载所有图片为压缩包
	const downloadAllImagesAsZip = async () => {
		if (!analysis) return;

		const timeStr = formatDateTime();
		const modelName = analysis.model_name;
		const zipFiles: { name: string; data: string; isBase64?: boolean }[] = [];

		try {
			// 1. 模型性能指标
			const metricsElement = document.getElementById("metrics-section");
			if (metricsElement) {
				const dataUrl = await toPng(metricsElement);
				const base64Data = dataUrl.split(",")[1];
				zipFiles.push({
					name: "01_模型性能指标.png",
					data: base64Data,
					isBase64: true,
				});
			}

			// 2. 训练结果
			if (analysis.results_png) {
				zipFiles.push({
					name: "02_训练结果.png",
					data: analysis.results_png,
					isBase64: true,
				});
			}

			// 3. 混淆矩阵
			if (analysis.confusion_matrix) {
				zipFiles.push({
					name: "03_混淆矩阵.png",
					data: analysis.confusion_matrix,
					isBase64: true,
				});
			}

			// 4. 归一化混淆矩阵
			if (analysis.confusion_matrix_normalized) {
				zipFiles.push({
					name: "04_归一化混淆矩阵.png",
					data: analysis.confusion_matrix_normalized,
					isBase64: true,
				});
			}

			// 5. Precision-Recall 曲线
			if (analysis.pr_curve) {
				zipFiles.push({
					name: "05_Precision-Recall曲线.png",
					data: analysis.pr_curve,
					isBase64: true,
				});
			}

			// 6. 训练曲线
			const chartElement = document.getElementById("training-chart");
			if (chartElement) {
				const dataUrl = await toPng(chartElement);
				const base64Data = dataUrl.split(",")[1];
				zipFiles.push({
					name: "06_训练曲线.png",
					data: base64Data,
					isBase64: true,
				});
			}

			// 7. 训练批次示例
			if (analysis.train_batches && analysis.train_batches.length > 0) {
				const trainBatchesElement = document.getElementById("train-batches");
				if (trainBatchesElement) {
					const dataUrl = await toPng(trainBatchesElement);
					const base64Data = dataUrl.split(",")[1];
					zipFiles.push({
						name: "07_训练批次示例.png",
						data: base64Data,
						isBase64: true,
					});
				}
			}

			// 8. 验证批次对比
			if (analysis.val_batches && analysis.val_batches.length > 0) {
				const valBatchesElement = document.getElementById("val-batches");
				if (valBatchesElement) {
					const dataUrl = await toPng(valBatchesElement);
					const base64Data = dataUrl.split(",")[1];
					zipFiles.push({
						name: "08_验证批次对比.png",
						data: base64Data,
						isBase64: true,
					});
				}
			}

			// 9. 训练参数
				if (analysis.args) {
					const argsElement = document.getElementById("training-args");
					if (argsElement) {
						const dataUrl = await toPng(argsElement);
						const base64Data = dataUrl.split(",")[1];
						zipFiles.push({
							name: "09_训练参数.png",
							data: base64Data,
							isBase64: true,
						});
					}
				}

				// 10. Anchor Box 信息
				const anchorBoxesElement = document.getElementById("anchor-boxes-section");
				if (anchorBoxesElement) {
					const dataUrl = await toPng(anchorBoxesElement);
					const base64Data = dataUrl.split(",")[1];
					zipFiles.push({
						name: "10_Anchor Box 信息.png",
						data: base64Data,
						isBase64: true,
					});
				}

				// 11. 特征图尺寸变化
				const featureMapsElement = document.getElementById("feature-maps-section");
				if (featureMapsElement) {
					const dataUrl = await toPng(featureMapsElement);
					const base64Data = dataUrl.split(",")[1];
					zipFiles.push({
						name: "11_特征图尺寸变化.png",
						data: base64Data,
						isBase64: true,
					});
				}

				// 12. NMS 参数
				const nmsParamsElement = document.getElementById("nms-params-section");
				if (nmsParamsElement) {
					const dataUrl = await toPng(nmsParamsElement);
					const base64Data = dataUrl.split(",")[1];
					zipFiles.push({
						name: "12_NMS 参数.png",
						data: base64Data,
						isBase64: true,
					});
				}

				// 13. 模型架构
				const modelArchitectureElement = document.getElementById("model-architecture-section");
				if (modelArchitectureElement) {
					const dataUrl = await toPng(modelArchitectureElement);
					const base64Data = dataUrl.split(",")[1];
					zipFiles.push({
						name: "13_模型架构.png",
						data: base64Data,
						isBase64: true,
					});
				}

				// 创建并下载 ZIP 文件
				if (zipFiles.length > 0) {
					const zipBlob = await createZip(zipFiles);
					const url = URL.createObjectURL(zipBlob);
					const link = document.createElement("a");
					link.href = url;
					link.download = `图片报告合集_${modelName}_${timeStr}.zip`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					URL.revokeObjectURL(url);
				}
			} catch (err) {
				console.error("下载压缩包失败:", err);
				alert("下载压缩包失败，请重试");
			}
		};

	if (!selectedModel) {
		return (
			<div className="empty-state">
				<div className="empty-state-icon">📊</div>
				<div>请在左侧模型列表中选择一个模型</div>
				<div style={{ fontSize: "12px", marginTop: "10px", color: "#666" }}>
					选择本地训练的模型可以查看详细分析
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="loading-spinner">
				<div>加载中...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="empty-state">
				<div className="empty-state-icon">⚠️</div>
				<div>{error}</div>
			</div>
		);
	}

	if (!analysis) {
		return (
			<div className="empty-state">
				<div className="empty-state-icon">📈</div>
				<div>该模型暂无分析数据</div>
				<div style={{ fontSize: "12px", marginTop: "10px", color: "#666" }}>
					预训练模型不包含训练过程数据
				</div>
			</div>
		);
	}

	const chartData =
		analysis.metrics?.epochs.map((epoch, i) => ({
			epoch,
			train_loss: analysis.metrics?.train_loss[i],
			val_loss: analysis.metrics?.val_loss[i],
			precision: analysis.metrics?.precision[i],
			recall: analysis.metrics?.recall[i],
			mAP50: analysis.metrics?.mAP50[i],
			mAP50_95: analysis.metrics?.mAP50_95[i],
		})) || [];

	const lastMetrics = chartData[chartData.length - 1] || {};

	return (
		<div className="analysis-container">
			<div className="analysis-header">
				<h3 className="analysis-title">{analysis.model_name}</h3>
				<div style={{ display: "flex", gap: "8px" }}>
					<button
						type="button"
						className="download-btn"
						onClick={() =>
							downloadImage(
								"analysis-content",
								`综合报告_${analysis.model_name}_${formatDateTime()}.png`,
							)
						}
					>
						📥 下载报告
					</button>
					<button
						type="button"
						className="download-btn download-zip-btn"
						onClick={downloadAllImagesAsZip}
					>
						🗂️ 下载多图合集
					</button>
				</div>
			</div>

			<div id="analysis-content">
				{lastMetrics && (
					<div id="metrics-section" className="analysis-card metrics-section">
						<div className="analysis-card-title">模型性能指标</div>
						<div className="metrics-grid">
							<div
								className="metric-card"
								title={`${METRIC_DESCRIPTIONS.mAP50.name}: ${METRIC_DESCRIPTIONS.mAP50.desc}`}
							>
								<div className="metric-value">
									{((lastMetrics.mAP50 || 0) * 100).toFixed(1)}%
								</div>
								<div className="metric-label">mAP@50</div>
								<div className="metric-tooltip">
									<div className="tooltip-header">
										{METRIC_DESCRIPTIONS.mAP50.name}
									</div>
									<div className="tooltip-content">
										<div className="tooltip-label">说明</div>
										<div className="tooltip-text">
											{METRIC_DESCRIPTIONS.mAP50.desc}
										</div>
										<div className="tooltip-label">用途</div>
										<div className="tooltip-text">
											{METRIC_DESCRIPTIONS.mAP50.purpose}
										</div>
									</div>
								</div>
							</div>
							<div
								className="metric-card"
								title={`${METRIC_DESCRIPTIONS.mAP50_95.name}: ${METRIC_DESCRIPTIONS.mAP50_95.desc}`}
							>
								<div className="metric-value">
									{((lastMetrics.mAP50_95 || 0) * 100).toFixed(1)}%
								</div>
								<div className="metric-label">mAP@50-95</div>
								<div className="metric-tooltip">
									<div className="tooltip-header">
										{METRIC_DESCRIPTIONS.mAP50_95.name}
									</div>
									<div className="tooltip-content">
										<div className="tooltip-label">说明</div>
										<div className="tooltip-text">
											{METRIC_DESCRIPTIONS.mAP50_95.desc}
										</div>
										<div className="tooltip-label">用途</div>
										<div className="tooltip-text">
											{METRIC_DESCRIPTIONS.mAP50_95.purpose}
										</div>
									</div>
								</div>
							</div>
							<div
								className="metric-card"
								title={`${METRIC_DESCRIPTIONS.precision.name}: ${METRIC_DESCRIPTIONS.precision.desc}`}
							>
								<div className="metric-value">
									{((lastMetrics.precision || 0) * 100).toFixed(1)}%
								</div>
								<div className="metric-label">Precision</div>
								<div className="metric-tooltip">
									<div className="tooltip-header">
										{METRIC_DESCRIPTIONS.precision.name}
									</div>
									<div className="tooltip-content">
										<div className="tooltip-label">说明</div>
										<div className="tooltip-text">
											{METRIC_DESCRIPTIONS.precision.desc}
										</div>
										<div className="tooltip-label">用途</div>
										<div className="tooltip-text">
											{METRIC_DESCRIPTIONS.precision.purpose}
										</div>
									</div>
								</div>
							</div>
							<div
								className="metric-card"
								title={`${METRIC_DESCRIPTIONS.recall.name}: ${METRIC_DESCRIPTIONS.recall.desc}`}
							>
								<div className="metric-value">
									{((lastMetrics.recall || 0) * 100).toFixed(1)}%
								</div>
								<div className="metric-label">Recall</div>
								<div className="metric-tooltip">
									<div className="tooltip-header">
										{METRIC_DESCRIPTIONS.recall.name}
									</div>
									<div className="tooltip-content">
										<div className="tooltip-label">说明</div>
										<div className="tooltip-text">
											{METRIC_DESCRIPTIONS.recall.desc}
										</div>
										<div className="tooltip-label">用途</div>
										<div className="tooltip-text">
											{METRIC_DESCRIPTIONS.recall.purpose}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				<div className="analysis-grid">
					{analysis.results_png && (
						<div className="analysis-card">
							<div className="analysis-card-title">
								训练结果
								<span className="chart-lib-badge matplotlib">matplotlib</span>
							</div>
							<div className="analysis-card-content">
								<ZoomableImage
									src={`data:image/png;base64,${analysis.results_png}`}
									alt="Results"
									title="训练结果"
									lib="matplotlib"
									chartKey="results"
								/>
							</div>
						</div>
					)}

					{analysis.confusion_matrix && (
						<div className="analysis-card">
							<div className="analysis-card-title">
								混淆矩阵
								<span className="chart-lib-badge matplotlib">matplotlib</span>
							</div>
							<div className="analysis-card-content">
								<ZoomableImage
									src={`data:image/png;base64,${analysis.confusion_matrix}`}
									alt="Confusion Matrix"
									title="混淆矩阵"
									lib="matplotlib"
									chartKey="confusion_matrix"
								/>
							</div>
						</div>
					)}

					{analysis.confusion_matrix_normalized && (
						<div className="analysis-card">
							<div className="analysis-card-title">
								归一化混淆矩阵
								<span className="chart-lib-badge matplotlib">matplotlib</span>
							</div>
							<div className="analysis-card-content">
								<ZoomableImage
									src={`data:image/png;base64,${analysis.confusion_matrix_normalized}`}
									alt="Normalized Confusion Matrix"
									title="归一化混淆矩阵"
									lib="matplotlib"
									chartKey="confusion_matrix_normalized"
								/>
							</div>
						</div>
					)}

					{analysis.pr_curve && (
						<div className="analysis-card">
							<div className="analysis-card-title">
								Precision-Recall 曲线
								<span className="chart-lib-badge matplotlib">matplotlib</span>
							</div>
							<div className="analysis-card-content">
								<ZoomableImage
									src={`data:image/png;base64,${analysis.pr_curve}`}
									alt="PR Curve"
									title="Precision-Recall 曲线"
									lib="matplotlib"
									chartKey="pr_curve"
								/>
							</div>
						</div>
					)}

					{chartData.length > 0 && (
						<div id="training-chart" className="analysis-card" style={{ gridColumn: "span 2" }}>
							<div className="analysis-card-title">
								训练曲线
								<span className="chart-lib-badge recharts">Recharts</span>
							</div>
							<div className="chart-container" style={{ height: "280px" }}>
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={chartData}>
										<CartesianGrid strokeDasharray="3 3" stroke="#333" />
										<XAxis dataKey="epoch" stroke="#888" />
										<YAxis stroke="#888" />
										<Tooltip
											content={<CustomTooltip />}
										/>
										<Legend />
										<Line
											type="monotone"
											dataKey="train_loss"
											stroke="#e94560"
											name="Train Loss"
											strokeWidth={2}
											dot={false}
											activeDot={{ r: 6, stroke: '#e94560', strokeWidth: 2, fill: '#fff' }}
										/>
										<Line
											type="monotone"
											dataKey="val_loss"
											stroke="#ffd369"
											name="Val Loss"
											strokeWidth={2}
											dot={false}
											activeDot={{ r: 6, stroke: '#ffd369', strokeWidth: 2, fill: '#fff' }}
										/>
										<Line
											type="monotone"
											dataKey="mAP50"
											stroke="#4ecca3"
											name="mAP@50"
											strokeWidth={2}
											dot={false}
											activeDot={{ r: 6, stroke: '#4ecca3', strokeWidth: 2, fill: '#fff' }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</div>
					)}

					{analysis.train_batches && analysis.train_batches.length > 0 && (
						<div id="train-batches" className="analysis-card" style={{ gridColumn: "span 2" }}>
							<div className="analysis-card-title">训练批次示例</div>
							<div
								style={{
									display: "flex",
									gap: "10px",
									overflowX: "auto",
									padding: "10px 0",
								}}
							>
								{analysis.train_batches.slice(0, 3).map((img, i) => (
									<img
										key={`train-${i}`}
										src={`data:image/jpeg;base64,${img}`}
										alt={`Train batch ${i}`}
										style={{ height: "150px", borderRadius: "4px" }}
									/>
								))}
							</div>
						</div>
					)}

					{analysis.val_batches && analysis.val_batches.length > 0 && (
						<div id="val-batches" className="analysis-card" style={{ gridColumn: "span 2" }}>
							<div className="analysis-card-title">
								验证批次对比 (标签 vs 预测)
							</div>
							<div
								style={{
									display: "flex",
									gap: "10px",
									overflowX: "auto",
									padding: "10px 0",
								}}
							>
								{analysis.val_batches.slice(0, 2).map((batch, i) => (
									<div key={`val-${i}`} style={{ display: "flex", gap: "5px" }}>
										<img
											src={`data:image/jpeg;base64,${batch.labels}`}
											alt={`Val labels ${i}`}
											style={{ height: "120px", borderRadius: "4px" }}
										/>
										<img
											src={`data:image/jpeg;base64,${batch.pred}`}
											alt={`Val pred ${i}`}
											style={{ height: "120px", borderRadius: "4px" }}
										/>
									</div>
								))}
							</div>
						</div>
					)}

					{analysis.args && (
						<div id="training-args" className="analysis-card" style={{ gridColumn: "span 2" }}>
							<div className="analysis-card-title">训练参数</div>
							<div className="training-params-grid">
								{Object.entries(analysis.args)
									.slice(0, 16)
									.map(([key, value]) => (
										<TrainingParamItem
											key={key}
											paramKey={key}
											value={String(value)}
										/>
									))}
							</div>
						</div>
					)}
				</div>

				{analysis.anchor_boxes && analysis.anchor_boxes.sizes && analysis.anchor_boxes.strides && (
						<div id="anchor-boxes-section" className="analysis-card">
							<div className="analysis-card-title">
								Anchor Box 信息
								<span className="chart-lib-badge custom">自定义</span>
							</div>
							<div className="analysis-card-content">
								<div className="anchor-boxes-list">
									{analysis.anchor_boxes.sizes.map((size, index) => (
										<div key={index} className="anchor-box-item">
											<div className="anchor-box-size">{size[0]}×{size[1]}</div>
											<div className="anchor-box-stride">步长: {analysis.anchor_boxes.strides[Math.floor(index / 3)]}</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

				{analysis.feature_maps && (
					<div id="feature-maps-section" className="analysis-card">
						<div className="analysis-card-title">
							特征图尺寸变化
							<span className="chart-lib-badge custom">自定义</span>
						</div>
						<div className="analysis-card-content">
							{analysis.feature_maps.map((fm, index) => (
								<div key={index} className="feature-map-item">
									<div className="feature-map-name">{fm.name}</div>
									<div className="feature-map-size">尺寸: {fm.size}</div>
									{fm.channels && <div className="feature-map-channels">通道数: {fm.channels}</div>}
								</div>
							))}
						</div>
					</div>
				)}

				{analysis.nms_params && (
					<div id="nms-params-section" className="analysis-card">
						<div className="analysis-card-title">
							NMS 参数
							<span className="chart-lib-badge custom">自定义</span>
						</div>
						<div className="analysis-card-content">
							<div className="nms-params-content">
								<div className="nms-param-item">
									<div className="nms-param-name">IoU 阈值</div>
									<div className="nms-param-value">{analysis.nms_params.iou_threshold}</div>
								</div>
								<div className="nms-param-item">
									<div className="nms-param-name">置信度阈值</div>
									<div className="nms-param-value">{analysis.nms_params.conf_threshold}</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{analysis.model_architecture && (
					<div id="model-architecture-section" className="analysis-card">
						<div className="analysis-card-title">
							模型架构
							<span className="chart-lib-badge custom">自定义</span>
						</div>
						<div className="analysis-card-content">
							<div className="model-architecture-content">
								<div className="architecture-overview">
									<div className="architecture-item">
										<div className="architecture-label">Backbone</div>
										<div className="architecture-value">{analysis.model_architecture.backbone}</div>
									</div>
									<div className="architecture-item">
										<div className="architecture-label">Neck</div>
										<div className="architecture-value">{analysis.model_architecture.neck}</div>
									</div>
									<div className="architecture-item">
										<div className="architecture-label">Head</div>
										<div className="architecture-value">{analysis.model_architecture.head}</div>
									</div>
								</div>
								<div className="architecture-layers">
									{analysis.model_architecture.layers.map((layer, index) => (
										<div key={index} className="architecture-layer">
											<div className="layer-name">{layer.name}</div>
											<div className="layer-size">{layer.size}</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
