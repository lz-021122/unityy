import type { IssueAggregates } from '../types'

export interface IssueMetrics {
  total: number
  high: number
  inProgress: number
  resolved: number
}

export interface GlobalIssueSnapshot {
  total: number
  aggregates: Pick<
    IssueAggregates,
    'high' | 'inProgress' | 'resolved'
  >
}

export function selectGlobalIssueMetrics(
  snapshot: GlobalIssueSnapshot | null,
): IssueMetrics | null {
  if (!snapshot) {
    return null
  }

  return {
    total: snapshot.total,
    high: snapshot.aggregates.high,
    inProgress: snapshot.aggregates.inProgress,
    resolved: snapshot.aggregates.resolved,
  }
}
