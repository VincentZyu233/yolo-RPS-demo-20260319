![yolo-RPS-demo-20260319](https://socialify.git.ci/VincentZyu233/yolo-RPS-demo-20260319/image?description=1&font=Source+Code+Pro&forks=1&issues=1&language=1&logo=https%3A%2F%2Fimg.icons8.com%2F%3Fsize%3D100%26id%3DOsYb6orOaOVV%26format%3Dpng%26color%3D000000%E2%80%8B&name=1&owner=1&pulls=1&stargazers=1&theme=Auto)

# YOLO Rock-Paper-Scissors Demo

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/yolo-RPS-fastapi-demo-20260319)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/yolo-RPS-fastapi-demo-20260319)

基于 YOLO + FastAPI 的石头剪刀布实时识别演示项目，支持摄像头采集、模型训练和实时检测。

| 目标检测框架 | [![YOLO](https://img.shields.io/badge/Ultralytics-YOLO11-00FFFF?style=flat-square)](https://github.com/ultralytics/ultralytics) |
|:---|:---|
| 深度学习框架 | [![PyTorch](https://img.shields.io/badge/PyTorch-2.7+cu118-EE4C2C?style=flat-square)](https://pytorch.org/) |
| Web 后端框架 | [![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square)](https://fastapi.tiangolo.com/) |
| 图像处理库 | [![OpenCV](https://img.shields.io/badge/OpenCV-4.9-5C3EE8?style=flat-square)](https://opencv.org/) |
| 数值计算库 | [![NumPy](https://img.shields.io/badge/NumPy-1.26-013243?style=flat-square)](https://numpy.org/) |
| ASGI 服务器 | [![Uvicorn](https://img.shields.io/badge/Uvicorn-0.27-333333?style=flat-square)](https://www.uvicorn.org/) |
| 数据验证库 | [![Pydantic](https://img.shields.io/badge/Pydantic-2.12-E92063?style=flat-square)](https://docs.pydantic.dev/) |
| 图像处理库 | [![Pillow](https://img.shields.io/badge/Pillow-12.1-9CF?style=flat-square)](https://python-pillow.org/) |
| 实时通信 | [![WebSockets](https://img.shields.io/badge/WebSockets-12.0-333333?style=flat-square)](https://github.com/python-websockets/websockets) |
| 模板引擎 | [![Jinja2](https://img.shields.io/badge/Jinja2-3.1-B41717?style=flat-square)](https://jinja.palletsprojects.com/) |
| HTTP 请求库 | [![Requests](https://img.shields.io/badge/Requests-2.32-CF4647?style=flat-square)](https://docs.python-requests.org/) |
| 数据可视化 | [![Matplotlib](https://img.shields.io/badge/Matplotlib-3.10-11557c?style=flat-square)](https://matplotlib.org/) |
| 科学计算库 | [![SciPy](https://img.shields.io/badge/SciPy-1.17-8CAAE6?style=flat-square)](https://scipy.org/) |
| 符号计算库 | [![SymPy](https://img.shields.io/badge/SymPy-1.14-3B5526?style=flat-square)](https://www.sympy.org/) |
| 数据分析库 | [![Pandas](https://img.shields.io/badge/Pandas-3.0-150458?style=flat-square)](https://pandas.pydata.org/) |
| 进度条库 | [![tqdm](https://img.shields.io/badge/tqdm-4.67-FFC107?style=flat-square)](https://github.com/tqdm/tqdm) |
| 环境变量管理 | [![python-dotenv](https://img.shields.io/badge/python--dotenv-1.2-222222?style=flat-square)](https://github.com/theskumar/python-dotenv) |
| 窗口捕获工具 | [![MSS](https://img.shields.io/badge/MSS-9.0-333333?style=flat-square)](https://github.com/BoboTiG/python-mss) |
| 文件上传解析 | [![python-multipart](https://img.shields.io/badge/python--multipart-0.0.6-3776AB?style=flat-square)](https://github.com/Kludex/python-multipart) |
| 异步网络库 | [![AnyIO](https://img.shields.io/badge/AnyIO-4.12-4B8BBE?style=flat-square)](https://anyio.readthedocs.io/) |

![Preview](doc/preview.png)

## 功能特性

- 实时手势检测（石头、剪刀、布）
- 支持摄像头和窗口捕获两种模式
- 数据采集与标注
- 本地模型训练
- Web UI 界面
- 检测框实时显示

## 环境要求

- Python 3.12+
- CUDA 11.8+（如需GPU训练）

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/yolo-rps-demo.git
cd yolo-rps-demo
```

### 2. 使用 uv 创建虚拟环境

> 💡 推荐使用 [【uv】https://docs.astral.sh/uv/getting-started/installation/](https://docs.astral.sh/uv/getting-started/installation/) 管理 Python 环境

```bash
uv venv --python 3.12
```

> **可选** 激活虚拟环境（uv 可直接使用 `.venv` 中的 Python，无需手动激活）：
> - Windows: `.venv\Scripts\activate`
> - Linux/macOS: `source .venv/bin/activate`

### 3. 安装依赖

> **重要提示**: 如果需要使用 CUDA GPU 进行本地训练，PyTorch 必须从特定 URL 安装，不能直接 `pip install torch`！

#### 方式一：有 CUDA GPU（推荐用于训练）

```bash
# 先安装 PyTorch with CUDA 11.8
uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# 再安装其他依赖
uv pip install -r requirements.txt
```

#### 方式二：仅 CPU（仅推理，不支持训练）

```bash
uv pip install -r requirements.txt
```

### 4. 配置

复制配置文件模板：

```bash
cp config.example.yaml config.yaml
```

> 📄 配置文件模板 [config.example.yaml](config.example.yaml)

```yaml
# 服务器配置
host: "0.0.0.0"           # 监听地址，0.0.0.0 表示所有网卡
port: 60319               # 监听端口

# 视频采集配置
capture_mode: "camera"    # 采集模式: "camera" 或 "window"
camera_index: 0           # 摄像头索引 (capture_mode=camera时使用)
window_hwnd: null         # 窗口句柄 (capture_mode=window时使用)

# 模型配置
model_source: "pretrained"  # 模型来源: "pretrained"(预训练) 或 "custom"(自定义训练)
model_path: "models/yolo11-rps-detection.pt"  # 模型路径(相对或绝对路径)

# 代理配置
use_proxy: false         # 是否使用代理下载模型
proxy_url: "http://192.168.31.233:7890"        # 代理地址

# 目标检测模型：石头剪刀布识别 (版本 v11, 规格 yolov8n, 迭代 100 次)
roboflow_dataset: models/rock-paper-scissors.v11-yolov8n-100epochs.yolov11

# 检测框显示配置
bbox_refresh_interval: 100  # 检测框刷新间隔，单位毫秒，默认100ms (10fps)
```

### 5. 运行

```bash
python run.py
```

或使用 uvicorn：

```bash
uvicorn app.main:app --host 0.0.0.0 --port 60319
```

打开浏览器访问 http://localhost:60319

## 项目结构

```
yolo-rps-demo/
├── app/
│   ├── main.py          # FastAPI 主应用
│   ├── static/
│   │   └── index.html   # Web UI
│   ├── camera/          # 摄像头/窗口捕获
│   ├── detection/       # YOLO 检测
│   ├── collect/         # 数据采集与训练
│   └── game/            # 游戏逻辑
├── models/              # 模型文件目录
├── self-train/          # 本地训练输出
├── data/                # 采集的数据集
├── config.yaml          # 配置文件
├── requirements.txt     # 依赖列表
└── run.py               # 启动脚本
```

## 使用说明

### Web UI 标签页

- **采集**: 采集手势数据用于训练
- **历史**: 查看历史采集会话
- **模型**: 切换和管理模型

### 快捷键

采集模式下：
- `R` - 采集石头
- `P` - 采集布
- `S` - 采集剪刀
- `Q` - 停止采集

### URL 参数

支持通过 URL 参数直接跳转到指定标签页：
- `?tab=capture` - 采集页
- `?tab=history` - 历史页
- `?tab=model` - 模型页