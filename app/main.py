from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import cv2
import base64
import asyncio
import yaml
import os
import subprocess
import platform
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel

from .camera import Cv2Camera, WindowCamera
from .detection import HandDetector
from .collect import (
    start_collection,
    stop_collection,
    save_snapshot,
    get_status,
    get_dataset_stats,
    list_sessions,
    select_session,
    start_training,
    get_training_status,
    CLASSES,
)
from .collect.training import get_local_dataset_info, start_training_local

ROOT_DIR = Path(__file__).parent.parent
CONFIG_PATH = ROOT_DIR / "config.yaml"

if CONFIG_PATH.exists():
    config = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
else:
    config = {}

MODELS_DIR = ROOT_DIR / "models"


def resolve_path(path_str: str) -> Path:
    p = Path(path_str)
    if p.is_absolute():
        return p
    return ROOT_DIR / p


def save_config():
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        yaml.dump(config, f, allow_unicode=True, default_flow_style=False)


def _get_model_time(pt_file: Path) -> str:
    """Get model file modification time as formatted string."""
    try:
        mtime = os.path.getmtime(pt_file)
        dt = datetime.fromtimestamp(mtime)
        return dt.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return ""


def _get_model_size_mb(pt_file: Path) -> str:
    """Get model file size in MB."""
    try:
        size_bytes = pt_file.stat().st_size
        return f"{size_bytes / (1024 * 1024):.1f}"
    except Exception:
        return ""


def _to_posix_path(pt_file: Path, base: Path) -> str:
    """Convert to forward-slash relative path (safe for all platforms)."""
    return pt_file.relative_to(base).as_posix()


def _make_model_name(pt_file: Path, source_label: str) -> str:
    """Generate a human-readable model display name."""
    parent_name = pt_file.parent.name
    if parent_name == "weights":
        # e.g. self-train/models/local_xxx/weights/best.pt
        session_dir = pt_file.parent.parent.name
        weight_type = pt_file.stem  # best or last
        return f"{source_label} ({session_dir}/{weight_type})"
    elif parent_name == "models":
        return f"{source_label} ({pt_file.stem})"
    else:
        return f"{source_label} ({parent_name})"


def _is_duplicate_loose_pt(pt_file: Path, base_dir: Path) -> bool:
    """Check if a loose .pt file (e.g. session_xxx_best.pt) is a duplicate
    of a weights/best.pt inside a corresponding session directory."""
    if pt_file.parent != base_dir:
        return False  # not a loose file at the root of base_dir
    stem = pt_file.stem  # e.g. "local_1773928313_best"
    # Check if there's a corresponding directory with weights
    # Pattern: <session_name>_best.pt or <session_name>_last.pt
    for suffix in ("_best", "_last"):
        if stem.endswith(suffix):
            session_name = stem[: -len(suffix)]
            weights_file = base_dir / session_name / "weights" / f"{suffix[1:]}.pt"
            if weights_file.exists():
                return True
    return False


def _get_model_folder_path(pt_file: Path) -> str:
    """Get the absolute path of the model's parent folder."""
    try:
        return str(pt_file.parent.resolve())
    except Exception:
        return ""


def _get_dataset_path_for_model(pt_file: Path) -> str:
    """Get the dataset path associated with a model."""
    try:
        # For models in self-train/models/<session>/weights/, 
        # the dataset is in self-train/models/<session>/ (same as model folder's parent)
        if "self-train" in str(pt_file) and "weights" in str(pt_file):
            # pt_file.parent is weights/, pt_file.parent.parent is <session>/
            session_dir = pt_file.parent.parent  # self-train/models/<session>/
            if session_dir.exists():
                return str(session_dir.resolve())
        # For custom models in models/<session>/weights/, look for dataset in data/<session>/
        if "models" in str(pt_file) and pt_file.parent.name == "weights":
            session_name = pt_file.parent.parent.name
            dataset_dir = ROOT_DIR / "data" / session_name
            if dataset_dir.exists():
                return str(dataset_dir.resolve())
        # Default: check if there's a data.yaml in the parent directory
        data_yaml = pt_file.parent / "data.yaml"
        if data_yaml.exists():
            return str(pt_file.parent.resolve())
        return ""
    except Exception:
        return ""


