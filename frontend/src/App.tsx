import { useState } from 'react'
import { parseApiError } from './api/errors'
import { useScope } from './api/hooks'
import type { Sale, Scope } from './api/types'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoginPage } from './auth/LoginPage'
import { Layout, type TabKey } from './components/Layout'
import { Skeleton } from './components/Skeleton'
import {
  defaultHistoryFilters,
  HistoryPage,
  type HistoryFilters,
} from './pages/HistoryPage'
import { SaleEditModal } from './pages/SaleEditModal'
import { SalesPage } from './pages/SalesPage'
import ui from './components/ui.module.css'
import styles from './App.module.css'

export function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

function AuthGate() {
  const { user, isAuthenticated, signOut } = useAuth()
  const scopeQuery = useScope(isAuthenticated)

  if (!isAuthenticated) {
    return <LoginPage />
  }

  if (scopeQuery.isPending) {
    return (
      <div className={styles.gate}>
        <div className={styles.gateCard}>
          <Skeleton width="180px" height="18px" />
          <Skeleton width="240px" />
          <Skeleton width="200px" />
          <p className={styles.gateNote}>Загружаем область доступа…</p>
        </div>
      </div>
    )
  }

  if (scopeQuery.isError) {
    return (
      <div className={styles.gate}>
        <div className={styles.gateCard}>
          <h1 className={styles.gateTitle}>Не удалось загрузить доступы</h1>
          <p className={styles.gateNote}>{parseApiError(scopeQuery.error).message}</p>
          <div className={styles.gateActions}>
            <button
              type="button"
              className={`${ui.btn} ${ui.primary}`}
              onClick={() => void scopeQuery.refetch()}
            >
              Повторить
            </button>
            <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={signOut}>
              Выйти
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SalesApp
      scope={scopeQuery.data}
      userName={scopeQuery.data.full_name || user?.full_name || user?.username || ''}
      onSignOut={signOut}
    />
  )
}

interface SalesAppProps {
  scope: Scope
  userName: string
  onSignOut: () => void
}

function SalesApp({ scope, userName, onSignOut }: SalesAppProps) {
  const [tab, setTab] = useState<TabKey>('sales')
  const [editing, setEditing] = useState<Sale | null>(null)
  // Фильтры живут здесь, чтобы переключение вкладок их не сбрасывало.
  const [filters, setFilters] = useState<HistoryFilters>(() =>
    defaultHistoryFilters(scope.today),
  )

  return (
    <Layout
      tab={tab}
      onTabChange={setTab}
      userName={userName}
      permissions={scope.permissions}
      onSignOut={onSignOut}
    >
      {tab === 'sales' ? (
        <SalesPage scope={scope} onEditSale={setEditing} />
      ) : (
        <HistoryPage
          scope={scope}
          filters={filters}
          onFiltersChange={setFilters}
          onEditSale={setEditing}
        />
      )}

      {editing ? (
        <SaleEditModal
          sale={editing}
          scope={scope}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Layout>
  )
}
