import React from 'react';
import type { Issue, NavTab } from '../types';
import { ShieldCheck, AlertTriangle, ArrowRight, TrendingUp, Box } from 'lucide-react';

interface HomeScreenProps {
  issues: Issue[];
  onNavigateTab: (tab: NavTab) => void;
  onOpenIssue: (issue: Issue) => void;
  onLocateIssue: (issue: Issue) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  issues,
  onNavigateTab,
  onOpenIssue,
  onLocateIssue,
}) => {
  const highPriorityIssues = issues.filter((i) => i.priority === 'HIGH' && i.status !== 'RESOLVED');
  const openCount = issues.filter((i) => i.status === 'OPEN').length;
  const inProgressCount = issues.filter((i) => i.status === 'IN_PROGRESS').length;

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-medium mb-3 backdrop-blur-xs border border-blue-400/20">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
            <span>智能巡检数字孪生系统 • 演示数据模式</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            欢迎使用 UNITY-INSPECT 工业数字孪生巡检平台
          </h1>
          <p className="text-sm text-blue-100 mt-2 leading-relaxed">
            用于展示 Unity 三维场景定位、隐患抓拍存档及设备问题闭环处置的前端交互，当前未连接真实 Unity 服务。
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('issues')}
              className="px-4 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>查看全部待办隐患</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateTab('scenes')}
              className="px-4 py-2 bg-blue-700/60 hover:bg-blue-700 text-white border border-blue-400/40 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Box className="w-4 h-4" />
              <span>进入3D场景漫游</span>
            </button>
          </div>
        </div>

        {/* Decorative Grid SVG in background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
          <svg className="w-96 h-96 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">设备健康安全指数</span>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
              优良
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">92.4 <span className="text-xs font-normal text-slate-400">/ 100</span></div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92.4%' }}></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">今日巡检完成度</span>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
              第 3 / 4 轮
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">75%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">当前待处理隐患</span>
            <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full">
              需关注
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{openCount + inProgressCount} <span className="text-xs font-normal text-slate-400">项</span></div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span className="text-rose-500 font-semibold">{highPriorityIssues.length} 项</span>
            <span>高优先级待办</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">本月隐患闭环率</span>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
              达标
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">88.6%</div>
          <div className="text-[11px] text-emerald-600 mt-2 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>平均修复耗时 4.2 小时</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Urgent Alerts & Facility Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent High Priority Alerts (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-800">高优先级隐患紧急看板</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold">
                {highPriorityIssues.length} 项紧急
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('issues')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>转到问题列表</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {highPriorityIssues.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-lg transition-colors group cursor-pointer"
                onClick={() => onOpenIssue(item)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                    {item.id}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span className="text-slate-600">{item.scene}</span>
                      <span>•</span>
                      <span className="font-mono">
                        坐标: ({item.pos.x}, {item.pos.y}, {item.pos.z})
                      </span>
                      <span>•</span>
                      <span>上报: {item.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocateIssue(item);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="在3D空间中定位"
                  >
                    <Box className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenIssue(item);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-xs transition-colors"
                  >
                    处理
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Facility Zones Status Overview (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">各区域孪生运行态势</h2>
            <button
              onClick={() => onNavigateTab('scenes')}
              className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
            >
              三维视口
            </button>
          </div>

          <div className="space-y-3">
            {[
              {
                name: '泵房区',
                status: '注意',
                statusColor: 'text-amber-600 bg-amber-50',
                issuesCount: issues.filter((i) => i.scene === '泵房区').length,
                sensors: '温度 78.5℃ (超标) / 压力 1.84 MPa',
              },
              {
                name: '配电室',
                status: '正常',
                statusColor: 'text-emerald-600 bg-emerald-50',
                issuesCount: issues.filter((i) => i.scene === '配电室').length,
                sensors: '母线发热点 42℃ / 绝缘监测正常',
              },
              {
                name: '管道区',
                status: '预警',
                statusColor: 'text-rose-600 bg-rose-50',
                issuesCount: issues.filter((i) => i.scene === '管道区').length,
                sensors: '共振振幅 2.4 mm/s / 法兰压力平衡',
              },
              {
                name: '其他区域',
                status: '正常',
                statusColor: 'text-slate-600 bg-slate-100',
                issuesCount: issues.filter((i) => i.scene === '其他').length,
                sensors: '外围红外安防、环境温湿度处于正常阈值',
              },
            ].map((zone) => (
              <div
                key={zone.name}
                onClick={() => onNavigateTab('scenes')}
                className="p-3 rounded-lg border border-slate-100 hover:border-blue-200 bg-slate-50/60 hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-xs group-hover:text-blue-600">
                    {zone.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">{zone.issuesCount} 项隐患</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${zone.statusColor}`}>
                      {zone.status}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 font-mono">{zone.sensors}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>在班巡检人员: 6 名</span>
              <span>同步频率: 1000ms</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
