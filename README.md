# Unity Inspect

## 项目目标

Unity Inspect 用于构建 Unity 场景巡检、问题管理和结果展示的一体化系统。

当前前端已导入 AI Studio 导出的完整管理端界面，并接入 Go 标准库 REST API 与本地 JSON 持久化。Unity 端已实现工业巡检场景、自由视角、射线建标、问题表单和问题提交；WebSocket 和实时传感器仍未接入。

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
- 服务端：Go 标准库 REST API
- 数据：本地 JSON 文件
- 版本控制：本地 Git

## 系统架构

```text
React 管理端 ─┐
               ├─ HTTP/JSON ─ Go REST API ─ server/data/issues.json
Unity 巡检端 ─┘
```

- React 使用 `fetch` 调用 Go API。
- Unity 使用 `UnityWebRequest` 调用 Go API。
- React 与 Unity 共享同一问题 API，但不直接连接。
- Unity WebSocket、实时传感器和前端嵌入 Unity 渲染尚未实现。

## 环境依赖

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

依赖安装：

```powershell
cd D:\Ai-3D-Unity\web
npm install
```

## 当前实现状态

- Unity Editor 可以打开 `unity-smoke-test`，并记录版本 `6000.3.27f1`。
- AI Studio 管理端界面已整合，包含首页、问题管理、统计分析、3D 场景和系统设置页面。
- 全局搜索支持问题编号、标题、描述和场景关键词；从其他页面搜索会进入问题管理页。
- 问题组合筛选、日期筛选、分页、详情、新建、编辑和图表联动已接入真实 API。
- React 与 Unity 的创建请求均支持 `Idempotency-Key`。
- React 后端异常时显示明确错误，不用 0 条记录伪装正常状态。
- Go 模块已初始化，临时模块路径为 `example.com/unity-inspect/server`。
- Go API 已实现问题查询、创建、更新、状态操作、删除和 CSV 导出。
- Go 使用本地 JSON 持久化，运行时数据位于 `server/data/issues.json`。
- React 问题管理、统计、场景和 CSV 已接入 Go API。
- Unity Play Mode 已通过 `UnityWebRequest` 读取真实 API 数据并生成三维问题标记。
- `SampleScene` 已持久化完整泵房环境，编辑模式下可见、可选择和编辑，不依赖进入 Play Mode 才生成。
- 泵房包含混凝土地面与墙面、结构柱、钢梁、三组泵组、阀门、弯管、管道支架、配电柜、压力表、排水沟、格栅和安全标线。
- 泵房使用 `Assets/Materials/PumpRoom` 下的共享 URP Lit 材质，区分混凝土、喷漆金属、不锈钢、安全色和发光指示灯。
- Unity 场景包含 15 个可巡检表面和有效 Collider，可点击地面、墙面、泵组、主管道和配电柜。
- Unity 端支持自由视角、唯一待提交标记、字段校验、POST 提交和明确的成功/失败反馈。
- 项目级 `.gitignore` 和基础文档已建立。
- 本地 Git 仓库使用 `main` 分支。

## 默认账号与演示数据

- 项目没有登录、用户表或真实测试账号。
- React 请求默认发送 `X-Actor: react-admin`。
- Unity 请求默认发送 `X-Actor: unity-inspector`。
- 未提供 `X-Actor` 的客户端由 API 使用 `operator`。
- 首次启动且运行时数据不存在时，API 从 `server/data/seed_issues.json` 初始化 56 条演示问题。
- ID 使用 `#001` 格式，并保存高水位；删除旧问题后不会复用已使用编号。

## API 接口

服务默认地址：`http://127.0.0.1:8080/api`

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| GET | `/issues` | 查询、搜索、筛选和分页 |
| GET | `/issues/{id}` | 查询单个问题 |
| POST | `/issues` | 创建问题 |
| PATCH | `/issues/{id}` | 更新问题 |
| PATCH | `/issues/{id}/status` | 更新状态 |
| DELETE | `/issues/{id}` | 删除问题 |
| POST | `/issues/batch-status` | 批量更新状态 |
| POST | `/issues/batch-delete` | 批量删除 |
| GET | `/issues/export.csv` | 按筛选条件导出 CSV |

列表响应包含：

```text
items
page
pageSize
total
aggregates
```

