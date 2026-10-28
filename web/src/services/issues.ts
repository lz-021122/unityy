import {
  requestJSON,
  requestResponse,
} from '../api/client'
import type {
  CreateIssueInput,
  Issue,
  IssueListResponse,
  IssueQuery,
  IssueStatus,
  UpdateIssueInput,
} from '../types'

const issuePath = (id: string) => `/issues/${encodeURIComponent(id)}`

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

export async function fetchAllIssues(signal?: AbortSignal): Promise<Issue[]> {
  const pageSize = 100
  let page = 1
  const issues: Issue[] = []
  while (true) {
    const result = await listIssues({ page, pageSize }, signal)
    issues.push(...result.items)
    if (issues.length >= result.total || result.items.length === 0) {
      break
    }
    page += 1
  }
  return issues
}

export function getIssue(id: string, signal?: AbortSignal): Promise<Issue> {
  return requestJSON<Issue>(issuePath(id), { signal })
}

export function createIssue(input: CreateIssueInput): Promise<Issue> {
  return requestJSON<Issue>('/issues', {
    method: 'POST',
    body: JSON.stringify(input),
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
