import os
import json
import urllib.request
from pathlib import Path


MODEL_URL = "https://github.com/gholamrezadar/yolo11-rock-paper-scissors-detection/raw/refs/heads/main/weights/yolo11-rps-detection.pt"
MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "yolo11-rps-detection.pt"


def get_config():
    config_path = Path(__file__).parent / "config.json"
    if config_path.exists():
        return json.loads(config_path.read_text())
    return {}


def download_file(url, path, proxies=None):
    def reporthook(block_num, block_size, total_size):
        downloaded = block_num * block_size
        percent = min(100, downloaded * 100 // total_size) if total_size > 0 else 0
        print(
            f"\rDownloading: {percent}% ({downloaded // 1024}KB / {total_size // 1024}KB)",
            end="",
        )

    print(f"Downloading {url}")
    print(f"To: {path}")

    opener = urllib.request.build_opener()
    if proxies:
        opener.add_handler(urllib.request.ProxyHandler(proxies))

    urllib.request.urlretrieve(url, path, reporthook)
    print(f"\nDone! Saved to {path}")


def main():
    MODEL_DIR.mkdir(exist_ok=True)

    if MODEL_PATH.exists():
        print(f"Model already exists at {MODEL_PATH}")
        response = input("Overwrite? (y/N): ").strip().lower()
        if response != "y":
            print("Skipped.")
            return

    config = get_config()
    proxies = None
    if config.get("use_proxy") and config.get("proxy_url"):
        proxy_url = config["proxy_url"]
        proxies = {
            "http": proxy_url,
            "https": proxy_url,
        }
        print(f"Using proxy: {proxy_url}")

    download_file(MODEL_URL, MODEL_PATH, proxies)

    print("\nTo use this model, ensure config.json has:")
    print(f'  "model_path": "{MODEL_PATH}"')


if __name__ == "__main__":
    main()
