import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import styles from './Toast.module.css'

type ToastKind = 'success' | 'error'

interface ToastItem {
  id: number
  kind: ToastKind
  text: string
}

interface ToastApi {
  success: (text: string) => void
  error: (text: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const push = useCallback((kind: ToastKind, text: string) => {
    const id = nextId.current++
    setItems((current) => [...current, { id, kind, text }])
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id))
    }, kind === 'error' ? 6000 : 3000)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => push('success', text),
      error: (text) => push('error', text),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {items.map((item) => (
          <div
            key={item.id}
            className={`${styles.toast} ${item.kind === 'error' ? styles.error : styles.success}`}
          >
            <span className={styles.icon}>{item.kind === 'error' ? '!' : '✓'}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast использован вне ToastProvider')
  return context
}
