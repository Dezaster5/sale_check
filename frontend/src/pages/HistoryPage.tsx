import { useMemo, useState } from 'react'
import { parseApiError } from '../api/errors'
import { fetchAllSales, PAGE_SIZE, useDeleteSale, useSales, useTotals } from '../api/hooks'
import type { Sale, SaleFilters, Scope } from '../api/types'
import { PageHead } from '../components/Layout'
import { Modal } from '../components/Modal'
import { Skeleton, SkeletonRows } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { currenciesOf, currencyForPark } from '../lib/currency'
import { formatAmount, formatCount, formatDate, formatDateTime, shiftDate } from '../lib/format'
import { exportSalesToExcel } from '../lib/excel'
import { MOBILE_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import { parkColor, productColor } from '../lib/palette'
import ui from '../components/ui.module.css'
import styles from './HistoryPage.module.css'

export interface HistoryFilters {
  dateFrom: string
  dateTo: string
  park: string
  product: string
}

export function defaultHistoryFilters(today: string): HistoryFilters {
  return {
    dateFrom: shiftDate(today, -13),
    dateTo: today,
    park: '',
    product: '',
  }
}

interface HistoryPageProps {
  scope: Scope
  filters: HistoryFilters
  onFiltersChange: (filters: HistoryFilters) => void
  onEditSale: (sale: Sale) => void
}

export function HistoryPage({
  scope,
  filters,
  onFiltersChange,
  onEditSale,
}: HistoryPageProps) {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<Sale | null>(null)
  const [exporting, setExporting] = useState(false)
  const deleteSale = useDeleteSale()

  // На телефоне шесть полей фильтра занимали целый экран до первой записи,
  // поэтому там они спрятаны за сводкой и раскрываются по нажатию.
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersVisible = !isMobile || filtersOpen

  const apiFilters = useMemo<SaleFilters>(
    () => ({
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      park: filters.park ? Number(filters.park) : null,
      product: filters.product ? Number(filters.product) : null,
      ordering: '-date',
    }),
    [filters],
  )

  const salesQuery = useSales(apiFilters, page)
  const totals = useTotals(apiFilters, scope.parks)

  const rows = salesQuery.data?.results ?? []
  const total = salesQuery.data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const isEmpty = !salesQuery.isPending && !salesQuery.isError && rows.length === 0

  // Во время дозагрузки строки остаются на месте (keepPreviousData) — приглушаем их,
  // чтобы старые цифры не читались как актуальные.
  const isRefreshing = salesQuery.isFetching && !salesQuery.isPending
  const listClass = isRefreshing ? styles.refreshing : ''

  const canEdit = scope.permissions.can_edit_sales
  const canDelete = scope.permissions.can_delete_sales
  const showActions = canEdit || canDelete

  const filtersSummary = [
    `${formatDate(filters.dateFrom)} — ${formatDate(filters.dateTo)}`,
    scope.parks.find((park) => String(park.id) === filters.park)?.park_name,
    scope.products.find((product) => String(product.id) === filters.product)?.name,
  ]
    .filter(Boolean)
    .join(' · ')

  const datesInvalid = Boolean(
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo,
  )

  // Страницу сбрасываем здесь же, а не эффектом: иначе между сменой фильтра
  // и сбросом успевает уйти лишний запрос за страницей, которой уже нет.
  function update(patch: Partial<HistoryFilters>) {
    setPage(1)
    onFiltersChange({ ...filters, ...patch })
  }

  function resetFilters() {
    setPage(1)
    onFiltersChange(defaultHistoryFilters(scope.today))
  }

  /** Выгружаем всю выборку по фильтрам, а не только открытую страницу. */
  async function handleExport() {
    if (exporting) return
    setExporting(true)
    try {
      const all = await fetchAllSales(apiFilters)
      if (all.length === 0) {
        toast.error('За выбранный период продаж нет — выгружать нечего.')
        return
      }
      await exportSalesToExcel(all, {
        periodFrom: filters.dateFrom || all[all.length - 1].date,
        periodTo: filters.dateTo || all[0].date,
        parkName: scope.parks.find((park) => String(park.id) === filters.park)?.park_name,
        productName: scope.products.find(
          (product) => String(product.id) === filters.product,
        )?.name,
        userName: scope.full_name || scope.username,
      })
      toast.success(`Выгружено записей: ${all.length}`)
    } catch (cause) {
      toast.error(parseApiError(cause).message)
    } finally {
      setExporting(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || deleteSale.isPending) return
    const sale = pendingDelete
    try {
      await deleteSale.mutateAsync(sale.id)
      toast.success(`Запись №${sale.id} удалена`)
      setPendingDelete(null)
      // Последняя запись на странице — отступаем назад.
      if (rows.length === 1 && page > 1) setPage((current) => current - 1)
    } catch (cause) {
      toast.error(parseApiError(cause).message)
      setPendingDelete(null)
    }
  }

  return (
    <section>
      <PageHead
        index="02"
        title="История продаж"
        lede="Продажи в рамках парков и услуг, доступных вашей учётной записи."
      />

      <div className={ui.panel}>
        {isMobile ? (
          <button
            type="button"
            className={styles.filtersToggle}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            <span className={styles.filtersToggleTitle}>Фильтры</span>
            <span className={styles.filtersToggleSummary}>{filtersSummary}</span>
            <span className={styles.filtersToggleChevron} aria-hidden="true">
              {filtersOpen ? '▲' : '▼'}
            </span>
          </button>
        ) : null}

        <div className={styles.filters} hidden={!filtersVisible}>
          <div className={`${ui.field} ${styles.dateField}`}>
            <label className={ui.label} htmlFor="filter-from">
              Период с
            </label>
            <input
              id="filter-from"
              className={`${ui.control} ${datesInvalid ? ui.invalid : ''}`}
              type="date"
              value={filters.dateFrom}
              max={scope.today}
              onChange={(event) => update({ dateFrom: event.target.value })}
            />
          </div>

          <div className={`${ui.field} ${styles.dateField}`}>
            <label className={ui.label} htmlFor="filter-to">
              по
            </label>
            <input
              id="filter-to"
              className={`${ui.control} ${datesInvalid ? ui.invalid : ''}`}
              type="date"
              value={filters.dateTo}
              max={scope.today}
              onChange={(event) => update({ dateTo: event.target.value })}
            />
          </div>

          <div className={ui.field}>
            <label className={ui.label} htmlFor="filter-park">
              Парк
            </label>
            <select
              id="filter-park"
              className={ui.control}
              value={filters.park}
              onChange={(event) => update({ park: event.target.value })}
            >
              <option value="">Все доступные парки</option>
              {scope.parks.map((park) => (
                <option key={park.id} value={park.id}>
                  {park.park_name}
                </option>
              ))}
            </select>
          </div>

          <div className={ui.field}>
            <label className={ui.label} htmlFor="filter-product">
              Услуга
            </label>
            <select
              id="filter-product"
              className={ui.control}
              value={filters.product}
              onChange={(event) => update({ product: event.target.value })}
            >
              <option value="">Все доступные услуги</option>
              {scope.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterActions}>
            <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={resetFilters}>
              Сбросить фильтры
            </button>
            <button
              type="button"
              className={`${ui.btn} ${ui.primary}`}
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Готовим файл…' : 'Выгрузить в Excel'}
            </button>
          </div>
        </div>

        {datesInvalid ? (
          <div className={`${ui.banner} ${ui.bannerWarn} ${styles.notice}`}>
            Начало периода позже его конца — уточните даты.
          </div>
        ) : null}

        {salesQuery.isError ? (
          <div className={`${ui.banner} ${ui.bannerError} ${styles.notice}`} role="alert">
            <span>{parseApiError(salesQuery.error).message}</span>
            <button
              type="button"
              className={`${ui.btn} ${ui.ghost}`}
              onClick={() => void salesQuery.refetch()}
            >
              Повторить
            </button>
          </div>
        ) : null}

        <div className={`${styles.tableWrap} ${listClass}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Парк</th>
                <th>Услуга</th>
                <th className={styles.numeric}>Кол-во</th>
                <th className={styles.numeric}>Цена</th>
                <th className={styles.numeric}>Сумма</th>
                <th>Пользователь</th>
                <th>Внесено</th>
                {showActions ? <th aria-label="Действия" /> : null}
              </tr>
            </thead>
            <tbody>
              {salesQuery.isPending ? (
                <SkeletonRows rows={6} columns={showActions ? 9 : 8} />
              ) : null}

              {isEmpty ? (
                <tr>
                  <td className={styles.empty} colSpan={showActions ? 9 : 8}>
                    Продаж за выбранный период нет.
                  </td>
                </tr>
              ) : null}

              {rows.map((sale) => {
                const currency = currencyForPark(sale.park)
                return (
                  <tr key={sale.id}>
                    <td className={styles.nowrap}>{formatDate(sale.date)}</td>
                    <td>
                      <span className={ui.parkTag}>
                        <span
                          className={ui.swatch}
                          style={{ background: parkColor(sale.park.id) }}
                        />
                        {sale.park.park_name}
                      </span>
                    </td>
                    <td>
                      <span
                        className={ui.serviceTag}
                        style={
                          {
                            '--tag-color': productColor(sale.product.id),
                            '--tag-tint': `${productColor(sale.product.id)}1A`,
                          } as React.CSSProperties
                        }
                      >
                        <span className={ui.swatch} />
                        {sale.product.name}
                      </span>
                    </td>
                    <td className={styles.numeric}>{formatCount(sale.count)}</td>
                    <td className={`${styles.numeric} ${styles.nowrap}`}>
                      {formatAmount(sale.price, currency)}
                    </td>
                    <td className={`${styles.numeric} ${styles.nowrap} ${styles.strong}`}>
                      {formatAmount(sale.sale_sum, currency)}
                    </td>
                    <td className={styles.muted}>{sale.user_full_name || sale.username}</td>
                    <td className={`${styles.muted} ${styles.nowrap}`}>
                      {formatDateTime(sale.created_at)}
                    </td>
                    {showActions ? (
                      <td>
                        <div className={styles.rowActions}>
                          {canEdit ? (
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => onEditSale(sale)}
                            >
                              Изменить
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.iconDanger}`}
                              onClick={() => setPendingDelete(sale)}
                            >
                              Удалить
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Тот же список карточками — на узких экранах таблица нечитаема. */}
        <div className={`${styles.cards} ${listClass}`}>
          {salesQuery.isPending ? <div className={styles.cardSkeleton} /> : null}
          {isEmpty ? <p className={styles.empty}>Продаж за выбранный период нет.</p> : null}
          {rows.map((sale) => {
            const currency = currencyForPark(sale.park)
            return (
              <article key={sale.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.cardDate}>{formatDate(sale.date)}</span>
                  <span className={styles.strong}>
                    {formatAmount(sale.sale_sum, currency)}
                  </span>
                </div>
                <div className={ui.parkTag}>
                  <span className={ui.swatch} style={{ background: parkColor(sale.park.id) }} />
                  {sale.park.park_name}
                </div>
                <div>
                  <span
                    className={ui.serviceTag}
                    style={
                      {
                        '--tag-color': productColor(sale.product.id),
                        '--tag-tint': `${productColor(sale.product.id)}1A`,
                      } as React.CSSProperties
                    }
                  >
                    <span className={ui.swatch} />
                    {sale.product.name}
                  </span>
                </div>
                <div className={styles.cardMeta}>
                  {formatCount(sale.count)} шт × {formatAmount(sale.price, currency)}
                </div>
                <div className={styles.cardMeta}>
                  {sale.user_full_name || sale.username} · внесено{' '}
                  {formatDateTime(sale.created_at)}
                </div>
                {showActions ? (
                  <div className={styles.rowActions}>
                    {canEdit ? (
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => onEditSale(sale)}
                      >
                        Изменить
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconDanger}`}
                        onClick={() => setPendingDelete(sale)}
                      >
                        Удалить
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        <Totals scope={scope} filters={filters} totals={totals} />

        {pageCount > 1 ? (
          <div className={styles.pagination}>
            <button
              type="button"
              className={`${ui.btn} ${ui.ghost}`}
              disabled={!salesQuery.data?.previous || salesQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Назад
            </button>
            <span className={styles.pageInfo}>
              Страница {page} из {pageCount} · записей {formatCount(total)}
            </span>
            <button
              type="button"
              className={`${ui.btn} ${ui.ghost}`}
              disabled={!salesQuery.data?.next || salesQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Вперёд
            </button>
          </div>
        ) : null}
      </div>

      {pendingDelete ? (
        <Modal
          title="Удалить продажу?"
          onClose={() => setPendingDelete(null)}
          footer={
            <>
              <button
                type="button"
                className={`${ui.btn} ${ui.ghost}`}
                onClick={() => setPendingDelete(null)}
                disabled={deleteSale.isPending}
              >
                Отмена
              </button>
              <button
                type="button"
                className={`${ui.btn} ${ui.danger}`}
                onClick={confirmDelete}
                disabled={deleteSale.isPending}
              >
                {deleteSale.isPending ? 'Удаляем…' : 'Удалить'}
              </button>
            </>
          }
        >
          <p>
            Запись №{pendingDelete.id} за {formatDate(pendingDelete.date)}:{' '}
            {pendingDelete.product.name}, {pendingDelete.park.park_name},{' '}
            {formatCount(pendingDelete.count)} шт на{' '}
            {formatAmount(pendingDelete.sale_sum, currencyForPark(pendingDelete.park))}.
          </p>
          <p className={styles.deleteNote}>Действие нельзя отменить.</p>
        </Modal>
      ) : null}
    </section>
  )
}

interface TotalsProps {
  scope: Scope
  filters: HistoryFilters
  totals: ReturnType<typeof useTotals>
}

/**
 * Итоги приходят с бэкенда. Если в выборке парки разных стран, показываем
 * отдельную строку на каждую валюту — складывать тенге с сумами нельзя.
 */
function Totals({ scope, filters, totals }: TotalsProps) {
  const selectedParks = filters.park
    ? scope.parks.filter((park) => String(park.id) === filters.park)
    : scope.parks
  const mixedCurrencies = currenciesOf(selectedParks).length > 1

  if (totals.isError) {
    return (
      <div className={`${ui.banner} ${ui.bannerError} ${styles.notice}`} role="alert">
        Не удалось посчитать итоги: {parseApiError(totals.error).message}
      </div>
    )
  }

  return (
    <div className={styles.totals}>
      {mixedCurrencies ? (
        <p className={styles.totalsNote}>
          В выборку попали парки разных стран — итоги показаны по каждой валюте отдельно.
        </p>
      ) : null}

      <div className={styles.totalsRows}>
        {totals.isLoading
          ? [0, 1].map((index) => (
              <div key={index} className={styles.totalItem}>
                <Skeleton width="120px" height="12px" />
                <span className={styles.totalValue}>
                  <Skeleton width="90px" height="18px" />
                </span>
              </div>
            ))
          : totals.rows.map((row) => (
              <div key={row.currency.code} className={styles.totalGroup}>
                <div className={styles.totalItem}>
                  <span className={styles.totalLabel}>
                    Общее количество{mixedCurrencies ? `, ${row.currency.name}` : ''}
                  </span>
                  <span className={styles.totalValue}>{formatCount(row.totalCount)}</span>
                </div>
                <div className={styles.totalItem}>
                  <span className={styles.totalLabel}>
                    Общая сумма продаж{mixedCurrencies ? `, ${row.currency.name}` : ''}
                  </span>
                  <span className={styles.totalValue}>
                    {formatAmount(row.totalSum, row.currency)}
                  </span>
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}
