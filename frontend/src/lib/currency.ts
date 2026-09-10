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
 * Слова, по которым узнаётся Узбекистан. Сверка идёт по отдельным словам:
 * в справочнике название может быть заполнено по-русски, по-узбекски или
 * латиницей, а рядом стоять лишнее («г. Ташкент», «Ташкент, Узбекистан»).
 */
const UZ_WORDS = new Set(
  [
    'узбекистан', 'uzbekistan',
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
  (import.meta.env?.VITE_UZ_CITY_IDS ?? '')
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value)),
)

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е')
}

/**
 * Разбивает строку на слова: «г. Ташкент» и «Avatariya Tashkent City»
 * дают слово «ташкент». Сверять целиком нельзя — название почти никогда
 * не приходит одним чистым словом.
 */
function words(value?: string | null): string[] {
  if (typeof value !== 'string') return []
  return normalize(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

function mentionsUzbekistan(value?: string | null): boolean {
  return words(value).some((word) => UZ_WORDS.has(word))
}

/**
 * Валюта по городу. Возвращает null, когда город неизвестен: справочник
 * заполнен не везде, и city_name приходит пустой строкой или null.
 * Отличать «город неизвестен» от «город не узбекский» обязательно —
 * иначе незаполненный справочник молча выдаётся за Казахстан.
 */
function currencyFromCity(
  cityId?: number | null,
  cityName?: string | null,
): Currency | null {
  if (typeof cityId === 'number' && UZ_CITY_IDS.has(cityId)) return UZS

  const cityWords = words(cityName)
  if (cityWords.length === 0) return null

  return cityWords.some((word) => UZ_WORDS.has(word)) ? UZS : KZT
}

/**
 * Валюта по городу парка.
 * Город может прийти пустой строкой или null — тогда возвращается валюта
 * по умолчанию, интерфейс не должен падать.
 */
export function currencyForCity(
  cityId?: number | null,
  cityName?: string | null,
): Currency {
  return currencyFromCity(cityId, cityName) ?? DEFAULT_CURRENCY
}

/**
 * Валюта по парку. Если город в справочнике не заполнен, страна узнаётся
 * по названию парка («Avatariya Tashkent City»). Заполненный город всегда
 * главнее названия: он ведётся в справочнике и точнее.
 */
export function currencyForPark(park?: Park | null): Currency {
  if (!park) return DEFAULT_CURRENCY

  const byCity = currencyFromCity(park.city_id, park.city_name)
  if (byCity) return byCity

  if (mentionsUzbekistan(park.park_name)) return UZS

  return DEFAULT_CURRENCY
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
