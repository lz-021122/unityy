import React, { useState } from 'react';
import { Bell, ChevronDown, AlertTriangle, Info } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCommandPalette: () => void;
  onOpenEngineStatus: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenCommandPalette,
  onOpenEngineStatus,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    {
      id: 1,
      type: 'alert',
      title: '演示提醒：高优先级泵出口法兰渗漏',
      time: '10分钟前',
      read: false,
    },
    {
      id: 2,
      type: 'warning',
      title: '演示提醒：2号循环泵电机测温异常',
      time: '1小时前',
      read: false,
    },
    {
      id: 3,
      type: 'info',
      title: '演示场景数据已载入',
      time: '2小时前',
      read: true,
    },
  ];

  return (
    <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between gap-2 shadow-xs">
      {/* Brand Info */}
      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        <div className="flex items-center gap-2 text-slate-900 font-extrabold tracking-tight text-base select-none">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <span className="tracking-wider hidden sm:inline">UNITY-INSPECT</span>
        </div>
        <div className="hidden md:block h-4 w-px bg-slate-200"></div>
        <span className="hidden md:inline text-slate-500 font-medium text-xs tracking-normal select-none">
          问题管理系统
        </span>
      </div>

      {/* Center Quick Search Bar */}
      <div className="w-full flex-1 min-w-0 max-w-96 relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            ></path>
          </svg>
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索问题标题或描述..."
          className="w-full pl-9 pr-12 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs rounded-full border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[10px] text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
          title="快捷搜索 (Cmd+K / Ctrl+K)"
        >
          <kbd className="border border-slate-200 rounded px-1.5 py-0.5 bg-white shadow-2xs font-mono font-medium">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Header Right Actions */}
      <div className="flex items-center gap-1 sm:gap-4 shrink-0">
        {/* Engine Sync Status quick indicator */}
        <button
          onClick={onOpenEngineStatus}
          className="hidden md:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200/70"
          title="点击查看 Unity 演示引擎状态"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="font-medium">演示模式 · Unity 未连接</span>
        </button>

        {/* Notification Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            title="通知消息"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">系统通知</span>
                <span className="text-[10px] bg-red-50 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">
                  2 条新告警
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer"
                  >
                    {item.type === 'alert' && (
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    {item.type === 'warning' && (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    {item.type === 'info' && (
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-800 font-medium leading-snug">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-3 pt-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
                >
                  全部标为已读
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-2 cursor-pointer group select-none"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold ring-2 ring-blue-100">
              管
            </div>
            <span className="hidden sm:inline text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
              管理员
            </span>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
          </div>

          {/* User Menu Modal / Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-800">系统总管理员</p>
                <p className="text-[11px] text-slate-400 mt-0.5">admin@unity-inspect.com</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">
                    最高权限
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                    双重认证开启
                  </span>
                </div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenEngineStatus();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                >
                  <span>数字孪生引擎状态</span>
                  <span className="text-[10px] text-amber-600 font-semibold">演示</span>
                </button>
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700"
                >
                  个人巡检偏好设置
                </button>
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700"
                >
                  快捷键指南 (⌘K, ESC)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
