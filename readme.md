# YOLO Rock-Paper-Scissors Recognition Demo
## reponame: `yolo-RPS-fastapi-demo-20260319`

> ✊✋✌️Rock-Paper-Scissors 简称 RPS

![yolo-RPS-fastapi-demo-20260319](https://socialify.git.ci/VincentZyuApps/yolo-RPS-fastapi-demo-20260319/image?custom_description=%E2%9C%8A%E2%9C%8B%E2%9C%8C%EF%B8%8FRock-Paper-Scissors+%E7%AE%80%E7%A7%B0+RPS+%E3%80%82%E5%9F%BA%E4%BA%8E+Ultralytics+YOLOv11%E7%9A%84%E7%9F%B3%E5%A4%B4%E5%89%AA%E5%88%80%E5%B8%83%E6%89%8B%E5%8A%BF%E5%AE%9E%E6%97%B6%E6%A3%80%E6%B5%8B%EF%BC%8C%E6%94%AF%E6%8C%81%E6%91%84%E5%83%8F%E5%A4%B4%E9%87%87%E9%9B%86+or+%E7%AA%97%E5%8F%A3%E6%8D%95%E8%8E%B7%E3%80%82%E5%8F%AF%E4%BB%A5%E6%9C%AC%E5%9C%B0%E8%AE%AD%E7%BB%83%E6%A8%A1%E5%9E%8B%E3%80%82&custom_language=Python&description=1&font=Inter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fimg.icons8.com%2F%3Fsize%3D100%26id%3DOsYb6orOaOVV%26format%3Dpng%26color%3D000000&name=1&owner=1&pulls=1&stargazers=1&theme=Auto)

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/yolo-RPS-fastapi-demo-20260319)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/yolo-RPS-fastapi-demo-20260319)

基于 YOLOv11 + FastAPI + React 的石头剪刀布实时识别演示项目，支持摄像头采集、模型训练和实时检测。

![Preview](doc/preview.png)

## 功能特性

- 🎯 实时手势检测（石头、剪刀、布）
- 📹 支持摄像头和窗口捕获两种模式
- 📊 数据采集与自动标注
- 🤖 本地模型训练
- 📈 模型性能分析可视化
- 🌐 Web UI 界面
- 🔲 检测框实时显示

## 技术栈

### 后端

