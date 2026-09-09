import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueries,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'
import { ApiError, request } from './client'
import type {
  AuthResponse,
  Paginated,
  Park,
  Sale,
  SaleFilters,
  SalePayload,
  Scope,
  Totals,
} from './types'
import {
  currenciesOf,
  currencyForPark,
  DEFAULT_CURRENCY,
  type Currency,
} from '../lib/currency'
import { toNumber } from '../lib/format'

export const PAGE_SIZE = 50

/** 4xx повторять бессмысленно — ответ не изменится. */
function retryPolicy(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

export function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/sales-auth/token/', {
    method: 'POST',
    body: { username, password },
    anonymous: true,
  })
}

export function useScope(enabled: boolean): UseQueryResult<Scope, unknown> {
  return useQuery({
    queryKey: ['scope'],
    queryFn: () => request<Scope>('/sales/scope/'),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: retryPolicy,
  })
}

function filterParams(filters: SaleFilters): Record<string, string | number | null | undefined> {
  return {
    date_from: filters.date_from,
    date_to: filters.date_to,
    park: filters.park ?? undefined,
    product: filters.product ?? undefined,
    ordering: filters.ordering,
  }
}

export function useSales(filters: SaleFilters, page: number) {
  return useQuery({
    queryKey: ['sales', filters, page],
    queryFn: () =>
      request<Paginated<Sale>>('/sales/', {
        params: { ...filterParams(filters), page },
      }),
    placeholderData: keepPreviousData,
    retry: retryPolicy,
  })
}

/** Верхняя граница на случай, если фильтр охватит слишком много записей. */
const EXPORT_PAGE_LIMIT = 200

/**
 * Выгружает все страницы по текущим фильтрам — нужно для экспорта в Excel,
 * который должен покрывать всю выборку, а не только открытую страницу.
 */
export async function fetchAllSales(filters: SaleFilters): Promise<Sale[]> {
  const collected: Sale[] = []

  for (let page = 1; page <= EXPORT_PAGE_LIMIT; page += 1) {
    const chunk = await request<Paginated<Sale>>('/sales/', {
      params: { ...filterParams(filters), page },
    })
    collected.push(...chunk.results)
    if (!chunk.next || chunk.results.length === 0) break
  }

  return collected
}

export interface CurrencyTotals {
  currency: Currency
  totalCount: number
  totalSum: number
  records: number
}

export interface TotalsResult {
  rows: CurrencyTotals[]
  isLoading: boolean
  isError: boolean
  error: unknown
}

/**
 * Итоги считает бэкенд, клиент строки не суммирует.
 *
 * Загвоздка: /totals/ отдаёт одну сумму на запрос, а параметр park не
 * повторяемый (проверено на бэкенде: при park=9&park=1 берётся последний).
 * Поэтому если в выборку попали парки разных стран, итоги собираются
 * отдельным запросом на каждый парк и группируются по валюте — складываются
 * при этом серверные итоги, а не строки таблицы. Обычный случай (одна валюта)
 * остаётся одним запросом.
 */
export function useTotals(filters: SaleFilters, parks: readonly Park[]): TotalsResult {
  const selectedParks = filters.park
    ? parks.filter((park) => park.id === filters.park)
    : parks

  const currencies = currenciesOf(selectedParks)
  const needsSplit = currencies.length > 1

  const parkIds = needsSplit ? selectedParks.map((park) => park.id) : [null]

  const queries = useQueries({
    queries: parkIds.map((parkId) => ({
      queryKey: ['totals', filters, parkId],
      queryFn: () =>
        request<Totals>('/sales/totals/', {
          params: {
            ...filterParams(filters),
            ...(parkId === null ? {} : { park: parkId }),
          },
        }),
      retry: retryPolicy,
    })),
  })

  const isLoading = queries.some((query) => query.isPending)
  const isError = queries.some((query) => query.isError)
  const error = queries.find((query) => query.isError)?.error

  if (isLoading || isError) {
    return { rows: [], isLoading, isError, error }
  }

  if (!needsSplit) {
    const totals = queries[0]?.data
    const currency = currencies[0] ?? DEFAULT_CURRENCY
    return {
      rows: [
        {
          currency,
          totalCount: totals?.total_count ?? 0,
          totalSum: toNumber(totals?.total_sum),
          records: totals?.records ?? 0,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    }
  }

  const byCurrency = new Map<string, CurrencyTotals>()
  parkIds.forEach((parkId, index) => {
    const totals = queries[index]?.data
    if (!totals || parkId === null) return
    const park = selectedParks.find((item) => item.id === parkId)
    const currency = currencyForPark(park)
    const bucket = byCurrency.get(currency.code) ?? {
      currency,
      totalCount: 0,
      totalSum: 0,
      records: 0,
    }
    bucket.totalCount += totals.total_count
    bucket.totalSum += toNumber(totals.total_sum)
    bucket.records += totals.records
    byCurrency.set(currency.code, bucket)
  })

  return {
    rows: [...byCurrency.values()],
    isLoading: false,
    isError: false,
    error: null,
  }
}

function useSalesInvalidation() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['sales'] })
    void queryClient.invalidateQueries({ queryKey: ['totals'] })
  }
}

export function useCreateSale() {
  const invalidate = useSalesInvalidation()
  return useMutation({
    mutationFn: (payload: SalePayload) =>
      request<Sale>('/sales/', { method: 'POST', body: payload }),
    onSuccess: invalidate,
  })
}

export function useUpdateSale() {
  const invalidate = useSalesInvalidation()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<SalePayload> }) =>
      request<Sale>(`/sales/${id}/`, { method: 'PATCH', body: payload }),
    onSuccess: invalidate,
  })
}

export function useDeleteSale() {
  const invalidate = useSalesInvalidation()
  return useMutation({
    mutationFn: (id: number) => request<void>(`/sales/${id}/`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}
