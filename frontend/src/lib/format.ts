import type { Currency } from './currency'

const numberFormatter = new Intl.NumberFormat('ru-RU')

const wholeAmountFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const fractionalAmountFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Суммы приходят строками ("15000.00"), количество — числом. */
export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatCount(value: string | number | null | undefined): string {
  return numberFormatter.format(toNumber(value))
}

/**
 * «15 000 ₸», «2 500,50 сўм». Разделители разрядов обязательны.
 * Копейки показываем только когда они есть, но тогда обе цифры: 1 500,50, а не 1 500,5.
 */
export function formatAmount(
  value: string | number | null | undefined,
  currency: Currency,
): string {
  const amount = toNumber(value)
  const hasFraction = Math.abs(amount % 1) > 1e-9
  const formatter = hasFraction ? fractionalAmountFormatter : wholeAmountFormatter
  return `${formatter.format(amount)} ${currency.symbol}`
}

/** ISO «2026-09-08» → «08.09.2026». Без Date, чтобы не поймать сдвиг часового пояса. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return iso
  const [, year, month, day] = match
  return `${day}.${month}.${year}`
}

/** Сдвиг ISO-даты на N дней без участия часового пояса браузера. */
export function shiftDate(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
