import uvicorn
import json
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / "config.json"
config = json.loads(CONFIG_PATH.read_text()) if CONFIG_PATH.exists() else {}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=config.get("host", "0.0.0.0"),
        port=config.get("port", 60319),
        reload=True,
    )
