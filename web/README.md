# UNITY-INSPECT Web

AI Studio 导出的 React 管理端界面，使用 React 19、TypeScript、Vite、Tailwind CSS 和 Lucide React。

## 页面

- 巡检概览
- 问题管理
- 统计分析
- 数字孪生场景
- 系统配置

## 数据边界

当前问题数据来自 `src/data/mockIssues.ts`，新建、编辑、筛选和图表联动仅保存在浏览器内存中。Unity WebSocket、Go API、登录和数据库均未连接；相关状态在界面中明确标记为演示数据。

## 命令

```powershell
npm install
npm run dev
npm run lint
npm run build
```
