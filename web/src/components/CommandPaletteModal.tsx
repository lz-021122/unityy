import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight, Box, BarChart2, Plus } from 'lucide-react';
import type { Issue, NavTab } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  onNavigateTab: (tab: NavTab) => void;
  onCreateNew: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  issues,
  onSelectIssue,
  onNavigateTab,
  onCreateNew,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredIssues = query.trim()
    ? issues
        .filter(
          (i) =>
            i.title.toLowerCase().includes(query.toLowerCase()) ||
            i.id.toLowerCase().includes(query.toLowerCase()) ||
            i.scene.toLowerCase().includes(query.toLowerCase()) ||
            i.desc.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 6)
    : issues.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入关键词搜索问题编号、标题、空间场景..."
            className="w-full bg-transparent border-0 p-0 text-sm text-slate-800 placeholder-slate-400 focus:ring-0 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions Bar */}
        {!query && (
          <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-600 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              快捷指令:
            </span>
            <button
              onClick={() => {
                onClose();
                onCreateNew();
              }}
              className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>新建巡检问题</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigateTab('scenes');
              }}
              className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Box className="w-3.5 h-3.5 text-blue-600" />
              <span>进入场景管理 (3D)</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigateTab('analytics');
              }}
              className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
              <span>查看统计分析</span>
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-2">
          {filteredIssues.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">未找到匹配的问题</div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => {
                  onSelectIssue(issue);
                  onClose();
                }}
                className="p-3 rounded-lg hover:bg-blue-50/70 transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-700 px-2 py-0.5 rounded transition-colors">
                    {issue.id}
                  </span>
                  <div>
                    <h4 className="text-xs font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                      {issue.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{issue.scene}</span>
                      <span>•</span>
                      <span>坐标 ({issue.pos.x}, {issue.pos.y}, {issue.pos.z})</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      issue.priority === 'HIGH'
                        ? 'bg-rose-50 text-rose-600'
                        : issue.priority === 'MEDIUM'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {issue.priority === 'HIGH' ? '高' : issue.priority === 'MEDIUM' ? '中' : '低'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <span>使用 ⌘K 打开此面板</span>
          <span>按 ESC 键退出</span>
        </div>
      </div>
    </div>
  );
};
