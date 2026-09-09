import { useState, type FormEvent } from 'react'
import { asDuplicateConflict, parseApiError, type FieldErrors } from '../api/errors'
import { useCreateSale } from '../api/hooks'
import type { DuplicateConflict, Sale, Scope } from '../api/types'
import { Modal } from '../components/Modal'
import { PageHead } from '../components/Layout'
import { useToast } from '../components/Toast'
import { currencyForPark } from '../lib/currency'
import { formatAmount, formatCount, formatDate } from '../lib/format'
import { SaleFormFields } from './SaleFormFields'
import {
  emptyValues,
  toPayload,
  validateSale,
  type SaleFormValues,
} from './saleForm'
import ui from '../components/ui.module.css'
import styles from './SalesPage.module.css'

interface SalesPageProps {
  scope: Scope
  onEditSale: (sale: Sale) => void
}

export function SalesPage({ scope, onEditSale }: SalesPageProps) {
  const toast = useToast()
  const createSale = useCreateSale()

  const [values, setValues] = useState<SaleFormValues>(() =>
    emptyValues(
      scope.today,
      scope.parks.length === 1 ? String(scope.parks[0].id) : '',
      scope.products.length === 1 ? String(scope.products[0].id) : '',
    ),
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<DuplicateConflict | null>(null)

  function patch(next: Partial<SaleFormValues>) {
    setValues((current) => ({ ...current, ...next }))
    // Правка поля снимает ошибку именно по нему.
    setErrors((current) => {
      const cleaned = { ...current }
      for (const key of Object.keys(next)) {
        delete cleaned[FIELD_TO_ERROR_KEY[key as keyof SaleFormValues]]
      }
      return cleaned
    })
  }

  function resetForm() {
    setValues(
      emptyValues(
        scope.today,
        scope.parks.length === 1 ? String(scope.parks[0].id) : '',
        scope.products.length === 1 ? String(scope.products[0].id) : '',
      ),
    )
    setErrors({})
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // Пока не пришёл ответ на предыдущий POST, повторный не отправляем.
    if (createSale.isPending) return

    setFormError(null)
    setDuplicate(null)

    const localErrors = validateSale(values, scope.today)
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors)
      return
    }
    setErrors({})

    try {
      const created = await createSale.mutateAsync(toPayload(values))
      toast.success(
        `Продажа сохранена: ${formatCount(created.count)} × ${formatAmount(
          created.price,
          currencyForPark(created.park),
        )}`,
      )
      resetForm()
    } catch (cause) {
      const conflict = asDuplicateConflict(cause)
      if (conflict) {
        setDuplicate(conflict)
        return
      }
      const parsed = parseApiError(cause)
      setErrors(parsed.fieldErrors)
      setFormError(parsed.message)
      toast.error(parsed.message)
    }
  }

  return (
    <section>
      <PageHead
        index="01"
        title="Продажи"
        lede="Внесите итоговые продажи за день по услуге и парку."
      />

      <div className={ui.panel}>
        <form onSubmit={handleSubmit} noValidate>
          <SaleFormFields
            idPrefix="create"
            values={values}
            onChange={patch}
            errors={errors}
            parks={scope.parks}
            products={scope.products}
            today={scope.today}
            dateEditable={scope.permissions.can_create_past_sales}
            disabled={createSale.isPending}
          />

          <div className={styles.actions}>
            <button
              type="submit"
              className={`${ui.btn} ${ui.primary}`}
              disabled={createSale.isPending}
            >
              {createSale.isPending ? 'Сохраняем…' : 'Сохранить продажу'}
            </button>
          </div>

          {formError ? (
            <div className={`${ui.banner} ${ui.bannerError} ${styles.banner}`} role="alert">
              {formError}
            </div>
          ) : null}
        </form>
      </div>

      {duplicate ? (
        <DuplicateModal
          conflict={duplicate}
          canEdit={scope.permissions.can_edit_sales}
          onClose={() => setDuplicate(null)}
          onEdit={(sale) => {
            setDuplicate(null)
            onEditSale(sale)
          }}
        />
      ) : null}
    </section>
  )
}

const FIELD_TO_ERROR_KEY: Record<keyof SaleFormValues, string> = {
  date: 'date',
  parkId: 'park_id',
  productId: 'product_id',
  count: 'count',
  price: 'price',
}

interface DuplicateModalProps {
  conflict: DuplicateConflict
  canEdit: boolean
  onClose: () => void
  onEdit: (sale: Sale) => void
}

/** 409: продажа по этой комбинации уже есть. Данные берём из ответа сервера. */
function DuplicateModal({ conflict, canEdit, onClose, onEdit }: DuplicateModalProps) {
  const sale = conflict.existing_sale
  const currency = currencyForPark(sale.park)

  return (
    <Modal
      title="Продажа за эту дату уже внесена"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={onClose}>
            Отмена
          </button>
          {canEdit ? (
            <button
              type="button"
              className={`${ui.btn} ${ui.primary}`}
              onClick={() => onEdit(sale)}
            >
              Редактировать существующую
            </button>
          ) : null}
        </>
      }
    >
      <p className={styles.modalLede}>{conflict.error}</p>

      <div className={styles.summary}>
        <span className={styles.summaryLine}>
          {formatCount(sale.count)} шт × {formatAmount(sale.price, currency)} ={' '}
          <b>{formatAmount(sale.sale_sum, currency)}</b>
        </span>
      </div>

      <dl className={styles.details}>
        <div>
          <dt>Дата</dt>
          <dd>{formatDate(sale.date)}</dd>
        </div>
        <div>
          <dt>Парк</dt>
          <dd>{sale.park.park_name}</dd>
        </div>
        <div>
          <dt>Услуга</dt>
          <dd>{sale.product.name}</dd>
        </div>
        <div>
          <dt>Запись</dt>
          <dd>№{sale.id}</dd>
        </div>
      </dl>

      {!canEdit ? (
        <p className={styles.noRights}>
          Прав на редактирование нет — обратитесь к администратору.
        </p>
      ) : null}
    </Modal>
  )
}
