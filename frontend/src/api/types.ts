/** Парк из области доступа пользователя. Справочник ведётся на бэкенде. */
export interface Park {
  id: number
  park_name: string
  /** Может отсутствовать, пока справочник городов не заполнен. */
  city_id: number | null
  /** На локальном стенде приходит пустой строкой — обрабатывать как «город неизвестен». */
  city_name: string | null
}

/** Услуга из справочника Product (создаётся в 1С). */
export interface Product {
  id: number
  name: string
}

export interface Permissions {
  can_create_past_sales: boolean
  can_change_sale_date: boolean
  can_edit_sales: boolean
  can_delete_sales: boolean
}

export interface Scope {
  user_id: number
  username: string
  full_name: string
  /** «Сегодня» по времени парков. Использовать вместо new Date() в браузере. */
  today: string
  parks: Park[]
  products: Product[]
  permissions: Permissions
}

export interface Sale {
  id: number
  user_id: number
  username: string
  user_full_name: string
  park: Park
  product: Product
  /** Десятичное значение строкой, например "3000.00". */
  price: string
  count: number
  sale_sum: string
  date: string
  created_at: string
  updated_at: string
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Totals {
  total_count: number
  total_sum: string
  records: number
}

export interface AuthResponse {
  token: string
  user_id: number
  username: string
  full_name: string
}

export interface SalePayload {
  park_id: number
  product_id: number
  price: string
  count: number
  date?: string
}

/** Тело ответа 409 при попытке завести дубль продажи. */
export interface DuplicateConflict {
  error: string
  existing_sale_id: number
  existing_sale: Sale
}

export interface SaleFilters {
  date_from?: string
  date_to?: string
  park?: number | null
  product?: number | null
  ordering?: string
}
