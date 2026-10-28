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

export interface IssueAggregates {
  total: number;
  high: number;
  inProgress: number;
  resolved: number;
  byPriority: Record<Priority, number>;
  byStatus: Record<IssueStatus, number>;
  byScene: Record<string, number>;
}

export interface IssueListResponse {
  items: Issue[];
  page: number;
  pageSize: number;
  total: number;
  aggregates: IssueAggregates;
}

export interface IssueQuery {
  query?: string;
  priority?: Priority;
  status?: IssueStatus;
  scene?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
}

export type CreateIssueInput = Pick<
  Issue,
  'title' | 'desc' | 'priority' | 'status' | 'scene' | 'pos'
> &
  Partial<
    Pick<
      Issue,
      | 'screenshot'
      | 'reporter'
      | 'assignee'
      | 'deviceCode'
      | 'severityScore'
    >
  >

export type UpdateIssueInput = Partial<
  Pick<
    Issue,
    | 'title'
    | 'desc'
    | 'priority'
    | 'status'
    | 'scene'
    | 'pos'
    | 'screenshot'
    | 'reporter'
    | 'assignee'
    | 'deviceCode'
    | 'severityScore'
  >
>
