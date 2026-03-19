import cv2
from .base import CameraBase


class Cv2Camera(CameraBase):
    def __init__(self, source=0):
        self._cap = cv2.VideoCapture(source)
        self._source = source

    def read(self):
        ret, frame = self._cap.read()
        if not ret:
            return None
        return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    def release(self):
        self._cap.release()

    @property
    def name(self):
        return f"Camera({self._source})"
