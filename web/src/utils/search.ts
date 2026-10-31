import type { Issue } from '../types'

export function isExactIssueMatch(
  issue: Pick<Issue, 'id' | 'title'>,
  query: string,
): boolean {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return false
  return (
    issue.id.toLocaleLowerCase() === normalized ||
    issue.title.trim().toLocaleLowerCase() === normalized
  )
}
