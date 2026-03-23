from ultralytics import YOLO
import cv2
import torch


class HandDetector:
    CLASSES = {
        0: "rock",
        1: "paper",
        2: "scissors",
        "rock": "rock",
        "paper": "paper",
        "scissors": "scissors",
        "Rock": "rock",
        "Paper": "paper",
        "Scissors": "scissors",
    }

    def __init__(self, model_path="yolov8n.pt"):
        self.model = YOLO(model_path)

    def detect(self, frame) -> list[dict]:
        if frame is None:
            return []
        bgr_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        results = self.model(bgr_frame, verbose=False)[0]
        detections = []
        names = results.names
        for box in results.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            cls_name = names.get(cls_id, str(cls_id)).lower()
            if cls_name in ["rock", "paper", "scissors"]:
                detections.append(
                    {
                        "class": cls_name,
                        "conf": conf,
                        "bbox": box.xyxy[0].cpu().numpy().tolist(),
                    }
                )
        return detections

    def get_anchors(self):
        """获取模型的 anchor boxes"""
        if hasattr(self.model, 'model') and hasattr(self.model.model, 'yaml'):
            anchors = self.model.model.yaml.get('anchors', [])
            return {
                "anchors": anchors,
                "strides": [8, 16, 32]  # YOLOv8 特征图步长
            }
        return {"anchors": [], "strides": []}

    def detect_with_nms_comparison(self, frame):
        """对比 NMS 前后的检测结果"""
        if frame is None:
            return {"before_nms": [], "after_nms": [], "nms_threshold": 0.45}
        
        bgr_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        # 禁用 NMS 检测
        results_no_nms = self.model(bgr_frame, verbose=False, nms=False)[0]
        # 启用 NMS 检测
        results_with_nms = self.model(bgr_frame, verbose=False, nms=True)[0]
        
        return {
            "before_nms": [
                {
                    "bbox": box.xyxy[0].tolist(),
                    "conf": box.conf[0].item(),
                    "cls": box.cls[0].item()
                } for box in results_no_nms.boxes
            ],
            "after_nms": [
                {
                    "bbox": box.xyxy[0].tolist(),
                    "conf": box.conf[0].item(),
                    "cls": box.cls[0].item()
                } for box in results_with_nms.boxes
            ],
            "nms_threshold": 0.45  # YOLO 默认阈值
        }

    def get_feature_map_sizes(self, input_shape=(640, 640)):
        """获取各层特征图尺寸"""
        feature_sizes = []
        
        # 注册钩子
        def hook_fn(module, input, output):
            if isinstance(output, torch.Tensor):
                feature_sizes.append({
                    "shape": output.shape,
                    "name": module.__class__.__name__
                })
            elif isinstance(output, (list, tuple)):
                for i, out in enumerate(output):
                    if isinstance(out, torch.Tensor):
                        feature_sizes.append({
                            "shape": out.shape,
                            "name": f"{module.__class__.__name__}[{i}]"
                        })
        
        # 为关键层注册钩子
        for i, layer in enumerate(self.model.model):
            layer.register_forward_hook(hook_fn)
        
        # 前向传播
        dummy_input = torch.randn(1, 3, input_shape[0], input_shape[1])
        with torch.no_grad():
            _ = self.model(dummy_input)
        
        # 过滤掉不需要的特征图，只保留主要的
        filtered_sizes = []
        seen_shapes = set()
        for item in feature_sizes:
            shape_str = str(item["shape"])
            if shape_str not in seen_shapes and len(item["shape"]) == 4:
                seen_shapes.add(shape_str)
                filtered_sizes.append(item)
        
        return filtered_sizes
