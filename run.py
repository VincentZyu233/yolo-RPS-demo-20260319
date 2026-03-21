import uvicorn
import yaml
from pathlib import Path

ROOT_DIR = Path(__file__).parent
CONFIG_PATH = ROOT_DIR / "config.yaml"

if CONFIG_PATH.exists():
    config = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
else:
    config = {}


if __name__ == "__main__":
    host = config.get("host", "0.0.0.0")
    port = config.get("port", 60319)

    print(f"Starting backend server on http://{host}:{port}")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True,
    )
