import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { parseApiError } from '../api/errors'
import { useAuth } from './AuthContext'
import ui from '../components/ui.module.css'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return

    setError(null)
    setPending(true)
    try {
      await signIn(username.trim(), password)
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <div className={styles.brand}>
          <svg width="44" height="34" viewBox="0 0 120 90" aria-hidden="true">
            <ellipse cx="60" cy="45" rx="52" ry="24" fill="none" stroke="#9520FF" strokeWidth="7" transform="rotate(-14 60 45)" />
            <ellipse cx="60" cy="45" rx="36" ry="16" fill="none" stroke="#780BDB" strokeWidth="7" transform="rotate(-14 60 45)" />
            <ellipse cx="60" cy="45" rx="18" ry="8" fill="none" stroke="#6A02C8" strokeWidth="7" transform="rotate(-14 60 45)" />
          </svg>
          <div>
            <div className={styles.word}>AVATARIYA</div>
            <div className={styles.sub}>Кабинет арендодателя</div>
          </div>
        </div>

        <h1 className={styles.title}>Вход</h1>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="login-username">
            Логин
          </label>
          <input
            id="login-username"
            className={ui.control}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="login-password">
            Пароль
          </label>
          <input
            id="login-password"
            className={ui.control}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error ? (
          <div className={`${ui.banner} ${ui.bannerError}`} role="alert">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          className={`${ui.btn} ${ui.primary} ${styles.submit}`}
          disabled={pending || !username.trim() || !password}
        >
          {pending ? 'Входим…' : 'Войти'}
        </button>

        <p className={styles.note}>
          Учётные записи заводит администратор сервиса. Самостоятельной регистрации нет.
        </p>
      </form>
    </div>
  )
}

/** 401 и 403 — разные ситуации, и текст у них тоже разный. */
function messageFor(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 401) {
      return 'Неверный логин или пароль.'
    }
    if (cause.status === 403) {
      const parsed = parseApiError(cause)
      return (
        parsed.message ||
        'Доступ к сервису продаж не настроен. Обратитесь к администратору.'
      )
    }
  }
  return parseApiError(cause).message
}
