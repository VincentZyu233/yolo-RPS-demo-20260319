from fastapi import FastAPI, WebSocket
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
    """Save configuration while preserving comments and order."""
    import re
    
    # Read the original file content
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            original_content = f.read()
    else:
        # If file doesn't exist, use example as template
        example_path = ROOT_DIR / "config.example.yaml"
        if example_path.exists():
            with open(example_path, "r", encoding="utf-8") as f:
                original_content = f.read()
        else:
            # Fallback to simple dump
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                yaml.dump(config, f, allow_unicode=True, default_flow_style=False)
            return
    
    # Parse the original content to preserve structure
    lines = original_content.strip().split('\n')
    result_lines = []
    
    # Create a mapping of key to value for easy lookup
    config_dict = dict(config)
    
    # Process each line
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        
        # Skip empty lines
        if not line:
            result_lines.append(line)
            i += 1
            continue
        
        # Handle comments and sections
        if line.startswith('#'):
            result_lines.append(line)
            i += 1
            continue
        
        # Handle key-value pairs
        match = re.match(r'^\s*([^#:]+):\s*(.*)$', line)
        if match:
            key = match.group(1).strip()
            value = match.group(2).strip()
            
            # Check if this key is in our config
            if key in config_dict:
                # Get the value from our config
                new_value = config_dict[key]
                
                # Format the value properly
                if isinstance(new_value, bool):
                    formatted_value = 'true' if new_value else 'false'
                elif new_value is None:
                    formatted_value = 'null'
                else:
                    formatted_value = str(new_value)
                
                # Preserve any trailing comment
                comment_match = re.search(r'#.*$', line)
                comment = comment_match.group(0) if comment_match else ''
                
                # Create the new line
                indent = len(line) - len(line.lstrip())
                new_line = f"{' ' * indent}{key}: {formatted_value}{comment}"
                result_lines.append(new_line)
                
                # Remove this key from the dict so we know which ones are new
                del config_dict[key]
            else:
                # Keep the original line
                result_lines.append(line)
            i += 1
        else:
            # Keep other lines as-is
            result_lines.append(line)
            i += 1
    
    # Add any new keys that weren't in the original
    if config_dict:
        # Add a blank line if not already present
        if result_lines and result_lines[-1].strip():
            result_lines.append('')
        
        # Add new keys
        for key, value in config_dict.items():
            if isinstance(value, bool):
                formatted_value = 'true' if value else 'false'
            elif value is None:
                formatted_value = 'null'
            else:
                formatted_value = str(value)
            result_lines.append(f"{key}: {formatted_value}")
    
    # Write the result back
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        f.write('\n'.join(result_lines) + '\n')


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

# 检查静态文件目录是否存在
static_dir = ROOT_DIR / "app" / "static"
if static_dir.exists() and (static_dir / "index.html").exists():
    # 生产模式：挂载静态文件
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
    static_files_available = True
else:
    static_files_available = False

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
    from fastapi.responses import FileResponse, RedirectResponse
    
    # 如果静态文件存在，直接返回 index.html（生产模式）
    if static_files_available:
        return FileResponse(str(static_dir / "index.html"))
    
    # 否则重定向到前端开发服务器（开发模式）
    webui_port = config.get("webui_port", 60320)
    return RedirectResponse(url=f"http://localhost:{webui_port}")


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


@app.get("/models/analysis")
async def api_model_analysis(model_path: str):
    """Get analysis data for a trained model."""
    import csv
    
    model_path = model_path.replace("\\", "/")
    full_path = resolve_path(model_path)
    
    if not full_path.exists():
        return {"error": "Model not found", "model_path": model_path, "model_name": ""}
    
    model_dir = full_path.parent if full_path.name in ("best.pt", "last.pt") else full_path
    if model_dir.name == "weights":
        model_dir = model_dir.parent
    
    result = {
        "model_path": model_path,
        "model_name": model_dir.name,
    }
    
    def encode_image(img_path: Path) -> str | None:
        if img_path.exists():
            try:
                with open(img_path, "rb") as f:
                    return base64.b64encode(f.read()).decode()
            except Exception:
                return None
        return None
    
    result["results_png"] = encode_image(model_dir / "results.png")
    result["confusion_matrix"] = encode_image(model_dir / "confusion_matrix.png")
    result["confusion_matrix_normalized"] = encode_image(model_dir / "confusion_matrix_normalized.png")
    result["pr_curve"] = encode_image(model_dir / "BoxPR_curve.png")
    result["f1_curve"] = encode_image(model_dir / "BoxF1_curve.png")
    result["p_curve"] = encode_image(model_dir / "BoxP_curve.png")
    result["r_curve"] = encode_image(model_dir / "BoxR_curve.png")
    
    train_batches = []
    for i in range(3):
        img = encode_image(model_dir / f"train_batch{i}.jpg")
        if img:
            train_batches.append(img)
    result["train_batches"] = train_batches
    
    val_batches = []
    for i in range(3):
        labels = encode_image(model_dir / f"val_batch{i}_labels.jpg")
        pred = encode_image(model_dir / f"val_batch{i}_pred.jpg")
        if labels and pred:
            val_batches.append({"labels": labels, "pred": pred})
    result["val_batches"] = val_batches
    
    results_csv_path = model_dir / "results.csv"
    if results_csv_path.exists():
        try:
            with open(results_csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            
            metrics = {
                "epochs": [],
                "train_loss": [],
                "val_loss": [],
                "precision": [],
                "recall": [],
                "mAP50": [],
                "mAP50_95": [],
            }
            
            for i, row in enumerate(rows):
                metrics["epochs"].append(i + 1)
                metrics["train_loss"].append(float(row.get("train/box_loss", 0) or 0) + float(row.get("train/cls_loss", 0) or 0) + float(row.get("train/dfl_loss", 0) or 0))
                metrics["val_loss"].append(float(row.get("val/box_loss", 0) or 0) + float(row.get("val/cls_loss", 0) or 0) + float(row.get("val/dfl_loss", 0) or 0))
                metrics["precision"].append(float(row.get("metrics/precision(B)", 0) or 0))
                metrics["recall"].append(float(row.get("metrics/recall(B)", 0) or 0))
                metrics["mAP50"].append(float(row.get("metrics/mAP50(B)", 0) or 0))
                metrics["mAP50_95"].append(float(row.get("metrics/mAP50-95(B)", 0) or 0))
            
            result["metrics"] = metrics
        except Exception:
            result["metrics"] = None
    
    args_path = model_dir / "args.yaml"
    if args_path.exists():
        try:
            with open(args_path, "r", encoding="utf-8") as f:
                result["args"] = yaml.safe_load(f)
        except Exception:
            result["args"] = None
    
    return result
