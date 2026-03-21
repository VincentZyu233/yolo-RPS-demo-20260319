import pygetwindow as gw
import psutil
import win32process


def list_windows():
    windows = gw.getAllWindows()
    result = []

    for window in windows:
        if not window.visible or not window.title:
            continue
        if window.width < 50 or window.height < 50:
            continue

        try:
            _, pid = win32process.GetWindowThreadProcessId(window._hWnd)
            process = psutil.Process(pid)
            exe_name = process.name()
        except Exception:
            exe_name = ""

        result.append(
            {
                "hwnd": window._hWnd,
                "title": window.title,
                "exe": exe_name,
                "left": window.left,
                "top": window.top,
                "width": window.width,
                "height": window.height,
                "size": f"{window.width}x{window.height}",
            }
        )

    result.sort(key=lambda w: w["title"].lower())
    return result


def main():
    print("=" * 110)
    print(f"{'HWND':<12} {'Size':<14} {'Position':<22} {'EXE':<20} {'Title'}")
    print("-" * 110)

    windows = list_windows()
    for w in windows:
        pos = f"({w['left']}, {w['top']})"
        print(
            f"{w['hwnd']:<12} {w['size']:<14} {pos:<22} {w['exe']:<20} {w['title'][:40]}"
        )

    print("=" * 110)
    print(f"\nTotal: {len(windows)} windows")
    print("\nUsage in config.json:")
    print('  "capture_mode": "window"')
    print('  "window_hwnd": <hwnd_value>')


if __name__ == "__main__":
    main()
