import type { FieldErrors } from '../api/errors'
import type { Park, Product } from '../api/types'
import { currencyForPark } from '../lib/currency'
import { formatAmount } from '../lib/format'
import { previewSum, sanitizePriceInput, type SaleFormValues } from './saleForm'
import ui from '../components/ui.module.css'
import styles from './SaleFormFields.module.css'

interface SaleFormFieldsProps {
  values: SaleFormValues
  onChange: (patch: Partial<SaleFormValues>) => void
  errors: FieldErrors
  parks: Park[]
  products: Product[]
  today: string
  /** Можно ли трогать дату: can_create_past_sales при создании, can_change_sale_date при правке. */
  dateEditable: boolean
  disabled?: boolean
  idPrefix: string
  /**
   * wide — пять полей в строку на всю ширину страницы,
   * compact — две колонки для формы внутри модалки.
   */
  layout?: 'wide' | 'compact'
}

export function SaleFormFields({
  values,
  onChange,
  errors,
  parks,
  products,
  today,
  dateEditable,
  disabled = false,
  idPrefix,
  layout = 'wide',
}: SaleFormFieldsProps) {
  const selectedPark = parks.find((park) => String(park.id) === values.parkId)
  const currency = currencyForPark(selectedPark)
  const onlyPark = parks.length === 1 ? parks[0] : null
  const onlyProduct = products.length === 1 ? products[0] : null

  return (
    <>
      <div className={`${styles.grid} ${layout === 'compact' ? styles.compact : ''}`}>
        <div className={ui.field}>
          <label className={ui.label} htmlFor={`${idPrefix}-date`}>
            Дата продажи
          </label>
          <input
            id={`${idPrefix}-date`}
            className={`${ui.control} ${errors.date ? ui.invalid : ''}`}
            type="date"
            value={values.date}
            max={today}
            readOnly={!dateEditable}
            disabled={disabled}
            onChange={(event) => onChange({ date: event.target.value })}
          />
          {errors.date ? <div className={ui.error}>{errors.date}</div> : null}
          {!dateEditable ? (
            <div className={ui.hint}>Права позволяют вносить продажи только за сегодня.</div>
          ) : null}
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor={`${idPrefix}-park`}>
            Парк
          </label>
          {onlyPark ? (
            <div className={ui.static} id={`${idPrefix}-park`}>
              {onlyPark.park_name}
            </div>
          ) : (
            <select
              id={`${idPrefix}-park`}
              className={`${ui.control} ${errors.park_id ? ui.invalid : ''}`}
              value={values.parkId}
              disabled={disabled}
              onChange={(event) => onChange({ parkId: event.target.value })}
            >
              <option value="">Выберите парк</option>
              {parks.map((park) => (
                <option key={park.id} value={park.id}>
                  {park.park_name}
                </option>
              ))}
            </select>
          )}
          {errors.park_id ? <div className={ui.error}>{errors.park_id}</div> : null}
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor={`${idPrefix}-product`}>
            Услуга
          </label>
          {onlyProduct ? (
            <div className={ui.static} id={`${idPrefix}-product`}>
              {onlyProduct.name}
            </div>
          ) : (
            <select
              id={`${idPrefix}-product`}
              className={`${ui.control} ${errors.product_id ? ui.invalid : ''}`}
              value={values.productId}
              disabled={disabled}
              onChange={(event) => onChange({ productId: event.target.value })}
            >
              <option value="">Выберите услугу</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          )}
          {errors.product_id ? <div className={ui.error}>{errors.product_id}</div> : null}
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor={`${idPrefix}-count`}>
            Количество
          </label>
          <input
            id={`${idPrefix}-count`}
            className={`${ui.control} ${errors.count ? ui.invalid : ''}`}
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={values.count}
            disabled={disabled}
            onChange={(event) => onChange({ count: event.target.value.replace(/\D/g, '') })}
          />
          {errors.count ? <div className={ui.error}>{errors.count}</div> : null}
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor={`${idPrefix}-price`}>
            Цена, {currency.symbol}
          </label>
          <input
            id={`${idPrefix}-price`}
            className={`${ui.control} ${errors.price ? ui.invalid : ''}`}
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={values.price}
            disabled={disabled}
            onChange={(event) => onChange({ price: sanitizePriceInput(event.target.value) })}
          />
          {errors.price ? <div className={ui.error}>{errors.price}</div> : null}
        </div>
      </div>

      <div className={styles.sumRow}>
        <div className={ui.field}>
          <span className={ui.label}>Стоимость (авторасчёт)</span>
          <div className={styles.sum}>{formatAmount(previewSum(values), currency)}</div>
          <div className={ui.hint}>Итоговую сумму считает сервер.</div>
        </div>
      </div>
    </>
  )
}
