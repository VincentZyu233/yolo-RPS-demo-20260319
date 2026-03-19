import ctypes
from ctypes import wintypes


class WindowPicker:
    def __init__(self):
        user32 = ctypes.windll.user32
        EnumWindows = user32.EnumWindows
        EnumWindowsProc = ctypes.WINFUNCTYPE(
            ctypes.c_bool, ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int)
        )
        GetWindowText = user32.GetWindowTextW
        GetWindowTextLength = user32.GetWindowTextLengthW
        IsWindowVisible = user32.IsWindowVisible

        self._EnumWindows = EnumWindows
        self._EnumWindowsProc = EnumWindowsProc
        self._GetWindowText = GetWindowText
        self._GetWindowTextLength = GetWindowTextLength
        self._IsWindowVisible = IsWindowVisible

    def get_windows(self):
        windows = []

        def callback(hwnd, _):
            if self._IsWindowVisible(hwnd):
                length = self._GetWindowTextLength(hwnd)
                if length > 0:
                    buffer = ctypes.create_unicode_buffer(length + 1)
                    self._GetWindowText(hwnd, buffer, length + 1)
                    title = buffer.value
                    if title:
                        windows.append((hwnd, title))
            return True

        self._EnumWindows(self._EnumWindowsProc(callback), 0)
        return windows

    def pick(self):
        windows = self.get_windows()
        print("\n=== Available Windows ===")
        for i, (hwnd, title) in enumerate(windows):
            print(f"  [{i}] {title[:60]} (hwnd={hwnd})")
        print()

        while True:
            try:
                idx = int(input("Select window number: "))
                if 0 <= idx < len(windows):
                    return windows[idx][0]
                print("Invalid number, try again.")
            except ValueError:
                print("Please enter a number.")
