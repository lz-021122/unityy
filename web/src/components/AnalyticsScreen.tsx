import React, { useState } from 'react';
import type { Issue } from '../types';
import { BarChart2, Download } from 'lucide-react';

interface AnalyticsScreenProps {
  issues: Issue[];
  onExportReport: () => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ issues, onExportReport }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'quarter'>('7d');

  const total = issues.length;
  const high = issues.filter((i) => i.priority === 'HIGH').length;
  const med = issues.filter((i) => i.priority === 'MEDIUM').length;
  const low = issues.filter((i) => i.priority === 'LOW').length;

  const open = issues.filter((i) => i.status === 'OPEN').length;
  const inProgress = issues.filter((i) => i.status === 'IN_PROGRESS').length;
  const resolved = issues.filter((i) => i.status === 'RESOLVED').length;

  const pump = issues.filter((i) => i.scene === '泵房区').length;
  const power = issues.filter((i) => i.scene === '配电室').length;
  const pipe = issues.filter((i) => i.scene === '管道区').length;
  const other = issues.filter((i) => i.scene === '其他').length;

  const openPct = total > 0 ? Math.round((open / total) * 100) : 0;
  const inProgPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const resolvedPct =
    total > 0 ? Math.max(0, 100 - openPct - inProgPct) : 0;

  // 7-day trend mock numbers
  const weeklyTrends = [
    { day: '10-22', found: 6, resolved: 4 },
    { day: '10-23', found: 8, resolved: 5 },
    { day: '10-24', found: 5, resolved: 6 },
    { day: '10-25', found: 9, resolved: 7 },
    { day: '10-26', found: 12, resolved: 9 },
    { day: '10-27', found: 10, resolved: 8 },
    { day: '10-28', found: 6, resolved: 4 },
  ];

  const maxTrend = 14;

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <span>智能巡检统计分析大屏</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            隐患发展趋势、多维分布模型与设备可靠性量化评估
          </p>
          <span className="inline-block mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            趋势与衍生指标为演示数据
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs text-xs">
            {(['7d', '30d', 'quarter'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range === '7d' ? '近7天' : range === '30d' ? '近30天' : '本季度'}
              </button>
            ))}
          </div>

          <button
            onClick={onExportReport}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出统计分析报告</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs text-slate-500">累计发现隐患</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{total}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">环比增加 12%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs text-slate-500">高危隐患整改率</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">94.2%</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">达到安全特级标准</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs text-slate-500">平均处置闭环周期 (MTTR)</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">4.2 小时</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">较上季度缩短 1.8h</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs text-slate-500">数字孪生点位覆盖率</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">99.4%</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">56/56 点位空间校准</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Bar/Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">巡检发现 vs 处置解决趋势</h3>
              <p className="text-xs text-slate-400 mt-0.5">每日隐患上报数与维保完工数对比</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500"></span>
                <span className="text-slate-600">发现隐患</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500"></span>
                <span className="text-slate-600">已闭环解决</span>
              </div>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between pt-6 pb-2 px-4 border-b border-slate-100">
            {weeklyTrends.map((item) => (
              <div key={item.day} className="flex flex-col items-center gap-2 flex-1">
                <div className="flex items-end gap-1.5 h-48 w-full justify-center">
                  {/* Found bar */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">{item.found}</span>
                    <div
                      className="w-4 bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600"
                      style={{ height: `${(item.found / maxTrend) * 100}%` }}
                    ></div>
                  </div>
                  {/* Resolved bar */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">{item.resolved}</span>
                    <div
                      className="w-4 bg-emerald-500 rounded-t transition-all duration-500 hover:bg-emerald-600"
                      style={{ height: `${(item.resolved / maxTrend) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Donut Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">问题状态全周期分布</h3>
            <p className="text-xs text-slate-400 mt-0.5">当前演示数据状态占比与统计</p>
          </div>

          <div className="my-6 flex items-center justify-around">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4.5"
                />
                <path
                  className="text-sky-400"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${openPct}, 100`}
                  strokeDashoffset="0"
                  strokeWidth="4.5"
                />
                <path
                  className="text-amber-400"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${inProgPct}, 100`}
                  strokeDashoffset={`-${openPct}`}
                  strokeWidth="4.5"
                />
                <path
                  className="text-emerald-400"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${resolvedPct}, 100`}
                  strokeDashoffset={`-${openPct + inProgPct}`}
                  strokeWidth="4.5"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-bold text-slate-800">{total}</span>
                <span className="text-[10px] text-slate-400">总计条目目</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                <span className="text-slate-600">待办打开 ({open})</span>
                <span className="font-semibold text-slate-800">{openPct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="text-slate-600">维保中 ({inProgress})</span>
                <span className="font-semibold text-slate-800">{inProgPct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <span className="text-slate-600">已闭环 ({resolved})</span>
                <span className="font-semibold text-slate-800">{resolvedPct}%</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500">
            已解决比率保持在健康区间，高危响应 SLA 合格率 98.6%。
          </div>
        </div>
      </div>

      {/* Second Row: Scene Defect Density & Priority Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scene Defect Density */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800">各车间/区域隐患密度排行</h3>
          <div className="space-y-4">
            {[
              { name: '泵房区', count: pump, color: 'bg-blue-500', pct: 27 },
              { name: '管道走廊区', count: pipe, color: 'bg-indigo-500', pct: 25 },
              { name: '配电室与控制柜', count: power, color: 'bg-sky-500', pct: 23 },
              { name: '其他公用设施', count: other, color: 'bg-slate-400', pct: 25 },
            ].map((sc) => (
              <div key={sc.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">{sc.name}</span>
                  <span className="text-slate-500">{sc.count} 项 ({sc.pct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${sc.color} rounded-full transition-all duration-500`}
                    style={{ width: `${sc.pct * 3.5}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800">优先级风险度量化</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-xl text-center">
              <span className="text-xs font-semibold text-rose-600">🔴 高优先级</span>
              <div className="text-2xl font-bold text-rose-700 mt-2">{high}</div>
              <span className="text-[10px] text-rose-500 block mt-1">需 2 小时内响应</span>
            </div>
            <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl text-center">
              <span className="text-xs font-semibold text-amber-600">🟡 中优先级</span>
              <div className="text-2xl font-bold text-amber-700 mt-2">{med}</div>
              <span className="text-[10px] text-amber-500 block mt-1">24 小时排程检修</span>
            </div>
            <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl text-center">
              <span className="text-xs font-semibold text-emerald-600">🟢 低优先级</span>
              <div className="text-2xl font-bold text-emerald-700 mt-2">{low}</div>
              <span className="text-[10px] text-emerald-500 block mt-1">例行维保跟踪</span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center justify-between">
            <span>当前安全风险评定：</span>
            <span className="font-bold text-emerald-600">受控状态 (RII: 1.28)</span>
          </div>
        </div>
      </div>
    </main>
  );
};
