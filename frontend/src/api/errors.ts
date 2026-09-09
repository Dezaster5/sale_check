import { ApiError } from './client'
import type { DuplicateConflict } from './types'

/** Ошибки, привязанные к конкретным полям формы: { count: 'текст' } */
export type FieldErrors = Record<string, string>

export interface ParsedError {
  /** Текст для тоста или баннера. */
  message: string
  /** Ошибки под полями формы. */
  fieldErrors: FieldErrors
  status: number | null
}

const FALLBACK_BY_STATUS: Record<number, string> = {
  400: 'Проверьте заполненные поля.',
  401: 'Сессия завершена, войдите заново.',
  403: 'Недостаточно прав для этой операции.',
  404: 'Запись не найдена.',
  409: 'Такая продажа уже внесена.',
  500: 'Ошибка на сервере. Попробуйте позже.',
}

/**
 * DRF отдаёт ошибки в нескольких формах, и все встречаются на этом бэкенде:
 *   { "detail": "текст" }              — права, аутентификация
 *   { "error": "текст" }               — конфликт продажи
 *   { "count": ["текст"] }             — ошибка поля массивом
 *   { "date": "текст" }                — ошибка поля строкой (да, тоже бывает)
 *   { "non_field_errors": ["текст"] }  — общая ошибка формы
 */
export function parseApiError(error: unknown): ParsedError {
  if (!(error instanceof ApiError)) {
    return {
      message:
        error instanceof Error && error.message
          ? error.message
          : 'Не удалось связаться с сервером.',
      fieldErrors: {},
      status: null,
    }
  }

  const fallback = FALLBACK_BY_STATUS[error.status] ?? 'Что-то пошло не так.'
  const payload = error.payload

  if (typeof payload === 'string' && payload.trim()) {
    return { message: payload, fieldErrors: {}, status: error.status }
  }

  if (!payload || typeof payload !== 'object') {
    return { message: fallback, fieldErrors: {}, status: error.status }
  }

  const record = payload as Record<string, unknown>
  const fieldErrors: FieldErrors = {}
  const generalParts: string[] = []

  for (const [key, value] of Object.entries(record)) {
    const text = flatten(value)
    if (!text) continue

    if (key === 'detail' || key === 'error' || key === 'non_field_errors') {
      generalParts.push(text)
    } else {
      fieldErrors[key] = text
    }
  }

  const message =
    generalParts.join(' ') ||
    Object.values(fieldErrors).join(' ') ||
    fallback

  return { message, fieldErrors, status: error.status }
}

function flatten(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.map(flatten).filter(Boolean).join(' ')
  }
  if (value && typeof value === 'object') {
    return Object.values(value).map(flatten).filter(Boolean).join(' ')
  }
  return ''
}

/** Продажа-дубль: 409 с полным объектом существующей записи. */
export function asDuplicateConflict(error: unknown): DuplicateConflict | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  const payload = error.payload as Partial<DuplicateConflict> | null
  if (!payload || typeof payload !== 'object' || !payload.existing_sale) return null
  return payload as DuplicateConflict
}
