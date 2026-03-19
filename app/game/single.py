import cv2
from ..camera import Cv2Camera
from ..detection import HandDetector


class SinglePlayerGame:
    WIN_MAP = {"rock": "scissors", "paper": "rock", "scissors": "paper"}

    def __init__(self, camera_source=0, model_path="yolov8n.pt"):
        self.camera = Cv2Camera(source=camera_source)
        self.detector = HandDetector(model_path=model_path)
        self.state = "waiting"

    def get_frame(self):
        frame = self.camera.read()
        if frame is None:
            return None
        detections = self.detector.detect(frame)
        self._draw_ui(frame, detections)
        return cv2.cvtColor(frame, cv2.COLOR_RGB2BGR), detections

    def _draw_ui(self, frame, detections):
        h, w = frame.shape[:2]
        for d in detections:
            x1, y1, x2, y2 = map(int, d["bbox"])
            label = f"{d['class']} {d['conf']:.2f}"
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                frame,
                label,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 0),
                2,
            )

    def release(self):
        self.camera.release()
