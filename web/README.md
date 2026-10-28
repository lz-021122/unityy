# UNITY-INSPECT Web

AI Studio 导出的 React 管理端界面，使用 React 19、TypeScript、Vite、Tailwind CSS 和 Lucide React。

## 页面

- 巡检概览
- 问题管理
- 统计分析
- 数字孪生场景
- 系统配置

## 数据边界

问题管理、统计、场景和 CSV 数据已接入本地 Go API，由服务端负责筛选、分页、聚合与 JSON 持久化。`src/data/mockIssues.ts` 仅保留为历史演示数据参考，不再是业务数据源。

默认 API 地址为 `http://127.0.0.1:8080/api`，可通过 `VITE_API_BASE_URL` 覆盖。Unity WebSocket、截图上传、登录和真实传感器数据尚未接入。

## 命令

```powershell
npm install
npm run dev
npm run lint
npm run build
```