def list_available_models():
    models = []
    seen_paths = set()

    # 1. Pretrained models
    pretrained_folder = str((ROOT_DIR / "models").resolve())
    models.append(
        {
            "name": "预训练模型 (pretrained)",
            "path": "models/yolo11-rps-detection.pt",
            "source": "pretrained",
            "time": "",
            "size_mb": "",
            "folder_path": pretrained_folder,
            "dataset_path": "",
        }
    )
    seen_paths.add("models/yolo11-rps-detection.pt")

    models.append(
        {
            "name": "YOLOv8n (默认)",
            "path": "yolov8n.pt",
            "source": "pretrained",
            "time": "",
            "size_mb": "",
            "folder_path": pretrained_folder,
            "dataset_path": "",
        }
    )
    seen_paths.add("yolov8n.pt")

    # 2. Scan models directory
    if MODELS_DIR.exists():
        for pt_file in sorted(MODELS_DIR.glob("**/*.pt"), key=lambda p: os.path.getmtime(p), reverse=True):
            rel_path = _to_posix_path(pt_file, ROOT_DIR)
            if rel_path in seen_paths:
                continue
            # Skip loose duplicate .pt files that duplicate weights/ files
            if _is_duplicate_loose_pt(pt_file, MODELS_DIR):
                continue
            seen_paths.add(rel_path)
            models.append(
                {
                    "name": _make_model_name(pt_file, "自定义训练"),
                    "path": rel_path,
                    "source": "custom",
                    "time": _get_model_time(pt_file),
                    "size_mb": _get_model_size_mb(pt_file),
                    "folder_path": _get_model_folder_path(pt_file),
                    "dataset_path": _get_dataset_path_for_model(pt_file),
                }
            )

    # 3. Scan self-train/models directory
    self_train_models_dir = ROOT_DIR / "self-train" / "models"
    if self_train_models_dir.exists():
        for pt_file in sorted(self_train_models_dir.glob("**/*.pt"), key=lambda p: os.path.getmtime(p), reverse=True):
            rel_path = _to_posix_path(pt_file, ROOT_DIR)
            if rel_path in seen_paths:
                continue
            # Skip loose duplicate .pt files that duplicate weights/ files
            if _is_duplicate_loose_pt(pt_file, self_train_models_dir):
                continue
            seen_paths.add(rel_path)
            models.append(
                {
                    "name": _make_model_name(pt_file, "本地训练"),
                    "path": rel_path,
                    "source": "local",
                    "time": _get_model_time(pt_file),
                    "size_mb": _get_model_size_mb(pt_file),
                    "folder_path": _get_model_folder_path(pt_file),
                    "dataset_path": _get_dataset_path_for_model(pt_file),
                }
            )

    return models


app = FastAPI()
app.mount("/static", StaticFiles(directory="app/static"), name="static")

detector = None
camera = None


@app.on_event("startup")
async def startup():
    global detector, camera

    mode = config.get("capture_mode", "camera")

    if mode == "window":
        hwnd = config.get("window_hwnd")
        if hwnd:
            camera = WindowCamera(hwnd=int(hwnd))
        else:
            raise ValueError("window_hwnd is required when capture_mode is 'window'")
    else:
        camera = Cv2Camera(source=config.get("camera_index", 0))

    model_path = resolve_path(config.get("model_path", "yolov8n.pt"))
    load_detector(str(model_path))


def load_detector(model_path: str):
    global detector
    full_path = resolve_path(model_path)
    if full_path.exists():
        detector = HandDetector(str(full_path))
        return True
    return False


@app.on_event("shutdown")
async def shutdown():
    if camera:
        camera.release()


@app.get("/")
async def index():
    with open("app/static/index.html", encoding="utf-8") as f:
        return HTMLResponse(f.read())


