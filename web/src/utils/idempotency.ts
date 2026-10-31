export interface IdempotencyKeySelection {
  key: string
  payload: string
}

function defaultKeyFactory(): string {
  return typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `issue-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function resolveIdempotencyKey(
  currentKey: string,
  currentPayload: string,
  payload: string,
  keyFactory: () => string = defaultKeyFactory,
): IdempotencyKeySelection {
  if (currentKey && currentPayload === payload) {
    return { key: currentKey, payload }
  }
  return { key: keyFactory(), payload }
}
