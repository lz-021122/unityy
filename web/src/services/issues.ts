import {
  requestJSON,
  requestResponse,
} from '../api/client'
import type {
  CreateIssueInput,
  Issue,
  IssueAggregates,
  IssueListResponse,
  IssueQuery,
  IssueStatus,
  UpdateIssueInput,
} from '../types'

const issuePath = (id: string) => `/issues/${encodeURIComponent(id)}`

export interface IssueSnapshot {
  issues: Issue[]
  total: number
  aggregates: IssueAggregates
}

export function queryString(params: IssueQuery): string {
  const query = new URLSearchParams()
  if (params.query?.trim()) query.set('query', params.query.trim())
  if (params.priority) query.set('priority', params.priority)
  if (params.status) query.set('status', params.status)
  if (params.scene?.trim()) query.set('scene', params.scene.trim())
  if (params.createdFrom) query.set('createdFrom', params.createdFrom)
  if (params.createdTo) query.set('createdTo', params.createdTo)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ''
}

export function listIssues(
  params: IssueQuery,
  signal?: AbortSignal,
): Promise<IssueListResponse> {
  return requestJSON<IssueListResponse>(`/issues${queryString(params)}`, {
    signal,
  })
}

export async function fetchIssueSnapshot(
  signal?: AbortSignal,
): Promise<IssueSnapshot> {
  const pageSize = 100
  let page = 1
  const issues: Issue[] = []
  let total = 0
  let aggregates: IssueAggregates | null = null
  while (true) {
    const result = await listIssues({ page, pageSize }, signal)
    if (aggregates === null) {
      total = result.total
      aggregates = result.aggregates
    }
    issues.push(...result.items)
    if (issues.length >= result.total || result.items.length === 0) {
      break
    }
    page += 1
  }
  if (aggregates === null) {
    throw new Error('问题列表响应缺少聚合数据')
  }
  return { issues, total, aggregates }
}

export function getIssue(id: string, signal?: AbortSignal): Promise<Issue> {
  return requestJSON<Issue>(issuePath(id), { signal })
}

export function createIssue(
  input: CreateIssueInput,
  idempotencyKey?: string,
): Promise<Issue> {
  const headers = idempotencyKey
    ? { 'Idempotency-Key': idempotencyKey }
    : undefined
  return requestJSON<Issue>('/issues', {
    method: 'POST',
    body: JSON.stringify(input),
    headers,
  })
}

export function updateIssue(
  id: string,
  input: UpdateIssueInput,
): Promise<Issue> {
  return requestJSON<Issue>(issuePath(id), {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function updateIssueStatus(
  id: string,
  status: IssueStatus,
): Promise<Issue> {
  return requestJSON<Issue>(`${issuePath(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function batchUpdateStatus(
  ids: string[],
  status: IssueStatus,
): Promise<{ updated: number }> {
  return requestJSON<{ updated: number }>('/issues/batch-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status }),
  })
}

export function deleteIssue(id: string): Promise<void> {
  return requestJSON<void>(issuePath(id), { method: 'DELETE' })
}

export function batchDeleteIssues(ids: string[]): Promise<{ deleted: number }> {
  return requestJSON<{ deleted: number }>('/issues/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function exportIssuesCSV(params: IssueQuery): Promise<void> {
  const response = await requestResponse(`/issues/export.csv${queryString({
    ...params,
    page: undefined,
    pageSize: undefined,
  })}`, {
    headers: { Accept: 'text/csv' },
  })
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'UNITY-INSPECT-问题清单.csv'
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(url)
  }, 60_000)
}
