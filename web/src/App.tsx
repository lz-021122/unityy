/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CreateIssueInput,
  Issue,
  IssueQuery,
  IssueStatus,
  NavTab,
  UpdateIssueInput,
} from './types';
import { apiErrorMessage } from './api/client';
import {
  batchDeleteIssues,
  batchUpdateStatus,
  createIssue,
  deleteIssue,
  exportIssuesCSV,
  fetchIssueSnapshot,
  getIssue,
  updateIssue,
  updateIssueStatus,
} from './services/issues';
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
import { isExactIssueMatch } from './utils/search';
import {
  selectGlobalIssueMetrics,
  type IssueMetrics,
} from './utils/issueMetrics';
import {
  BarChart2,
  Box,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Home,
  Settings,
} from 'lucide-react';

export default function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [globalIssueMetrics, setGlobalIssueMetrics] =
    useState<IssueMetrics | null>(null);
  const [allIssuesError, setAllIssuesError] = useState('');
  const [dataVersion, setDataVersion] = useState(0);
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
  const [toast, setToast] = useState<{
    message: string;
    tone: 'success' | 'error';
  } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 3200);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchIssueSnapshot(controller.signal)
      .then((snapshot) => {
        setIssues(snapshot.issues);
        setGlobalIssueMetrics(selectGlobalIssueMetrics(snapshot));
        setAllIssuesError('');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setGlobalIssueMetrics(null);
        setAllIssuesError(apiErrorMessage(error));
      });
    return () => controller.abort();
  }, [dataVersion]);

  const refreshData = useCallback(() => {
    setDataVersion((version) => version + 1);
  }, []);

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

  const handleOpenViewDrawer = async (issue: Issue) => {
    setDrawerMode('view');
    setActiveIssue(null);
    setIsDrawerOpen(false);
    try {
      const detail = await getIssue(issue.id);
      setActiveIssue(detail);
      setIsDrawerOpen(true);
    } catch (error) {
      showToast(`详情加载失败：${apiErrorMessage(error)}`, 'error');
    }
  };

  const handleGlobalSearchChange = (query: string) => {
    setSearchQuery(query);
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    const exactIssue = issues.find((issue) =>
      isExactIssueMatch(issue, normalized),
    );
    if (currentTab !== 'issues') {
      setCurrentTab('issues');
      if (exactIssue) {
        void handleOpenViewDrawer(exactIssue);
      }
    }
  };

  const handleSaveIssue = async (
    data: Partial<Issue>,
    idempotencyKey?: string,
  ): Promise<void> => {
    try {
      if (drawerMode === 'create') {
        const input: CreateIssueInput = {
          title: data.title ?? '',
          desc: data.desc ?? '',
          priority: data.priority ?? 'HIGH',
          status: data.status ?? 'OPEN',
          scene: data.scene ?? '泵房区',
          pos: data.pos ?? { x: 0, y: 0, z: 0 },
          screenshot: data.screenshot,
          reporter: data.reporter,
          assignee: data.assignee,
          deviceCode: data.deviceCode,
          severityScore: data.severityScore,
        };
        const created = await createIssue(input, idempotencyKey);
        showToast(`已创建问题：${created.id}`);
      } else if (activeIssue) {
        const input: UpdateIssueInput = {
          title: data.title,
          desc: data.desc,
          priority: data.priority,
          status: data.status,
          scene: data.scene,
          pos: data.pos,
          screenshot: data.screenshot,
          reporter: data.reporter,
          assignee: data.assignee,
          deviceCode: data.deviceCode,
          severityScore: data.severityScore,
        };
        await updateIssue(activeIssue.id, input);
        showToast(`已更新问题：${activeIssue.id}`);
      }
      setIsDrawerOpen(false);
      refreshData();
    } catch (error) {
      showToast(`保存失败：${apiErrorMessage(error)}`, 'error');
      throw error;
    }
  };

  const handleDeleteIssue = async (id: string): Promise<boolean> => {
    try {
      await deleteIssue(id);
      setIsDrawerOpen(false);
      refreshData();
      showToast(`已删除问题：${id}`);
      return true;
    } catch (error) {
      showToast(`删除失败：${apiErrorMessage(error)}`, 'error');
      return false;
    }
  };

  const handleUpdateIssueStatus = async (
    id: string,
    status: IssueStatus,
  ): Promise<boolean> => {
    try {
      await updateIssueStatus(id, status);
      refreshData();
      showToast(`问题 ${id} 已更新为 ${status === 'RESOLVED' ? '已解决' : '处理中'}`);
      return true;
    } catch (error) {
      showToast(`状态更新失败：${apiErrorMessage(error)}`, 'error');
      return false;
    }
  };

  const handleBatchResolve = async (ids: string[]): Promise<boolean> => {
    try {
      const result = await batchUpdateStatus(ids, 'RESOLVED');
      refreshData();
      showToast(`已将 ${result.updated} 项问题标记为已解决`);
      return true;
    } catch (error) {
      showToast(`批量状态更新失败：${apiErrorMessage(error)}`, 'error');
      return false;
    }
  };

  const handleBatchDelete = async (ids: string[]): Promise<boolean> => {
    try {
      const result = await batchDeleteIssues(ids);
      refreshData();
      showToast(`已删除 ${result.deleted} 条问题记录`);
      return true;
    } catch (error) {
      showToast(`批量删除失败：${apiErrorMessage(error)}`, 'error');
      return false;
    }
  };

  const handleLocateInScene = (issue: Issue) => {
    setSceneTargetIssue(issue);
    setCurrentTab('scenes');
    setIsDrawerOpen(false);
    showToast(`已在场景中锁定坐标 (${issue.pos.x}, ${issue.pos.y}, ${issue.pos.z})`);
  };

  const handleOpenLightbox = (issue: Issue) => {
    setLightboxIssue(issue);
    setLightboxImage(issue.screenshot);
  };

  const handleExportData = async (params: IssueQuery = {}): Promise<boolean> => {
    try {
      await exportIssuesCSV(params);
      showToast('已导出当前筛选范围内的全部问题');
      return true;
    } catch (error) {
      showToast(`导出失败：${apiErrorMessage(error)}`, 'error');
      return false;
    }
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
        onSearchChange={handleGlobalSearchChange}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenEngineStatus={() => setIsEngineStatusOpen(true)}
      />

      {allIssuesError && currentTab !== 'issues' && (
        <div className="mx-6 mt-3 px-4 py-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center justify-between gap-3 shrink-0">
          <span>无法加载后端问题数据：{allIssuesError}</span>
          <button
            type="button"
            onClick={refreshData}
            className="px-2.5 py-1 rounded border border-rose-300 bg-white font-medium"
          >
            重试
          </button>
        </div>
      )}

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
            refreshVersion={dataVersion}
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
            globalIssueMetrics={globalIssueMetrics}
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
          <AnalyticsScreen
            issues={issues}
            onExportReport={() => void handleExportData()}
          />
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
        issueCount={issues.length}
        issuesAvailable={!allIssuesError}
      />

      {/* Toast Notification Notification Banner */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium z-50 flex items-center gap-2 transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 pointer-events-none ${
            toast.tone === 'error' ? 'bg-rose-700' : 'bg-slate-900'
          }`}
        >
          {toast.tone === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-200 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
