import os
import uuid
from pathlib import Path
import cv2
import numpy as np
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

ROOT_DIR = Path(__file__).parent.parent.parent / "self-train"
DATASET_DIR = ROOT_DIR / "dataset"
CLASSES = ["rock", "paper", "scissors"]


@dataclass
class CollectionState:
    active: bool = False
    counts: dict = field(default_factory=lambda: {c: 0 for c in CLASSES})
    session_id: Optional[str] = None


collection = CollectionState()


def get_session_dir():
    if not collection.session_id:
        collection.session_id = f"session_{uuid.uuid4().hex[:8]}"
    session_dir = DATASET_DIR / collection.session_id
    for cls in CLASSES:
        (session_dir / "images" / cls).mkdir(parents=True, exist_ok=True)
    return session_dir


def start_collection():
    collection.active = True
    collection.session_id = None
    collection.counts = {c: 0 for c in CLASSES}
    return {"status": "started", "counts": collection.counts}


def stop_collection():
    collection.active = False
    session_dir = get_session_dir()
    return {
        "status": "stopped",
        "session_id": collection.session_id,
        "counts": collection.counts,
        "path": str(session_dir),
    }


def save_snapshot(frame: np.ndarray, gesture: str):
    if not collection.active:
        return {"status": "error", "message": "Collection not active"}

    if gesture not in CLASSES:
        return {"status": "error", "message": f"Invalid gesture: {gesture}"}

    session_dir = get_session_dir()
    img_dir = session_dir / "images" / gesture

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{gesture}_{ts}.jpg"
    img_path = img_dir / filename

    cv2.imwrite(str(img_path), cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))

    collection.counts[gesture] += 1

    return {
        "status": "saved",
        "gesture": gesture,
        "filename": filename,
        "counts": collection.counts,
    }


def get_status():
    return {
        "active": collection.active,
        "session_id": collection.session_id,
        "counts": collection.counts,
        "classes": CLASSES,
    }


def list_sessions():
    sessions = []
    if not DATASET_DIR.exists():
        return sessions

    for session_path in DATASET_DIR.iterdir():
        if not session_path.is_dir() or not session_path.name.startswith("session_"):
            continue

        stats = {c: 0 for c in CLASSES}
        total = 0
        for cls in CLASSES:
            img_dir = session_path / "images" / cls
            if img_dir.exists():
                count = len(list(img_dir.glob("*.jpg")))
                stats[cls] = count
                total += count

        mtime = datetime.fromtimestamp(session_path.stat().st_mtime)

        sessions.append(
            {
                "id": session_path.name,
                "total": total,
                "stats": stats,
                "created": mtime.strftime("%Y-%m-%d %H:%M:%S"),
            }
        )

    sessions.sort(key=lambda x: x["created"], reverse=True)
    return sessions


def select_session(session_id: str):
    session_dir = DATASET_DIR / session_id
    if not session_dir.exists():
        return {"status": "error", "message": f"Session not found: {session_id}"}

    collection.session_id = session_id
    collection.active = False

    stats = {c: 0 for c in CLASSES}
    for cls in CLASSES:
        img_dir = session_dir / "images" / cls
        if img_dir.exists():
            stats[cls] = len(list(img_dir.glob("*.jpg")))

    collection.counts = stats

    return {
        "status": "selected",
        "session_id": session_id,
        "counts": stats,
    }


def get_dataset_stats():
    stats = {c: 0 for c in CLASSES}
    session_id = None
    if collection.session_id:
        session_dir = DATASET_DIR / collection.session_id
        session_id = collection.session_id
        for cls in CLASSES:
            img_dir = session_dir / "images" / cls
            if img_dir.exists():
                stats[cls] = len(list(img_dir.glob("*.jpg")))
    return {"stats": stats, "session_id": session_id}