| 技术 | 版本 | 说明 |
|:---|:---|:---|
| [![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/) | 3.12+ | 编程语言 |
| [![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/) | 0.109 | Web 框架 |
| [![YOLO](https://img.shields.io/badge/Ultralytics-YOLO11-00FFFF?style=flat-square)](https://github.com/ultralytics/ultralytics) | 8.4.23 | 目标检测框架 |
| [![PyTorch](https://img.shields.io/badge/PyTorch-2.7+cu118-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org/) | 2.7+cu118 | 深度学习框架 |
| [![OpenCV](https://img.shields.io/badge/OpenCV-4.9-5C3EE8?style=flat-square&logo=opencv&logoColor=white)](https://opencv.org/) | 4.9 | 图像处理库 |
| [![Uvicorn](https://img.shields.io/badge/Uvicorn-0.27-333333?style=flat-square)](https://www.uvicorn.org/) | 0.27 | ASGI 服务器 |
| [![WebSockets](https://img.shields.io/badge/WebSockets-12.0-333333?style=flat-square)](https://github.com/python-websockets/websockets) | 12.0 | 实时通信 |
| [![Pydantic](https://img.shields.io/badge/Pydantic-2.12-E92063?style=flat-square)](https://docs.pydantic.dev/) | 2.12 | 数据验证 |
| [![NumPy](https://img.shields.io/badge/NumPy-1.26-013243?style=flat-square&logo=numpy&logoColor=white)](https://numpy.org/) | 1.26 | 数值计算 |
| [![Pillow](https://img.shields.io/badge/Pillow-12.1-9CF?style=flat-square)](https://python-pillow.org/) | 12.1 | 图像处理 |

### 前端

| 技术 | 版本 | 说明 |
|:---|:---|:---|
| [![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/) | 19.2.4 | UI 框架 |
| [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) | 5.9 | 类型系统 |
| [![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/) | 8.0 | 构建工具 |
| [![Recharts](https://img.shields.io/badge/Recharts-3.8-22B5BF?style=flat-square)](https://recharts.org/) | 3.8 | 图表库 |
| [![React Router](https://img.shields.io/badge/React_Router-7.13-CA4245?style=flat-square&logo=react-router&logoColor=white)](https://reactrouter.com/) | 7.13 | 路由管理 |
| [![html-to-image](https://img.shields.io/badge/html--to--image-1.11-FF6B6B?style=flat-square)](https://github.com/bubkoo/html-to-image) | 1.11 | 图片导出 |
| [![ESLint](https://img.shields.io/badge/ESLint-9.39-4B32C3?style=flat-square&logo=eslint&logoColor=white)](https://eslint.org/) | 9.39 | 代码检查 |
| [![Babel](https://img.shields.io/badge/Babel-7.29-F9DC3E?style=flat-square&logo=babel&logoColor=black)](https://babeljs.io/) | 7.29 | 编译器 |
| [![React Compiler](https://img.shields.io/badge/React_Compiler-1.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/learn/react-compiler) | 1.0 | 编译优化 |

## 快速开始

### 环境要求

- Python 3.12+
- Node.js 18+
- CUDA 11.8+（如需GPU训练）

### 1. 克隆项目

```bash
git clone https://github.com/VincentZyuApps/yolo-RPS-fastapi-demo-20260319
cd yolo-RPS-fastapi-demo-20260319
```

### 2. 后端设置

```bash
# 创建虚拟环境
uv venv --python 3.12

# 安装 PyTorch (CUDA 版本)
uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# 安装其他依赖
uv pip install -r requirements.txt

# 复制配置文件
cp config.example.yaml config.yaml
```

### 3. 前端设置
```bash
cd frontend
npm install
cd ..
```

### 4. 启动服务

#### 方式一：开发模式（推荐开发时使用）

同时启动后端和前端开发服务器：

```bash
cd frontend
npm install   # 首次需要安装依赖
npm run dev
```

- 后端 API: http://localhost:60319
- 前端页面: http://localhost:60320

#### 方式二：生产模式（推荐部署时使用）

先构建前端，然后只启动后端：

```bash
cd frontend
npm install   # 首次需要安装依赖
npm run build
npm run start
```

- 统一访问: http://localhost:60319

后端会自动检测静态文件是否存在，如果存在则直接提供前端页面，否则重定向到前端开发服务器。

## 项目结构

```
yolo-rps-demo/
├── app/                    # 后端应用
│   ├── camera/            # 摄像头/窗口捕获
│   ├── collect/           # 数据采集与训练
│   ├── detection/         # YOLO 检测
│   └── main.py            # FastAPI 入口
├── frontend/              # React 前端
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── services/      # API 服务
│   │   └── styles/        # 样式
│   └── package.json
├── models/                # 模型文件
├── self-train/            # 训练数据与结果
│   ├── sessions/          # 采集会话
│   └── models/            # 训练好的模型
├── test/                  # 测试脚本
├── config.example.yaml    # 配置模板
├── requirements.txt       # Python 依赖
└── run.py                 # 启动脚本
```

## 配置说明

编辑 `config.yaml`：

```yaml
# ============================================
# 🖥️  服务器配置
# ============================================
host: "0.0.0.0"           # 🌐 监听地址，0.0.0.0 表示所有网卡
port: 60319               # 🔌 监听端口

# ============================================
# 📹 视频采集配置
# ============================================
capture_mode: "camera"    # 🎬 采集模式: "camera" 或 "window"
camera_index: 0           # 📷 摄像头索引 (capture_mode=camera时使用)
window_hwnd: null         # 🪟 窗口句柄 (capture_mode=window时使用，Windows上可用 test/list_windows.py 获取)

# ============================================
# 🤖 模型配置
# ============================================
model_source: "pretrained"                      # 📦 模型来源: "pretrained"(预训练) 或 "custom"(自定义训练)
model_path: "models/yolo11-rps-detection.pt"   # 📁 模型路径(相对或绝对路径)

# ============================================
# 🌍 代理配置
# ============================================
use_proxy: false              # 🔀 是否使用代理下载模型
proxy_url: "http://127.0.0.1:7890"  # 🌐 代理地址

# ============================================
# 📚 数据集配置
# ============================================
# 🎯 目标检测模型：石头剪刀布识别
roboflow_dataset: models/rock-paper-scissors.v11-yolov8n-100epochs.yolov11

# ============================================
# 🎨 检测框显示配置
# ============================================
bbox_refresh_interval: 100  # ⏱️ 检测框刷新间隔，单位毫秒，默认100ms (10fps)
```

## Web UI 使用说明

### 标签页

| 标签 | 功能 |
|:---|:---|
| **采集** | 采集手势数据用于训练 |
| **历史** | 查看历史采集会话 |
| **模型** | 切换和管理模型 |
| **分析** | 查看模型训练结果和性能指标 |

### 快捷键

采集模式下：
- `R` - 采集石头
- `P` - 采集布
- `S` - 采集剪刀
- `Q` - 停止采集

## 代码检查

### 一键检查脚本

项目提供了便捷的代码检查脚本，自动运行 Ruff 和 Biome 检查：

**Windows (PowerShell):**
```powershell
.\check.ps1
```

**Linux/macOS (Bash):**
```bash
./check.sh
```

**跨平台 (Python):**
```bash
python check.py
```

检查完成后，日志将输出到：
- `tmp/uv_ruff_check_latest.log` - Python 代码检查结果
- `tmp/npx_biome_check.log` - 前端代码检查结果

### 手动检查

#### Python (Ruff)

```bash
# 检查代码
uv tool run ruff check .

# 自动修复
uv tool run ruff check . --fix
```

#### 前端 (Biome)

```bash
cd frontend

# 格式化代码
npx @biomejs/biome format ./src --write

# 检查代码
npx @biomejs/biome check ./src

# 自动修复
npx @biomejs/biome check ./src --fix
```

## 开发环境参考

- OS: Windows 11 / WSL2 Ubuntu 22.04
- GPU: NVIDIA RTX 3060 12GB
- Python: 3.12
- Node.js: 22.17.0

![开发环境](doc/my-device-RTX3060-fastfetch-nvidia-smi.png)

### 训练报告示例

<table>
  <tr>
    <th align="center" colspan="2">📊 模型性能指标</th>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="doc/report/01_模型性能指标.png" width="100%">
    </td>
  </tr>
  <tr>
    <th align="center" width="50%">📈 训练结果</th>
    <th align="center" width="50%">🔀 混淆矩阵</th>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="doc/report/02_训练结果.png" width="100%">
    </td>
    <td align="center" width="50%">
      <img src="doc/report/03_混淆矩阵.png" width="100%">
    </td>
  </tr>
  <tr>
    <th align="center" width="50%">📊 归一化混淆矩阵</th>
    <th align="center" width="50%">📉 Precision-Recall 曲线</th>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="doc/report/04_归一化混淆矩阵.png" width="100%">
    </td>
    <td align="center" width="50%">
      <img src="doc/report/05_Precision-Recall曲线.png" width="100%">
    </td>
  </tr>
  <tr>
    <th align="center" colspan="2">📈 训练曲线</th>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="doc/report/06_训练曲线.png" width="100%">
    </td>
  </tr>
  <tr>
    <th align="center" width="50%">🖼️ 训练批次示例</th>
    <th align="center" width="50%">🆚 验证批次对比</th>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="doc/report/07_训练批次示例.png" width="100%">
    </td>
    <td align="center" width="50%">
      <img src="doc/report/08_验证批次对比.png" width="100%">
    </td>
  </tr>
  <tr>
    <th align="center" colspan="2">⚙️ 训练参数</th>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="doc/report/09_训练参数.png" width="100%">
    </td>
  </tr>
</table>

## 模型架构可视化

### YOLO 网络架构

```mermaid
graph TB
    Input[输入图像 640x640] --> Backbone[CSPDarknet 骨干网络]
    Backbone --> P3[特征图 80x80]
    Backbone --> P4[特征图 40x40]
    Backbone --> P5[特征图 20x20]
    
    P3 --> Neck[PANet 特征融合]
    P4 --> Neck
    P5 --> Neck
    
    Neck --> P3_out[输出特征图 80x80]
    Neck --> P4_out[输出特征图 40x40]
    Neck --> P5_out[输出特征图 20x20]
    
    P3_out --> Head[检测头]
    P4_out --> Head
    P5_out --> Head
    
    Head --> Output[检测结果]
    
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px
    classDef input fill:#e6f7ff,stroke:#1890ff,stroke-width:2px
    classDef backbone fill:#f6ffed,stroke:#52c41a,stroke-width:2px
    classDef neck fill:#fff7e6,stroke:#fa8c16,stroke-width:2px
    classDef head fill:#fff2e8,stroke:#fa541c,stroke-width:2px
    classDef output fill:#f9f0ff,stroke:#722ed1,stroke-width:2px
    
    class Input input
    class Backbone backbone
    class Neck neck
    class Head head
    class Output output
```

### 特征图尺寸变化

```mermaid
graph TD
    A[输入图像 640x640] --> B[CSPDarknet 第一层 320x320]
    B --> C[CSPDarknet 第二层 160x160]
    C --> D[CSPDarknet 第三层 80x80]
    D --> E[CSPDarknet 第四层 40x40]
    E --> F[CSPDarknet 第五层 20x20]
    
    F --> G[PANet 上采样 40x40]
    G --> H[特征融合 40x40]
    H --> I[PANet 上采样 80x80]
    I --> J[特征融合 80x80]
    
    J --> K[检测头输出 80x80]
    H --> L[检测头输出 40x40]
    F --> M[检测头输出 20x20]
    
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px
    classDef input fill:#e6f7ff,stroke:#1890ff,stroke-width:2px
    classDef process fill:#f6ffed,stroke:#52c41a,stroke-width:2px
    classDef output fill:#f9f0ff,stroke:#722ed1,stroke-width:2px
    
    class A input
    class B,C,D,E,F,G,H,I,J process
    class K,L,M output
```

### Anchor Box 尺寸

| 特征图 | 尺寸 | Anchor Box 尺寸 (w×h) |
|:---|:---|:---|
| P5 | 20×20 | 116×90, 156×198, 373×326 |
| P4 | 40×40 | 30×61, 62×45, 59×119 |
| P3 | 80×80 | 10×13, 16×30, 33×23 |

### NMS (非极大值抑制) 流程

```mermaid
graph TD
    A[原始检测框] --> B[按置信度排序]
    B --> C[选择置信度最高的框]
    C --> D[计算与其他框的IoU]
    D --> E{IoU > 阈值?}
    E -->|是| F[抑制该框]
    E -->|否| G[保留该框]
    F --> H[处理下一个框]
    G --> H
    H --> I{还有框?}
    I -->|是| C
    I -->|否| J[最终检测结果]
    
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px
    classDef process fill:#f6ffed,stroke:#52c41a,stroke-width:2px
    classDef decision fill:#fff7e6,stroke:#fa8c16,stroke-width:2px
    classDef output fill:#f9f0ff,stroke:#722ed1,stroke-width:2px
    
    class A process
    class B,C,D process
    class E,I decision
    class F,G process
    class H process
    class J output
```
