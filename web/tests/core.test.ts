import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveIdempotencyKey } from '../src/utils/idempotency.ts'
import { selectGlobalIssueMetrics } from '../src/utils/issueMetrics.ts'
import { isExactIssueMatch } from '../src/utils/search.ts'

test('global exact search matches ID and title without case sensitivity', () => {
  const issue = {
    id: '#023',
    title: 'UPS 不间断电源逆变器旁路指示灯闪烁',
  }
  assert.equal(isExactIssueMatch(issue, '  #023 '), true)
  assert.equal(isExactIssueMatch(issue, 'ups 不间断电源逆变器旁路指示灯闪烁'), true)
  assert.equal(isExactIssueMatch(issue, 'UPS'), false)
})

test('idempotency key is reused only for an unchanged payload', () => {
  let generated = 0
  const keyFactory = () => `key-${++generated}`
  const first = resolveIdempotencyKey('', '', '{"title":"A"}', keyFactory)
  const retry = resolveIdempotencyKey(
    first.key,
    first.payload,
    '{"title":"A"}',
    keyFactory,
  )
  const changed = resolveIdempotencyKey(
    retry.key,
    retry.payload,
    '{"title":"B"}',
    keyFactory,
  )

  assert.equal(first.key, 'key-1')
  assert.equal(retry.key, first.key)
  assert.equal(changed.key, 'key-2')
})

test('global KPI metrics remain stable when a filtered search has no results', () => {
  const snapshot = {
    total: 56,
    aggregates: {
      high: 19,
      inProgress: 14,
      resolved: 14,
    },
  }
  const emptySnapshot = {
    total: 0,
    aggregates: { high: 0, inProgress: 0, resolved: 0 },
  }

  assert.deepEqual(selectGlobalIssueMetrics(snapshot), {
    total: 56,
    high: 19,
    inProgress: 14,
    resolved: 14,
  })
  assert.deepEqual(selectGlobalIssueMetrics(emptySnapshot), {
    total: 0,
    high: 0,
    inProgress: 0,
    resolved: 0,
  })
  assert.equal(selectGlobalIssueMetrics(null), null)
})
