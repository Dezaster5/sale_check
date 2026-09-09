import { useState, type FormEvent } from 'react'
import { asDuplicateConflict, parseApiError, type FieldErrors } from '../api/errors'
import { useUpdateSale } from '../api/hooks'
import type { Park, Product, Sale, Scope } from '../api/types'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { currencyForPark } from '../lib/currency'
import { formatAmount, formatCount, formatDate } from '../lib/format'
import { SaleFormFields } from './SaleFormFields'
import {
  toPatchPayload,
  validateSale,
  valuesFromSale,
  type SaleFormValues,
} from './saleForm'
import ui from '../components/ui.module.css'
import styles from './SaleEditModal.module.css'

interface SaleEditModalProps {
  sale: Sale
  scope: Scope
  onClose: () => void
}

/**
 * Редактирование открывается модалкой поверх любой вкладки: сюда приводит
 * и кнопка в истории, и «Редактировать существующую» из конфликта 409.
 */
export function SaleEditModal({ sale, scope, onClose }: SaleEditModalProps) {
  const toast = useToast()
  const updateSale = useUpdateSale()

  const [values, setValues] = useState<SaleFormValues>(() => valuesFromSale(sale))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Парк или услуга записи могли выпасть из области доступа — показываем их,
  // чтобы поле не оказалось пустым и правка не подменила данные молча.
  const parks = withCurrent(scope.parks, sale.park)
  const products = withCurrent(scope.products, sale.product)

  function patch(next: Partial<SaleFormValues>) {
    setValues((current) => ({ ...current, ...next }))
    setErrors((current) => {
      const cleaned = { ...current }
      for (const key of Object.keys(next)) {
        delete cleaned[FIELD_TO_ERROR_KEY[key as keyof SaleFormValues]]
      }
      return cleaned
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (updateSale.isPending) return

    setFormError(null)

    const localErrors = validateSale(values, scope.today)
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors)
      return
    }
    setErrors({})

    const payload = toPatchPayload(values, sale)
    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }

    try {
      await updateSale.mutateAsync({ id: sale.id, payload })
      toast.success(`Запись №${sale.id} обновлена`)
      onClose()
    } catch (cause) {
      const conflict = asDuplicateConflict(cause)
      if (conflict) {
        const existing = conflict.existing_sale
        const currency = currencyForPark(existing.park)
        setFormError(
          `${conflict.error}: запись №${existing.id} за ${formatDate(existing.date)}, ` +
            `${formatCount(existing.count)} шт × ${formatAmount(existing.price, currency)}.`,
        )
        return
      }
      const parsed = parseApiError(cause)
      setErrors(parsed.fieldErrors)
      setFormError(parsed.message)
    }
  }

  return (
    <Modal
      title={`Редактирование записи №${sale.id}`}
      onClose={onClose}
      size="wide"
      footer={
        <>
          <button
            type="button"
            className={`${ui.btn} ${ui.ghost}`}
            onClick={onClose}
            disabled={updateSale.isPending}
          >
            Отмена
          </button>
          <button
            type="submit"
            form="sale-edit-form"
            className={`${ui.btn} ${ui.primary}`}
            disabled={updateSale.isPending}
          >
            {updateSale.isPending ? 'Сохраняем…' : 'Сохранить изменения'}
          </button>
        </>
      }
    >
      <form id="sale-edit-form" onSubmit={handleSubmit} noValidate>
        <SaleFormFields
          idPrefix="edit"
          layout="compact"
          values={values}
          onChange={patch}
          errors={errors}
          parks={parks}
          products={products}
          today={scope.today}
          dateEditable={scope.permissions.can_change_sale_date}
          disabled={updateSale.isPending}
        />

        {!scope.permissions.can_change_sale_date ? (
          <p className={styles.note}>Права на изменение даты продажи не назначены.</p>
        ) : null}

        {formError ? (
          <div className={`${ui.banner} ${ui.bannerError} ${styles.banner}`} role="alert">
            {formError}
          </div>
        ) : null}
      </form>
    </Modal>
  )
}

function withCurrent<T extends Park | Product>(list: T[], current: T): T[] {
  return list.some((item) => item.id === current.id) ? list : [...list, current]
}

const FIELD_TO_ERROR_KEY: Record<keyof SaleFormValues, string> = {
  date: 'date',
  parkId: 'park_id',
  productId: 'product_id',
  count: 'count',
  price: 'price',
}
