import React, { useState } from 'react';
import { X, Camera, Trash2, Box } from 'lucide-react';
import type { Issue, Priority, IssueStatus, SceneCategory, WorldPosition } from '../types';
import { HOTLINK_SCREENSHOT } from '../data/mockIssues';

interface IssueDrawerProps {
  isOpen: boolean;
  mode: 'view' | 'create';
  issue: Issue | null;
  onClose: () => void;
  onSave: (issueData: Partial<Issue>) => void;
  onDelete?: (id: string) => void;
  onOpenLightbox: (issue: Issue) => void;
  onLocateInScene: (issue: Issue) => void;
}

export const IssueDrawer: React.FC<IssueDrawerProps> = ({
  isOpen,
  mode,
  issue,
  onClose,
  onSave,
  onDelete,
  onOpenLightbox,
  onLocateInScene,
}) => {
  const [title, setTitle] = useState(issue?.title ?? '');
  const [desc, setDesc] = useState(issue?.desc ?? '');
  const [priority, setPriority] = useState<Priority>(issue?.priority ?? 'HIGH');
  const [status, setStatus] = useState<IssueStatus>(issue?.status ?? 'OPEN');
  const [scene, setScene] = useState<SceneCategory>(
    (issue?.scene as SceneCategory) ?? '泵房区'
  );
  const [pos, setPos] = useState<WorldPosition>(
    issue?.pos ?? { x: 12.354, y: 0.86, z: -5.217 }
  );
  const [screenshot, setScreenshot] = useState(issue?.screenshot || HOTLINK_SCREENSHOT);
  const [reporter, setReporter] = useState(issue?.reporter ?? '管理员 (工号: ADM-01)');
  const [assignee, setAssignee] = useState(issue?.assignee ?? '待分派');
  const [deviceCode, setDeviceCode] = useState(
    issue?.deviceCode ?? (mode === 'create' ? 'DEV-BF-001' : '')
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('请输入问题标题！');
      return;
    }
    onSave({
      id: issue?.id,
      title: title.trim(),
      desc: desc.trim(),
      priority,
      status,
      scene,
      pos,
      screenshot,
      reporter,
      assignee,
      deviceCode,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sliding Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-[430px] max-w-full bg-white border-l border-slate-200 z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {mode === 'create' ? '新建巡检问题' : `问题详情 - ${issue?.id}`}
            </h3>
            {mode === 'view' && issue && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  issue.priority === 'HIGH'
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : issue.priority === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}
              >
                {issue.priority === 'HIGH' ? '高优先级' : issue.priority === 'MEDIUM' ? '中优先级' : '低优先级'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content Area */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">
              标题 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: 泵出口法兰渗漏"
              className="w-full px-3 py-2 rounded-lg border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">描述</label>
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="描述具体隐患、巡检情况与处理建议..."
              className="w-full px-3 py-2 rounded-lg border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 resize-none"
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                优先级 <span className="text-rose-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-2.5 py-1.5 rounded-lg border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              >
                <option value="HIGH">🔴 高</option>
                <option value="MEDIUM">🟡 中</option>
                <option value="LOW">🟢 低</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                状态 <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as IssueStatus)}
                className="w-full px-2.5 py-1.5 rounded-lg border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              >
                <option value="OPEN">🔵 打开</option>
                <option value="IN_PROGRESS">🟠 处理中</option>
                <option value="RESOLVED">🟢 已解决</option>
              </select>
            </div>
          </div>

          {/* Scene Category & Device Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">所属场景</label>
              <select
                value={scene}
                onChange={(e) => setScene(e.target.value as SceneCategory)}
                className="w-full px-2.5 py-1.5 rounded-lg border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              >
                <option value="泵房区">泵房区</option>
                <option value="配电室">配电室</option>
                <option value="管道区">管道区</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">关联设备编号</label>
              <input
                type="text"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
                placeholder="例如: PUMP-A01"
                className="w-full px-2.5 py-1.5 rounded-lg border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* World Coordinates */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-600 font-medium">场景位置 (Unity 世界坐标)</label>
              {mode === 'view' && issue && (
                <button
                  type="button"
                  onClick={() => onLocateInScene(issue)}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-[11px]"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>在3D空间中定位</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="text-slate-400 font-bold mr-1">X</span>
                <input
                  type="number"
                  step="0.001"
                  value={pos.x}
                  onChange={(e) => setPos({ ...pos, x: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent border-0 p-0 text-xs text-slate-700 focus:ring-0"
                />
              </div>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="text-slate-400 font-bold mr-1">Y</span>
                <input
                  type="number"
                  step="0.001"
                  value={pos.y}
                  onChange={(e) => setPos({ ...pos, y: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent border-0 p-0 text-xs text-slate-700 focus:ring-0"
                />
              </div>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="text-slate-400 font-bold mr-1">Z</span>
                <input
                  type="number"
                  step="0.001"
                  value={pos.z}
                  onChange={(e) => setPos({ ...pos, z: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent border-0 p-0 text-xs text-slate-700 focus:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Reporter & Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">上报人 / 班组</label>
              <input
                type="text"
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">当前处理人</label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">创建时间</label>
              <input
                type="text"
                readOnly
                value={issue?.createdAt || '保存后自动生成'}
                className="w-full px-2.5 py-1.5 rounded-lg border-slate-200 text-xs bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">更新时间</label>
              <input
                type="text"
                readOnly
                value={issue?.updatedAt || '保存后自动生成'}
                className="w-full px-2.5 py-1.5 rounded-lg border-slate-200 text-xs bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Screenshots Preview matching screen.png */}
          <div>
            <label className="block text-slate-600 font-medium mb-2">相关截图</label>
            <div className="flex items-center gap-3">
              <div
                onClick={() => {
                  if (issue) onOpenLightbox(issue);
                }}
                className="relative w-28 h-20 rounded-lg overflow-hidden border border-slate-200 group bg-slate-900 shadow-2xs cursor-pointer"
              >
                <img
                  src={screenshot}
                  alt="相关截图"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-medium">
                  点击放大
                </div>
              </div>

              <label className="w-28 h-20 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer">
                <Camera className="w-5 h-5 mb-1" />
                <span className="text-[11px]">更换截图</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setScreenshot(url);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Audit Logs Timeline */}
          {mode === 'view' && issue?.auditLogs && issue.auditLogs.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-slate-600 font-medium mb-2">流转与处置记录</label>
              <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-1 text-[11px]">
                {issue.auditLogs.map((log, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white"></span>
                    <div className="text-slate-500 font-mono text-[10px]">{log.time}</div>
                    <div className="text-slate-700 font-medium">{log.user}: {log.action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Drawer Footer Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          {mode === 'view' && issue && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(`确认删除此问题记录 (${issue.id}) 吗？`)) {
                  onDelete(issue.id);
                  onClose();
                }
              }}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="删除此问题"
            >
              <Trash2 className="w-4 h-4" />
              <span>删除</span>
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-medium text-xs transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-2xs"
            >
              {mode === 'create' ? '创建问题' : '保存修改'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
