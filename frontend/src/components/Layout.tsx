import type { ReactNode } from 'react'
import type { Permissions } from '../api/types'
import { MOBILE_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import styles from './Layout.module.css'

export type TabKey = 'sales' | 'history'

interface LayoutProps {
  tab: TabKey
  onTabChange: (tab: TabKey) => void
  userName: string
  permissions?: Permissions
  onSignOut: () => void
  children: ReactNode
}

const TABS: { key: TabKey; label: string; short: string }[] = [
  { key: 'sales', label: 'Продажи', short: 'Продажи' },
  { key: 'history', label: 'История продаж', short: 'История' },
]

/**
 * На телефоне это не «тот же макет поуже»: боковая панель съедала треть экрана,
 * поэтому там компактная шапка сверху и вкладки снизу.
 *
 * Обе раскладки живут в одном дереве, а <main> стоит на одной и той же позиции —
 * иначе поворот планшета пересекал бы границу 900px, React размонтировал бы
 * содержимое и заполненная форма продажи терялась бы.
 */
export function Layout({
  tab,
  onTabChange,
  userName,
  permissions,
  onSignOut,
  children,
}: LayoutProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY)

  return (
    <div className={isMobile ? styles.mobileApp : styles.app}>
      {isMobile ? (
        <header className={styles.topbar}>
          <Logo size={28} />
          <div className={styles.topbarWho}>
            <span className={styles.topbarBrand}>AVATARIYA</span>
            <span className={styles.topbarName}>{userName}</span>
          </div>
          <button type="button" className={styles.topbarExit} onClick={onSignOut}>
            Выйти
          </button>
        </header>
      ) : (
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <Logo />
            <div>
              <div className={styles.word}>AVATARIYA</div>
              <div className={styles.sub}>Кабинет арендодателя</div>
            </div>
          </div>

          <nav className={styles.nav}>
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`${styles.navBtn} ${tab === item.key ? styles.navActive : ''}`}
                onClick={() => onTabChange(item.key)}
                aria-current={tab === item.key ? 'page' : undefined}
              >
                <span className={styles.dot} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className={styles.account}>
            <div className={styles.accountLabel}>Вы вошли как</div>
            <div className={styles.accountName}>{userName}</div>

            {permissions ? (
              <div className={styles.chips}>
                <Chip label="Прошлые даты" on={permissions.can_create_past_sales} />
                <Chip label="Смена даты" on={permissions.can_change_sale_date} />
                <Chip label="Редактирование" on={permissions.can_edit_sales} />
                <Chip label="Удаление" on={permissions.can_delete_sales} />
              </div>
            ) : null}

            <button type="button" className={styles.signOut} onClick={onSignOut}>
              Выйти
            </button>
          </div>
        </aside>
      )}

      <main className={isMobile ? styles.mobileMain : styles.main}>{children}</main>

      {isMobile ? (
        <nav className={styles.bottomNav}>
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${styles.bottomBtn} ${tab === item.key ? styles.bottomActive : ''}`}
              onClick={() => onTabChange(item.key)}
              aria-current={tab === item.key ? 'page' : undefined}
              aria-label={item.label}
            >
              <span className={styles.bottomDot} />
              {item.short}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  )
}

function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 30) / 38}
      viewBox="0 0 120 90"
      aria-hidden="true"
      className={styles.logo}
    >
      <ellipse cx="60" cy="45" rx="52" ry="24" fill="none" stroke="#9520FF" strokeWidth="7" transform="rotate(-14 60 45)" />
      <ellipse cx="60" cy="45" rx="36" ry="16" fill="none" stroke="#780BDB" strokeWidth="7" transform="rotate(-14 60 45)" />
      <ellipse cx="60" cy="45" rx="18" ry="8" fill="none" stroke="#6A02C8" strokeWidth="7" transform="rotate(-14 60 45)" />
    </svg>
  )
}

function Chip({ label, on }: { label: string; on: boolean }) {
  return <span className={`${styles.chip} ${on ? styles.chipOn : ''}`}>{label}</span>
}

interface PageHeadProps {
  index: string
  title: string
  lede: string
}

export function PageHead({ index, title, lede }: PageHeadProps) {
  return (
    <>
      <p className={styles.pageMeta}>Avatariya · Кабинет арендодателя</p>
      <div className={styles.pageHead}>
        <span className={styles.pageIndex}>{index}</span>
        <div>
          <h1 className={styles.pageTitle}>{title}</h1>
          <p className={styles.pageLede}>{lede}</p>
        </div>
      </div>
    </>
  )
}