错误响应统一为：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求字段不合法",
    "fields": {
      "title": "不能为空"
    }
  }
}
```

创建问题支持 `Idempotency-Key` 请求头。React 与 Unity 会自动生成并复用 Key：

- 相同 Key、相同内容：返回原始创建快照，不新增记录。
- 重放响应包含 `Idempotency-Replayed: true`。
- 相同 Key、不同内容：返回 HTTP `409` 和 `IDEMPOTENCY_CONFLICT`。
- 幂等记录与问题数据原子保存在同一 JSON 文件中，有效期 24 小时。
- 幂等记录在服务重启后继续有效；过期后才允许相同 Key 重新创建。
- 有效期内删除问题不会删除幂等快照，但原问题保持删除状态。

## 数据持久化

- 种子数据：`server/data/seed_issues.json`
- 运行时数据：`server/data/issues.json`
- 运行时数据由 `.gitignore` 排除，不应提交或由测试直接修改。
- 写入采用临时文件、同步写入和原子替换。
- 批量和单个写操作失败时，不推进会内存状态。
- 当前实现面向单个 Go 服务进程；不支持多个进程同时写同一个 JSON 文件。

## 演示指标边界

来自真实 API：

- 问题总数、优先级数量、状态数量、场景数量
- 问题列表、分页、搜索与筛选结果
- 问题详情、创建、修改、删除和 CSV

明确属于演示或静态数据：

- 首页健康指数、巡检完成度、闭环率和平均修复时间
- 统计分析页的趋势、整改率、MTTR、点位覆盖率、SLA 和 RII
- 场景页的 Canvas 孪生示意和模拟传感器遥测
- 通知中心示例消息
- 每个问题默认共用的截图占位图

页面中会保留“演示数据”“模拟趋势”或“未连接”等标识。

## 尚未实现

- Unity WebSocket 实时桥接
- Unity 传感器数据和复杂数字孪生
- Unity 截图上传
- 数据库、身份认证、部署和远程仓库配置

## 常用命令

前端开发：

```powershell
cd D:\Ai-3D-Unity\web
npm run dev
```

前端质量检查、测试和生产构建：

```powershell
cd D:\Ai-3D-Unity\web
npm run lint
npm test
npm run build
```

Go API：

```powershell
cd D:\Ai-3D-Unity\server
go run .
```

服务默认仅监听 `127.0.0.1:8080`。

后端测试：

```powershell
cd D:\Ai-3D-Unity\server
go test -count=1 ./...
go vet ./...
```

联调时需要同时运行 Go API 与前端开发服务。前端默认请求
`http://127.0.0.1:8080/api`，可通过 `VITE_API_BASE_URL` 覆盖。

## Unity 打开与运行

1. 使用 Unity `6000.3.27f1` 打开 `D:\Ai-3D-Unity\unity-smoke-test`。
2. 打开 `Assets/Scenes/SampleScene.unity`。
3. 保持 Go API 在 `127.0.0.1:8080` 运行。
4. 进入 Play Mode，运行时会加载 100 条以内的第一页问题并创建三维标记。
5. 右键拖拽旋转，中键拖拽平移，滚轮缩放。
6. 点击地面、墙体、机柜、泵或管线表面创建待提交标记。
7. 在右侧填写标题、描述和优先级，核对 XYZ 坐标后提交。
8. 左侧“刷新问题数据”可重新读取外部修改；“视角复位”可恢复默认构图。

当前工业场景由基础几何体组合并已保存到 `SampleScene`；运行时保留幂等生成作为缺失场景对象时的后备。若需要重建场景，使用 Unity 菜单 `Tools > UNITY-INSPECT > Rebuild Pump Room Scene`，生成完成后会自动保存并聚焦场景。

## 完整演示流程

1. 在 `server` 启动 Go API。
2. 在 `web` 启动 Vite 开发服务。
3. 打开 React 管理端，确认问题列表加载 56 条种子数据。
4. 使用全局搜索查找问题编号或关键词，测试优先级、状态、场景和日期筛选。
5. 在 React 新建一条问题，确认 KPI 和列表增加；编辑后确认详情更新。
6. 在 Unity 打开泵房场景并进入 Play Mode，确认 56 个标记加载。
7. 点击 P-01/P-02/P-03 或 MCC-E01 表面，提交一条问题，核对区域分类和设备编号。
8. 回到 React 刷新页面，确认 Unity 创建的问题可按对应区域查询。
9. 在 React 修改该问题或状态，再回到 Unity 点击“刷新问题数据”核对结果。
10. 删除隔离测试问题时使用单独数据副本，正式演示数据应保持 56 条。

## 已知限制

- 未实现 Unity WebSocket 实时桥接和实时传感器。
- 未实现真实截图上传，所有问题默认使用同一占位图。
- 未实现登录、权限、数据库、部署和远程仓库配置。
- React 场景页使用 Canvas 示意，不是 Unity WebGL 或实时 Unity 渲染。
- 趋势、健康指数、MTTR、SLA、RII 等衍生指标为演示数据。
- JSON 持久化适用于单进程本地演示，不适合多实例并发写入。
- API 不可用或提交失败时会显示明确错误，不会使用假数据冒充成功。
