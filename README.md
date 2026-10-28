# Unity Inspect

## 项目目标

Unity Inspect 用于构建 Unity 场景巡检、问题管理和结果展示的一体化系统。

当前前端已导入 AI Studio 导出的完整管理端界面，并使用统一的本地演示数据；Go 端已提供标准库 REST API 与本地 JSON 持久化。React 尚未切换为 API 数据源，Unity 业务与实时桥接仍未开始。

## 当前目录结构

```text
Ai-3D-Unity/
├── unity/                  # Unity Editor 未完整初始化，当前保留待处理
├── unity-smoke-test/       # 当前有效的 Unity 验证工程
├── web/                    # React + TypeScript 管理端前端
├── server/                 # Go REST API、测试和 JSON 种子数据
├── .gitignore
├── AI_LOG.md
└── README.md
```

当前 Unity 工程路径为：

```text
D:\Ai-3D-Unity\unity-smoke-test
```

`unity-smoke-test` 包含 Unity 默认 `SampleScene`。根目录下的 `unity` 是此前 Licensing 初始化失败后留下的不完整目录，不是当前活动工程。

## 技术栈

- Unity：`6000.3.27f1`
- 前端：React + TypeScript + Vite + Tailwind CSS
- 图标：Lucide React
- 服务端：Go
- 版本控制：本地 Git

## 环境版本

本次初始化实际使用的工具版本：

```text
Unity Editor : 6000.3.27f1
Node.js      : v24.15.0
npm          : 11.12.1
Go           : go1.27.0 windows/amd64
Git          : 2.54.0.windows.1
```

前端主要依赖版本：

```text
react        : 19.3.1
react-dom    : 19.3.1
typescript   : 7.0.2
vite         : 8.3.5
tailwindcss  : 4.3.3
lucide-react : 0.546.0
```

## 当前初始化状态

- Unity Editor 可以打开 `unity-smoke-test`，并记录版本 `6000.3.27f1`。
- AI Studio 管理端界面已整合，包含首页、问题管理、统计分析、3D 场景和系统设置页面。
- 问题搜索、组合筛选、分页、详情、新建、编辑和图表联动已完成前端演示。
- 前端依赖已安装，lint 和生产构建已实际执行。
- Go 模块已初始化，临时模块路径为 `example.com/unity-inspect/server`。
- Go API 已实现问题查询、创建、更新、状态操作、删除和 CSV 导出。
- Go 使用本地 JSON 持久化，运行时数据位于 `server/data/issues.json`。
- 项目级 `.gitignore` 和基础文档已建立。
- 本地 Git 仓库使用 `main` 分支。

## 尚未实现

- Unity 巡检脚本
- React 与 Go API 的数据接入
- Unity 与 Web、Go 服务之间的业务数据交互
- Unity WebSocket 实时桥接
- 前端演示数据的服务端持久化
- 数据库、身份认证、部署和远程仓库配置

## 常用命令

前端开发：

```powershell
cd D:\Ai-3D-Unity\web
npm run dev
```

前端生产构建：

```powershell
cd D:\Ai-3D-Unity\web
npm run build
```

Go API：

```powershell
cd D:\Ai-3D-Unity\server
go run .
```

服务默认仅监听 `127.0.0.1:8080`。
