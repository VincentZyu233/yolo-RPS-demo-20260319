from ultralytics import YOLO
import numpy as np
import cv2


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