@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            frame = camera.read()
            if frame is None:
                await asyncio.sleep(0.03)
                continue
            detections = detector.detect(frame)
            _, buffer = cv2.imencode(".jpg", cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))
            await websocket.send_json(
                {"frame": base64.b64encode(buffer).decode(), "detections": detections}
            )
            await asyncio.sleep(0.03)
    except Exception:
        pass


class SnapshotRequest(BaseModel):
    gesture: str


class SwitchModelRequest(BaseModel):
    model_path: str


class OpenFolderRequest(BaseModel):
    folder_path: str


class CopyPathRequest(BaseModel):
    path: str


def open_folder_in_explorer(folder_path: str) -> bool:
    """Open folder in system file explorer."""
    try:
        if not folder_path or not os.path.exists(folder_path):
            return False
        if platform.system() == "Windows":
            subprocess.run(["explorer", folder_path], check=True)
        elif platform.system() == "Darwin":  # macOS
            subprocess.run(["open", folder_path], check=True)
        else:  # Linux
            subprocess.run(["xdg-open", folder_path], check=True)
        return True
    except Exception:
        return False


def copy_to_clipboard(text: str) -> bool:
    """Copy text to system clipboard."""
    try:
        if platform.system() == "Windows":
            subprocess.run(["clip"], input=text.encode("utf-8"), check=True)
        elif platform.system() == "Darwin":  # macOS
            subprocess.run(["pbcopy"], input=text.encode("utf-8"), check=True)
        else:  # Linux
            subprocess.run(["xclip", "-selection", "clipboard"], input=text.encode("utf-8"), check=True)
        return True
    except Exception:
        return False


@app.post("/folder/open")
async def api_open_folder(req: OpenFolderRequest):
    success = open_folder_in_explorer(req.folder_path)
    return {"status": "success" if success else "error", "message": "" if success else "无法打开文件夹"}


@app.post("/path/copy")
async def api_copy_path(req: CopyPathRequest):
    success = copy_to_clipboard(req.path)
    return {"status": "success" if success else "error", "message": "" if success else "无法复制到剪贴板"}


@app.post("/collect/start")
async def api_start_collection():
    return start_collection()


@app.post("/collect/stop")
async def api_stop_collection():
    return stop_collection()


@app.post("/collect/snapshot")
async def api_snapshot(req: SnapshotRequest):
    frame = camera.read()
    if frame is None:
        return {"status": "error", "message": "Failed to capture frame"}
    return save_snapshot(frame, req.gesture)


@app.get("/collect/status")
async def api_collect_status():
    status = get_status()
    stats_data = get_dataset_stats()
    status["stats"] = stats_data["stats"]
    if stats_data["session_id"]:
        status["session_id"] = stats_data["session_id"]
    return status


@app.post("/train/start")
async def api_start_training(session_id: str, epochs: int = 50):
    return start_training(session_id, epochs)


@app.get("/train/status")
async def api_train_status():
    return get_training_status()


@app.get("/classes")
async def api_classes():
    return {"classes": CLASSES}


@app.get("/dataset")
async def api_dataset_info():
    return get_local_dataset_info()


@app.post("/train/local")
async def api_train_local(epochs: int = 50):
    return start_training_local(epochs)


@app.get("/sessions")
async def api_list_sessions():
    return {"sessions": list_sessions()}


@app.post("/sessions/select")
async def api_select_session(session_id: str):
    return select_session(session_id)


@app.get("/models")
async def api_list_models():
    models = list_available_models()
    # Normalize stored path to posix style for consistent matching
    current_path = config.get("model_path", "yolov8n.pt").replace("\\", "/")
    return {"models": models, "current": current_path}


@app.post("/models/switch")
async def api_switch_model(req: SwitchModelRequest):
    # Normalize to forward slashes
    model_path = req.model_path.replace("\\", "/")
    if load_detector(model_path):
        config["model_path"] = model_path
        save_config()
        return {"status": "success", "model_path": model_path}
    return {"status": "error", "message": f"Model not found: {model_path}"}
