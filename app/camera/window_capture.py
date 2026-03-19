import numpy as np
import mss
import ctypes
from .base import CameraBase


class WindowCamera(CameraBase):
    def __init__(self, hwnd: int):
        self._hwnd = hwnd
        self._sct = mss.mss()

    def read(self) -> np.ndarray:
        if not self._hwnd:
            return None
        try:
            left, top, right, bottom = self._get_window_rect(self._hwnd)
            if right <= left or bottom <= top:
                return None
            screenshot = self._sct.grab(
                {
                    "left": left,
                    "top": top,
                    "width": right - left,
                    "height": bottom - top,
                }
            )
            frame = np.array(screenshot)
            return frame[:, :, :3][:, :, ::-1]
        except Exception:
            return None

    def _get_window_rect(self, hwnd):
        rect = ctypes.wintypes.RECT()
        ctypes.windll.user32.GetWindowRect(hwnd, ctypes.byref(rect))
        return rect.left, rect.top, rect.right, rect.bottom

    def release(self):
        self._sct.close()

    @property
    def name(self):
        return f"Window({self._hwnd})"
