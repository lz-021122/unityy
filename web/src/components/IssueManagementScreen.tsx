import React, { useState, useMemo } from 'react';
import type { Issue, Priority, IssueStatus, SceneCategory } from '../types';
import {
  Plus,
  RotateCcw,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  BarChart2,
  Download,
  Trash2,
  Box,
  Check,
} from 'lucide-react';

interface IssueManagementScreenProps {
  issues: Issue[];
  onOpenCreateDrawer: () => void;
  onOpenViewDrawer: (issue: Issue) => void;
  onLocateInScene: (issue: Issue) => void;
  onUpdateIssueStatus: (id: string, status: IssueStatus) => void;
  onDeleteIssue: (id: string) => void;
  onBatchResolve: (ids: string[]) => void;
  onBatchDelete: (ids: string[]) => void;
  searchQuery: string;
  onResetSearch: () => void;
  onExportData: () => void;
}

export const IssueManagementScreen: React.FC<IssueManagementScreenProps> = ({
  issues,
  onOpenCreateDrawer,
  onOpenViewDrawer,
  onLocateInScene,
  onUpdateIssueStatus,
  onDeleteIssue,
  onBatchResolve,
  onBatchDelete,
  searchQuery,
  onResetSearch,
  onExportData,
}) => {
  // Filter States
  const [filterPriority, setFilterPriority] = useState<'ALL' | Priority>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | IssueStatus>('ALL');
  const [filterScene, setFilterScene] = useState<'ALL' | SceneCategory | string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Table selection & pagination
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageState, setPageState] = useState({
    page: 1,
    search: searchQuery,
  });
  const currentPage = pageState.search === searchQuery ? pageState.page : 1;
  const setCurrentPage = (next: number | ((page: number) => number)) => {
    setPageState((previous) => {
      const visiblePage = previous.search === searchQuery ? previous.page : 1;
      const page = typeof next === 'function' ? next(visiblePage) : next;
      return { page, search: searchQuery };
    });
  };
  const pageSize = 5; // Exactly 5 rows per page to match screen.png (#001 - #005)

  // Active action menu row
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filtered dataset
  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      // Query filter
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.scene.toLowerCase().includes(q);

      // Priority filter
      const matchesPriority = filterPriority === 'ALL' || item.priority === filterPriority;

      // Status filter
      const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;

      // Scene filter
      const matchesScene = filterScene === 'ALL' || item.scene === filterScene;

      // Date range filter
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && item.createdAt.slice(0, 10) >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && item.createdAt.slice(0, 10) <= endDate;
      }

      return matchesQuery && matchesPriority && matchesStatus && matchesScene && matchesDate;
    });
  }, [issues, searchQuery, filterPriority, filterStatus, filterScene, startDate, endDate]);

  const totalRecords = filteredIssues.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Current page records
  const paginatedIssues = useMemo(() => {
    const page = Math.min(Math.max(1, currentPage), totalPages);
    const start = (page - 1) * pageSize;
    return filteredIssues.slice(start, start + pageSize);
  }, [filteredIssues, currentPage, totalPages]);

  // Statistics for KPI cards and charts, derived from the same filtered dataset as the table
  const stats = useMemo(() => {
    const total = filteredIssues.length;
    const high = filteredIssues.filter((i) => i.priority === 'HIGH').length;
    const med = filteredIssues.filter((i) => i.priority === 'MEDIUM').length;
    const low = filteredIssues.filter((i) => i.priority === 'LOW').length;

    const open = filteredIssues.filter((i) => i.status === 'OPEN').length;
    const inProgress = filteredIssues.filter((i) => i.status === 'IN_PROGRESS').length;
    const resolved = filteredIssues.filter((i) => i.status === 'RESOLVED').length;

    const pump = filteredIssues.filter((i) => i.scene === '泵房区').length;
    const power = filteredIssues.filter((i) => i.scene === '配电室').length;
    const pipe = filteredIssues.filter((i) => i.scene === '管道区').length;
    const other = filteredIssues.filter((i) => i.scene === '其他').length;

    return { total, high, med, low, open, inProgress, resolved, pump, power, pipe, other };
  }, [filteredIssues]);

  const handleResetFilters = () => {
    setFilterPriority('ALL');
    setFilterStatus('ALL');
    setFilterScene('ALL');
    setStartDate('');
    setEndDate('');
    onResetSearch();
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredIssues.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Helper renderers for priority and status tags matching screen.png
  const renderPriorityTag = (p: Priority) => {
    switch (p) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
            高
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
            中
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
            低
          </span>
        );
    }
  };

  const renderStatusTag = (s: IssueStatus) => {
    switch (s) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
            打开
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
            处理中
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
            已解决
          </span>
        );
    }
  };

  // Percentages for Donut chart
  const openPct = stats.total > 0 ? Math.round((stats.open / stats.total) * 100) : 0;
  const inProgPct = stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0;
  const resolvedPct =
    stats.total > 0 ? Math.max(0, 100 - openPct - inProgPct) : 0;

  // Maximum values for bars
  const maxPriority = Math.max(stats.high, stats.med, stats.low, 1);
  const maxScene = Math.max(stats.pump, stats.power, stats.pipe, stats.other, 1);

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Title & Description Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">问题管理</h1>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              演示数据
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">查看、筛选和管理巡检发现的问题</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportData}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            title="导出当前问题报表为 CSV / JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出报表</span>
          </button>
        </div>
      </div>

      {/* Filters & Actions Header Bar matching screen.png */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter: Priority */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">优先级</span>
            <select
              value={filterPriority}
              onChange={(e) => {
                setFilterPriority(e.target.value as 'ALL' | Priority);
                setCurrentPage(1);
              }}
              className="text-xs border-slate-200 rounded-lg py-1.5 px-2.5 bg-slate-50 text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">全部</option>
              <option value="HIGH">高</option>
              <option value="MEDIUM">中</option>
              <option value="LOW">低</option>
            </select>
          </div>

          {/* Filter: Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">状态</span>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as 'ALL' | IssueStatus);
                setCurrentPage(1);
              }}
              className="text-xs border-slate-200 rounded-lg py-1.5 px-2.5 bg-slate-50 text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">全部</option>
              <option value="OPEN">打开</option>
              <option value="IN_PROGRESS">处理中</option>
              <option value="RESOLVED">已解决</option>
            </select>
          </div>

          {/* Filter: Scene */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">场景</span>
            <select
              value={filterScene}
              onChange={(e) => {
                setFilterScene(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border-slate-200 rounded-lg py-1.5 px-2.5 bg-slate-50 text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">全部</option>
              <option value="泵房区">泵房区</option>
              <option value="配电室">配电室</option>
              <option value="管道区">管道区</option>
              <option value="其他">其他</option>
            </select>
          </div>

          {/* Filter: Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">创建时间</span>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-0 p-0 text-xs text-slate-600 focus:ring-0 focus:outline-none"
              />
              <span className="text-slate-400 mx-1.5">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-0 p-0 text-xs text-slate-600 focus:ring-0 focus:outline-none"
              />
            </div>
          </div>

          {/* Reset Filter Button */}
          <button
            onClick={handleResetFilters}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置</span>
          </button>
        </div>

        {/* Add Issue Button */}
        <button
          onClick={onOpenCreateDrawer}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建问题</span>
        </button>
      </div>

      {/* Batch Action Bar if rows are selected */}
      {selectedIds.size > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-blue-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>已选中 {selectedIds.size} 项问题</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onBatchResolve(Array.from(selectedIds));
                setSelectedIds(new Set());
              }}
              className="px-3 py-1 bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors"
            >
              批量标记为已解决
            </button>
            <button
              onClick={() => {
                if (confirm(`确认批量删除这 ${selectedIds.size} 条记录吗？`)) {
                  onBatchDelete(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }
              }}
              className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg font-medium transition-colors"
            >
              批量删除
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-500 hover:text-slate-700 text-xs px-2"
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* KPI Metrics Cards Row (4 cards matching the reference) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Issues */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">问题总数</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</div>
            <div className="flex items-center text-[11px] text-blue-600 font-medium mt-1">
              <span>↑ +12%</span>
              <span className="text-slate-400 ml-1.5 font-normal">模拟趋势</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: High Priority */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">高优先级</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.high}</div>
            <div className="flex items-center text-[11px] text-rose-600 font-medium mt-1">
              <span>↑ +20%</span>
              <span className="text-slate-400 ml-1.5 font-normal">模拟趋势</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">处理中</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.inProgress}</div>
            <div className="flex items-center text-[11px] text-amber-600 font-medium mt-1">
              <span>↑ +9%</span>
              <span className="text-slate-400 ml-1.5 font-normal">模拟趋势</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Resolved */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">已解决</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.resolved}</div>
            <div className="flex items-center text-[11px] text-emerald-600 font-medium mt-1">
              <span>↑ +22%</span>
              <span className="text-slate-400 ml-1.5 font-normal">模拟趋势</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Data Table Container */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-medium">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedIssues.length > 0 &&
                      paginatedIssues.every((i) => selectedIds.has(i.id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-3 px-4 font-semibold text-slate-600">ID</th>
                <th className="py-3 px-4 font-semibold text-slate-600">标题</th>
                <th className="py-3 px-4 font-semibold text-slate-600">优先级</th>
                <th className="py-3 px-4 font-semibold text-slate-600">状态</th>
                <th className="py-3 px-4 font-semibold text-slate-600">场景位置</th>
                <th className="py-3 px-4 font-semibold text-slate-600">创建时间</th>
                <th className="py-3 px-4 font-semibold text-slate-600">更新时间</th>
                <th className="py-3 px-4 text-center font-semibold text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paginatedIssues.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>暂无符合条件的问题记录</span>
                  </td>
                </tr>
              ) : (
                paginatedIssues.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  const isMenuOpen = activeMenuId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onOpenViewDrawer(item)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer group ${
                        isChecked ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">{item.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </td>
                      <td className="py-3 px-4">{renderPriorityTag(item.priority)}</td>
                      <td className="py-3 px-4">{renderStatusTag(item.status)}</td>
                      <td className="py-3 px-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-[11px]">
                            ({item.pos.x}, {item.pos.y}, {item.pos.z})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{item.createdAt}</td>
                      <td className="py-3 px-4 text-slate-500">{item.updatedAt}</td>
                      <td
                        className="py-3 px-4 text-center relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onOpenViewDrawer(item)}
                            className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                          >
                            查看
                          </button>
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMenuId(isMenuOpen ? null : item.id)
                              }
                              className="text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded text-sm leading-none font-bold"
                              title="更多操作"
                            >
                              ···
                            </button>
                            {isMenuOpen && (
                              <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 text-left text-xs animate-in fade-in duration-100">
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onLocateInScene(item);
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5"
                                >
                                  <Box className="w-3.5 h-3.5 text-blue-500" />
                                  <span>3D场景定位</span>
                                </button>
                                {item.status !== 'RESOLVED' ? (
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onUpdateIssueStatus(item.id, 'RESOLVED');
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-slate-50 text-emerald-600 flex items-center gap-1.5"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>标为已解决</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onUpdateIssueStatus(item.id, 'IN_PROGRESS');
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-slate-50 text-amber-600 flex items-center gap-1.5"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>重开/处理中</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    if (confirm(`确认删除问题 ${item.id} 吗？`)) {
                                      onDeleteIssue(item.id);
                                    }
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-1.5 border-t border-slate-100 mt-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>删除</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer matching screen.png */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div>共 {totalRecords} 条记录</div>
          <div className="flex items-center gap-1 select-none">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                const isCurrent = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 border border-blue-600 text-blue-600 font-bold'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="px-1 text-slate-400">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-7 h-7 flex items-center justify-center rounded border transition-colors ${
                      currentPage === totalPages
                        ? 'bg-blue-50 border-blue-600 text-blue-600 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* BEGIN: AnalyticsPanel matching screen.png */}
      <div className="mt-8 pt-4">
        <h2 className="text-sm font-bold text-blue-600 tracking-tight mb-4 flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4" />
          <span>统计分析</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Chart 1: Status Donut Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-800">问题状态分布</span>
            <div className="flex items-center justify-around my-4">
              {/* SVG Donut Chart */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background circle */}
                  <path
                    className="text-slate-100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4.5"
                  />
                  {/* Segment 1: Open (Sky Blue) */}
                  <path
                    className="text-sky-400 transition-all duration-500"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${openPct}, 100`}
                    strokeDashoffset="0"
                    strokeWidth="4.5"
                  />
                  {/* Segment 2: In Progress (Amber) */}
                  <path
                    className="text-amber-400 transition-all duration-500"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${inProgPct}, 100`}
                    strokeDashoffset={`-${openPct}`}
                    strokeWidth="4.5"
                  />
                  {/* Segment 3: Resolved (Green) */}
                  <path
                    className="text-emerald-400 transition-all duration-500"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${resolvedPct}, 100`}
                    strokeDashoffset={`-${openPct + inProgPct}`}
                    strokeWidth="4.5"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-bold text-slate-800 leading-none">
                    {stats.total}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">总计</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                  <span className="text-slate-600">打开</span>
                  <span className="font-medium text-slate-700 ml-1">{stats.open}</span>
                  <span className="text-slate-400 text-[11px]">{openPct}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="text-slate-600">处理中</span>
                  <span className="font-medium text-slate-700 ml-1">{stats.inProgress}</span>
                  <span className="text-slate-400 text-[11px]">{inProgPct}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-600">已解决</span>
                  <span className="font-medium text-slate-700 ml-1">{stats.resolved}</span>
                  <span className="text-slate-400 text-[11px]">{resolvedPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart 2: Priority Histogram */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-800">优先级分布</span>
            <div className="h-32 flex items-end justify-between px-6 pt-2 pb-1 border-b border-slate-100">
              {/* Bar High */}
              <div className="flex flex-col items-center gap-1 w-12">
                <span className="text-[11px] font-semibold text-rose-500">{stats.high}</span>
                <div
                  className="w-8 bg-rose-400 rounded-t transition-all duration-500"
                  style={{ height: `${(stats.high / maxPriority) * 85}%` }}
                ></div>
              </div>
              {/* Bar Med */}
              <div className="flex flex-col items-center gap-1 w-12">
                <span className="text-[11px] font-semibold text-amber-500">{stats.med}</span>
                <div
                  className="w-8 bg-amber-400 rounded-t transition-all duration-500"
                  style={{ height: `${(stats.med / maxPriority) * 85}%` }}
                ></div>
              </div>
              {/* Bar Low */}
              <div className="flex flex-col items-center gap-1 w-12">
                <span className="text-[11px] font-semibold text-emerald-500">{stats.low}</span>
                <div
                  className="w-8 bg-emerald-400 rounded-t transition-all duration-500"
                  style={{ height: `${(stats.low / maxPriority) * 85}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between px-6 pt-2 text-[11px] text-slate-500 font-medium">
              <span className="w-12 text-center">高</span>
              <span className="w-12 text-center">中</span>
              <span className="w-12 text-center">低</span>
            </div>
          </div>

          {/* Chart 3: Scene Distribution */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-800">按场景分布</span>
            <div className="space-y-3 my-2">
              {/* Item 1: 泵房区 */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>泵房区</span>
                  <span className="font-medium text-slate-800">{stats.pump}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.pump / maxScene) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Item 2: 配电室 */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>配电室</span>
                  <span className="font-medium text-slate-800">{stats.power}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-400 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.power / maxScene) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Item 3: 管道区 */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>管道区</span>
                  <span className="font-medium text-slate-800">{stats.pipe}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.pipe / maxScene) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Item 4: 其他 */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>其他</span>
                  <span className="font-medium text-slate-800">{stats.other}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.other / maxScene) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* END: AnalyticsPanel */}
    </main>
  );
};
