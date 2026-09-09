/**
 * Брендбук Avatariya. Парки и услуги приходят из 1С с произвольными id,
 * поэтому цвет назначается детерминированно по id, а не таблицей соответствий:
 * один и тот же парк всегда получает один и тот же цвет.
 */
const PARK_COLORS = ['#0047BB', '#0072CE', '#008C15', '#FF8200', '#AE2573'] as const
const PRODUCT_COLORS = ['#6A02C8', '#780BDB', '#9520FF', '#B44BFF', '#5A0BA8'] as const

function pick(palette: readonly string[], id: number): string {
  // Перемешиваем id, чтобы соседние id не давали соседние цвета.
  const mixed = Math.abs(Math.imul(id | 0, 2654435761)) % palette.length
  return palette[mixed]
}

export function parkColor(id: number): string {
  return pick(PARK_COLORS, id)
}

export function productColor(id: number): string {
  return pick(PRODUCT_COLORS, id)
}
