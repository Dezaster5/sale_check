import type { FieldErrors } from '../api/errors'
import type { Sale, SalePayload } from '../api/types'

export interface SaleFormValues {
  date: string
  parkId: string
  productId: string
  count: string
  price: string
}

export function emptyValues(today: string, parkId = '', productId = ''): SaleFormValues {
  return { date: today, parkId, productId, count: '', price: '' }
}

export function valuesFromSale(sale: Sale): SaleFormValues {
  return {
    date: sale.date,
    parkId: String(sale.park.id),
    productId: String(sale.product.id),
    count: String(sale.count),
    price: normalizePriceInput(sale.price),
  }
}

/** В поле цены допускаем запятую как разделитель и не больше двух знаков после неё. */
export function sanitizePriceInput(raw: string): string {
  const replaced = raw.replace(',', '.').replace(/[^\d.]/g, '')
  const [whole, ...rest] = replaced.split('.')
  if (rest.length === 0) return whole
  return `${whole}.${rest.join('').slice(0, 2)}`
}

function normalizePriceInput(value: string): string {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return ''
  // "3000.00" показываем как "3000", "2500.50" — как "2500.5"
  return String(parsed)
}

export function previewSum(values: SaleFormValues): number {
  const count = Number.parseInt(values.count, 10)
  const price = Number.parseFloat(values.price)
  if (!Number.isFinite(count) || !Number.isFinite(price)) return 0
  return count * price
}

/**
 * Клиентская проверка — только чтобы не гонять заведомо неверный запрос.
 * Бэкенд всё равно проверяет всё заново, его ошибки обрабатываются отдельно.
 */
export function validateSale(values: SaleFormValues, today: string): FieldErrors {
  const errors: FieldErrors = {}

  if (!values.date) {
    errors.date = 'Укажите дату продажи.'
  } else if (values.date > today) {
    errors.date = 'Нельзя завести продажу за будущую дату.'
  }

  if (!values.parkId) errors.park_id = 'Выберите парк.'
  if (!values.productId) errors.product_id = 'Выберите услугу.'

  const count = Number(values.count)
  if (!values.count.trim()) {
    errors.count = 'Укажите количество.'
  } else if (!Number.isInteger(count) || count <= 0) {
    errors.count = 'Количество — целое число больше нуля.'
  }

  const price = Number(values.price)
  if (!values.price.trim()) {
    errors.price = 'Укажите цену.'
  } else if (!Number.isFinite(price) || price < 0) {
    errors.price = 'Цена не может быть отрицательной.'
  }

  return errors
}

export function toPayload(values: SaleFormValues): SalePayload {
  return {
    park_id: Number(values.parkId),
    product_id: Number(values.productId),
    price: Number(values.price).toFixed(2),
    count: Number.parseInt(values.count, 10),
    date: values.date,
  }
}

/** Для PATCH шлём только изменившиеся поля. */
export function toPatchPayload(
  values: SaleFormValues,
  original: Sale,
): Partial<SalePayload> {
  const full = toPayload(values)
  const patch: Partial<SalePayload> = {}

  if (full.park_id !== original.park.id) patch.park_id = full.park_id
  if (full.product_id !== original.product.id) patch.product_id = full.product_id
  if (full.count !== original.count) patch.count = full.count
  if (full.price !== Number(original.price).toFixed(2)) patch.price = full.price
  if (full.date !== original.date) patch.date = full.date

  return patch
}
