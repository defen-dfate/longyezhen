/* ============================================================
 * 统一请求层
 * 仅在 VITE_AUTH_MODE=api（接入真实后端）时使用
 * ============================================================ */
import { API_BASE } from './auth'

export class ApiError extends Error {
  code: number
  constructor(message: string, code = -1) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  timeout?: number
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, timeout = 15000, headers, ...rest } = options
  const token = localStorage.getItem('wb.token')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers as Record<string, string>)
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })

    const text = await res.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    if (!res.ok) {
      const msg =
        (data && typeof data === 'object' && 'message' in data
          ? String((data as { message?: unknown }).message)
          : null) || `请求失败 (${res.status})`
      throw new ApiError(msg, res.status)
    }
    return data as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('请求超时，请检查后端服务是否可用', -2)
    }
    throw new ApiError((err as Error).message || '网络异常，后端服务可能未启动', -3)
  } finally {
    clearTimeout(timer)
  }
}

export const http = {
  get: <T>(path: string, o?: RequestOptions) => request<T>(path, { ...o, method: 'GET' }),
  post: <T>(path: string, body?: unknown, o?: RequestOptions) =>
    request<T>(path, { ...o, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, o?: RequestOptions) =>
    request<T>(path, { ...o, method: 'PUT', body }),
  del: <T>(path: string, o?: RequestOptions) => request<T>(path, { ...o, method: 'DELETE' })
}

/** 探测后端是否可达（综合管理页用） */
export async function pingBackend(): Promise<{ ok: boolean; latency: number; error?: string }> {
  const start = performance.now()
  try {
    await request('/health', { timeout: 4000 })
    return { ok: true, latency: Math.round(performance.now() - start) }
  } catch (err) {
    return {
      ok: false,
      latency: Math.round(performance.now() - start),
      error: (err as Error).message
    }
  }
}
