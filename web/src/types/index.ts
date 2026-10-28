export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type SceneCategory = '泵房区' | '配电室' | '管道区' | '其他';

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface AuditLog {
  time: string;
  user: string;
  action: string;
}

export interface Issue {
  id: string;
  title: string;
  desc: string;
  priority: Priority;
  status: IssueStatus;
  scene: SceneCategory | string;
  pos: WorldPosition;
  createdAt: string;
  updatedAt: string;
  screenshot: string;
  reporter?: string;
  assignee?: string;
  deviceCode?: string;
  severityScore?: number;
  auditLogs?: AuditLog[];
}

export type NavTab = 'home' | 'issues' | 'analytics' | 'scenes' | 'settings';

export interface FilterState {
  priority: 'ALL' | Priority;
  status: 'ALL' | IssueStatus;
  scene: 'ALL' | SceneCategory | string;
  startDate: string;
  endDate: string;
  searchQuery: string;
}
