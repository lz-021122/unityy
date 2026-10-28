const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim()

export const API_BASE_URL = (
  configuredBase || 'http://127.0.0.1:8080/api'
).replace(/\/+$/, '')

interface APIErrorBody {
  error?: {
    code?: string
    message?: string
    fields?: Record<string, string>
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>

  constructor(
    message: string,
    status = 0,
    code = 'NETWORK_ERROR',
    fields: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export async function requestJSON<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await requestResponse(path, options)
  if (response.status === 204) {
    return undefined as T
  }
  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError('服务端返回了无法解析的数据', response.status, 'INVALID_RESPONSE')
  }
}

export async function requestResponse(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  let response: Response
  try {
    const headers = new Headers(options.headers)
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json')
    }
    headers.set('X-Actor', 'react-admin')
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError(
      '无法连接本地 API，请确认 Go 服务已在 127.0.0.1:8080 启动',
      0,
      'NETWORK_ERROR',
    )
  }

  if (!response.ok) {
    let body: APIErrorBody = {}
    try {
      body = (await response.json()) as APIErrorBody
    } catch {
      // Keep the HTTP fallback message when an error body is not JSON.
    }
    throw new ApiError(
      body.error?.message || `请求失败（HTTP ${response.status}）`,
      response.status,
      body.error?.code || 'HTTP_ERROR',
      body.error?.fields ?? {},
    )
  }
  return response
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fieldMessages = Object.values(error.fields)
    if (fieldMessages.length > 0) {
      return `${error.message}：${fieldMessages.join('；')}`
    }
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return '发生未知错误'
}
