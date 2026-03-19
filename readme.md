# YOLO Rock-Paper-Scissors Demo

基于 YOLO 的石头剪刀布实时识别演示项目，支持摄像头采集、模型训练和实时检测。

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

编辑 `config.yaml` 修改配置：
- `capture_mode`: 采集模式，`camera` 或 `window`
- `camera_index`: 摄像头索引
- `model_path`: 模型路径

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

## 配置说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `host` | 监听地址 | `0.0.0.0` |
| `port` | 监听端口 | `60319` |
| `capture_mode` | 采集模式 | `camera` |
| `camera_index` | 摄像头索引 | `0` |
| `model_path` | 模型路径 | `models/yolo11-rps-detection.pt` |
| `bbox_refresh_interval` | 检测框刷新间隔(ms) | `100` |
