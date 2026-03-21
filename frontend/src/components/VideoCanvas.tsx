import { useCallback, useEffect, useRef } from "react";
import type { Detection } from "../types";

interface VideoCanvasProps {
	frame: string;
	detections: Detection[];
}

const classColors: Record<string, string> = {
	rock: "#e94560",
	paper: "#4ecca3",
	scissors: "#ffd369",
};

export function VideoCanvas({ frame, detections }: VideoCanvasProps) {
	const imgRef = useRef<HTMLImageElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const getVideoDisplayInfo = useCallback(() => {
		const img = imgRef.current;
		const canvas = canvasRef.current;
		if (!img || !canvas || img.naturalWidth === 0) return null;

		const containerWidth = canvas.width;
		const containerHeight = canvas.height;
		const videoRatio = img.naturalWidth / img.naturalHeight;
		const containerRatio = containerWidth / containerHeight;

		let displayWidth: number,
			displayHeight: number,
			offsetX: number,
			offsetY: number;

		if (videoRatio > containerRatio) {
			displayWidth = containerWidth;
			displayHeight = containerWidth / videoRatio;
			offsetX = 0;
			offsetY = (containerHeight - displayHeight) / 2;
		} else {
			displayHeight = containerHeight;
			displayWidth = containerHeight * videoRatio;
			offsetX = (containerWidth - displayWidth) / 2;
			offsetY = 0;
		}

		return {
			displayWidth,
			displayHeight,
			offsetX,
			offsetY,
			naturalWidth: img.naturalWidth,
			naturalHeight: img.naturalHeight,
		};
	}, []);

	const drawBoundingBoxes = useCallback(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!ctx || !canvas) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (detections.length === 0) return;

		const info = getVideoDisplayInfo();
		if (!info) return;

		const {
			displayWidth,
			displayHeight,
			offsetX,
			offsetY,
			naturalWidth,
			naturalHeight,
		} = info;
		const scaleX = displayWidth / naturalWidth;
		const scaleY = displayHeight / naturalHeight;

		detections.forEach((det) => {
			const [x1, y1, x2, y2] = det.bbox;
			const color = classColors[det.class] || "#fff";
			const conf = (det.conf * 100).toFixed(1);
			const label = `${det.class} ${conf}%`;

			const sx1 = x1 * scaleX + offsetX;
			const sy1 = y1 * scaleY + offsetY;
			const width = (x2 - x1) * scaleX;
			const height = (y2 - y1) * scaleY;

			ctx.strokeStyle = color;
			ctx.lineWidth = 3;
			ctx.strokeRect(sx1, sy1, width, height);

			ctx.fillStyle = color;
			const textWidth = ctx.measureText(label).width;
			const textHeight = 16;
			ctx.fillRect(sx1, sy1 - textHeight - 4, textWidth + 8, textHeight + 4);

			ctx.fillStyle = "#000";
			ctx.font = "bold 12px Arial";
			ctx.fillText(label, sx1 + 4, sy1 - 4);
		});
	}, [detections, getVideoDisplayInfo]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const container = canvas.parentElement;
		if (!container) return;

		const resizeCanvas = () => {
			canvas.width = container.clientWidth;
			canvas.height = container.clientHeight;
			drawBoundingBoxes();
		};

		resizeCanvas();
		window.addEventListener("resize", resizeCanvas);

		return () => window.removeEventListener("resize", resizeCanvas);
	}, [drawBoundingBoxes]);

	useEffect(() => {
		drawBoundingBoxes();
	}, [drawBoundingBoxes]);

	return (
		<div className="video-container">
			<img
				ref={imgRef}
				className="video-frame"
				src={`data:image/jpeg;base64,${frame}`}
				alt="Video stream"
			/>
			<canvas ref={canvasRef} className="bbox-canvas" />
		</div>
	);
}
