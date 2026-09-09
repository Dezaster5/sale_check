import { clearSession, readToken } from './token'

/**
 * Адрес бэкенда. Пустое значение — значит тот же адрес, откуда отдан фронтенд:
 * так работает вариант, когда nginx фронтенда проксирует /api на бэкенд. Это
 * снимает и mixed content (бэкенд пока без TLS), и зависимость от CORS.
 */
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
const API_ROOT = `${RAW_BASE.replace(/\/+$/, '')}/api/v1`

export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(status: number, payload: unknown) {
    super(`Запрос завершился со статусом ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

let unauthorizedHandler: (() => void) | null = null

/** Вызывается один раз из AuthProvider: любой 401 возвращает на экран входа. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export type QueryParams = Record<string, string | number | null | undefined>

function buildUrl(path: string, params?: QueryParams): string {
  // Относительный API_ROOT сам по себе не является валидным URL,
  // поэтому разбираем его относительно текущего происхождения страницы.
  const url = new URL(`${API_ROOT}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === null || value === undefined || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: QueryParams
  /** Запросы без токена — только логин. */
  anonymous?: boolean
  signal?: AbortSignal
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, anonymous = false, signal } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (!anonymous) {
    const token = readToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError(0, { detail: 'Сервер недоступен. Проверьте подключение.' })
  }

  if (response.status === 204) return undefined as T

  const payload = await readBody(response)

  if (!response.ok) {
    // Токен протух или отозван — чистим сессию и уводим на вход.
    if (response.status === 401 && !anonymous) {
      clearSession()
      unauthorizedHandler?.()
    }
    throw new ApiError(response.status, payload)
  }

  return payload as T
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
