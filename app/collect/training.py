import threading
import time
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
import yaml

ROOT_DIR = Path(__file__).parent.parent.parent / "self-train"
MODEL_DIR = ROOT_DIR / "models"
DATASET_DIR = ROOT_DIR / "dataset"

ROBOFLOW_CLASSES = ["Paper", "Rock", "Scissors"]
APP_CLASSES = ["rock", "paper", "scissors"]

ROBOFLOW_DATASET_PATHS = [
    "data/rock-paper-scissors.v11-yolov8n-100epochs.yolov11",
    "models/rock-paper-scissors.v11-yolov8n-100epochs.yolov11",
]


def find_roboflow_dataset():
    for path in ROBOFLOW_DATASET_PATHS:
        full_path = Path(__file__).parent.parent.parent / path
        if full_path.exists() and (full_path / "data.yaml").exists():
            return str(full_path)
    return None


def get_local_dataset_info():
    path = find_roboflow_dataset()
    if path:
        dataset_path = Path(path)
        train_count = (
            len(list((dataset_path / "train" / "images").glob("*.*")))
            if (dataset_path / "train" / "images").exists()
            else 0
        )
        valid_count = (
            len(list((dataset_path / "valid" / "images").glob("*.*")))
            if (dataset_path / "valid" / "images").exists()
            else 0
        )
        return {
            "available": True,
            "path": path,
            "train_images": train_count,
            "valid_images": valid_count,
        }
    return {"available": False, "path": None, "train_images": 0, "valid_images": 0}


@dataclass
class TrainingState:
    active: bool = False
    progress: float = 0.0
    epoch: int = 0
    total_epochs: int = 50
    message: str = ""
    output_model: Optional[str] = None
    use_roboflow: bool = False


training = TrainingState()


def prepare_dataset_yaml(session_id: str):
    session_dir = DATASET_DIR / session_id

    yaml_content = {
        "path": str(session_dir),
        "train": "images",
        "val": "images",
        "names": {0: "rock", 1: "paper", 2: "scissors"},
    }

    yaml_path = session_dir / "dataset.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(yaml_content, f, allow_unicode=True)

    return yaml_path


def check_gpu():
    try:
        import torch

        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            gpu_mem = torch.cuda.get_device_properties(0).total_memory / 1024**3
            return True, f"{gpu_name} ({gpu_mem:.1f}GB)"
        return False, None
    except Exception:
        return False, None


def start_training(session_id: str, epochs: int = 50):
    if training.active:
        return {"status": "error", "message": "Training already in progress"}

    gpu_available, gpu_info = check_gpu()
    if not gpu_available:
        return {
            "status": "error",
            "message": "GPU not available! Training requires NVIDIA GPU with CUDA support.",
        }

    session_dir = DATASET_DIR / session_id
    if not session_dir.exists():
        return {"status": "error", "message": f"Session not found: {session_id}"}

    yaml_path = prepare_dataset_yaml(session_id)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    output_model = str(MODEL_DIR / f"{session_id}_best.pt")

    training.active = True
    training.progress = 0.0
    training.epoch = 0
    training.total_epochs = epochs
    training.message = f"Starting... Using {gpu_info}"
    training.output_model = output_model

    def train_thread():
        from ultralytics import YOLO

        try:
            model = YOLO("yolov8n.pt")

            def on_train_epoch_end(trainer):
                training.epoch = trainer.epoch + 1
                training.progress = (training.epoch / training.total_epochs) * 100
                loss = trainer.loss if hasattr(trainer, "loss") else 0
                training.message = (
                    f"Epoch {training.epoch}/{training.total_epochs} | Loss: {loss:.3f}"
                )

            model.add_callback("on_train_epoch_end", on_train_epoch_end)

            model.train(
                data=str(yaml_path),
                epochs=epochs,
                imgsz=640,
                batch=16,
                device=0,
                project=str(MODEL_DIR),
                name=session_id,
                exist_ok=True,
                verbose=False,
                augment=True,
            )

            best_model_path = MODEL_DIR / session_id / "weights" / "best.pt"
            if best_model_path.exists():
                import shutil

                shutil.copy(best_model_path, output_model)

            training.active = False
            training.progress = 100.0
            training.message = f"Done! Model saved to {output_model}"

        except Exception as e:
            training.active = False
            training.message = f"Error: {str(e)}"

    thread = threading.Thread(target=train_thread, daemon=True)
    thread.start()

    return {
        "status": "started",
        "session_id": session_id,
        "output_model": output_model,
        "epochs": epochs,
        "gpu": gpu_info,
    }


def start_training_local(epochs: int = 50):
    if training.active:
        return {"status": "error", "message": "Training already in progress"}

    gpu_available, gpu_info = check_gpu()
    if not gpu_available:
        return {
            "status": "error",
            "message": "GPU not available! Training requires NVIDIA GPU with CUDA support.",
        }

    dataset_path = find_roboflow_dataset()
    if not dataset_path:
        return {"status": "error", "message": "Local Roboflow dataset not found!"}

    yaml_path = Path(dataset_path) / "data.yaml"
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    session_id = f"local_{int(time.time())}"
    output_model = str(MODEL_DIR / f"{session_id}_best.pt")

    training.active = True
    training.progress = 0.0
    training.epoch = 0
    training.total_epochs = epochs
    training.message = f"Starting... Using {gpu_info} | Local dataset: {dataset_path}"
    training.output_model = output_model

    def train_thread():
        from ultralytics import YOLO

        try:
            model = YOLO("yolov8n.pt")

            def on_train_epoch_end(trainer):
                training.epoch = trainer.epoch + 1
                training.progress = (training.epoch / training.total_epochs) * 100
                loss = trainer.loss if hasattr(trainer, "loss") else 0
                training.message = (
                    f"Epoch {training.epoch}/{training.total_epochs} | Loss: {loss:.3f}"
                )

            model.add_callback("on_train_epoch_end", on_train_epoch_end)

            model.train(
                data=str(yaml_path),
                epochs=epochs,
                imgsz=640,
                batch=16,
                device=0,
                project=str(MODEL_DIR),
                name=session_id,
                exist_ok=True,
                verbose=False,
                augment=True,
            )

            best_model_path = MODEL_DIR / session_id / "weights" / "best.pt"
            if best_model_path.exists():
                import shutil

                shutil.copy(best_model_path, output_model)

            training.active = False
            training.progress = 100.0
            training.message = f"Done! Model saved to {output_model}"

        except Exception as e:
            training.active = False
            training.message = f"Error: {str(e)}"

    thread = threading.Thread(target=train_thread, daemon=True)
    thread.start()

    return {
        "status": "started",
        "session_id": session_id,
        "output_model": output_model,
        "epochs": epochs,
        "gpu": gpu_info,
        "dataset": dataset_path,
    }


def get_training_status():
    return {
        "active": training.active,
        "progress": training.progress,
        "epoch": training.epoch,
        "total_epochs": training.total_epochs,
        "message": training.message,
        "output_model": training.output_model,
    }
