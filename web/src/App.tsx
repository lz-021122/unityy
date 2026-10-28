/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import type { Issue, NavTab, IssueStatus } from './types';
import { generateInitialIssues, HOTLINK_SCREENSHOT } from './data/mockIssues';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { IssueManagementScreen } from './components/IssueManagementScreen';
import { SceneManagementScreen } from './components/SceneManagementScreen';
import { HomeScreen } from './components/HomeScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { IssueDrawer } from './components/IssueDrawer';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { EngineStatusModal } from './components/EngineStatusModal';
import {
  BarChart2,
  Box,
  CheckCircle2,
  ClipboardCheck,
  Home,
  Settings,
} from 'lucide-react';

export default function App() {
  const [issues, setIssues] = useState<Issue[]>(() => generateInitialIssues());
  const [currentTab, setCurrentTab] = useState<NavTab>('issues');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'create'>('view');
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  // Lightbox State
  const [lightboxIssue, setLightboxIssue] = useState<Issue | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isEngineStatusOpen, setIsEngineStatusOpen] = useState(false);

  // 3D Scene target
  const [sceneTargetIssue, setSceneTargetIssue] = useState<Issue | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Keyboard shortcut for Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
        setLightboxImage(null);
        setIsCommandPaletteOpen(false);
        setIsEngineStatusOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleOpenCreateDrawer = () => {
    setDrawerMode('create');
    setActiveIssue(null);
    setIsDrawerOpen(true);
  };

  const handleOpenViewDrawer = (issue: Issue) => {
    setDrawerMode('view');
    setActiveIssue(issue);
    setIsDrawerOpen(true);
  };

  const handleSaveIssue = (data: Partial<Issue>) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    if (drawerMode === 'create') {
      const nextNum = issues.length + 1;
      const newId = '#' + String(nextNum).padStart(3, '0');
      const newRecord: Issue = {
        id: newId,
        title: data.title || '巡检新隐患',
        desc: data.desc || '',
        priority: data.priority || 'HIGH',
        status: data.status || 'OPEN',
        scene: data.scene || '泵房区',
        pos: data.pos || { x: 0, y: 0, z: 0 },
        createdAt: nowStr,
        updatedAt: nowStr,
        screenshot: data.screenshot || HOTLINK_SCREENSHOT,
        reporter: data.reporter || '当前管理员',
        assignee: data.assignee || '待分派',
        deviceCode: data.deviceCode || `DEV-${newId}`,
        auditLogs: [{ time: nowStr, user: '管理员', action: '创建并录入问题' }],
      };
      setIssues([newRecord, ...issues]);
      showToast(`已创建前端演示问题：${newId}`);
    } else if (activeIssue) {
      setIssues((prev) =>
        prev.map((item) => {
          if (item.id === activeIssue.id) {
            return {
              ...item,
              ...data,
              updatedAt: nowStr,
              auditLogs: [
                ...(item.auditLogs || []),
                { time: nowStr, user: '管理员', action: '更新问题工况详情' },
              ],
            };
          }
          return item;
        })
      );
      showToast(`已更新前端演示问题：${activeIssue.id}`);
    }
    setIsDrawerOpen(false);
  };

  const handleDeleteIssue = (id: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    showToast(`已从当前前端演示数据删除：${id}`);
    setIsDrawerOpen(false);
  };

  const handleUpdateIssueStatus = (id: string, status: IssueStatus) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setIssues((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status,
              updatedAt: nowStr,
              auditLogs: [
                ...(i.auditLogs || []),
                { time: nowStr, user: '管理员', action: `状态变更至 ${status}` },
              ],
            }
          : i
      )
    );
    showToast(`演示问题 ${id} 已更新为 ${status === 'RESOLVED' ? '已解决' : '处理中'}`);
  };

  const handleBatchResolve = (ids: string[]) => {
    const idSet = new Set(ids);
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setIssues((prev) =>
      prev.map((i) => (idSet.has(i.id) ? { ...i, status: 'RESOLVED', updatedAt: nowStr } : i))
    );
    showToast(`已将 ${ids.length} 项演示问题标记为已解决`);
  };

  const handleBatchDelete = (ids: string[]) => {
    const idSet = new Set(ids);
    setIssues((prev) => prev.filter((i) => !idSet.has(i.id)));
    showToast(`已从当前前端演示数据删除 ${ids.length} 条记录`);
  };

  const handleLocateInScene = (issue: Issue) => {
    setSceneTargetIssue(issue);
    setCurrentTab('scenes');
    setIsDrawerOpen(false);
    showToast(`已在演示场景中锁定坐标 (${issue.pos.x}, ${issue.pos.y}, ${issue.pos.z})`);
  };

  const handleOpenLightbox = (issue: Issue) => {
    setLightboxIssue(issue);
    setLightboxImage(issue.screenshot);
  };

  const handleExportData = () => {
    // Generate CSV string
    const headers = 'ID,标题,优先级,状态,场景,坐标X,坐标Y,坐标Z,创建时间,更新时间\n';
    const rows = issues
      .map(
        (i) =>
          `"${i.id}","${i.title}","${i.priority}","${i.status}","${i.scene}",${i.pos.x},${i.pos.y},${i.pos.z},"${i.createdAt}","${i.updatedAt}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `unity_inspect_issues_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('问题清单数据已成功导出为 CSV 文件');
  };

  const openIssuesCount = issues.filter((i) => i.status === 'OPEN').length;
  const mobileNavItems = [
    { id: 'home' as NavTab, label: '首页', icon: Home },
    { id: 'issues' as NavTab, label: '问题', icon: ClipboardCheck },
    { id: 'analytics' as NavTab, label: '分析', icon: BarChart2 },
    { id: 'scenes' as NavTab, label: '场景', icon: Box },
    { id: 'settings' as NavTab, label: '设置', icon: Settings },
  ];

  return (
    <div className="bg-[#f8fafc] text-slate-800 text-[13px] antialiased min-h-screen flex flex-col font-sans select-none overflow-x-hidden">
      {/* Main Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenEngineStatus={() => setIsEngineStatusOpen(true)}
      />

      {/* Main Body Area with Sidebar and Content */}
      <div className="flex flex-1 relative overflow-hidden pb-16 md:pb-0">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenEngineStatus={() => setIsEngineStatusOpen(true)}
          openIssuesCount={openIssuesCount}
        />

        {/* Dynamic Screen View */}
        {currentTab === 'issues' && (
          <IssueManagementScreen
            issues={issues}
            onOpenCreateDrawer={handleOpenCreateDrawer}
            onOpenViewDrawer={handleOpenViewDrawer}
            onLocateInScene={handleLocateInScene}
            onUpdateIssueStatus={handleUpdateIssueStatus}
            onDeleteIssue={handleDeleteIssue}
            onBatchResolve={handleBatchResolve}
            onBatchDelete={handleBatchDelete}
            searchQuery={searchQuery}
            onResetSearch={() => setSearchQuery('')}
            onExportData={handleExportData}
          />
        )}

        {currentTab === 'scenes' && (
          <SceneManagementScreen
            issues={issues}
            selectedIssueForScene={sceneTargetIssue}
            onSelectIssue={handleOpenViewDrawer}
            onOpenCreateDrawer={handleOpenCreateDrawer}
          />
        )}

        {currentTab === 'home' && (
          <HomeScreen
            issues={issues}
            onNavigateTab={setCurrentTab}
            onOpenIssue={handleOpenViewDrawer}
            onLocateIssue={handleLocateInScene}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsScreen issues={issues} onExportReport={handleExportData} />
        )}

        {currentTab === 'settings' && <SettingsScreen onShowToast={showToast} />}

        {/* Slide-out Issue Detail & Edit Drawer */}
        <IssueDrawer
          key={`${drawerMode}-${activeIssue?.id ?? 'new'}-${isDrawerOpen ? 'open' : 'closed'}`}
          isOpen={isDrawerOpen}
          mode={drawerMode}
          issue={activeIssue}
          onClose={() => setIsDrawerOpen(false)}
          onSave={handleSaveIssue}
          onDelete={handleDeleteIssue}
          onOpenLightbox={handleOpenLightbox}
          onLocateInScene={handleLocateInScene}
        />
      </div>

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 h-16 bg-white/95 backdrop-blur border-t border-slate-200 grid grid-cols-5">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                active ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Image Evidence Lightbox Modal */}
      <ImageLightboxModal
        issue={lightboxIssue}
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* Cmd+K Command Palette Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        issues={issues}
        onSelectIssue={handleOpenViewDrawer}
        onNavigateTab={setCurrentTab}
        onCreateNew={handleOpenCreateDrawer}
      />

      {/* Unity Engine Live Telemetry Modal */}
      <EngineStatusModal
        isOpen={isEngineStatusOpen}
        onClose={() => setIsEngineStatusOpen(false)}
      />

      {/* Toast Notification Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium z-50 flex items-center gap-2 transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 pointer-events-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
