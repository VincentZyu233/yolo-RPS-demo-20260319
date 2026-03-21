#!/usr/bin/env python
"""GPU 检测脚本"""

import sys
import os

# 创建tmp文件夹
tmp_dir = "../tmp"
os.makedirs(tmp_dir, exist_ok=True)


def test_gpu():
    print("=" * 50)
    print("GPU 检测")
    print("=" * 50)

    try:
        import torch

        print(f"\nPyTorch 版本: {torch.__version__}")
    except ImportError:
        print("\nERROR: PyTorch 未安装")
        print(
            "安装命令: uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118"
        )
        return False

    print(f"\nCUDA 可用: {torch.cuda.is_available()}")

    if torch.cuda.is_available():
        print(f"CUDA 版本: {torch.version.cuda}")
        print(f"cuDNN 版本: {torch.backends.cudnn.version()}")
        print("\nGPU 设备:")
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            mem = props.total_memory / 1024**3
            print(f"  [{i}] {props.name}")
            print(f"      显存: {mem:.1f} GB")
            print(f"      计算能力: {props.major}.{props.minor}")
        return True
    else:
        print("\nWARNING: CUDA 不可用!")
        print("\n可能原因:")
        print("  1. NVIDIA 驱动未安装或版本过低")
        print("  2. PyTorch 未安装 CUDA 版本")
        print("  3. 当前使用 CPU 版本的 PyTorch")
        print("\n解决方案:")
        print("  pip uninstall torch torchvision")
        print(
            "  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118"
        )
        return False


def test_yolo_gpu():
    print("\n" + "=" * 50)
    print("YOLO GPU 测试")
    print("=" * 50)

    try:
        from ultralytics import YOLO
        import torch

        if not torch.cuda.is_available():
            print("\nERROR: CUDA 不可用，跳过 YOLO GPU 测试")
            return False

        print("\n运行 YOLO 推理测试...")
        # 使用tmp文件夹存储模型
        model_path = os.path.join(tmp_dir, "yolov8n.pt")
        model = YOLO(model_path)
        
        # 下载图片到tmp文件夹
        import requests
        image_url = "https://ultralytics.com/images/bus.jpg"
        image_path = os.path.join(tmp_dir, "bus.jpg")
        
        if not os.path.exists(image_path):
            print("下载测试图片...")
            response = requests.get(image_url)
            with open(image_path, "wb") as f:
                f.write(response.content)
        
        model(
            image_path, device=0, verbose=False
        )

        print("YOLO GPU 推理成功!")
        return True

    except ImportError as e:
        print(f"\nERROR: {e}")
        return False
    except Exception as e:
        print(f"\nERROR: {e}")
        return False


if __name__ == "__main__":
    gpu_ok = test_gpu()

    if gpu_ok:
        print("\n" + "=" * 50)
        print("开始 YOLO GPU 测试...")
        print("=" * 50)
        yolo_ok = test_yolo_gpu()

        print("\n" + "=" * 50)
        print("总结")
        print("=" * 50)
        print(f"GPU 状态: {'OK' if gpu_ok else 'FAIL'}")
        print(f"YOLO GPU: {'OK' if yolo_ok else 'FAIL'}")

        if gpu_ok and yolo_ok:
            print("\n可以开始训练!")
            sys.exit(0)
        else:
            print("\n请解决上述问题后再试")
            sys.exit(1)
    else:
        sys.exit(1)
