import { useCallback, useEffect, useRef, useState } from "react";
import type { Detection } from "../types";

interface WebSocketData {
	frame: string;
	detections: Detection[];
}

export function useWebSocket() {
	const [detections, setDetections] = useState<Detection[]>([]);
	const [frame, setFrame] = useState<string>("");
	const [connected, setConnected] = useState(false);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const isManualCloseRef = useRef(false);

	const MAX_RECONNECT_ATTEMPTS = 5;
	const INITIAL_RECONNECT_DELAY = 1000;
	const MAX_RECONNECT_DELAY = 30000;

	const isConnectingRef = useRef(false);

	const connect = useCallback(() => {
		const getReconnectDelay = () => {
			// 指数退避: 1s, 2s, 4s, 8s, 16s, then 30s
			const delay = Math.min(
				INITIAL_RECONNECT_DELAY * 2 ** reconnectAttemptsRef.current,
				MAX_RECONNECT_DELAY,
			);
			return delay;
		};

		// 如果正在连接或已连接，不再重复连接
		if (isConnectingRef.current) return;
		if (wsRef.current?.readyState === WebSocket.OPEN) return;

		// 如果手动关闭，不再重连
		if (isManualCloseRef.current) return;

		// 超过最大重试次数，停止重连
		if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
			console.warn(`WebSocket 重连失败 ${MAX_RECONNECT_ATTEMPTS} 次，停止重连`);
			return;
		}

		isConnectingRef.current = true;

		if (wsRef.current) {
			wsRef.current.close();
		}

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/ws/stream`;

		const ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			isConnectingRef.current = false;
			setConnected(true);
			reconnectAttemptsRef.current = 0; // 重置重试计数
		};

		ws.onmessage = (event) => {
			try {
				const data: WebSocketData = JSON.parse(event.data);
				setFrame(data.frame);
				setDetections(data.detections);
			} catch (err) {
				console.error("WebSocket 消息解析失败:", err);
			}
		};

		ws.onclose = (event) => {
			isConnectingRef.current = false;
			setConnected(false);

			// 正常关闭或手动关闭，不重连
			if (event.wasClean || isManualCloseRef.current) return;

			reconnectAttemptsRef.current++;
			const delay = getReconnectDelay();

			console.log(
				`WebSocket 断开，${delay / 1000}s 后尝试第 ${reconnectAttemptsRef.current} 次重连...`,
			);

			reconnectTimeoutRef.current = window.setTimeout(() => {
				isConnectingRef.current = false; // 重置连接状态，允许下次连接
				connect();
			}, delay);
		};

		ws.onerror = (error) => {
			isConnectingRef.current = false;
			console.error("WebSocket 错误:", error);
			// 错误时让 onclose 处理重连
		};

		wsRef.current = ws;
	}, []);

	// 手动重连函数
	const reconnect = useCallback(() => {
		reconnectAttemptsRef.current = 0;
		isManualCloseRef.current = false;
		connect();
	}, [connect]);

	useEffect(() => {
		connect();

		return () => {
			isManualCloseRef.current = true;
			if (wsRef.current) {
				wsRef.current.close();
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
		};
	}, [connect]);

	return { frame, detections, connected, reconnect };
}
