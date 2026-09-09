import type { Park } from '../api/types'

export type CurrencyCode = 'KZT' | 'UZS'

export interface Currency {
  code: CurrencyCode
  /** Символ для сумм: «15 000 ₸». */
  symbol: string
  /** Название для подписей полей: «Цена, тенге». */
  name: string
}

export const KZT: Currency = { code: 'KZT', symbol: '₸', name: 'тенге' }
export const UZS: Currency = { code: 'UZS', symbol: 'сўм', name: 'сум' }

/** Бэкенд валюту не отдаёт, поэтому она выводится из города парка. */
export const DEFAULT_CURRENCY = KZT

/**
 * Города Узбекистана. Сверка идёт по названию: в справочнике city_name
 * может быть заполнен по-русски, по-узбекски или латиницей.
 */
const UZ_CITY_NAMES = new Set(
  [
    'ташкент', 'toshkent', 'tashkent',
    'самарканд', 'samarqand', 'samarkand',
    'бухара', 'buxoro', 'bukhara',
    'наманган', 'namangan',
    'андижан', 'andijon', 'andijan',
    'фергана', 'фаргона', 'fargona', 'ferghana', 'fergana',
    'нукус', 'nukus',
    'карши', 'qarshi', 'karshi',
    'термез', 'termiz', 'termez',
    'джизак', 'jizzax', 'jizzakh',
    'гулистан', 'guliston', 'gulistan',
    'навои', 'navoiy', 'navoi',
    'ургенч', 'urganch', 'urgench',
    'хива', 'xiva', 'khiva',
    'коканд', 'qoqon', 'kokand',
    'маргилан', 'margilon', 'margilan',
    'чирчик', 'chirchiq', 'chirchik',
    'ангрен', 'angren',
    'алмалык', 'olmaliq', 'almalyk',
  ].map(normalize),
)

/**
 * Пока city_name в справочнике пустой, город можно распознать по id:
 * список задаётся переменной окружения VITE_UZ_CITY_IDS="7,12".
 * Как только справочник заполнят, переменная станет не нужна.
 */
const UZ_CITY_IDS: ReadonlySet<number> = new Set(
  (import.meta.env.VITE_UZ_CITY_IDS ?? '')
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value)),
)

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е')
}

/**
 * Валюта по городу парка.
 * Город может прийти пустой строкой или null (справочник заполнен не везде) —
 * в этом случае возвращается валюта по умолчанию, интерфейс не должен падать.
 */
export function currencyForCity(
  cityId?: number | null,
  cityName?: string | null,
): Currency {
  if (typeof cityId === 'number' && UZ_CITY_IDS.has(cityId)) return UZS

  const name = typeof cityName === 'string' ? normalize(cityName) : ''
  if (name && UZ_CITY_NAMES.has(name)) return UZS

  return DEFAULT_CURRENCY
}

export function currencyForPark(park?: Park | null): Currency {
  if (!park) return DEFAULT_CURRENCY
  return currencyForCity(park.city_id, park.city_name)
}

/** Есть ли в наборе парков больше одной валюты — от этого зависит вид итогов. */
export function currenciesOf(parks: readonly Park[]): Currency[] {
  const seen = new Map<CurrencyCode, Currency>()
  for (const park of parks) {
    const currency = currencyForPark(park)
    if (!seen.has(currency.code)) seen.set(currency.code, currency)
  }
  return [...seen.values()]
}
