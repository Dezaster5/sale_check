import type { AuthResponse } from './types'

const TOKEN_KEY = 'avatariya.sales.token'
const USER_KEY = 'avatariya.sales.user'

export type StoredUser = Omit<AuthResponse, 'token'>

/**
 * Токен живёт в localStorage: по условию он не истекает по времени,
 * а сессия должна переживать перезагрузку страницы.
 * Значение нигде не логируется и не попадает в URL.
 */
export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function readUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as StoredUser) : null
  } catch {
    return null
  }
}

export function saveSession(auth: AuthResponse): void {
  const { token, ...user } = auth
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    /* приватный режим — работаем в пределах вкладки */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    /* ничего не делаем */
  }
}
