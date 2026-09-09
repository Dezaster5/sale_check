import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler } from '../api/client'
import { clearSession, readToken, readUser, saveSession, type StoredUser } from '../api/token'
import { login as loginRequest } from '../api/hooks'

interface AuthState {
  user: StoredUser | null
  isAuthenticated: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<StoredUser | null>(() => (readToken() ? readUser() : null))

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  // Любой 401 из любого запроса возвращает на экран входа.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      queryClient.clear()
    })
    return () => setUnauthorizedHandler(null)
  }, [queryClient])

  const signIn = useCallback(
    async (username: string, password: string) => {
      const auth = await loginRequest(username, password)
      saveSession(auth)
      const { token: _token, ...profile } = auth
      setUser(profile)
    },
    [],
  )

  const value = useMemo<AuthState>(
    () => ({ user, isAuthenticated: Boolean(user), signIn, signOut }),
    [user, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth использован вне AuthProvider')
  return context
}
